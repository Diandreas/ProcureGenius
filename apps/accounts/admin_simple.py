from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserPreferences


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Administration des utilisateurs"""
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active')
    list_filter = ('role', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('phone', 'language', 'role', 'ai_notifications')
        }),
    )


@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    """Administration des préférences utilisateur"""
    list_display = ('user', 'created_at')
    search_fields = ('user__username', 'user__email')
