"""
Admin configuration for Laboratory (LIMS) app
"""
from django.contrib import admin
from .models import LabTestCategory, LabTest, LabOrder, LabOrderItem, LabTestParameter, LabResultValue


@admin.register(LabTestCategory)
class LabTestCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'is_active', 'display_order']
    list_filter = ['organization', 'is_active']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}


class LabTestParameterInline(admin.TabularInline):
    model = LabTestParameter
    extra = 0
    fields = [
        'code', 'name', 'group_name', 'display_order', 'unit', 'value_type', 'decimal_places', 'is_required',
        'adult_ref_min_male', 'adult_ref_max_male',
        'adult_ref_min_female', 'adult_ref_max_female',
        'adult_ref_min_general', 'adult_ref_max_general',
        'child_ref_min', 'child_ref_max', 'child_age_max_years',
        'critical_low', 'critical_high',
    ]
    ordering = ['display_order']


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = [
        'test_code',
        'name',
        'category',
        'price',
        'sample_type',
        'estimated_turnaround_hours',
        'is_active',
    ]
    list_filter = [
        'category',
        'sample_type',
        'is_active',
        'fasting_required',
        'organization',
    ]
    search_fields = ['test_code', 'name', 'short_name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [LabTestParameterInline]

    fieldsets = (
        ('Identification', {
            'fields': ('id', 'organization', 'test_code', 'name', 'short_name', 'category')
        }),
        ('Description', {
            'fields': ('description',)
        }),
        ('Pricing', {
            'fields': ('price',)
        }),
        ('Reference Ranges', {
            'fields': (
                'normal_range_male',
                'normal_range_female',
                'normal_range_child',
                'normal_range_general',
                'unit_of_measurement',
            )
        }),
        ('Sample Requirements', {
            'fields': (
                'sample_type',
                'sample_volume',
                'container_type',
                'fasting_required',
                'fasting_hours',
                'preparation_instructions',
            )
        }),
        ('Processing', {
            'fields': ('estimated_turnaround_hours', 'methodology')
        }),
        ('Status', {
            'fields': ('is_active', 'requires_approval', 'use_large_layout', 'show_on_new_page')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class LabOrderItemInline(admin.TabularInline):
    model = LabOrderItem
    extra = 0
    readonly_fields = ['result_entered_at', 'result_verified_at']
    fields = [
        'lab_test',
        'result_value',
        'result_numeric',
        'is_abnormal',
        'abnormality_type',
        'result_entered_at',
    ]


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number',
        'patient',
        'status',
        'priority',
        'order_date',
        'notification_sent',
    ]
    list_filter = [
        'status',
        'priority',
        'notification_sent',
        'organization',
    ]
    search_fields = [
        'order_number',
        'patient__name',
        'patient__patient_number',
        'clinical_notes',
    ]
    readonly_fields = [
        'id',
        'order_number',
        'created_at',
        'updated_at',
    ]
    date_hierarchy = 'order_date'
    inlines = [LabOrderItemInline]
    
    fieldsets = (
        ('Identification', {
            'fields': ('id', 'order_number', 'organization')
        }),
        ('Patient & Visit', {
            'fields': ('patient', 'visit')
        }),
        ('Order Details', {
            'fields': ('order_date', 'status', 'priority', 'clinical_notes')
        }),
        ('Staff', {
            'fields': ('ordered_by', 'sample_collected_by', 'results_entered_by', 'results_verified_by')
        }),
        ('Tracking', {
            'fields': (
                'sample_collected_at',
                'results_completed_at',
                'notification_sent',
                'notification_sent_at',
            )
        }),
        ('Billing', {
            'fields': ('lab_invoice',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LabOrderItem)
class LabOrderItemAdmin(admin.ModelAdmin):
    list_display = [
        'lab_order',
        'lab_test',
        'result_value',
        'is_abnormal',
        'result_entered_at',
    ]
    list_filter = ['is_abnormal', 'is_critical', 'abnormality_type']
    search_fields = ['lab_order__order_number', 'lab_test__name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'result_entered_at', 'result_verified_at']
