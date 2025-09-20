from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe

from .models import (
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderApproval,
    PurchaseOrderHistory, PurchaseOrderTemplate, PurchaseOrderAttachment,
    PurchaseOrderReceipt, PurchaseOrderReceiptItem
)


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    fields = [
        'product', 'description', 'quantity', 'unit', 'unit_price', 
        'total_price', 'quantity_received'
    ]
    readonly_fields = ['total_price']


class PurchaseOrderApprovalInline(admin.TabularInline):
    model = PurchaseOrderApproval
    extra = 0
    fields = ['approver', 'status', 'approval_level', 'comments', 'approved_at']
    readonly_fields = ['approved_at']


class PurchaseOrderHistoryInline(admin.TabularInline):
    model = PurchaseOrderHistory
    extra = 0
    fields = ['user', 'action', 'notes', 'performed_by_ai', 'timestamp']
    readonly_fields = ['timestamp']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = [
        'number', 'supplier', 'status_colored', 'priority_colored', 
        'total_amount', 'created_by', 'order_date', 'created_at'
    ]
    list_filter = [
        'status', 'priority', 'created_at', 'order_date', 
        'created_by_ai', 'supplier'
    ]
    search_fields = [
        'number', 'supplier__name', 'notes', 'external_reference'
    ]
    readonly_fields = [
        'number', 'created_at', 'updated_at', 'ai_confidence_score',
        'completion_percentage'
    ]
    inlines = [PurchaseOrderItemInline, PurchaseOrderApprovalInline, PurchaseOrderHistoryInline]
    
    fieldsets = (
        (_('Informations générales'), {
            'fields': (
                'number', 'supplier', 'status', 'priority', 
                'created_by', 'approved_by'
            )
        }),
        (_('Dates'), {
            'fields': ('order_date', 'expected_delivery', 'delivery_date')
        }),
        (_('Montants'), {
            'fields': ('subtotal', 'tax_gst_hst', 'tax_qst', 'total_amount')
        }),
        (_('Adresses'), {
            'fields': ('shipping_address', 'billing_address')
        }),
        (_('Termes et conditions'), {
            'fields': ('payment_terms', 'notes', 'terms_conditions', 'external_reference')
        }),
        (_('IA et automatisation'), {
            'fields': ('created_by_ai', 'ai_confidence_score', 'ai_analysis'),
            'classes': ('collapse',)
        }),
        (_('Audit'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_colored(self, obj):
        colors = {
            'draft': '#6c757d',
            'pending': '#ffc107',
            'approved': '#17a2b8',
            'sent': '#007bff',
            'confirmed': '#28a745',
            'partial': '#fd7e14',
            'received': '#28a745',
            'invoiced': '#17a2b8',
            'completed': '#28a745',
            'cancelled': '#dc3545',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_colored.short_description = _('Statut')
    
    def priority_colored(self, obj):
        colors = {
            'low': '#6c757d',
            'medium': '#007bff',
            'high': '#ffc107',
            'urgent': '#dc3545',
        }
        color = colors.get(obj.priority, '#007bff')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_priority_display()
        )
    priority_colored.short_description = _('Priorité')
    
    def completion_percentage(self, obj):
        percentage = obj.get_completion_percentage()
        if percentage == 0:
            color = '#6c757d'
        elif percentage < 50:
            color = '#dc3545'
        elif percentage < 100:
            color = '#ffc107'
        else:
            color = '#28a745'
        
        return format_html(
            '<div style="width: 100px; background: #f8f9fa; border-radius: 4px; overflow: hidden;">'
            '<div style="width: {}%; background: {}; height: 20px; text-align: center; color: white; font-size: 12px; line-height: 20px;">'
            '{}%'
            '</div></div>',
            percentage, color, int(percentage)
        )
    completion_percentage.short_description = _('Réception')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'supplier', 'created_by', 'approved_by'
        )


@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    list_display = [
        'purchase_order', 'description', 'quantity', 'unit_price', 
        'total_price', 'quantity_received', 'reception_status'
    ]
    list_filter = [
        'purchase_order__status', 'category', 'suggested_by_ai'
    ]
    search_fields = [
        'description', 'sku', 'purchase_order__number'
    ]
    readonly_fields = ['total_price']
    
    def reception_status(self, obj):
        if obj.is_fully_received():
            return format_html('<span style="color: #28a745;">✓ Complet</span>')
        elif obj.quantity_received > 0:
            return format_html('<span style="color: #ffc107;">Partiel</span>')
        else:
            return format_html('<span style="color: #dc3545;">En attente</span>')
    reception_status.short_description = _('Réception')


@admin.register(PurchaseOrderApproval)
class PurchaseOrderApprovalAdmin(admin.ModelAdmin):
    list_display = [
        'purchase_order', 'approver', 'status', 'approval_level', 
        'approved_at', 'ai_recommended'
    ]
    list_filter = [
        'status', 'approval_level', 'ai_recommended', 'approved_at'
    ]
    search_fields = [
        'purchase_order__number', 'approver__username', 'comments'
    ]
    readonly_fields = ['approved_at']


@admin.register(PurchaseOrderHistory)
class PurchaseOrderHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'purchase_order', 'user', 'action', 'performed_by_ai', 'timestamp'
    ]
    list_filter = [
        'action', 'performed_by_ai', 'timestamp'
    ]
    search_fields = [
        'purchase_order__number', 'user__username', 'action', 'notes'
    ]
    readonly_fields = ['timestamp']
    
    def has_add_permission(self, request):
        return False  # L'historique est créé automatiquement


@admin.register(PurchaseOrderTemplate)
class PurchaseOrderTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'supplier', 'created_by', 'usage_count', 
        'is_active', 'created_at'
    ]
    list_filter = [
        'is_active', 'created_at', 'supplier'
    ]
    search_fields = [
        'name', 'description', 'supplier__name'
    ]
    readonly_fields = ['usage_count', 'created_at', 'updated_at']
    
    fieldsets = (
        (_('Template'), {
            'fields': ('name', 'description', 'supplier', 'is_active')
        }),
        (_('Données'), {
            'fields': ('template_data',),
            'classes': ('collapse',)
        }),
        (_('Statistiques'), {
            'fields': ('usage_count', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PurchaseOrderAttachment)
class PurchaseOrderAttachmentAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'purchase_order', 'uploaded_by', 'uploaded_at', 'file_link'
    ]
    list_filter = ['uploaded_at']
    search_fields = [
        'name', 'purchase_order__number', 'description'
    ]
    readonly_fields = ['uploaded_at']
    
    def file_link(self, obj):
        if obj.file:
            return format_html(
                '<a href="{}" target="_blank">Télécharger</a>',
                obj.file.url
            )
        return '-'
    file_link.short_description = _('Fichier')


class PurchaseOrderReceiptItemInline(admin.TabularInline):
    model = PurchaseOrderReceiptItem
    extra = 0
    fields = [
        'purchase_order_item', 'quantity_received', 'quality_ok', 
        'quality_notes', 'quantity_variance'
    ]
    readonly_fields = ['quantity_variance']


@admin.register(PurchaseOrderReceipt)
class PurchaseOrderReceiptAdmin(admin.ModelAdmin):
    list_display = [
        'receipt_number', 'purchase_order', 'receipt_date', 
        'received_by', 'carrier', 'created_at'
    ]
    list_filter = ['receipt_date', 'created_at', 'carrier']
    search_fields = [
        'receipt_number', 'purchase_order__number', 'delivery_note', 'tracking_number'
    ]
    readonly_fields = ['created_at']
    inlines = [PurchaseOrderReceiptItemInline]
    
    fieldsets = (
        (_('Réception'), {
            'fields': (
                'purchase_order', 'receipt_number', 'receipt_date', 'received_by'
            )
        }),
        (_('Livraison'), {
            'fields': ('delivery_note', 'carrier', 'tracking_number')
        }),
        (_('Notes'), {
            'fields': ('notes',)
        }),
        (_('Audit'), {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(PurchaseOrderReceiptItem)
class PurchaseOrderReceiptItemAdmin(admin.ModelAdmin):
    list_display = [
        'receipt', 'purchase_order_item', 'quantity_received', 
        'quality_ok', 'quantity_variance'
    ]
    list_filter = ['quality_ok', 'receipt__receipt_date']
    search_fields = [
        'receipt__receipt_number', 'purchase_order_item__description'
    ]
    readonly_fields = ['quantity_variance']


# Configuration de l'admin principal
admin.site.site_header = _('Administration ProcureGenius')
admin.site.site_title = _('ProcureGenius Admin')
admin.site.index_title = _('Tableau de bord administrateur')