from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Client, Organization, UserPreferences, UserPermissions


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Administration des organisations"""
    list_display = ('name', 'subscription_type', 'created_at')
    list_filter = ('subscription_type', 'created_at')
    search_fields = ('name',)
    ordering = ['name']


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Administration des utilisateurs"""
    list_display = ('username', 'email', 'first_name', 'last_name', 'organization', 'role', 'is_active')
    list_filter = ('is_active', 'is_staff', 'role', 'organization', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'company')

    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('phone', 'organization', 'company', 'role')
        }),
    )


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """Administration des clients"""
    list_display = ('name', 'email', 'contact_person', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'email', 'contact_person')
    ordering = ['name']


@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    """Administration des préférences utilisateur"""
    list_display = ('user', 'onboarding_completed', 'updated_at')
    list_filter = ('onboarding_completed', 'updated_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserPermissions)
class UserPermissionsAdmin(admin.ModelAdmin):
    """Administration des permissions utilisateur"""
    list_display = ('user', 'can_manage_users', 'can_manage_settings', 'can_view_analytics', 'can_approve_purchases')
    list_filter = ('can_manage_users', 'can_manage_settings', 'can_view_analytics', 'can_approve_purchases')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'updated_at')
