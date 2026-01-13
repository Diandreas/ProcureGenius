"""
Admin configuration for Pharmacy app
"""
from django.contrib import admin
from .models import PharmacyDispensing, DispensingItem


class DispensingItemInline(admin.TabularInline):
    model = DispensingItem
    extra = 0
    readonly_fields = ['total_price', 'stock_movement', 'created_at']
    fields = [
        'medication',
        'quantity_dispensed',
        'unit_price',
        'total_price',
        'dosage_instructions',
        'frequency',
    ]


@admin.register(PharmacyDispensing)
class PharmacyDispensingAdmin(admin.ModelAdmin):
    list_display = [
        'dispensing_number',
        'patient',
        'status',
        'dispensed_at',
        'dispensed_by',
        'counseling_provided',
    ]
    list_filter = [
        'status',
        'counseling_provided',
        'organization',
    ]
    search_fields = [
        'dispensing_number',
        'patient__name',
        'patient__patient_number',
        'notes',
    ]
    readonly_fields = [
        'id',
        'dispensing_number',
        'created_at',
        'updated_at',
    ]
    date_hierarchy = 'dispensed_at'
    inlines = [DispensingItemInline]
    
    fieldsets = (
        ('Identification', {
            'fields': ('id', 'dispensing_number', 'organization')
        }),
        ('Patient & Visit', {
            'fields': ('patient', 'visit')
        }),
        ('Dispensing Details', {
            'fields': ('dispensed_at', 'status', 'dispensed_by')
        }),
        ('Counseling', {
            'fields': ('counseling_provided', 'counseling_notes')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Billing', {
            'fields': ('pharmacy_invoice',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DispensingItem)
class DispensingItemAdmin(admin.ModelAdmin):
    list_display = [
        'dispensing',
        'medication',
        'quantity_dispensed',
        'unit_price',
        'total_price',
    ]
    list_filter = ['dispensing__organization']
    search_fields = [
        'dispensing__dispensing_number',
        'medication__name',
        'medication__reference',
    ]
    readonly_fields = ['id', 'total_price', 'stock_movement', 'created_at', 'updated_at']
