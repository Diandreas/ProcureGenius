from django.contrib import admin
from django.utils.html import format_html
from .models import Product, Invoice, InvoiceItem, PrintTemplate, PrintConfiguration, PrintHistory


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Administration des produits"""
    list_display = (
        'name', 'reference', 'product_type', 'price', 'stock_badge', 
        'is_active', 'created_at'
    )
    list_filter = ('product_type', 'is_active')
    search_fields = ('name', 'reference', 'barcode', 'description')
    readonly_fields = ('reference', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'description', 'reference', 'barcode', 'product_type', 'is_active')
        }),
        ('Prix', {
            'fields': ('price', 'cost_price')
        }),
        ('Stock', {
            'fields': ('stock_quantity', 'low_stock_threshold'),
            'description': 'Applicable uniquement aux produits physiques'
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def stock_badge(self, obj):
        """Affiche le statut du stock avec une couleur"""
        if obj.product_type != 'physical':
            return format_html('<span style="color: #6b7280;">Service</span>')
        
        if obj.is_out_of_stock:
            return format_html(
                '<span style="color: #dc2626; font-weight: bold;">Rupture (0)</span>'
            )
        elif obj.is_low_stock:
            return format_html(
                '<span style="color: #d97706; font-weight: bold;">Stock bas ({} restant)</span>',
                obj.stock_quantity
            )
        else:
            return format_html(
                '<span style="color: #059669; font-weight: bold;">{} en stock</span>',
                obj.stock_quantity
            )
    stock_badge.short_description = 'Stock'
    
    def get_queryset(self, request):
        """Optimise les requêtes"""
        return super().get_queryset(request).select_related()


class InvoiceItemInline(admin.TabularInline):
    """Gestion des éléments de facture en inline"""
    model = InvoiceItem
    extra = 1
    fields = (
        'service_code', 'description', 'quantity', 'unit_price', 
        'unit_of_measure', 'discount_percent', 'total_price'
    )
    readonly_fields = ('total_price',)
    
    def get_readonly_fields(self, request, obj=None):
        """Rend total_price en lecture seule"""
        return self.readonly_fields


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Administration des factures avec gestion des éléments"""
    list_display = (
        'invoice_number', 'title', 'status_badge', 'client_name', 
        'items_count', 'total_amount', 'created_at'
    )
    list_filter = ('status', 'created_at', 'currency')
    search_fields = ('invoice_number', 'title', 'description', 'client__username')
    readonly_fields = ('invoice_number', 'subtotal', 'total_amount', 'qr_code_display')
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('invoice_number', 'title', 'description', 'status')
        }),
        ('Client et relations', {
            'fields': ('client', 'purchase_order', 'created_by')
        }),
        ('Dates', {
            'fields': ('due_date',)
        }),
        ('Facturation', {
            'fields': ('billing_address', 'payment_terms', 'payment_method', 'currency')
        }),
        ('Totaux (calculés automatiquement)', {
            'fields': ('subtotal', 'tax_amount', 'total_amount'),
            'classes': ('collapse',)
        }),
        ('QR Code', {
            'fields': ('qr_code_display',),
            'classes': ('collapse',)
        })
    )
    
    inlines = [InvoiceItemInline]
    
    def status_badge(self, obj):
        """Affiche le statut avec une couleur"""
        colors = {
            'draft': '#6c757d',
            'sent': '#007bff',
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
    status_badge.short_description = 'Statut'
    
    def client_name(self, obj):
        """Affiche le nom du client"""
        return obj.client.get_full_name() if obj.client else '-'
    client_name.short_description = 'Client'
    
    def items_count(self, obj):
        """Affiche le nombre d'éléments"""
        count = obj.get_items_count()
        return format_html(
            '<span style="font-weight: bold;">{} élément{}</span>',
            count,
            's' if count > 1 else ''
        )
    items_count.short_description = 'Éléments'
    
    def qr_code_display(self, obj):
        """Affiche le QR code"""
        if obj.pk:
            try:
                qr_data = obj.qr_code_data
                return format_html(
                    '<img src="data:image/png;base64,{}" style="max-width: 200px;">',
                    qr_data
                )
            except:
                return "Erreur génération QR code"
        return "Sauvegardez d'abord la facture"
    qr_code_display.short_description = 'QR Code'
    
    def save_model(self, request, obj, form, change):
        """Sauvegarde avec recalcul des totaux"""
        if not change:  # Nouvelle facture
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        obj.recalculate_totals()
    
    def save_related(self, request, form, formsets, change):
        """Sauvegarde des éléments liés avec recalcul"""
        super().save_related(request, form, formsets, change)
        form.instance.recalculate_totals()


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    """Administration des éléments de facture"""
    list_display = (
        'invoice_number', 'service_code', 'description', 
        'quantity', 'unit_price', 'total_price'
    )
    list_filter = ('invoice__status', 'service_code', 'unit_of_measure')
    search_fields = ('description', 'service_code', 'invoice__invoice_number')
    readonly_fields = ('total_price',)
    
    def invoice_number(self, obj):
        """Affiche le numéro de facture"""
        return obj.invoice.invoice_number
    invoice_number.short_description = 'N° Facture'


@admin.register(PrintTemplate)
class PrintTemplateAdmin(admin.ModelAdmin):
    """Administration des templates d'impression"""
    list_display = ('name', 'template_type', 'is_default', 'created_at')
    list_filter = ('template_type', 'is_default')
    search_fields = ('name',)


@admin.register(PrintConfiguration)
class PrintConfigurationAdmin(admin.ModelAdmin):
    """Administration des configurations d'impression"""
    list_display = ('name', 'paper_size', 'orientation', 'is_default')
    list_filter = ('paper_size', 'orientation', 'is_default')


@admin.register(PrintHistory)
class PrintHistoryAdmin(admin.ModelAdmin):
    """Administration de l'historique d'impression"""
    list_display = ('document_number', 'document_type', 'printed_by', 'printed_at', 'print_format')
    list_filter = ('document_type', 'print_format', 'printed_at')
    search_fields = ('document_number',)
    readonly_fields = ('printed_at',)
