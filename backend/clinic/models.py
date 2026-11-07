from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class Patient(models.Model):
    """
    Bemor modeli: Klinika bemorlari haqidagi umumiy va tibbiy ma'lumotlar.
    """
    first_name = models.CharField(max_length=100, verbose_name="Ism")
    last_name = models.CharField(max_length=100, verbose_name="Familiya")
    phone = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name="Telefon raqami",
        help_text="Masalan: +998901234567"
    )
    telegram_username = models.CharField(max_length=64, blank=True, null=True, verbose_name="Telegram username")
    telegram_chat_id = models.BigIntegerField(
        blank=True,
        null=True,
        unique=True,
        editable=False,
        verbose_name="Telegram chat ID"
    )
    telegram_link_token = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        editable=False,
        verbose_name="Telegram bog'lash tokeni"
    )
    telegram_link_expires_at = models.DateTimeField(
        blank=True,
        null=True,
        editable=False,
        verbose_name="Telegram bog'lash muddati"
    )
    birth_date = models.DateField(null=True, blank=True, verbose_name="Tug‘ilgan sana")
    medical_notes = models.TextField(
        blank=True,
        verbose_name="Tibbiy tarix / Eslatmalar",
        help_text="Allergiyalar, surunkali kasalliklar, dori ta'siri yoki shifokor maxsus eslatmalari"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Ro‘yxatga olingan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="O‘zgartirilgan vaqt")

    class Meta:
        verbose_name = "Bemor"
        verbose_name_plural = "Bemorlar"
        ordering = ['-created_at']

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    @property
    def total_cost(self):
        """Bemorga ko‘rsatilgan barcha muolajalar umumiy narxi"""
        from django.db.models import Sum
        total = Treatment.objects.filter(
            appointment__patient=self,
            status=Treatment.Status.COMPLETED
        ).aggregate(total=Sum('price'))['total']
        return total or 0

    @property
    def total_paid(self):
        """Bemor kiritgan balans to‘ldirishlar jami."""
        from django.db.models import Sum
        total = self.payments.filter(treatment__isnull=True).aggregate(total=Sum('amount_paid'))['total']
        return total or 0

    @property
    def balance_due(self):
        """Musbat qiymat kredit, manfiy qiymat xizmatlar uchun qarzdorlik."""
        from django.db.models import Sum
        service_charges = self.payments.filter(
            treatment__isnull=False
        ).aggregate(total=Sum('amount_paid'))['total'] or 0
        return self.total_paid - service_charges

    def __str__(self):
        return f"{self.full_name} ({self.phone})"


class Appointment(models.Model):
    """
    Qabul modeli: Shifokor va bemor o‘rtasidagi uchrashuv/qabul vaqti.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Kutilmoqda'
        CONFIRMED = 'CONFIRMED', 'Tasdiqlangan'
        COMPLETED = 'COMPLETED', 'Yakunlangan'
        CANCELLED = 'CANCELLED', 'Bekor qilingan'

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='appointments',
        verbose_name="Bemor"
    )
    appointment_time = models.DateTimeField(
        db_index=True,
        verbose_name="Qabul vaqti"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="Qabul holati"
    )
    complaint_or_note = models.TextField(
        blank=True,
        verbose_name="Shikoyat yoki qabul sababi",
        help_text="Masalan: Tish og‘rig‘i, rejaviy tekshiruv, breket almashtirish"
    )
    reminder_sent_at = models.DateTimeField(
        blank=True,
        null=True,
        editable=False,
        verbose_name="Eslatma yuborilgan vaqt"
    )
    reminder_sent_to_chat_id = models.BigIntegerField(
        blank=True,
        null=True,
        editable=False,
        verbose_name="Eslatma yuborilgan Telegram chat ID"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="O‘zgartirilgan vaqt")

    class Meta:
        verbose_name = "Qabul"
        verbose_name_plural = "Qabullar"
        ordering = ['appointment_time']

    @property
    def appointment_total(self):
        """Ushbu qabuldagi muolajalar summasi"""
        from django.db.models import Sum
        total = self.treatments.aggregate(total=Sum('price'))['total']
        return total or 0

    def __str__(self):
        return f"{self.patient.full_name} - {self.appointment_time.strftime('%d.%m.%Y %H:%M')} [{self.get_status_display()}]"


class Treatment(models.Model):
    """
    Bajarilgan ish / Muolaja modeli: Qabul davomida qilingan stomatologik amaliyotlar.
    """
    class Status(models.TextChoices):
        PLANNED = 'PLANNED', 'Rejalashtirilgan'
        COMPLETED = 'COMPLETED', 'Bajarilgan'
        CANCELLED = 'CANCELLED', 'Bekor qilingan'

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='treatments',
        verbose_name="Tegishli qabul"
    )
    tooth_number = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(11), MaxValueValidator(85)],
        verbose_name="Tish raqami (FDI)",
        help_text="Xalqaro FDI standarti (masalan: 11-48 katta yoshlilar, 51-85 sut tishlari)"
    )
    procedure_name = models.CharField(
        max_length=255,
        verbose_name="Muolaja nomi",
        help_text="Masalan: Tish plombalash (nurlar yordamida), Kanal davolash, Tish toshini tozalash"
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        verbose_name="Narxi (so‘m)"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
        db_index=True,
        verbose_name="Muolaja holati"
    )
    performed_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Bajarilgan vaqt"
    )

    class Meta:
        verbose_name = "Muolaja"
        verbose_name_plural = "Muolajalar"
        ordering = ['-performed_at']

    def __str__(self):
        tooth_str = f" (#{self.tooth_number}-tish)" if self.tooth_number else ""
        return f"{self.procedure_name}{tooth_str} - {self.price:,.0f} so'm"


class Payment(models.Model):
    """
    To‘lov modeli: Bemor tomonidan amalga oshirilgan to‘lovlar.
    """
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Naqd pul'
        CARD = 'CARD', 'Plastik karta (Uzcard/Humo)'
        TRANSFER = 'TRANSFER', 'Bank o‘tkazmasi (Payme/Click)'

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name="Bemor"
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name="Tegishli qabul (ixtiyoriy)"
    )
    treatment = models.OneToOneField(
        Treatment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name="Tegishli muolaja (ixtiyoriy)"
    )
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name="To‘langan summa (so‘m)"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        verbose_name="To‘lov usuli"
    )
    payment_date = models.DateTimeField(
        default=timezone.now,
        verbose_name="To‘lov vaqti"
    )
    note = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Izoh"
    )

    class Meta:
        verbose_name = "To‘lov"
        verbose_name_plural = "To‘lovlar"
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.patient.full_name} - {self.amount_paid:,.0f} so'm ({self.get_payment_method_display()})"
