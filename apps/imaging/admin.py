"""
Admin configuration for Imaging app
"""
from django.contrib import admin
from .models import ImagingExamCategory, ImagingExamType, ImagingOrder, ImagingOrderItem, ImagingResultFile


@admin.register(ImagingExamCategory)
class ImagingExamCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'is_active']
    list_filter = ['organization', 'is_active']
    search_fields = ['name']


@admin.register(ImagingExamType)
class ImagingExamTypeAdmin(admin.ModelAdmin):
    list_display = ['exam_code', 'name', 'category', 'modality', 'price', 'is_active']
    list_filter = ['organization', 'modality', 'is_active', 'category']
    search_fields = ['name', 'exam_code', 'short_name']


class ImagingOrderItemInline(admin.TabularInline):
    model = ImagingOrderItem
    extra = 0
    fields = ['exam_type', 'price', 'discount', 'report_text', 'is_urgent_finding']


@admin.register(ImagingOrder)
class ImagingOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'patient', 'status', 'priority', 'total_price', 'order_date']
    list_filter = ['organization', 'status', 'priority']
    search_fields = ['order_number', 'patient__name']
    date_hierarchy = 'order_date'
    inlines = [ImagingOrderItemInline]


@admin.register(ImagingOrderItem)
class ImagingOrderItemAdmin(admin.ModelAdmin):
    list_display = ['imaging_order', 'exam_type', 'price', 'is_urgent_finding']
    search_fields = ['imaging_order__order_number', 'exam_type__name']


@admin.register(ImagingResultFile)
class ImagingResultFileAdmin(admin.ModelAdmin):
    list_display = ['order_item', 'file_type', 'uploaded_at', 'uploaded_by']
    list_filter = ['file_type']
