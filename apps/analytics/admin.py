from django.contrib import admin
from .models import Analytics, Visit


@admin.register(Analytics)
class AnalyticsAdmin(admin.ModelAdmin):
    """Administration des analytics"""
    pass


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    """Visites anonymes du site public."""
    list_display = (
        'created_at', 'anon_id', 'path', 'referrer_domain',
        'utm_source', 'device_type', 'country', 'converted_user',
    )
    list_filter = ('device_type', 'utm_source', 'referrer_domain', 'created_at')
    search_fields = ('anon_id', 'path', 'referrer_domain', 'utm_campaign')
    date_hierarchy = 'created_at'
    readonly_fields = [f.name for f in Visit._meta.fields]

    def has_add_permission(self, request):
        return False
