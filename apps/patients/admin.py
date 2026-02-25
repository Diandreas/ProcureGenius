"""
Admin configuration for Patients app
"""
from django.contrib import admin
from .models import PatientVisit
from .models_care import PatientCareService
from .models_followup import PatientFollowUp


@admin.register(PatientVisit)
class PatientVisitAdmin(admin.ModelAdmin):
    list_display = [
        'visit_number',
        'patient',
        'visit_type',
        'status',
        'priority',
        'arrived_at',
        'assigned_doctor',
    ]
    list_filter = [
        'status',
        'visit_type',
        'priority',
        'organization',
    ]
    search_fields = [
        'visit_number',
        'patient__name',
        'patient__patient_number',
        'chief_complaint',
    ]
    readonly_fields = [
        'id',
        'visit_number',
        'created_at',
        'updated_at',
    ]
    date_hierarchy = 'arrived_at'
    ordering = ['-arrived_at']
    
    fieldsets = (
        ('Identification', {
            'fields': ('id', 'visit_number', 'organization')
        }),
        ('Patient', {
            'fields': ('patient',)
        }),
        ('Visit Details', {
            'fields': ('visit_type', 'status', 'priority', 'chief_complaint', 'notes')
        }),
        ('Staff', {
            'fields': ('assigned_doctor', 'registered_by')
        }),
        ('Billing', {
            'fields': ('consultation_invoice',)
        }),
        ('Timestamps', {
            'fields': (
                'arrived_at',
                'consultation_started_at',
                'consultation_ended_at',
                'completed_at',
                'created_at',
                'updated_at',
            )
        }),
    )


@admin.register(PatientCareService)
class PatientCareServiceAdmin(admin.ModelAdmin):
    list_display = [
        'patient',
        'service_name',
        'service_type',
        'provided_at',
        'provided_by',
        'is_billed',
    ]
    list_filter = [
        'service_type',
        'is_billed',
        'provided_at',
    ]
    search_fields = [
        'patient__name',
        'service_name',
        'notes',
    ]
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
    ]
    date_hierarchy = 'provided_at'
    ordering = ['-provided_at']


@admin.register(PatientFollowUp)
class PatientFollowUpAdmin(admin.ModelAdmin):
    list_display = ['patient', 'follow_up_date', 'provided_by', 'diagnosis', 'organization']
    list_filter = ['organization', 'follow_up_date', 'provided_by']
    search_fields = ['patient__name', 'diagnosis', 'chief_complaint']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'follow_up_date'
    ordering = ['-follow_up_date']
    fieldsets = (
        ('Patient', {'fields': ('id', 'organization', 'patient', 'provided_by', 'visit')}),
        ('Clinique', {'fields': ('chief_complaint', 'physical_examination', 'diagnosis', 'evolution', 'treatment', 'notes')}),
        ('Paramètres Vitaux', {'fields': (
            'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic',
            'heart_rate', 'oxygen_saturation', 'respiratory_rate', 'weight', 'blood_glucose',
        )}),
        ('Dates', {'fields': ('follow_up_date', 'created_at', 'updated_at')}),
    )
