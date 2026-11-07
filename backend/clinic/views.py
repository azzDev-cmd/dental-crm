from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from django.utils.timezone import localtime

from .models import Patient, Appointment, Treatment, Payment
from .serializers import (
    PatientListSerializer,
    PatientDetailSerializer,
    AppointmentListSerializer,
    AppointmentDetailSerializer,
    TreatmentSerializer,
    PaymentSerializer,
)
from .telegram import TelegramError, send_telegram_message, validate_web_app_init_data


class PatientViewSet(viewsets.ModelViewSet):
    """
    Bemorlar boshqaruvi:
    - Ro'yxat, qidiruv (ism yoki telefon bo'yicha)
    - Yangi bemor qo'shish, o'zgartirish, o'chirish
    - Bemor tafsilotlari (qabullar va to'lovlar tarixi)
    """
    queryset = Patient.objects.all().order_by('-created_at')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'phone']
    ordering_fields = ['created_at', 'first_name', 'last_name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PatientDetailSerializer
        return PatientListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            return queryset.annotate(
                unpaid_services_count=Count(
                    'appointments__treatments',
                    filter=Q(appointments__treatments__payments__isnull=True),
                    distinct=True
                )
            )
        return queryset


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    Qabullar (uchrashuvlar) boshqaruvi:
    - Barcha qabullar
    - Bugungi qabullar (/api/appointments/today/)
    - Haftalik qabullar (/api/appointments/this_week/)
    - Klinika statistikasi (/api/appointments/stats/)
    - Holatni o'zgartirish (/api/appointments/{id}/status/)
    """
    queryset = Appointment.objects.select_related('patient').prefetch_related('treatments', 'payments').order_by('appointment_time')
    filter_backends = [filters.SearchFilter]
    search_fields = ['patient__first_name', 'patient__last_name', 'patient__phone', 'complaint_or_note']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'update', 'partial_update']:
            return AppointmentDetailSerializer
        return AppointmentListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Qo'shimcha filter parametrlar: ?date=YYYY-MM-DD yoki ?status=PENDING
        date_param = self.request.query_params.get('date')
        status_param = self.request.query_params.get('status')
        patient_param = self.request.query_params.get('patient')

        if date_param:
            queryset = queryset.filter(appointment_time__date=date_param)
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if patient_param:
            queryset = queryset.filter(patient_id=patient_param)

        return queryset

    @action(detail=True, methods=['post'], url_path='send-reminder')
    @transaction.atomic
    def send_reminder(self, request, pk=None):
        try:
            telegram_user_id = validate_web_app_init_data(
                request.headers.get('X-Telegram-Init-Data', '')
            )
        except TelegramError:
            return Response(
                {'error': 'Telegram bot sozlamalari to‘liq emas.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        if telegram_user_id is None:
            return Response(
                {'error': 'Telegram Mini App tasdiqlanmadi.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if not settings.TELEGRAM_ADMIN_IDS:
            return Response(
                {'error': 'Eslatma yuborish uchun Telegram admin ID sozlanmagan.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        if telegram_user_id not in settings.TELEGRAM_ADMIN_IDS:
            return Response(
                {'error': 'Eslatma yuborish huquqi yo‘q.'},
                status=status.HTTP_403_FORBIDDEN
            )

        appointment = get_object_or_404(
            Appointment.objects.select_for_update().select_related('patient'),
            pk=pk
        )
        if appointment.status == Appointment.Status.CANCELLED:
            return Response(
                {'error': "Bekor qilingan qabulga eslatma yuborib bo'lmaydi."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if appointment.reminder_sent_at:
            return Response(
                {'error': "Ushbu qabul uchun eslatma avval yuborilgan."},
                status=status.HTTP_409_CONFLICT
            )
        if not appointment.patient.telegram_chat_id:
            return Response(
                {'error': "Bemorning Telegram hisobi hali botga bog'lanmagan."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if appointment.appointment_time <= timezone.now():
            return Response(
                {'error': "O'tgan qabul uchun eslatma yuborib bo'lmaydi."},
                status=status.HTTP_400_BAD_REQUEST
            )

        appointment_time = localtime(appointment.appointment_time)
        message = (
            f"Hurmatli {appointment.patient.first_name}, sizni "
            f"{appointment_time.strftime('%d.%m.%Y')} kuni soat "
            f"{appointment_time.strftime('%H:%M')} da stomatolog qabuliga kutamiz."
        )
        try:
            send_telegram_message(appointment.patient.telegram_chat_id, message)
        except TelegramError:
            return Response(
                {'error': "Telegram orqali eslatma yuborilmadi. Qayta urinib ko'ring."},
                status=status.HTTP_502_BAD_GATEWAY
            )

        appointment.reminder_sent_at = timezone.now()
        appointment.reminder_sent_to_chat_id = appointment.patient.telegram_chat_id
        appointment.save(update_fields=['reminder_sent_at', 'reminder_sent_to_chat_id'])
        return Response(AppointmentDetailSerializer(appointment).data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def cancel(self, request, pk=None):
        appointment = get_object_or_404(
            Appointment.objects.select_for_update(),
            pk=pk
        )
        appointment.status = Appointment.Status.CANCELLED
        appointment.save(update_fields=['status', 'updated_at'])
        appointment.treatments.filter(status=Treatment.Status.PLANNED).update(
            status=Treatment.Status.CANCELLED
        )
        return Response(AppointmentDetailSerializer(appointment).data)

    @action(detail=False, methods=['post'], url_path='plan-service')
    @transaction.atomic
    def plan_service(self, request):
        """Create an appointment and its planned treatment as one operation."""
        appointment_serializer = AppointmentListSerializer(data=request.data)
        appointment_serializer.is_valid(raise_exception=True)

        appointment = appointment_serializer.save()
        treatment_serializer = TreatmentSerializer(data={
            'appointment': appointment.pk,
            'procedure_name': request.data.get('procedure_name'),
            'price': request.data.get('price'),
        })
        treatment_serializer.is_valid(raise_exception=True)
        treatment_serializer.save(
            status=Treatment.Status.PLANNED
        )

        return Response(
            AppointmentDetailSerializer(appointment).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Bugungi kundagi barcha qabullar ro'yxati"""
        today_date = timezone.localdate()
        today_appointments = self.get_queryset().filter(appointment_time__date=today_date)
        serializer = self.get_serializer(today_appointments, many=True)
        return Response({
            'date': today_date,
            'count': today_appointments.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def this_week(self, request):
        """Joriy haftadagi (dushanbadan yakshanbagacha) qabullar ro'yxati"""
        today = timezone.localdate()
        start_of_week = today - timedelta(days=today.weekday())  # Dushanba
        end_of_week = start_of_week + timedelta(days=6)          # Yakshanba

        week_appointments = self.get_queryset().filter(
            appointment_time__date__range=[start_of_week, end_of_week]
        )
        serializer = self.get_serializer(week_appointments, many=True)
        return Response({
            'start_date': start_of_week,
            'end_date': end_of_week,
            'count': week_appointments.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Shifokor boshqaruv paneli (Dashboard) uchun tezkor statistika"""
        now = timezone.now()
        today = timezone.localdate()
        selected_date_param = request.query_params.get('date')
        selected_date = parse_date(selected_date_param) if selected_date_param else today
        if selected_date is None:
            return Response(
                {'date': ["Sana YYYY-MM-DD formatida bo'lishi kerak."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        local_now = timezone.localtime(now)
        month_start = local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        selected_appointments = Appointment.objects.filter(appointment_time__date=selected_date)
        selected_count = selected_appointments.count()
        selected_pending = selected_appointments.filter(status=Appointment.Status.PENDING).count()
        selected_completed = selected_appointments.filter(status=Appointment.Status.COMPLETED).count()

        # Tanlangan kundagi tushum (to'lovlar)
        selected_income = Payment.objects.filter(
            payment_date__date=selected_date
        ).aggregate(total=Sum('amount_paid'))['total'] or 0
        monthly_revenue = Payment.objects.filter(
            payment_date__gte=month_start,
            payment_date__lte=now
        ).aggregate(total=Sum('amount_paid'))['total'] or 0

        # Umumiy ko'rsatkichlar
        total_patients = Patient.objects.count()
        total_appointments = Appointment.objects.count()

        return Response({
            'today': {
                'date': selected_date,
                'total_appointments': selected_count,
                'pending': selected_pending,
                'completed': selected_completed,
                'income': selected_income,
            },
            'monthly_revenue': monthly_revenue,
            'all_time': {
                'total_patients': total_patients,
                'total_appointments': total_appointments,
            }
        })

    @action(detail=True, methods=['patch', 'post'], url_path='status')
    def change_status(self, request, pk=None):
        """Qabul holatini tezkor o'zgartirish (masalan, Telegram Mini App tugmasi orqali)"""
        appointment = self.get_object()
        new_status = request.data.get('status')
        if not new_status or new_status not in Appointment.Status.values:
            return Response(
                {'error': f"Noto'g'ri holat. Mumkin bo'lgan qiymatlar: {Appointment.Status.values}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        appointment.status = new_status
        appointment.save(update_fields=['status', 'updated_at'])
        return Response({
            'id': appointment.id,
            'status': appointment.status,
            'status_display': appointment.get_status_display()
        })


class TreatmentViewSet(viewsets.ModelViewSet):
    """
    Muolajalar (bajarilgan ishlar) boshqaruvi:
    Qabul ichida amalga oshirilgan xizmatlar va narxlari.
    """
    queryset = Treatment.objects.select_related('appointment', 'appointment__patient').order_by('-performed_at')
    serializer_class = TreatmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        appointment_id = self.request.query_params.get('appointment')
        if appointment_id:
            queryset = queryset.filter(appointment_id=appointment_id)
        return queryset

    def perform_update(self, serializer):
        treatment = serializer.instance
        if (
            serializer.validated_data.get('status') == Treatment.Status.COMPLETED
            and treatment.status != Treatment.Status.COMPLETED
        ):
            serializer.save(performed_at=timezone.now())
            return
        serializer.save()


class PaymentViewSet(viewsets.ModelViewSet):
    """
    To‘lovlar boshqaruvi:
    Bemor to‘lagan summalar tarixi va yangi to‘lov kiritish.
    """
    queryset = Payment.objects.select_related('patient', 'appointment').order_by('-payment_date')
    serializer_class = PaymentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get('patient')
        appointment_id = self.request.query_params.get('appointment')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if appointment_id:
            queryset = queryset.filter(appointment_id=appointment_id)
        return queryset

    @action(detail=False, methods=['post'], url_path='pay-treatment')
    @transaction.atomic
    def pay_treatment(self, request):
        treatment = get_object_or_404(
            Treatment.objects.select_for_update().select_related(
                'appointment', 'appointment__patient'
            ),
            pk=request.data.get('treatment_id')
        )
        if Payment.objects.filter(treatment=treatment).exists():
            return Response(
                {'error': "Ushbu xizmat uchun to'lov allaqachon qilingan."},
                status=status.HTTP_409_CONFLICT
            )
        if treatment.price <= 0:
            return Response(
                {'error': "Narxi 0 bo'lgan xizmat uchun to'lov yechib bo'lmaydi."},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment = Payment.objects.create(
            patient=treatment.appointment.patient,
            appointment=treatment.appointment,
            treatment=treatment,
            amount_paid=treatment.price,
            note=f"Xizmat to'lovi: {treatment.procedure_name}"
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
