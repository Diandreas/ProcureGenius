from django.contrib import admin
from .models import PurchaseOrder, PurchaseOrderItem


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    """Administration des bons de commande"""
    list_display = ('po_number', 'title', 'status', 'priority', 'total_amount', 'created_at')
    list_filter = ('status', 'priority', 'created_at')
    search_fields = ('po_number', 'title', 'description')
    readonly_fields = ('po_number', 'created_at', 'updated_at')


@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    """Administration des articles de BC"""
    list_display = ('product_code', 'description', 'quantity', 'unit_price', 'total_price')
    search_fields = ('product_code', 'description')
