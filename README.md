# Snipr 🔍📈

[https://tweetsniper.vercel.app](tweetsniper.vercel.app)

Snipr is a stock call tracker for Twitter traders. Given a Twitter profile URL, the app analyzes recent tweets to identify bullish or bearish calls on stocks. It then evaluates the accuracy of those calls based on current performance of those stocks and assigns a **reliability score** to each creator.

## 🧠 What It Does

- Takes a Twitter profile link as input
- Analyzes tweet history for bullish/bearish calls using OpenAI
- Cross-checks those calls against real stock market data
- Assigns a **reliability score** based on call accuracy
- Displays a leaderboard of top stock trading influencers

## 🛠️ Tech Stack

**Frontend:**
- React
- TypeScript
- Tailwind CSS
- Shadcn UI
- Vite

**Backend:**
- Python (Flask)
- OpenAI API
- yFinance (Yahoo Finance)
- Tweepy / SNScrape (for tweet fetching)

**Database:**
- Firebase Firestore

**Hosting & Build Tools:**
- Vercel (Frontend)
- Render (for Python)
- GitHub (CI/CD)

## 📚 What I Learned

- Parsing unstructured tweet data using NLP
- Using OpenAI to extract and classify financial sentiment
- Building a full-stack app with TypeScript + Python
- Managing async workflows between frontend, Python scripts, and Firestore
- Designing with Tailwind + Shadcn for clean UI
- Fetching live stock data using yFinance
- Deploying both frontend and backend in a production-ready setup

## ⚙️ How It Works (Flow)

1. **User inputs Twitter URL** on the frontend dashboard
2. Username is extracted and passed to Flask API
3. API fetches recent tweets using Tweepy/SNScrape
4. Each tweet is passed to OpenAI to identify and label stock calls (bullish/bearish/neutral)
5. API compares tweet date and prediction against historical stock data (via yFinance)
6. A reliability score is calculated and saved to Firestore
7. Frontend retrieves and displays top performers on a leaderboard

## 🐞 Bugs

If you encounter any bugs, have suggestions for improvements, or want to share some fun features, please reach out!
---

Thanks for reading!
Made by Ammar Faruqui
