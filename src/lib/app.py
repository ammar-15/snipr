from flask import Flask, request, jsonify
from openai import OpenAI
import yfinance as yf
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import os, time
import numpy as np
from flask_cors import CORS
from flask_limiter import Limiter
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
from flask_limiter.util import get_remote_address

load_dotenv()

app = Flask(__name__)
limiter = Limiter(get_remote_address, app=app, default_limits=["300 per day", "10 per minute"])
ALLOWED_ORIGINS = [
    "https://tweetsniper.vercel.app",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["POST", "OPTIONS"],
)

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

def ratelimit_handler(e):
    return jsonify(success=False, error="Too many requests, slow down."), 429

# Scrape tweets using logged-in Selenium session
def get_tweets(twitter_username: str, limit: int = 100):
    options = Options()
    # keep your persistent profile (optional, helps sometimes, but not required)
    options.add_argument("--user-data-dir=/Users/akuul15/.snipr_chrome")
    options.add_argument("--profile-directory=Default")

    # stability flags
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1400,900")

    driver = webdriver.Chrome(options=options)
    print("✅ Chrome window launched")

    try:
        # go straight to profile (no login)
        url = f"https://x.com/{twitter_username}"
        driver.get(url)
        time.sleep(4)
        print(f"➡️ Navigating to: {url}")

        # If X shows a login wall, you’ll often still get some tweets.
        # We scrape what we can. If we get almost nothing, we’ll return [].
        tweets = []
        seen = set()

        scroll_attempts = 40
        stuck_rounds = 0
        max_stuck_rounds = 4
        for attempt in range(scroll_attempts):
            # Grab tweet text blocks
            elements = driver.find_elements(By.XPATH, '//article//div[@lang]')
            new_count = 0
            for el in elements:
                try:
                    txt = (el.text or "").strip()
                    if txt and txt not in seen:
                        seen.add(txt)
                        tweets.append(txt)
                        new_count += 1
                        if len(tweets) >= limit:
                            break
                except Exception:
                    continue
            print(f"🔄 Scroll attempt {attempt + 1} | +{new_count} new | total={len(tweets)}")
            if len(tweets) >= limit:
                break

            # scroll
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(5.0)

            new_height = driver.execute_script("return document.body.scrollHeight")
            # if we didn't find new tweets this round, count as "stuck"
            if new_count == 0:
                stuck_rounds += 1
                if stuck_rounds >= max_stuck_rounds:
                    print("⚠️ No new tweets after multiple scrolls, stopping.")
                    break
            else:
                stuck_rounds = 0

        print(f"✅ Fetched {len(tweets)} tweets (public scrape)")
        # If X blocked everything, you’ll get ~0-2 tiny strings. Treat that as blocked.
        if len(tweets) < 3:
            print("⚠️ Likely blocked by X login wall / rate limits.")
            return []
        return tweets[:limit]

    finally:
        driver.quit()


# Use OpenAI to analyze tweet sentiments

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_tweets(tweets):
    prompt = f"""
Analyze the following tweets for stock-related calls.
For each ticker mentioned, label it as 'bullish' or 'bearish' based on what the user said.
Format exactly one per line like:
AAPL: bullish
TSLA: bearish

Tweets:
{tweets}
""".strip()

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a financial analysis assistant."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=500,
    )
    return (resp.choices[0].message.content or "").strip()


# Compare predictions with stock performance
def fact_check(ticker_calls):
    correct = 0
    breakdown = {}
    for ticker, sentiment in ticker_calls.items():
        data = yf.Ticker(ticker).history(period="1wk")
        if data.empty:
            breakdown[ticker] = None
            continue
        start = data.iloc[0]["Close"]
        end = data.iloc[-1]["Close"]
        is_correct = (sentiment == "bullish" and end > start) or (sentiment == "bearish" and end < start)
        breakdown[ticker] = is_correct
        if is_correct:
            correct += 1
    return correct, len(ticker_calls), breakdown

