from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Integration, SyncLog, WebhookEndpoint, APIConnection


@admin.register(Integration)
class IntegrationAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'integration_type', 'status', 'last_sync',
        'sync_count', 'error_count', 'is_active'
    ]
    list_filter = ['integration_type', 'status', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'endpoint_url']
    readonly_fields = ['sync_count', 'error_count', 'last_sync', 'created_at', 'updated_at']


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = [
        'integration', 'sync_type', 'status', 'records_processed',
        'records_success', 'records_failed', 'started_at'
    ]
    list_filter = ['sync_type', 'status', 'started_at']
    search_fields = ['integration__name']
    readonly_fields = ['started_at', 'completed_at', 'duration_seconds']


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'endpoint_path', 'request_count',
        'last_request', 'is_active'
    ]
    list_filter = ['is_active', 'created_at', 'last_request']
    search_fields = ['name', 'endpoint_path']
    readonly_fields = ['request_count', 'last_request', 'created_at', 'updated_at']