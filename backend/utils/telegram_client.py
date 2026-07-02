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

        # Build request details
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": target_chat,
            "text": text,
            "parse_mode": parse_mode
        }

        # Diagnostic: log masked token and target chat for debugging without leaking full token
        try:
            masked_token = self.bot_token[:4] + '...' + self.bot_token[-4:]
        except Exception:
            masked_token = 'REDACTED'

        logger.info(f"Telegram request prepared. target_chat={target_chat} token={masked_token}")

        for attempt in range(1, retries + 1):
            try:
                logger.info(f"Sending Telegram alert to {target_chat} (Attempt {attempt}/{retries})...")
                response = httpx.post(url, json=payload, timeout=10.0)
                
                # Detailed response logging for diagnostics
                status = getattr(response, 'status_code', None)
                text_resp = getattr(response, 'text', '')

                if status == 200:
                    logger.info(f"Telegram alert successfully sent to {target_chat}")
                    return True

                # Rate limit handling
                if status == 429:
                    try:
                        retry_after = response.json().get("parameters", {}).get("retry_after", backoff)
                    except Exception:
                        retry_after = backoff
                    logger.warning(f"Telegram rate limited. Waiting for {retry_after}s... status={status} text={text_resp}")
                    time.sleep(retry_after)
                    continue

                # Log full response for debugging (safe: token masked above)
                logger.error(f"Telegram returned error status={status} text={text_resp}")
            except httpx.RequestError as exc:
                logger.error(f"Network error sending Telegram message (attempt {attempt}/{retries}): {exc}")
            
            if attempt < retries:
                sleep_time = backoff * (2 ** (attempt - 1))
                time.sleep(sleep_time)

        logger.critical(f"Failed to send Telegram alert to {target_chat} after {retries} attempts.")
        return False
