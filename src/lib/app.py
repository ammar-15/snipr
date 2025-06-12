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
CORS(app, origins=["https://tweetsniper.vercel.app"], supports_credentials=True, methods=["GET", "POST", "OPTIONS"])

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

def ratelimit_handler(e):
    return jsonify(success=False, error="Too many requests, slow down."), 429

# Scrape tweets using logged-in Selenium session
def get_tweets(twitter_username, limit=100):
    from selenium.webdriver.common.keys import Keys

    options = Options()
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920x1080")

    driver = webdriver.Chrome(options=options)
    print("✅ Chrome window launched")

    driver.get("https://x.com/login")
    time.sleep(3)

    email = os.getenv("STATS_EMAIL")
    password = os.getenv("STATS_PASSWORD")

    try:
        email_input = driver.find_element(By.NAME, "text")
        email_input.send_keys(email)
        email_input.send_keys(Keys.RETURN)
        time.sleep(2)

        password_input = driver.find_element(By.NAME, "password")
        password_input.send_keys(password)
        password_input.send_keys(Keys.RETURN)
        time.sleep(5)

        print("🔓 Logged in automatically")
    except Exception as e:
        print("❌ Login failed:", e)
        driver.quit()
        return []

    driver.get(f"https://x.com/{twitter_username}")
    time.sleep(5)
    print(f"➡️ Navigating to: https://x.com/{twitter_username}")

    tweets = set()
    scroll_attempts = 40
    current_attempt = 0
    last_height = driver.execute_script("return document.body.scrollHeight")

    while len(tweets) < limit and current_attempt < scroll_attempts:
        print(f"🔄 Scroll attempt {current_attempt + 1}")

        elements = driver.find_elements(By.XPATH, '//article//div[@lang]')
        for i in range(len(elements)):
            try:
                tweets.add(elements[i].text)
            except Exception:
                continue

        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3.5)

        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            print("⚠️ No new tweets loaded, stopping scroll")
            break
        last_height = new_height
        current_attempt += 1

    driver.quit()
    print(f"✅ Fetched {len(tweets)} tweets")
    return list(tweets)[:limit]

# Use OpenAI to analyze tweet sentiments

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_tweets(tweets):
    prompt = f"""
    Analyze the following 3 weeks oftweets for stock-related calls. 
    For each ticker mentioned, label it as 'bullish' or 'bearish', whatever the user mentioned.
    Format the response as one per line like this: 
    AAPL: bullish
    TSLA: bearish

    Tweets:
    {tweets}
    """
    print(prompt)
    response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a financial analysis assistant."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.3,
    max_tokens=500
)
    return response.choices[0].message.content.strip()

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

from flask_cors import cross_origin
@app.route("/analyze", methods=["POST", "OPTIONS"])
@limiter.limit("10 per minute") 
@cross_origin()
def analyze():
    # 🔒 Authenticate user using Firebase ID token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify(error="Missing or invalid Authorization header"), 401

    id_token = auth_header.split("Bearer ")[1]
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        user_uid = decoded_token.get("uid", "")
        user_email = decoded_token.get("email", "")
        print("✅ Authenticated Firebase user:", user_email)
    except Exception as e:
        print("❌ Firebase token verification failed:", e)
        return jsonify(error="Invalid token"), 401

    # 📩 Get Twitter URL from request body
    twitter_url = request.json.get("twitterUrl")
    if not twitter_url:
        return jsonify(error="Missing 'twitterUrl' in request"), 400

    twitter_username = twitter_url.rstrip("/").split("/")[-1]

    # 🐦 Get tweets & analyze
    tweets = get_tweets(twitter_username, limit=30)
    analysis = analyze_tweets(tweets)

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
        return jsonify(success=True, reliability=0, tweetCount=len(tweets), message="No ticker calls found.")

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

        app_username = user_doc.to_dict().get("username")
        if not app_username:
            print("❌ No 'username' field found in user document")
            return jsonify(error="Username not found"), 400

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
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)), debug=True)
