import os
import smtplib
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

# Configure logging
logging.basicConfig(level=logging.ERROR)

# Load environment variables
SUPPORT_NOTIFY_EMAIL_TO = os.getenv("SUPPORT_NOTIFY_EMAIL_TO")
SUPPORT_NOTIFY_EMAIL_FROM = os.getenv("SUPPORT_NOTIFY_EMAIL_FROM")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = os.getenv("SMTP_PORT")
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")


def send_feature_request_email(
    username: str,
    route: str,
    user_message: str,
    title: str | None,
    description: str | None,
    timestamp: str,
    conversation_id: str,
):
    to_email = os.getenv("SUPPORT_NOTIFY_EMAIL_TO")
    from_email = os.getenv("SUPPORT_NOTIFY_EMAIL_FROM")

    # ✅ Don't crash the server if not configured (especially in dev)
    if not to_email or not from_email:
        print("⚠️ Email notifier not configured (missing SUPPORT_NOTIFY_EMAIL_TO/FROM). Skipping email.")
        return

    # SMTP config (optional)
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not smtp_host or not smtp_user or not smtp_pass:
        print("⚠️ SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS). Skipping email.")
        return

    subject = f"Snipr Feature Request: {title or 'New request'}"

    body = f"""
A user asked for a feature that may not exist.

Username: {username}
Route: {route}
Message: {user_message}
Timestamp: {timestamp}
Conversation ID: {conversation_id}

Title: {title or ''}
Description: {description or ''}
""".strip()

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print("✅ Feature request email sent.")
    except Exception as e:
        print("❌ Failed to send feature request email:", repr(e))