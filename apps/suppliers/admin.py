from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import (
    Supplier, Product, Client, ProductCategory, 
    SupplierContact, SupplierDocument, SupplierPerformance
)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'contact_person', 'email', 'city', 'province', 
        'status', 'rating', 'is_local', 'created_at'
    ]
    list_filter = [
        'status', 'province', 'is_local', 'is_minority_owned', 
        'is_indigenous', 'is_woman_owned', 'created_at'
    ]
    search_fields = ['name', 'legal_name', 'email', 'contact_person', 'city']
    readonly_fields = ['created_at', 'updated_at', 'ai_risk_score', 'ai_performance_score']
    filter_horizontal = ['categories']
    
    fieldsets = (
        (_('Informations générales'), {
            'fields': ('name', 'legal_name', 'business_number', 'status', 'rating')
        }),
        (_('Contact'), {
            'fields': ('contact_person', 'email', 'phone', 'website')
        }),
        (_('Adresse'), {
            'fields': ('address', 'city', 'province', 'postal_code', 'country')
        }),
        (_('Termes commerciaux'), {
            'fields': ('payment_terms', 'currency', 'categories')
        }),
        (_('Diversité et certification'), {
            'fields': (
                'is_local', 'is_minority_owned', 'is_indigenous', 
                'is_woman_owned', 'certifications'
            )
        }),
        (_('IA et analyse'), {
            'fields': ('ai_risk_score', 'ai_performance_score', 'ai_analysis'),
            'classes': ('collapse',)
        }),
        (_('Audit'), {
            'fields': ('created_at', 'updated_at', 'last_order_date'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('categories')


class SupplierContactInline(admin.TabularInline):
    model = SupplierContact
    extra = 1
    fields = ['name', 'title', 'contact_type', 'email', 'phone', 'is_primary', 'is_active']


class SupplierDocumentInline(admin.TabularInline):
    model = SupplierDocument
    extra = 0
    fields = ['name', 'document_type', 'file', 'expiry_date']
    readonly_fields = ['upload_date']


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'code', 'product_count']
    list_filter = ['parent']
    search_fields = ['name', 'code', 'description']
    prepopulated_fields = {'code': ('name',)}
    
    def product_count(self, obj):
        return obj.product_set.count()
    product_count.short_description = _('Nombre de produits')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'sku', 'supplier', 'category', 'unit_price', 
        'is_available', 'stock_quantity', 'created_at'
    ]
    list_filter = [
        'supplier', 'category', 'is_available', 'created_at'
    ]
    search_fields = ['name', 'sku', 'description', 'supplier__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (_('Informations générales'), {
            'fields': ('supplier', 'category', 'sku', 'name', 'description', 'image')
        }),
        (_('Prix et quantités'), {
            'fields': (
                'unit_price', 'bulk_price', 'bulk_quantity', 
                'is_available', 'stock_quantity', 'lead_time_days', 
                'minimum_order_quantity'
            )
        }),
        (_('Spécifications'), {
            'fields': ('specifications',),
            'classes': ('collapse',)
        }),
        (_('IA et prévisions'), {
            'fields': ('ai_demand_forecast', 'ai_price_trend'),
            'classes': ('collapse',)
        }),
        (_('Audit'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('supplier', 'category')


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'contact_person', 'email', 'payment_terms', 
        'credit_limit', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'payment_terms', 'created_at']
    search_fields = ['name', 'legal_name', 'email', 'contact_person']
    readonly_fields = ['created_at', 'ai_payment_risk_score']
    
    fieldsets = (
        (_('Informations générales'), {
            'fields': ('name', 'legal_name', 'business_number', 'is_active')
        }),
        (_('Contact'), {
            'fields': ('contact_person', 'email', 'phone', 'billing_address')
        }),
        (_('Termes commerciaux'), {
            'fields': ('payment_terms', 'credit_limit')
        }),
        (_('IA et analyse'), {
            'fields': ('ai_payment_risk_score', 'ai_payment_pattern'),
            'classes': ('collapse',)
        }),
        (_('Audit'), {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(SupplierContact)
class SupplierContactAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'supplier', 'contact_type', 'email', 'phone', 
        'is_primary', 'is_active'
    ]
    list_filter = ['contact_type', 'is_primary', 'is_active', 'created_at']
    search_fields = ['name', 'email', 'supplier__name']
    readonly_fields = ['created_at']
    
    fieldsets = (
        (_('Contact'), {
            'fields': ('supplier', 'name', 'title', 'contact_type')
        }),
        (_('Coordonnées'), {
            'fields': ('email', 'phone', 'mobile')
        }),
        (_('Paramètres'), {
            'fields': ('is_primary', 'is_active', 'notes')
        }),
        (_('Audit'), {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(SupplierDocument)
class SupplierDocumentAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'supplier', 'document_type', 'upload_date', 
        'expiry_date', 'uploaded_by', 'is_expired_display'
    ]
    list_filter = ['document_type', 'upload_date', 'expiry_date']
    search_fields = ['name', 'supplier__name', 'description']
    readonly_fields = ['upload_date']
    
    def is_expired_display(self, obj):
        if obj.is_expired():
            return _('Expiré')
        elif obj.expiry_date:
            return _('Valide')
        return _('Pas d\'expiration')
    is_expired_display.short_description = _('Statut')
    
    fieldsets = (
        (_('Document'), {
            'fields': ('supplier', 'name', 'document_type', 'file')
        }),
        (_('Détails'), {
            'fields': ('description', 'expiry_date')
        }),
        (_('Audit'), {
            'fields': ('uploaded_by', 'upload_date'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Création
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(SupplierPerformance)
class SupplierPerformanceAdmin(admin.ModelAdmin):
    list_display = [
        'supplier', 'period_start', 'period_end', 'overall_score',
        'delivery_score', 'quality_score', 'calculated_by_ai'
    ]
    list_filter = ['calculated_by_ai', 'period_start', 'created_at']
    search_fields = ['supplier__name']
    readonly_fields = ['created_at']
    
    fieldsets = (
        (_('Période'), {
            'fields': ('supplier', 'period_start', 'period_end')
        }),
        (_('Scores de performance'), {
            'fields': (
                'delivery_score', 'quality_score', 'price_competitiveness',
                'responsiveness_score', 'overall_score'
            )
        }),
        (_('Données brutes'), {
            'fields': ('total_orders', 'on_time_deliveries', 'quality_issues')
        }),
        (_('IA'), {
            'fields': ('calculated_by_ai',)
        }),
        (_('Audit'), {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('supplier')


# Configuration de l'admin avec des inlines
class SupplierAdminWithInlines(SupplierAdmin):
    inlines = [SupplierContactInline, SupplierDocumentInline]

# Remplacer l'admin par défaut
admin.site.unregister(Supplier)
admin.site.register(Supplier, SupplierAdminWithInlines)