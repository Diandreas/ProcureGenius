from django.contrib import admin
from .models import DashboardWidget, SystemNotification, UserNotificationRead, QuickAction, SystemSetting


@admin.register(DashboardWidget)
class DashboardWidgetAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'widget_type', 'is_active', 'created_at']
    list_filter = ['widget_type', 'is_active', 'created_at']
    search_fields = ['title', 'user__username', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Widget', {
            'fields': ('user', 'widget_type', 'title', 'configuration')
        }),
        ('Position et taille', {
            'fields': ('position_x', 'position_y', 'width', 'height')
        }),
        ('Statut', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )


@admin.register(SystemNotification)
class SystemNotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'notification_type', 'target_all_users', 'is_active', 'start_date', 'end_date']
    list_filter = ['notification_type', 'is_active', 'target_all_users', 'created_at']
    search_fields = ['title', 'message']
    filter_horizontal = ['target_users']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Notification', {
            'fields': ('title', 'message', 'notification_type')
        }),
        ('Ciblage', {
            'fields': ('target_all_users', 'target_roles', 'target_users')
        }),
        ('Planification', {
            'fields': ('is_active', 'start_date', 'end_date')
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'created_at')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Création
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(UserNotificationRead)
class UserNotificationReadAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification', 'read_at']
    list_filter = ['read_at']
    search_fields = ['user__username', 'notification__title']
    readonly_fields = ['read_at']


@admin.register(QuickAction)
class QuickActionAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'url', 'order', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'user__username', 'description']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Action', {
            'fields': ('user', 'title', 'description', 'icon', 'url')
        }),
        ('Paramètres', {
            'fields': ('order', 'is_active')
        }),
        ('Métadonnées', {
            'fields': ('created_at',)
        }),
    )


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'value_preview', 'is_public', 'updated_at']
    list_filter = ['is_public', 'created_at', 'updated_at']
    search_fields = ['key', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    def value_preview(self, obj):
        return obj.value[:50] + ('...' if len(obj.value) > 50 else '')
    value_preview.short_description = 'Valeur'
    
    fieldsets = (
        ('Paramètre', {
            'fields': ('key', 'value', 'description')
        }),
        ('Options', {
            'fields': ('is_public',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at')
        }),
    )