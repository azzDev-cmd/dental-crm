import json
import logging
import secrets

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import Patient
from .telegram import TelegramError, send_telegram_message


logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def telegram_webhook(request):
    expected_secret = settings.TELEGRAM_WEBHOOK_SECRET
    supplied_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not expected_secret:
        return HttpResponse(status=503)
    if not secrets.compare_digest(expected_secret, supplied_secret):
        return HttpResponse(status=403)

    try:
        update = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    if not isinstance(update, dict):
        return JsonResponse({"error": "Invalid Telegram update."}, status=400)

    message = update.get("message", {})
    if not isinstance(message, dict):
        return JsonResponse({"error": "Invalid Telegram message."}, status=400)
    chat = message.get("chat", {})
    telegram_user = message.get("from", {})
    text = message.get("text", "")
    if not isinstance(chat, dict) or not isinstance(telegram_user, dict) or not isinstance(text, str):
        return JsonResponse({"error": "Invalid Telegram message."}, status=400)
    chat_id = chat.get("id")
    if chat.get("type") != "private" or chat_id is None or telegram_user.get("id") != chat_id:
        return JsonResponse({"ok": True})

    command, _, payload = text.partition(" ")
    if command.split("@", 1)[0] != "/start" or not payload:
        return JsonResponse({"ok": True})

    now = timezone.now()
    patient = None
    try:
        with transaction.atomic():
            patient = Patient.objects.select_for_update().filter(
                telegram_link_token=payload.strip(),
                telegram_link_expires_at__gt=now,
            ).first()
            if patient is None:
                reply = "Ushbu bog'lash havolasi yaroqsiz yoki muddati o'tgan."
            elif patient.telegram_chat_id not in (None, chat_id):
                reply = "Ushbu havola boshqa Telegram hisobiga bog'langan."
                patient = None
            else:
                patient.telegram_chat_id = chat_id
                patient.telegram_username = telegram_user.get("username") or patient.telegram_username
                patient.save(update_fields=["telegram_chat_id", "telegram_username"])
                reply = "Telegram hisobingiz bemor kartasiga ulandi. Eslatmalar shu bot orqali yuboriladi."
    except IntegrityError:
        patient = None
        reply = "Ushbu Telegram hisobi boshqa bemor kartasiga bog'langan."

    try:
        send_telegram_message(chat_id, reply)
    except TelegramError:
        logger.exception("Could not send Telegram deep-link response.")
        return JsonResponse({"error": "Telegram response could not be sent."}, status=502)

    return JsonResponse({"ok": True, "linked": patient is not None})
