from django.contrib import admin
from .models import Report, ReportTemplate


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'is_default', 'is_active', 'created_at']
    list_filter = ['report_type', 'is_default', 'is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {
            'fields': ('name', 'report_type', 'description')
        }),
        ('Configuration', {
            'fields': ('configuration', 'is_default', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['report_type', 'format', 'status', 'generated_by', 'generated_at', 'file_size_display']
    list_filter = ['report_type', 'format', 'status', 'generated_at']
    search_fields = ['generated_by__username', 'generated_by__email']
    readonly_fields = ['generated_at', 'completed_at', 'file_size', 'download_count', 'last_downloaded_at']
    date_hierarchy = 'generated_at'

    fieldsets = (
        (None, {
            'fields': ('template', 'report_type', 'format', 'status')
        }),
        ('Paramètres', {
            'fields': ('parameters',),
            'classes': ('collapse',)
        }),
        ('Fichier', {
            'fields': ('file_path', 'file_size')
        }),
        ('Erreur', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('generated_by', 'generated_at', 'completed_at', 'download_count', 'last_downloaded_at'),
            'classes': ('collapse',)
        }),
    )

    def file_size_display(self, obj):
        if obj.file_size:
            if obj.file_size < 1024:
                return f"{obj.file_size} B"
            elif obj.file_size < 1024 * 1024:
                return f"{obj.file_size / 1024:.1f} KB"
            else:
                return f"{obj.file_size / (1024 * 1024):.1f} MB"
        return "-"
    file_size_display.short_description = "Taille"
