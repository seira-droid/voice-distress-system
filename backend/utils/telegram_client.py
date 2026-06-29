import logging
import httpx
import time
from django.conf import settings

logger = logging.getLogger(__name__)

class TelegramClient:
    """
    Client for interacting with the Telegram Bot API to send emergency alerts.
    Includes retry logic and graceful exception handling.
    """

    def __init__(self):
        self.bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
        self.fallback_chat_id = getattr(settings, "TELEGRAM_CHAT_ID", None)

        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN is not set in Django settings. Alerts will be simulated.")

    def send_message(self, chat_id: str, text: str, parse_mode: str = "Markdown", retries: int = 3, backoff: float = 1.0) -> bool:
        """
        Sends a text message to a specific Telegram chat ID.
        Retries up to `retries` times on failure using exponential backoff.
        """
        target_chat = chat_id or self.fallback_chat_id
        if not target_chat:
            logger.error("No chat ID provided and no fallback TELEGRAM_CHAT_ID configured. Alert skipped.")
            return False

        if not self.bot_token:
            logger.info(f"[SIMULATED TELEGRAM ALERT] To: {target_chat}\nMessage:\n{text}")
            return True

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": target_chat,
            "text": text,
            "parse_mode": parse_mode
        }

        for attempt in range(1, retries + 1):
            try:
                logger.info(f"Sending Telegram alert to {target_chat} (Attempt {attempt}/{retries})...")
                response = httpx.post(url, json=payload, timeout=10.0)
                
                if response.status_code == 200:
                    logger.info(f"Telegram alert successfully sent to {target_chat}")
                    return True
                
                # Check for rate limiting (HTTP 429)
                if response.status_code == 429:
                    retry_after = response.json().get("parameters", {}).get("retry_after", backoff)
                    logger.warning(f"Telegram rate limited. Waiting for {retry_after}s...")
                    time.sleep(retry_after)
                    continue

                logger.error(f"Telegram returned error {response.status_code}: {response.text}")
            except httpx.RequestError as exc:
                logger.error(f"Network error sending Telegram message (attempt {attempt}/{retries}): {exc}")
            
            if attempt < retries:
                sleep_time = backoff * (2 ** (attempt - 1))
                time.sleep(sleep_time)

        logger.critical(f"Failed to send Telegram alert to {target_chat} after {retries} attempts.")
        return False
