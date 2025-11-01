"""
Django Admin configuration for Subscriptions app
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import SubscriptionPlan, Subscription, SubscriptionPayment


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'price_monthly', 'price_yearly',
        'has_ads_badge', 'has_ai_badge', 'trial_days',
        'is_active', 'sort_order'
    ]
    list_filter = ['is_active', 'has_ads', 'has_ai_assistant', 'code']
    search_fields = ['name', 'code', 'description']
    ordering = ['sort_order', 'price_monthly']

    fieldsets = (
        ('Identification', {
            'fields': ('code', 'name', 'description', 'is_active', 'sort_order')
        }),
        ('Tarification', {
            'fields': ('price_monthly', 'price_yearly', 'currency', 'trial_days')
        }),
        ('Quotas', {
            'fields': (
                'max_invoices_per_month',
                'max_clients',
                'max_products',
                'max_purchase_orders_per_month',
                'max_suppliers',
                'max_storage_mb',
                'max_ai_requests_per_month',
            )
        }),
        ('Fonctionnalités', {
            'fields': (
                'has_ads',
                'has_ai_assistant',
                'has_purchase_orders',
                'has_suppliers',
                'has_e_sourcing',
                'has_contracts',
                'has_analytics',
            )
        }),
    )

    def has_ads_badge(self, obj):
        if obj.has_ads:
            return format_html('<span style="color: orange;">🔔 Pub</span>')
        return format_html('<span style="color: green;">✓ Sans pub</span>')
    has_ads_badge.short_description = 'Publicités'

    def has_ai_badge(self, obj):
        if obj.has_ai_assistant:
            if obj.max_ai_requests_per_month == -1:
                return format_html('<span style="color: green;">🤖 Illimité</span>')
            return format_html(f'<span style="color: blue;">🤖 {obj.max_ai_requests_per_month}/mois</span>')
        return format_html('<span style="color: gray;">-</span>')
    has_ai_badge.short_description = 'IA'


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'organization', 'plan', 'status', 'billing_period',
        'trial_badge', 'current_period_end', 'usage_summary'
    ]
    list_filter = ['status', 'plan', 'billing_period', 'payment_method']
    search_fields = ['organization__name', 'plan__name', 'paypal_subscription_id']
    readonly_fields = ['started_at', 'created_at', 'updated_at']
    date_hierarchy = 'started_at'

    fieldsets = (
        ('Abonnement', {
            'fields': ('organization', 'plan', 'status', 'billing_period')
        }),
        ('Période et essai', {
            'fields': (
                'started_at', 'trial_ends_at',
                'current_period_start', 'current_period_end',
                'cancelled_at'
            )
        }),
        ('Paiement', {
            'fields': ('payment_method', 'paypal_subscription_id')
        }),
        ('Utilisation mensuelle', {
            'fields': (
                'invoices_this_month',
                'purchase_orders_this_month',
                'ai_requests_this_month',
            )
        }),
        ('Métadonnées', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )

    def trial_badge(self, obj):
        if obj.is_trial:
            days = obj.trial_days_remaining
            return format_html(f'<span style="color: orange;">🎁 Essai ({days}j)</span>')
        return '-'
    trial_badge.short_description = 'Essai'

    def usage_summary(self, obj):
        can_invoice, used_invoices, limit_invoices = obj.check_quota('invoices')
        can_ai, used_ai, limit_ai = obj.check_quota('ai_requests')

        invoice_color = 'green' if can_invoice else 'red'
        ai_text = 'N/A' if limit_ai is None else (f'{used_ai}' if limit_ai == -1 else f'{used_ai}/{limit_ai}')

        return format_html(
            f'<span style="color: {invoice_color};">📄 {used_invoices}/{limit_invoices if limit_invoices else "N/A"}</span> | '
            f'<span>🤖 {ai_text}</span>'
        )
    usage_summary.short_description = 'Utilisation'

    actions = ['reset_monthly_quotas', 'renew_subscriptions']

    def reset_monthly_quotas(self, request, queryset):
        for subscription in queryset:
            subscription.reset_monthly_quotas()
        self.message_user(request, f'{queryset.count()} abonnements réinitialisés')
    reset_monthly_quotas.short_description = 'Réinitialiser quotas mensuels'

    def renew_subscriptions(self, request, queryset):
        for subscription in queryset:
            subscription.renew_period()
        self.message_user(request, f'{queryset.count()} abonnements renouvelés')
    renew_subscriptions.short_description = 'Renouveler périodes'


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = [
        'subscription', 'amount', 'status', 'payment_method',
        'period_start', 'period_end', 'created_at'
    ]
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = [
        'subscription__organization__name',
        'transaction_id',
        'paypal_order_id'
    ]
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Paiement', {
            'fields': (
                'subscription', 'amount', 'currency',
                'status', 'payment_method'
            )
        }),
        ('Transaction', {
            'fields': ('transaction_id', 'paypal_order_id')
        }),
        ('Période couverte', {
            'fields': ('period_start', 'period_end')
        }),
        ('Métadonnées', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )
