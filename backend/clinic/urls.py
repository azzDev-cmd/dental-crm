from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, AppointmentViewSet, TreatmentViewSet, PaymentViewSet
from .telegram_views import telegram_webhook

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'treatments', TreatmentViewSet, basename='treatment')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('telegram/webhook/', telegram_webhook, name='telegram-webhook'),
    path('', include(router.urls)),
]
