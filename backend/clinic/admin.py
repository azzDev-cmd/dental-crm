import secrets
from datetime import timedelta

from django.contrib import admin
from django.contrib import messages
from django.conf import settings
from django.utils.html import format_html
from django.utils.html import format_html_join
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.models import Group
from unfold.admin import ModelAdmin, TabularInline
from .models import Patient, Appointment, Treatment, Payment


admin.site.site_header = "Dental CRM Admin"
admin.site.site_title = "Dental CRM"
admin.site.index_title = "Klinika boshqaruv paneli"
if admin.site.is_registered(Group):
    admin.site.unregister(Group)


# -------------------------------------------------------------
# INLINE MODELLAR (Bemor va Qabul ichida ko'rinadigan qismlar)
# -------------------------------------------------------------

class AppointmentInline(TabularInline):
    """Bemor kartasi ichida uning barcha qabullari ro'yxati"""
    model = Appointment
    extra = 0
    fields = ('appointment_time', 'status', 'complaint_or_note', 'view_appointment_link')
    readonly_fields = ('view_appointment_link',)
    ordering = ('-appointment_time',)
    show_change_link = True

    def view_appointment_link(self, obj):
        if obj.id:
            url = reverse('admin:clinic_appointment_change', args=[obj.id])
            return format_html('<a href="{}" target="_blank" style="font-weight: bold; color: #2563eb;">Ochish ↗</a>', url)
        return "-"
    view_appointment_link.short_description = "Batafsil"


class TreatmentInline(TabularInline):
    """Qabul ichida bajarilgan barcha muolajalar va narxlari"""
    model = Treatment
    extra = 1
    fields = ('tooth_number', 'procedure_name', 'price', 'performed_at')
    ordering = ('performed_at',)


class PaymentInline(TabularInline):
    """Bemor yoki Qabul ichida amalga oshirilgan to‘lovlar"""
    model = Payment
    extra = 0
    fields = ('amount_paid', 'payment_method', 'payment_date', 'note')
    ordering = ('-payment_date',)


# -------------------------------------------------------------
# ASOSIY ADMIN MODELLAR
# -------------------------------------------------------------

