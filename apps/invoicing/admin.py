from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import (
    Invoice, InvoiceItem, Payment, InvoiceReminder,
    RecurringInvoice, InvoiceTemplate, InvoiceAttachment,
    PayPalTransaction
)


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    fields = ['description', 'quantity', 'unit_price', 'total_price', 'account_code']
    readonly_fields = ['total_price']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'number', 'client', 'status_colored', 'total_amount',
        'invoice_date', 'due_date', 'created_by', 'balance_due'
    ]
    list_filter = [
        'status', 'invoice_date', 'due_date', 'created_at',
        'generated_by_ai', 'is_recurring'
    ]
    search_fields = ['number', 'client__name', 'notes']
    readonly_fields = ['number', 'created_at', 'updated_at', 'sent_at']
    inlines = [InvoiceItemInline]
    
    fieldsets = (
        (_('Informations générales'), {
            'fields': (
                'number', 'client', 'purchase_order', 'status',
                'created_by'
            )
        }),
        (_('Dates'), {
            'fields': ('invoice_date', 'due_date', 'sent_at')
        }),
        (_('Montants'), {
            'fields': (
                'subtotal', 'tax_gst_hst_rate', 'tax_gst_hst',
                'tax_qst_rate', 'tax_qst', 'total_amount'
            )
        }),
        (_('Paiement'), {
            'fields': ('payment_terms', 'payment_method', 'billing_address')
        }),
        (_('PayPal'), {
            'fields': ('paypal_payment_id', 'paypal_status'),
            'classes': ('collapse',)
        }),
        (_('Facturation récurrente'), {
            'fields': ('is_recurring', 'recurring_pattern'),
            'classes': ('collapse',)
        }),
        (_('Notes'), {
            'fields': ('notes', 'terms_conditions')
        }),
        (_('IA'), {
            'fields': ('generated_by_ai', 'ai_analysis'),
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
            'sent': '#007bff',
            'viewed': '#17a2b8',
            'partial': '#ffc107',
            'paid': '#28a745',
            'overdue': '#dc3545',
            'cancelled': '#343a40',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_colored.short_description = _('Statut')
    
    def balance_due(self, obj):
        balance = obj.get_balance_due()
        if balance.amount > 0:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;">{}</span>',
                balance
            )
        else:
            return format_html(
                '<span style="color: #28a745;">✓ Payé</span>'
            )
    balance_due.short_description = _('Solde dû')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'invoice', 'amount', 'payment_date', 'payment_method',
        'reference', 'created_by'
    ]
    list_filter = ['payment_method', 'payment_date', 'created_at']
    search_fields = ['invoice__number', 'reference', 'paypal_transaction_id']
    readonly_fields = ['created_at']
    
    fieldsets = (
        (_('Paiement'), {
            'fields': ('invoice', 'amount', 'payment_date', 'payment_method')
        }),
        (_('Référence'), {
            'fields': ('reference', 'notes')
        }),
        (_('PayPal'), {
            'fields': ('paypal_transaction_id', 'paypal_payer_email', 'paypal_fee'),
            'classes': ('collapse',)
        }),
        (_('Audit'), {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PayPalTransaction)
class PayPalTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'paypal_transaction_id', 'invoice', 'transaction_type',
        'status', 'gross_amount', 'fee_amount', 'transaction_date'
    ]
    list_filter = ['transaction_type', 'status', 'transaction_date']
    search_fields = ['paypal_transaction_id', 'invoice__number', 'payer_email']
    readonly_fields = ['transaction_date', 'created_at']


@admin.register(RecurringInvoice)
class RecurringInvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'client', 'frequency', 'next_invoice_date',
        'invoices_generated', 'is_active'
    ]
    list_filter = ['frequency', 'is_active', 'created_at']
    search_fields = ['name', 'client__name', 'description']
    readonly_fields = ['invoices_generated', 'last_generated', 'created_at', 'updated_at']