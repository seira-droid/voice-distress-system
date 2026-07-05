import logging
from datetime import datetime
from django.conf import settings
from utils.telegram_client import TelegramClient

logger = logging.getLogger(__name__)


def send_telegram_alert(contact, event_data):
    """
    Send a Telegram alert to an emergency contact.
    Uses TelegramClient for unified Telegram message sending.
    """
    # Debug logging: ALERT WORKFLOW START
    print("ALERT WORKFLOW START")
    
    fallback_chat_id = getattr(settings, "TELEGRAM_CHAT_ID", None)
    
    # Task 3: Debug logging before sending
    contact_chat_id = contact.telegram_chat_id
    final_chat_id = contact_chat_id or fallback_chat_id
    
    print(f"Contact Name: {contact.name}")
    print(f"Contact Chat ID: {contact_chat_id}")
    print(f"Fallback Chat ID: {fallback_chat_id}")
    print(f"Final Chat ID Used: {final_chat_id}")
    
    if not final_chat_id:
        print("No chat ID available, alert skipped")
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

    print(f"Message text: {message[:100]}...")
    
    # Use TelegramClient for unified sending
    client = TelegramClient()
    print("TelegramClient method called: send_message")
    
    result = client.send_message_with_details(final_chat_id, message)
    
    print(f"Telegram response: {result}")
    
    # Update AlertLog
    if "alert_log" in event_data:
        alert_log = event_data["alert_log"]
        if result.get("success"):
            alert_log.delivered = True
            alert_log.delivery_error = ""
        else:
            alert_log.delivered = False
            alert_log.delivery_error = result.get("error", "Unknown error")
        alert_log.save()
        print("AlertLog updated")
    
    return result.get("success", False)


def send_alerts_to_contacts(contacts, event_data):
    count = 0
    for contact in contacts:
        if send_telegram_alert(contact, event_data):
            count += 1
    return count