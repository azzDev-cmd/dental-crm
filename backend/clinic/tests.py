import hashlib
import hmac
import json
import time
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from urllib.parse import urlencode

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Appointment, Patient, Payment, Treatment
from .telegram import TelegramError


class AppointmentEditCancelTests(APITestCase):
    def setUp(self):
        self.patient = Patient.objects.create(
            first_name='Test',
            last_name='Patient',
            phone='+998900000001'
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            appointment_time=timezone.now() + timedelta(days=1),
            complaint_or_note='Initial note'
        )
        self.treatment = Treatment.objects.create(
            appointment=self.appointment,
            procedure_name='Cleaning',
            price=Decimal('100000'),
            status=Treatment.Status.PLANNED
        )
        self.appointment_url = reverse(
            'appointment-detail',
            kwargs={'pk': self.appointment.pk}
        )

    def test_patch_updates_appointment_and_its_treatment(self):
        new_time = timezone.now() + timedelta(days=2)
        response = self.client.patch(
            self.appointment_url,
            {
                'appointment_time': new_time.isoformat(),
                'complaint_or_note': 'Updated note',
                'treatment_id': self.treatment.pk,
                'procedure_name': 'Filling',
                'price': '150000.00'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.treatment.refresh_from_db()
        self.assertEqual(self.appointment.complaint_or_note, 'Updated note')
        self.assertEqual(self.treatment.procedure_name, 'Filling')
        self.assertEqual(self.treatment.price, Decimal('150000.00'))

    def test_cancel_marks_appointment_and_planned_treatment_cancelled(self):
        response = self.client.post(
            reverse('appointment-cancel', kwargs={'pk': self.appointment.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.treatment.refresh_from_db()
        self.assertEqual(self.appointment.status, Appointment.Status.CANCELLED)
        self.assertEqual(self.treatment.status, Treatment.Status.CANCELLED)

    def test_paid_treatment_cannot_be_edited_and_update_rolls_back(self):
        Payment.objects.create(
            patient=self.patient,
            appointment=self.appointment,
            treatment=self.treatment,
            amount_paid=Decimal('100000.00')
        )
        response = self.client.patch(
            self.appointment_url,
            {
                'complaint_or_note': 'Should roll back',
                'treatment_id': self.treatment.pk,
                'procedure_name': 'Changed service',
                'price': '200000.00'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.appointment.refresh_from_db()
        self.treatment.refresh_from_db()
        self.assertEqual(self.appointment.complaint_or_note, 'Initial note')
        self.assertEqual(self.treatment.procedure_name, 'Cleaning')
        self.assertEqual(self.treatment.price, Decimal('100000.00'))


@override_settings(
    TELEGRAM_BOT_TOKEN='123456:unit-test-token',
    TELEGRAM_ADMIN_IDS=frozenset({42}),
    TELEGRAM_WEBHOOK_SECRET='test-webhook-secret',
)
class TelegramReminderTests(APITestCase):
    def setUp(self):
        self.patient = Patient.objects.create(
            first_name='Reminder',
            last_name='Patient',
            phone='+998900000042',
            telegram_chat_id=1234,
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            appointment_time=timezone.now() + timedelta(days=1),
        )
        self.reminder_url = reverse(
            'appointment-send-reminder',
            kwargs={'pk': self.appointment.pk}
        )

    def make_init_data(self, user_id=42):
        data = {
            'auth_date': str(int(time.time())),
            'user': json.dumps({'id': user_id}),
        }
        data_check_string = '\n'.join(
            f'{key}={value}' for key, value in sorted(data.items())
        )
        secret_key = hmac.new(
            b'WebAppData',
            b'123456:unit-test-token',
            hashlib.sha256,
        ).digest()
        data['hash'] = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256,
        ).hexdigest()
        return urlencode(data)

    @patch('clinic.views.send_telegram_message')
    def test_reminder_requires_verified_mini_app_data(self, send_message):
        response = self.client.post(self.reminder_url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        send_message.assert_not_called()

    @patch('clinic.views.send_telegram_message')
    def test_reminder_rejects_non_allowlisted_mini_app_user(self, send_message):
        response = self.client.post(
            self.reminder_url,
            {},
            format='json',
            HTTP_X_TELEGRAM_INIT_DATA=self.make_init_data(user_id=99),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        send_message.assert_not_called()

    @patch('clinic.views.send_telegram_message', side_effect=TelegramError)
    def test_failed_telegram_send_does_not_mark_reminder_sent(self, send_message):
        response = self.client.post(
            self.reminder_url,
            {},
            format='json',
            HTTP_X_TELEGRAM_INIT_DATA=self.make_init_data(),
        )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.appointment.refresh_from_db()
        self.assertIsNone(self.appointment.reminder_sent_at)
        send_message.assert_called_once()

    @patch('clinic.views.send_telegram_message')
    def test_reminder_sends_once_and_records_status(self, send_message):
        init_data = self.make_init_data()
        response = self.client.post(
            self.reminder_url,
            {},
            format='json',
            HTTP_X_TELEGRAM_INIT_DATA=init_data,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['reminder_sent_at'])
        send_message.assert_called_once()
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.reminder_sent_to_chat_id, 1234)

        repeated_response = self.client.post(
            self.reminder_url,
            {},
            format='json',
            HTTP_X_TELEGRAM_INIT_DATA=init_data,
        )
        self.assertEqual(repeated_response.status_code, status.HTTP_409_CONFLICT)
        send_message.assert_called_once()

    @patch('clinic.telegram_views.send_telegram_message')
    def test_webhook_links_patient_using_unexpired_start_token(self, send_message):
        self.patient.telegram_chat_id = None
        self.patient.telegram_link_token = 'one-time-patient-token'
        self.patient.telegram_link_expires_at = timezone.now() + timedelta(minutes=30)
        self.patient.save(update_fields=[
            'telegram_chat_id',
            'telegram_link_token',
            'telegram_link_expires_at',
        ])

        response = self.client.post(
            reverse('telegram-webhook'),
            data=json.dumps({
                'message': {
                    'text': '/start one-time-patient-token',
                    'chat': {'id': 5678, 'type': 'private'},
                    'from': {'id': 5678, 'username': 'reminder_patient'},
                }
            }),
            content_type='application/json',
            HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN='test-webhook-secret',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['linked'])
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.telegram_chat_id, 5678)
        self.assertEqual(self.patient.telegram_username, 'reminder_patient')
        send_message.assert_called_once()
