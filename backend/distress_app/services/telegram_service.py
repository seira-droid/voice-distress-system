import requests
from datetime import datetime
from django.conf import settings


def send_telegram_alert(contact, event_data):
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = contact.telegram_chat_id
    if not token or not chat_id:
        return False

    risk_score = event_data.get("risk_score", 0)
    risk_level = event_data.get("risk_level", "UNKNOWN")
    classification = event_data.get("classification", "Unknown")
    summary = event_data.get("summary", "No summary available.")
    transcript = event_data.get("transcript", "N/A")
    wake_word = event_data.get("wake_word", "N/A")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    level_emoji = {
        "CRITICAL": "🔴",
        "HIGH": "🟠",
        "MEDIUM": "🟡",
        "LOW": "🟢",
    }.get(risk_level, "⚪")

    message = (
        f"🚨 *VOICE DISTRESS ALERT*\n\n"
        f"*Risk Score:* {risk_score}/100\n"
        f"*Risk Level:* {level_emoji} {risk_level}\n"
        f"*Classification:* {classification}\n"
        f"*Wake Word:* `{wake_word}`\n\n"
        f"*Transcription:*\n_{transcript}_\n\n"
        f"*Analysis:*\n{summary}\n\n"
        f"*Time:* {timestamp}\n\n"
        f"⚠️ Please contact the user immediately."
    )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        response = requests.post(url, json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown",
        }, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"Telegram error: {e}")
        return False


def send_alerts_to_contacts(contacts, event_data):
    count = 0
    for contact in contacts:
        if send_telegram_alert(contact, event_data):
            count += 1
    return count