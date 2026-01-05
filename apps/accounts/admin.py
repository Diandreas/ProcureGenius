from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Client


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Administration des utilisateurs"""
    list_display = ('username', 'email', 'first_name', 'last_name', 'company', 'is_active')
    list_filter = ('is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'company')

    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('phone', 'company')
        }),
    )


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """Administration des clients"""
    list_display = ('name', 'email', 'contact_person', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'email', 'contact_person')
    ordering = ['name']