@app.route("/analyze", methods=["POST", "OPTIONS"])
@limiter.limit("10 per minute") 
def analyze():
    if request.method == "OPTIONS":
        return ("", 204)
    # 🔒 Authenticate user using Firebase ID token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify(error="Missing or invalid Authorization header"), 401

    id_token = auth_header.split("Bearer ")[1]
    try:
        decoded_token: dict = firebase_auth.verify_id_token(id_token)
        user_uid = decoded_token.get("uid", "")
        user_email = decoded_token.get("email", "")
        print("✅ Authenticated Firebase user:", user_email)
    except Exception as e:
        print("❌ Firebase token verification failed:", e)
        return jsonify(error="Invalid token"), 401

    # 📩 Get Twitter URL from request body
    if not request.is_json or request.json is None:
        return jsonify(error="Invalid or missing JSON in request"), 400
    twitter_url = request.json.get("twitterUrl")
    if not twitter_url:
        return jsonify(error="Missing 'twitterUrl' in request"), 400
    twitter_username = twitter_url.rstrip("/").split("/")[-1]

    # 🐦 Get tweets & analyze
    try:
        tweets = get_tweets(twitter_username, limit=30)
        print(f"✅ got {len(tweets)} tweets")
    except Exception as e:
        print("❌ get_tweets crashed:", repr(e))
        return jsonify(success=False, error="Tweet scraping failed", details=str(e)), 500

    try:
        analysis = analyze_tweets(tweets)
        print("✅ OpenAI response received")
    except Exception as e:
        print("❌ analyze_tweets crashed:", repr(e))
        return jsonify(success=False, error="AI analysis failed", details=str(e)), 500


    ticker_calls = {}
    print("📊 OpenAI Analysis Response:\n", analysis)
    for line in analysis.split("\n"):
        if ":" in line:
            ticker, sentiment = line.split(":")
            ticker = ticker.strip().replace("$", "").upper()
            sentiment = sentiment.strip().lower()
            ticker_calls[ticker] = sentiment

    correct, total, breakdown = fact_check(ticker_calls)
    reliability = round((correct / total) * 100) if total else 0

    if request.method == "OPTIONS":
        return '', 204

    if not ticker_calls:
        print("⚠️ No valid ticker calls found in tweets.")
        return jsonify(
        success=True,
        reliability=0,
        tweetCount=len(tweets),
        username=twitter_username,
        breakdown={},
        message="No ticker calls found."
    )


    # 🛡️ Initialize Firebase
    if not firebase_admin._apps:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)

    db = firestore.client()

    try:
        user_doc = db.collection("users").document(user_uid).get()
        if not user_doc.exists:
            print("❌ No user document found for UID:", user_uid)
            return jsonify(error="User not found"), 404

        user_data = user_doc.to_dict()
        if not user_data or "username" not in user_data:
            print("❌ No 'username' field found in user document")
            return jsonify(error="Username not found"), 400
        app_username = user_data.get("username")

        print("✅ Found app username:", app_username)
    except Exception as e:
        print("❌ Firestore user lookup failed:", e)
        return jsonify(error="User lookup failed"), 500

    for k in breakdown:
        if isinstance(breakdown[k], np.bool_):
            breakdown[k] = bool(breakdown[k])

    try:
        # Save under collection named by user email, document by Twitter username
        db.collection(f"{app_username}snipe").document(f"@{twitter_username}").set({
            "username": twitter_username,
            "twitterLink": f"https://x.com/{twitter_username}",
            "tickers": ", ".join(ticker_calls.keys()),
            "reliabilityScore": reliability,
            "breakdown": breakdown
        })
        print("✅ Firestore write successful")
    except Exception as e:
        print("❌ Firestore write failed:", e)

    return jsonify(
        success=True,
        reliability=reliability,
        tweetCount=len(tweets),
        breakdown=breakdown
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5004)), debug=True)