@admin.register(Patient)
class PatientAdmin(ModelAdmin):
    list_display = ('full_name', 'phone', 'telegram_username', 'birth_date', 'display_balance', 'appointments_count', 'created_at_formatted')
    list_display_links = ('full_name',)
    search_fields = ('first_name', 'last_name', 'phone', 'telegram_username')
    readonly_fields = ('created_at', 'updated_at', 'display_total_cost', 'display_total_paid', 'display_balance')
    inlines = [AppointmentInline, PaymentInline]
    actions = ['generate_telegram_link']

    fieldsets = (
        ("Asosiy ma'lumotlar", {
            'fields': (('first_name', 'last_name'), ('phone', 'telegram_username'), 'birth_date')
        }),
        ("Tibbiy karta va anamnez", {
            'fields': ('medical_notes',),
            'classes': ('collapse',),
            'description': "Bemorning allergiyalari, surunkali kasalliklari yoki shifokorning muhim eslatmalari"
        }),
        ("Moliyaviy ko‘rsatkichlar", {
            'fields': (('display_total_cost', 'display_total_paid', 'display_balance'),),
            'description': "Muolajalar umumiy qiymati va to‘lovlar balansi"
        }),
        ("Tizim ma'lumotlari", {
            'fields': (('created_at', 'updated_at'),),
            'classes': ('collapse',)
        }),
    )

    def appointments_count(self, obj):
        count = obj.appointments.count()
        return f"{count} ta qabul"
    appointments_count.short_description = "Qabullar soni"

    def created_at_formatted(self, obj):
        return obj.created_at.strftime("%d.%m.%Y")
    created_at_formatted.short_description = "Ro‘yxat sanasi"

    def display_total_cost(self, obj):
        return f"{obj.total_cost:,.0f} so‘m"
    display_total_cost.short_description = "Jami xizmatlar summasi"

    def display_total_paid(self, obj):
        return f"{obj.total_paid:,.0f} so‘m"
    display_total_paid.short_description = "Jami to‘langan"

    def display_balance(self, obj):
        balance = obj.balance_due
        formatted_balance = f"{abs(balance):,.0f} so'm"

        if balance < 0:
            return format_html(
                '<span style="color: red; font-weight: bold;">{} (Qarz)</span>',
                formatted_balance
            )
        elif balance > 0:
            return format_html(
                '<span style="color: green; font-weight: bold;">{} (Haqdor)</span>',
                formatted_balance
            )
        return "0 so'm"

    display_balance.short_description = "Balans (Qoldiq)"

    @admin.action(description="Telegram botga bir martalik bog'lash havolasi yaratish")
    def generate_telegram_link(self, request, queryset):
        if not settings.TELEGRAM_BOT_USERNAME:
            self.message_user(
                request,
                "TELEGRAM_BOT_USERNAME backend sozlamalarida ko'rsatilmagan.",
                level=messages.ERROR
            )
            return

        expires_at = timezone.now() + timedelta(minutes=30)
        links = []
        for patient in queryset:
            patient.telegram_link_token = secrets.token_urlsafe(32)
            patient.telegram_link_expires_at = expires_at
            patient.save(update_fields=['telegram_link_token', 'telegram_link_expires_at'])
            link = (
                f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}"
                f"?start={patient.telegram_link_token}"
            )
            links.append(format_html(
                '<li><strong>{}</strong>: <a href="{}" target="_blank">{}</a></li>',
                patient.full_name,
                link,
                link
            ))

        self.message_user(
            request,
            format_html(
                '<p>30 daqiqada tugaydigan havolalar:</p><ul>{}</ul>',
                format_html_join('', '{}', ((link,) for link in links))
            ),
            level=messages.SUCCESS
        )


@admin.register(Appointment)
class AppointmentAdmin(ModelAdmin):
    list_display = ('patient_link', 'appointment_time_formatted', 'status_badge', 'complaint_or_note_short', 'total_price_formatted')
    list_filter = ('status', 'appointment_time')
    search_fields = ('patient__first_name', 'patient__last_name', 'patient__phone', 'complaint_or_note')
    autocomplete_fields = ('patient',)
    date_hierarchy = 'appointment_time'
    inlines = [TreatmentInline, PaymentInline]
    actions = ['mark_as_confirmed', 'mark_as_completed', 'mark_as_cancelled']

    def patient_link(self, obj):
        url = reverse('admin:clinic_patient_change', args=[obj.patient.id])
        return format_html('<a href="{}" style="font-weight: 600; color: #0284c7;">{}</a>', url, obj.patient.full_name)
    patient_link.short_description = "Bemor"

    def appointment_time_formatted(self, obj):
        now = timezone.now()
        is_today = obj.appointment_time.date() == timezone.localdate()
        date_str = obj.appointment_time.strftime("%d.%m.%Y — %H:%M")
        if is_today:
            return format_html('<span style="color: #2563eb; font-weight: bold;">⭐ Bugun ({})</span>', obj.appointment_time.strftime("%H:%M"))
        return date_str
    appointment_time_formatted.short_description = "Qabul vaqti"

    def status_badge(self, obj):
        colors = {
            Appointment.Status.PENDING: ("#d97706", "#fef3c7"),    # sariq
            Appointment.Status.CONFIRMED: ("#2563eb", "#dbeafe"),  # ko'k
            Appointment.Status.COMPLETED: ("#16a34a", "#dcfce7"),  # yashil
            Appointment.Status.CANCELLED: ("#dc2626", "#fee2e2"),  # qizil
        }
        text_color, bg_color = colors.get(obj.status, ("#475569", "#f1f5f9"))
        return format_html(
            '<span style="color: {}; background-color: {}; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px;">{}</span>',
            text_color, bg_color, obj.get_status_display()
        )
    status_badge.short_description = "Holat"

    def complaint_or_note_short(self, obj):
        if not obj.complaint_or_note:
            return "-"
        return obj.complaint_or_note[:45] + ("..." if len(obj.complaint_or_note) > 45 else "")
    complaint_or_note_short.short_description = "Shikoyat / Izoh"

    def total_price_formatted(self, obj):
        return f"{obj.appointment_total:,.0f} so‘m"
    total_price_formatted.short_description = "Qabul summasi"

    # Tezkor boshqaruv amallari (Actions)
    @admin.action(description="Tanlangan qabullarni 'Tasdiqlangan' holatiga o‘tkazish")
    def mark_as_confirmed(self, request, queryset):
        queryset.update(status=Appointment.Status.CONFIRMED)

    @admin.action(description="Tanlangan qabullarni 'Yakunlangan' holatiga o‘tkazish")
    def mark_as_completed(self, request, queryset):
        queryset.update(status=Appointment.Status.COMPLETED)

    @admin.action(description="Tanlangan qabullarni 'Bekor qilingan' holatiga o‘tkazish")
    def mark_as_cancelled(self, request, queryset):
        queryset.update(status=Appointment.Status.CANCELLED)


