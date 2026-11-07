from django.contrib import admin
from django.urls import path, include

admin.site.site_header = "Stomatologiya CRM Admin"
admin.site.site_title = "Dental CRM"
admin.site.index_title = "Klinika boshqaruv paneli"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('clinic.urls')),
]
