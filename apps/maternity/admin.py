from django.contrib import admin
from .models import PregnancyRecord, PrenatalVisit, Delivery, Newborn, PostnatalVisit


@admin.register(PregnancyRecord)
class PregnancyRecordAdmin(admin.ModelAdmin):
    list_display = ['patient', 'status', 'expected_delivery_date', 'organization', 'created_at']
    list_filter = ['status', 'organization']
    search_fields = ['patient__name']


@admin.register(PrenatalVisit)
class PrenatalVisitAdmin(admin.ModelAdmin):
    list_display = ['pregnancy', 'visit_date', 'gestational_age_weeks', 'doctor']
    list_filter = ['visit_date']


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ['pregnancy', 'delivery_date', 'delivery_type', 'hospitalization']
    list_filter = ['delivery_type']


@admin.register(Newborn)
class NewbornAdmin(admin.ModelAdmin):
    list_display = ['name', 'delivery', 'sex', 'birth_weight_grams']


@admin.register(PostnatalVisit)
class PostnatalVisitAdmin(admin.ModelAdmin):
    list_display = ['delivery', 'visit_date', 'days_after_delivery']
