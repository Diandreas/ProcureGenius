"""
Admin configuration for Patients app
"""
from django.contrib import admin
from .models import PatientVisit


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
