from django.contrib import admin
from .models import MigrationJob, MigrationLog, QuickBooksConnection


@admin.register(MigrationJob)
class MigrationJobAdmin(admin.ModelAdmin):
    list_display = ['name', 'source_type', 'entity_type', 'status', 'progress_percentage', 'success_count', 'error_count', 'created_at']
    list_filter = ['status', 'source_type', 'entity_type', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at', 'started_at', 'completed_at', 'processed_rows', 'success_count', 'error_count', 'skipped_count']

    def progress_percentage(self, obj):
        return f"{obj.progress_percentage:.1f}%"
    progress_percentage.short_description = "Progression"


@admin.register(MigrationLog)
class MigrationLogAdmin(admin.ModelAdmin):
    list_display = ['job', 'level', 'row_number', 'message', 'created_at']
    list_filter = ['level', 'created_at']
    search_fields = ['message']
    readonly_fields = ['created_at']


@admin.register(QuickBooksConnection)
class QuickBooksConnectionAdmin(admin.ModelAdmin):
    list_display = ['user', 'company_name', 'realm_id', 'is_active', 'connected_at', 'last_sync_at']
    list_filter = ['is_active', 'connected_at']
    search_fields = ['user__username', 'company_name', 'realm_id']
    readonly_fields = ['connected_at', 'last_sync_at']
