from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django_tenants.admin import TenantAdminMixin
from .models import Tenant, Domain, CustomUser, UserPreferences


@admin.register(Tenant)
class TenantAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ['name', 'schema_name', 'created_at', 'is_active']
    list_filter = ['created_at', 'is_active', 'province', 'ai_enabled']
    search_fields = ['name', 'business_number', 'email']
    readonly_fields = ['schema_name', 'created_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'schema_name', 'business_number', 'email', 'phone')
        }),
        ('Adresse', {
            'fields': ('address', 'city', 'province', 'postal_code')
        }),
        ('Configuration IA', {
            'fields': ('ai_enabled', 'ai_automation_level')
        }),
        ('Statut', {
            'fields': ('is_active', 'created_at')
        }),
    )


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['domain', 'tenant', 'is_primary']
    list_filter = ['is_primary']
    search_fields = ['domain']


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'language', 'is_staff']
    list_filter = ['role', 'language', 'is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('phone', 'language', 'role')
        }),
        ('Préférences IA', {
            'fields': ('ai_notifications', 'ai_auto_approve_limit')
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('phone', 'language', 'role')
        }),
    )


@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    list_display = ['user', 'user_role', 'user_language']
    list_filter = ['user__role', 'user__language']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']
    
    def user_role(self, obj):
        return obj.user.get_role_display()
    user_role.short_description = 'Rôle'
    
    def user_language(self, obj):
        return obj.user.get_language_display()
    user_language.short_description = 'Langue'