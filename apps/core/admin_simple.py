from django.contrib import admin
from .models import Core


@admin.register(Core)
class CoreAdmin(admin.ModelAdmin):
    """Administration du core"""
    pass
