import logging
import requests
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

        logger.info(f"TelegramClient initialized. bot_token: {'SET' if self.bot_token else 'NOT SET'}, fallback_chat_id: '{self.fallback_chat_id}'")

        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN is not set in Django settings. Alerts will be simulated.")

    def send_message(self, chat_id: str, text: str, parse_mode: str = "Markdown", retries: int = 3, backoff: float = 1.0) -> bool:
        """
        Sends a text message to a specific Telegram chat ID.
        Retries up to `retries` times on failure using exponential backoff.
        Returns True only if Telegram API returns HTTP 200 with {"ok": true}.
        """
        result = self.send_message_with_details(chat_id, text, parse_mode, retries, backoff)
        return result.get("success", False)

    def send_message_with_details(self, chat_id: str, text: str, parse_mode: str = "Markdown", retries: int = 3, backoff: float = 1.0) -> dict:
        """
        Sends a text message to a specific Telegram chat ID.
        Retries up to `retries` times on failure using exponential backoff.
        Returns a dict with 'success' (bool) and 'error' (str) fields.
        """
        target_chat = chat_id or self.fallback_chat_id
        if not target_chat:
            logger.error("No chat ID provided and no fallback TELEGRAM_CHAT_ID configured. Alert skipped.")
            return {"success": False, "error": "No chat ID provided and no fallback TELEGRAM_CHAT_ID configured."}

        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN is not set. Alert cannot be sent.")
            return {"success": False, "error": "TELEGRAM_BOT_TOKEN is not configured."}

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
        logger.info(f"Request URL: {url}")
        logger.info(f"Payload: chat_id={target_chat}, text_length={len(text)}, parse_mode={parse_mode}")

        for attempt in range(1, retries + 1):
            try:
                logger.info(f"Sending Telegram alert to {target_chat} (Attempt {attempt}/{retries})...")
                response = requests.post(url, json=payload, timeout=10.0)
                
                # Detailed response logging for diagnostics
                status = getattr(response, 'status_code', None)
                text_resp = getattr(response, 'text', '')
                
                # Log the full response for debugging
                logger.info(f"Telegram HTTP status: {status}")
                logger.info(f"Telegram response body: {text_resp}")

                # Check for actual Telegram success: HTTP 200 AND {"ok": true}
                if status == 200:
                    try:
                        json_resp = response.json()
                        if json_resp.get("ok") is True:
                            logger.info(f"Telegram alert successfully sent to {target_chat}")
                            return {"success": True, "error": None}
                        else:
                            # Telegram returned an error in the JSON response
                            error_description = json_resp.get("description", "Unknown error")
                            logger.error(f"Telegram API error: {error_description}")
                            return {"success": False, "error": f"Telegram API error: {error_description}"}
                    except Exception as json_exc:
                        logger.error(f"Failed to parse Telegram response JSON: {json_exc}")
                        return {"success": False, "error": f"Failed to parse Telegram response: {json_exc}"}

                # Handle "Bad Request: chat not found" error
                if status == 400:
                    try:
                        json_resp = response.json()
                        error_description = json_resp.get("description", "")
                        if "Bad Request: chat not found" in error_description:
                            logger.error("The bot cannot access this chat.")
                            logger.error("Verify that:")
                            logger.error("1. The bot has been started using /start.")
                            logger.error("2. The chat ID belongs to the same account.")
                            logger.error("3. The chat ID is not outdated.")
                            return {"success": False, "error": "Bad Request: chat not found"}
                    except Exception:
                        pass

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
                return {"success": False, "error": f"HTTP {status}: {text_resp}"}
            except requests.RequestException as exc:
                logger.error(f"Network error sending Telegram message (attempt {attempt}/{retries}): {exc}")
                if attempt >= retries:
                    return {"success": False, "error": f"Network error: {exc}"}
            
            if attempt < retries:
                sleep_time = backoff * (2 ** (attempt - 1))
                time.sleep(sleep_time)

        logger.critical(f"Failed to send Telegram alert to {target_chat} after {retries} attempts.")
        return {"success": False, "error": f"Failed after {retries} attempts"}
