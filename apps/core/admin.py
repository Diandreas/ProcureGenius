from django.contrib import admin
from .models import Core, OrganizationSettings


@admin.register(Core)
class CoreAdmin(admin.ModelAdmin):
    """Administration du core"""
    pass


@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(admin.ModelAdmin):
    """Paramètres d'organisation — activation des relances automatiques
    d'impayés en attendant un toggle dédié côté interface."""
    list_display = ('organization', 'auto_reminders_enabled', 'default_currency', 'tax_region')
    list_filter = ('auto_reminders_enabled', 'tax_region', 'default_currency')
    search_fields = ('organization__name', 'company_name')
    autocomplete_fields = ('organization',)
    fieldsets = (
        (None, {'fields': ('organization',)}),
        ('Relances automatiques d\'impayés', {
            'fields': (
                'auto_reminders_enabled',
                'reminder_delay_1', 'reminder_delay_2', 'reminder_delay_3',
                'reminder_max_count',
            ),
        }),
    )
