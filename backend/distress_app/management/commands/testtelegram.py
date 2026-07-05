"""
Django management command to test Telegram bot configuration.
Usage: python manage.py testtelegram
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from utils.telegram_client import TelegramClient


class Command(BaseCommand):
    help = 'Test Telegram bot configuration by sending a test message'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('TELEGRAM TEST'))
        self.stdout.write(self.style.SUCCESS('='*60))
        
        # Load TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from settings
        bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
        chat_id = getattr(settings, "TELEGRAM_CHAT_ID", None)
        
        if not bot_token:
            self.stdout.write(self.style.ERROR('\nTELEGRAM_BOT_TOKEN is not configured in settings.'))
            return
        
        if not chat_id:
            self.stdout.write(self.style.ERROR('\nTELEGRAM_CHAT_ID is not configured in settings.'))
            return
        
        self.stdout.write(f'\nBot Token: {bot_token[:4]}...{bot_token[-4:]}')
        self.stdout.write(f'Chat ID: {chat_id}')
        
        # Send test message using TelegramClient
        message = "✅ Voice Distress Guardian Telegram Test Successful"
        
        self.stdout.write('\nSending test message...')
        client = TelegramClient()
        result = client.send_message_with_details(chat_id, message)
        
        # Print complete Telegram response
        self.stdout.write('\nTelegram Response:')
        self.stdout.write(f'  Result: {result}')
        
        if result.get("success"):
            self.stdout.write(self.style.SUCCESS('\n✅ Test message sent successfully!'))
        else:
            error = result.get("error", "Unknown error")
            if "Bad Request: chat not found" in error:
                self.stdout.write(self.style.ERROR('\nThe bot cannot access this chat.'))
                self.stdout.write(self.style.ERROR('Verify that:'))
                self.stdout.write(self.style.ERROR('1. The bot has been started using /start.'))
                self.stdout.write(self.style.ERROR('2. The chat ID belongs to the same account.'))
                self.stdout.write(self.style.ERROR('3. The chat ID is not outdated.'))
            else:
                self.stdout.write(self.style.ERROR(f'\n❌ Telegram error: {error}'))
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('TEST COMPLETE'))
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))