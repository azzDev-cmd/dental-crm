# Telegram appointment reminders

Configure these values in `backend/.env`; never put the bot token in frontend code:

```dotenv
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_SECRET=long-random-webhook-secret
TELEGRAM_WEBHOOK_URL=https://your-domain.example/api/telegram/webhook/
TELEGRAM_ADMIN_IDS=123456789,987654321
```

`TELEGRAM_ADMIN_IDS` contains the numeric Telegram user IDs of staff allowed to send reminders. The app checks Telegram Mini App `initData` signatures and rejects users outside this allowlist.

After deploying the backend and applying migrations, register the webhook:

```sh
python manage.py migrate
python manage.py set_telegram_webhook
```

To connect a patient, select the patient in Django Admin and run **Telegram botga bir martalik bog'lash havolasi yaratish**. Send the generated link to the patient and have them open it and press **Start** in the bot within 30 minutes. The patient must start the bot before Telegram can deliver reminders. A Telegram username or phone number alone cannot be used to initiate a Bot API conversation.

The app's **Eslatma yuborish** action sends one reminder per appointment. Editing the appointment time clears the reminder status so the updated appointment can be reminded again.
