"""
Admin configuration for Consultations app
"""
from django.contrib import admin
from .models import Consultation, Prescription, PrescriptionItem


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0
    readonly_fields = ['created_at']
    fields = [
        'medication',
        'medication_name',
        'dosage',
        'frequency',
        'duration',
        'route',
        'quantity_prescribed',
        'quantity_dispensed',
        'is_dispensed',
    ]


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = [
        'consultation_number',
        'patient',
        'doctor',
        'consultation_date',
        'diagnosis_preview',
        'follow_up_required',
    ]
    list_filter = [
        'follow_up_required',
        'doctor',
        'organization',
    ]
    search_fields = [
        'consultation_number',
        'patient__name',
        'patient__patient_number',
        'diagnosis',
        'chief_complaint',
    ]
    readonly_fields = [
        'id',
        'consultation_number',
        'blood_pressure',
        'bmi',
        'bmi_category',
        'created_at',
        'updated_at',
    ]
    date_hierarchy = 'consultation_date'
    
    fieldsets = (
        ('Identification', {
            'fields': ('id', 'consultation_number', 'organization')
        }),
        ('Patient & Doctor', {
            'fields': ('patient', 'visit', 'doctor', 'consultation_date')
        }),
        ('Vital Signs', {
            'fields': (
                ('temperature', 'heart_rate', 'respiratory_rate'),
                ('blood_pressure_systolic', 'blood_pressure_diastolic', 'blood_pressure'),
                ('oxygen_saturation',),
                ('weight', 'height', 'bmi', 'bmi_category'),
            )
        }),
        ('Clinical Information', {
            'fields': (
                'chief_complaint',
                'history_of_present_illness',
                'physical_examination',
                'diagnosis',
                'diagnosis_codes',
                'treatment_plan',
            )
        }),
        ('Follow-up', {
            'fields': ('follow_up_required', 'follow_up_date', 'follow_up_instructions')
        }),
        ('Notes', {
            'fields': ('private_notes', 'patient_instructions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def diagnosis_preview(self, obj):
        if obj.diagnosis:
            return obj.diagnosis[:50] + '...' if len(obj.diagnosis) > 50 else obj.diagnosis
        return '-'
    diagnosis_preview.short_description = 'Diagnostic'


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = [
        'prescription_number',
        'patient',
        'prescriber',
        'prescribed_date',
        'valid_until',
        'status',
        'items_count',
    ]
    list_filter = [
        'status',
        'prescriber',
        'organization',
    ]
    search_fields = [
        'prescription_number',
        'patient__name',
        'patient__patient_number',
    ]
    readonly_fields = [
        'id',
        'prescription_number',
        'is_expired',
        'items_count',
        'all_dispensed',
        'created_at',
        'updated_at',
    ]
    date_hierarchy = 'prescribed_date'
    inlines = [PrescriptionItemInline]
    
    fieldsets = (
        ('Identification', {
            'fields': ('id', 'prescription_number', 'organization')
        }),
        ('References', {
            'fields': ('consultation', 'patient', 'prescriber')
        }),
        ('Details', {
            'fields': ('prescribed_date', 'valid_until', 'is_expired', 'status')
        }),
        ('Status', {
            'fields': ('items_count', 'all_dispensed', 'pharmacy_dispensing')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = 'Nb médicaments'


@admin.register(PrescriptionItem)
class PrescriptionItemAdmin(admin.ModelAdmin):
    list_display = [
        'prescription',
        'medication_name',
        'dosage',
        'frequency',
        'quantity_prescribed',
        'quantity_dispensed',
        'is_dispensed',
    ]
    list_filter = ['is_dispensed', 'route']
    search_fields = [
        'prescription__prescription_number',
        'medication_name',
        'medication__name',
    ]
    readonly_fields = ['id', 'remaining_quantity', 'created_at', 'updated_at']
