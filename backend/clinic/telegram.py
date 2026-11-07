import hashlib
import hmac
import json
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode
from urllib.request import Request, urlopen

from django.conf import settings


class TelegramError(Exception):
    """Raised when Telegram rejects or cannot process a Bot API request."""


def telegram_api_request(method, data):
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise TelegramError("Telegram bot is not configured.")

    request = Request(
        f"https://api.telegram.org/bot{token}/{method}",
        data=urlencode(data).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            result = json.loads(response.read())
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise TelegramError("Telegram Bot API request failed.") from error

    if not result.get("ok"):
        raise TelegramError("Telegram Bot API rejected the request.")
    return result.get("result")


def send_telegram_message(chat_id, text):
    return telegram_api_request("sendMessage", {"chat_id": chat_id, "text": text})


def validate_web_app_init_data(init_data):
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise TelegramError("Telegram bot is not configured.")
    if not init_data:
        return None

    try:
        values = parse_qsl(init_data, keep_blank_values=True, strict_parsing=True)
        data = dict(values)
        received_hash = data.pop("hash")
        if len(data) != len(values) - 1:
            return None
        auth_date = int(data["auth_date"])
        user = json.loads(data["user"])
        user_id = int(user["id"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(data.items())
    )
    secret_key = hmac.new(
        b"WebAppData",
        token.encode(),
        hashlib.sha256,
    ).digest()
    expected_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(received_hash, expected_hash):
        return None

    now = int(time.time())
    if auth_date > now + 60 or now - auth_date > 86400:
        return None
    return user_id
