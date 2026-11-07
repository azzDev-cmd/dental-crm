import json

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from clinic.telegram import TelegramError, telegram_api_request


class Command(BaseCommand):
    help = "Configure the Telegram bot webhook for this deployment."

    def handle(self, *args, **options):
        if not settings.TELEGRAM_WEBHOOK_URL:
            raise CommandError("TELEGRAM_WEBHOOK_URL is not configured.")
        if not settings.TELEGRAM_WEBHOOK_SECRET:
            raise CommandError("TELEGRAM_WEBHOOK_SECRET is not configured.")

        try:
            telegram_api_request("setWebhook", {
                "url": settings.TELEGRAM_WEBHOOK_URL,
                "secret_token": settings.TELEGRAM_WEBHOOK_SECRET,
                "allowed_updates": json.dumps(["message"]),
            })
        except TelegramError as error:
            raise CommandError(str(error)) from error

        self.stdout.write(self.style.SUCCESS("Telegram webhook configured successfully."))
