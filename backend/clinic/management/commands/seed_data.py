from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from clinic.models import Patient, Appointment, Treatment, Payment
from datetime import timedelta
from decimal import Decimal


class Command(BaseCommand):
    help = "Stomatologiya CRM uchun dastlabki test ma'lumotlarini (demo data) yaratish"

    def handle(self, *args, **options):
        self.stdout.write("Boshlang‘ich ma'lumotlar yaratilmoqda...")

        # 1. Superuser yaratish (admin / admin123)
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@dentalcrm.uz', 'admin123')
            self.stdout.write(self.style.SUCCESS("✓ Admin foydalanuvchi yaratildi: login='admin', parol='admin123'"))

        # 2. Bemorlar
        p1, _ = Patient.objects.get_or_create(
            phone="+998901234567",
            defaults={
                'first_name': 'Jasur',
                'last_name': 'Aliyev',
                'birth_date': '1995-04-12',
                'medical_notes': 'Penitsillinga allergiyasi bor. Qon bosimi normada.'
            }
        )

        p2, _ = Patient.objects.get_or_create(
            phone="+998912345678",
            defaults={
                'first_name': 'Malika',
                'last_name': 'Karimova',
                'birth_date': '2001-08-25',
                'medical_notes': 'Homiladorlik davri (2-trimestr). Anesteziyada ehtiyot bo‘lish kerak.'
            }
        )

        p3, _ = Patient.objects.get_or_create(
            phone="+998933334455",
            defaults={
                'first_name': 'Bobur',
                'last_name': 'Toshmatov',
                'birth_date': '1988-11-03',
                'medical_notes': 'Surunkali kasalliklar yo‘q. Profilaktik tozalash.'
            }
        )

        p4, _ = Patient.objects.get_or_create(
            phone="+998977778899",
            defaults={
                'first_name': 'Zuhra',
                'last_name': 'Usmonova',
                'birth_date': '1998-02-14',
                'medical_notes': 'Breket davolash kursi davom etmoqda.'
            }
        )

        now = timezone.now()
        today = now.date()

        # 3. Qabullar (Bugun va kelgusi kunlar)
        # Bugungi qabul 1 (10:00)
        app1_time = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=10)
        app1, _ = Appointment.objects.get_or_create(
            patient=p1,
            appointment_time=app1_time,
            defaults={
                'status': Appointment.Status.COMPLETED,
                'complaint_or_note': 'Pastki o‘ng jag‘da qattiq og‘riq (sovuq va issiqqa ta‘sirchanlik)'
            }
        )

        # Bugungi qabul 2 (14:30)
        app2_time = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=14, minutes=30)
        app2, _ = Appointment.objects.get_or_create(
            patient=p2,
            appointment_time=app2_time,
            defaults={
                'status': Appointment.Status.CONFIRMED,
                'complaint_or_note': 'Yuqori tishlarni profilaktik ko‘rik va tish toshlarini tozalash'
            }
        )

        # Bugungi qabul 3 (16:00)
        app3_time = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=16)
        app3, _ = Appointment.objects.get_or_create(
            patient=p3,
            appointment_time=app3_time,
            defaults={
                'status': Appointment.Status.PENDING,
                'complaint_or_note': 'Katta oziq tishiga fotopolimer plomba qo‘yish'
            }
        )

        # Ertangi qabul (11:00)
        app4_time = timezone.make_aware(timezone.datetime.combine(today + timedelta(days=1), timezone.datetime.min.time())) + timedelta(hours=11)
        app4, _ = Appointment.objects.get_or_create(
            patient=p4,
            appointment_time=app4_time,
            defaults={
                'status': Appointment.Status.CONFIRMED,
                'complaint_or_note': 'Breket ligaturalarini almashtirish va tortish'
            }
        )

        # 4. Muolajalar (Treatments)
        if not app1.treatments.exists():
            Treatment.objects.create(
                appointment=app1,
                tooth_number=46,
                procedure_name="Kanalni tozalash va dori qo‘yish (Endodontiya)",
                price=Decimal('350000.00'),
                performed_at=app1_time
            )
            Treatment.objects.create(
                appointment=app1,
                tooth_number=46,
                procedure_name="Nur bilan qotuvchi fotopolimer plomba",
                price=Decimal('250000.00'),
                performed_at=app1_time + timedelta(minutes=40)
            )

        if not app2.treatments.exists():
            Treatment.objects.create(
                appointment=app2,
                tooth_number=None,
                procedure_name="Ultratovushli tish toshlarini tozalash (Air Flow)",
                price=Decimal('400000.00'),
                performed_at=app2_time
            )

        # 5. To‘lovlar (Payments)
        if not app1.payments.exists():
            Payment.objects.create(
                patient=p1,
                appointment=app1,
                amount_paid=Decimal('500000.00'),
                payment_method=Payment.PaymentMethod.CARD,
                payment_date=app1_time + timedelta(hours=1),
                note="Plastik karta orqali to‘landi (100,000 so‘m qoldiq qarz)"
            )

        if not app2.payments.exists():
            Payment.objects.create(
                patient=p2,
                appointment=app2,
                amount_paid=Decimal('400000.00'),
                payment_method=Payment.PaymentMethod.CASH,
                payment_date=app2_time + timedelta(minutes=30),
                note="To‘liq naqd to‘landi"
            )

        self.stdout.write(self.style.SUCCESS("✓ Demo ma'lumotlar muvaffaqiyatli yuklandi!"))
