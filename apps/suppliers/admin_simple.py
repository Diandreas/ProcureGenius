from django.contrib import admin
from .models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    """Administration des fournisseurs"""
    list_display = ('name', 'contact_person', 'email', 'phone', 'is_active')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'contact_person', 'email')