@admin.register(Treatment)
class TreatmentAdmin(ModelAdmin):
    list_display = ('procedure_name', 'tooth_badge', 'price_formatted', 'patient_name', 'performed_at_formatted')
    list_filter = ('performed_at', 'tooth_number')
    search_fields = ('procedure_name', 'appointment__patient__first_name', 'appointment__patient__last_name', 'appointment__patient__phone')
    autocomplete_fields = ('appointment',)

    def tooth_badge(self, obj):
        if obj.tooth_number:
            return format_html(
                '<span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-weight: bold;">№ {}</span>',
                obj.tooth_number
            )
        return "-"
    tooth_badge.short_description = "Tish raqami"

    def price_formatted(self, obj):
        return f"{obj.price:,.0f} so‘m"
    price_formatted.short_description = "Narxi"

    def patient_name(self, obj):
        return obj.appointment.patient.full_name
    patient_name.short_description = "Bemor"

    def performed_at_formatted(self, obj):
        return obj.performed_at.strftime("%d.%m.%Y %H:%M")
    performed_at_formatted.short_description = "Bajarilgan vaqt"


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    list_display = ('patient', 'amount_paid_formatted', 'payment_method_badge', 'payment_date_formatted', 'appointment')
    list_filter = ('payment_method', 'payment_date')
    search_fields = ('patient__first_name', 'patient__last_name', 'patient__phone', 'note')
    autocomplete_fields = ('patient', 'appointment')

    def amount_paid_formatted(self, obj):
        return format_html('<span style="font-weight: 700; color: #047857;">{:,.0f} so‘m</span>', obj.amount_paid)
    amount_paid_formatted.short_description = "To‘langan summa"

    def payment_method_badge(self, obj):
        colors = {
            Payment.PaymentMethod.CASH: ("#065f46", "#d1fae5"),
            Payment.PaymentMethod.CARD: ("#1e40af", "#dbeafe"),
            Payment.PaymentMethod.TRANSFER: ("#6b21a8", "#f3e8ff"),
        }
        text_color, bg_color = colors.get(obj.payment_method, ("#374151", "#f3f4f6"))
        return format_html(
            '<span style="color: {}; background: {}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">{}</span>',
            text_color, bg_color, obj.get_payment_method_display()
        )
    payment_method_badge.short_description = "To‘lov usuli"

    def payment_date_formatted(self, obj):
        return obj.payment_date.strftime("%d.%m.%Y %H:%M")
    payment_date_formatted.short_description = "To‘lov vaqti"
