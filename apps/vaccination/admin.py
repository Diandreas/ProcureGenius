from django.contrib import admin
from .models import VaccineCategory, VaccineType, VaccinationRecord


@admin.register(VaccineCategory)
class VaccineCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'is_active']
    list_filter = ['organization', 'is_active']
    search_fields = ['name']


@admin.register(VaccineType)
class VaccineTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'target_population', 'is_billable', 'price', 'is_active']
    list_filter = ['organization', 'target_population', 'is_billable', 'is_active', 'category']
    search_fields = ['name', 'code']


@admin.register(VaccinationRecord)
class VaccinationRecordAdmin(admin.ModelAdmin):
    list_display = ['patient', 'vaccine_type', 'dose_number', 'administered_date', 'pregnancy']
    list_filter = ['organization', 'vaccine_type']
    search_fields = ['patient__name', 'vaccine_type__name']
    date_hierarchy = 'administered_date'
