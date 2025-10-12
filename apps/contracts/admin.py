from django.contrib import admin
from .models import Contract, ContractClause, ContractMilestone, ContractDocument, ContractItem


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['contract_number', 'title', 'contract_type', 'status', 'supplier', 'start_date', 'end_date', 'total_value']
    list_filter = ['status', 'contract_type', 'auto_renewal', 'created_at']
    search_fields = ['contract_number', 'title', 'description', 'supplier__name']
    readonly_fields = ['contract_number', 'created_at', 'updated_at', 'approved_at', 'terminated_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Informations générales', {
            'fields': ('contract_number', 'title', 'contract_type', 'status', 'description')
        }),
        ('Parties', {
            'fields': ('supplier', 'internal_contact')
        }),
        ('Termes', {
            'fields': ('terms_and_conditions', 'payment_terms')
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date', 'created_at', 'updated_at', 'approved_at', 'terminated_at')
        }),
        ('Montants', {
            'fields': ('total_value', 'currency')
        }),
        ('Renouvellement', {
            'fields': ('auto_renewal', 'renewal_notice_days', 'renewal_count')
        }),
        ('Alertes', {
            'fields': ('alert_days_before_expiry', 'last_alert_sent')
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'approved_by', 'internal_notes')
        }),
    )


@admin.register(ContractClause)
class ContractClauseAdmin(admin.ModelAdmin):
    list_display = ['title', 'contract', 'clause_type', 'risk_level', 'extracted_by_ai', 'verified']
    list_filter = ['clause_type', 'risk_level', 'extracted_by_ai', 'verified', 'created_at']
    search_fields = ['title', 'content', 'section_reference', 'contract__contract_number']
    readonly_fields = ['created_at', 'updated_at', 'verified_at']


@admin.register(ContractMilestone)
class ContractMilestoneAdmin(admin.ModelAdmin):
    list_display = ['title', 'contract', 'due_date', 'status', 'payment_amount', 'completed_at']
    list_filter = ['status', 'due_date']
    search_fields = ['title', 'description', 'contract__contract_number']
    readonly_fields = ['completed_at', 'created_at', 'updated_at']


@admin.register(ContractDocument)
class ContractDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'contract', 'document_type', 'uploaded_by', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['title', 'description', 'contract__contract_number']
    readonly_fields = ['file_size', 'mime_type', 'uploaded_at']


@admin.register(ContractItem)
class ContractItemAdmin(admin.ModelAdmin):
    list_display = ['contract', 'product', 'contracted_price', 'min_quantity', 'max_quantity', 'created_at']
    list_filter = ['created_at', 'contract__status']
    search_fields = ['contract__contract_number', 'product__name', 'product__reference']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['contract', 'product']
