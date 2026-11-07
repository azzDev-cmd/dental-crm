from rest_framework import serializers
from django.db import transaction
from .models import Patient, Appointment, Treatment, Payment


# -------------------------------------------------------------
# TREATMENT & PAYMENT SERIALIZERS
# -------------------------------------------------------------

class TreatmentSerializer(serializers.ModelSerializer):
    """Muolaja (bajarilgan ish) serializeri"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_paid = serializers.SerializerMethodField()

    def get_is_paid(self, treatment):
        return Payment.objects.filter(treatment=treatment).exists()

    class Meta:
        model = Treatment
        fields = [
            'id',
            'appointment',
            'tooth_number',
            'procedure_name',
            'price',
            'status',
            'status_display',
            'is_paid',
            'performed_at',
        ]


class PaymentSerializer(serializers.ModelSerializer):
    """To‘lov serializeri"""
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'patient',
            'appointment',
            'treatment',
            'amount_paid',
            'payment_method',
            'payment_method_display',
            'payment_date',
            'note',
        ]
        read_only_fields = ['treatment']


# -------------------------------------------------------------
# PATIENT SERIALIZERS
# -------------------------------------------------------------

class PatientSummarySerializer(serializers.ModelSerializer):
    """Qabul ro‘yxati ichida ko‘rsatish uchun soddalashtirilgan bemor ma'lumotlari"""
    telegram_linked = serializers.SerializerMethodField()

    def get_telegram_linked(self, patient):
        return patient.telegram_chat_id is not None

    class Meta:
        model = Patient
        fields = [
            'id',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'telegram_username',
            'telegram_linked',
        ]


class PatientListSerializer(serializers.ModelSerializer):
    """Bemorlar umumiy ro'yxati (katalog) uchun serializer"""
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    appointments_count = serializers.IntegerField(source='appointments.count', read_only=True)
    unpaid_services_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'telegram_username',
            'birth_date',
            'medical_notes',
            'total_cost',
            'total_paid',
            'balance_due',
            'appointments_count',
            'unpaid_services_count',
            'created_at',
        ]


# -------------------------------------------------------------
# APPOINTMENT SERIALIZERS
# -------------------------------------------------------------

class AppointmentListSerializer(serializers.ModelSerializer):
    """Kalendar va kunlik qabullar ro'yxati uchun serializer"""
    patient = PatientSummarySerializer(read_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        source='patient',
        write_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    appointment_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    treatments_count = serializers.IntegerField(source='treatments.count', read_only=True)
    treatments = TreatmentSerializer(many=True, read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id',
            'patient',
            'patient_id',
            'appointment_time',
            'status',
            'status_display',
            'complaint_or_note',
            'appointment_total',
            'treatments_count',
            'treatments',
            'reminder_sent_at',
            'created_at',
        ]
        read_only_fields = ['reminder_sent_at']


class AppointmentDetailSerializer(serializers.ModelSerializer):
    """Bitta qabulning to‘liq tafsilotlari (muolajalar va to‘lovlar bilan)"""
    patient = PatientSummarySerializer(read_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        source='patient',
        write_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    treatments = TreatmentSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    appointment_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    treatment_id = serializers.IntegerField(write_only=True, required=False)
    procedure_name = serializers.CharField(write_only=True, required=False)
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0,
        write_only=True,
        required=False
    )

    class Meta:
        model = Appointment
        fields = [
            'id',
            'patient',
            'patient_id',
            'appointment_time',
            'status',
            'status_display',
            'complaint_or_note',
            'treatments',
            'payments',
            'appointment_total',
            'treatment_id',
            'procedure_name',
            'price',
            'reminder_sent_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['reminder_sent_at']

    @transaction.atomic
    def update(self, instance, validated_data):
        previous_appointment_time = instance.appointment_time
        previous_patient_id = instance.patient_id
        treatment_id = validated_data.pop('treatment_id', None)
        procedure_name = validated_data.pop('procedure_name', None)
        price = validated_data.pop('price', None)
        has_procedure = procedure_name is not None
        has_price = price is not None
        if has_procedure != has_price:
            raise serializers.ValidationError(
                {'procedure_name': 'Xizmat nomi va narxi birgalikda berilishi kerak.'}
            )

        appointment = super().update(instance, validated_data)
        if (
            appointment.reminder_sent_at
            and (
                appointment.appointment_time != previous_appointment_time
                or appointment.patient_id != previous_patient_id
            )
        ):
            appointment.reminder_sent_at = None
            appointment.reminder_sent_to_chat_id = None
            appointment.save(update_fields=['reminder_sent_at', 'reminder_sent_to_chat_id'])
        if not has_procedure:
            return appointment

        if treatment_id is not None:
            try:
                treatment = Treatment.objects.select_for_update().get(
                    pk=treatment_id,
                    appointment=appointment
                )
            except Treatment.DoesNotExist as error:
                raise serializers.ValidationError(
                    {'treatment_id': 'Xizmat ushbu qabulga tegishli emas.'}
                ) from error
        else:
            treatment = appointment.treatments.select_for_update().first()

        if treatment is None:
            Treatment.objects.create(
                appointment=appointment,
                procedure_name=procedure_name,
                price=price,
                status=Treatment.Status.PLANNED
            )
            return appointment

        if Payment.objects.filter(treatment=treatment).exists() and (
            treatment.procedure_name != procedure_name or treatment.price != price
        ):
            raise serializers.ValidationError(
                {'treatment_id': "To'langan xizmatning nomi yoki narxini o'zgartirib bo'lmaydi."}
            )

        treatment.procedure_name = procedure_name
        treatment.price = price
        treatment.save(update_fields=['procedure_name', 'price'])
        return appointment


class PatientDetailSerializer(serializers.ModelSerializer):
    """Bemorning to‘liq kartasi: uning barcha tashriflari va to‘lovlari bilan"""
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    appointments = AppointmentDetailSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    telegram_linked = serializers.SerializerMethodField()

    def get_telegram_linked(self, patient):
        return patient.telegram_chat_id is not None

    class Meta:
        model = Patient
        fields = [
            'id',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'telegram_username',
            'telegram_linked',
            'birth_date',
            'medical_notes',
            'total_cost',
            'total_paid',
            'balance_due',
            'appointments',
            'payments',
            'created_at',
            'updated_at',
        ]
