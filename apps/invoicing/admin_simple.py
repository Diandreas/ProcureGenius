from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Administration des factures"""
    list_display = ('invoice_number', 'title', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('invoice_number', 'title', 'description')
