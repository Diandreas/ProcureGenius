from django.contrib import admin
from .models import Analytics


@admin.register(Analytics)
class AnalyticsAdmin(admin.ModelAdmin):
    """Administration des analytics"""
    pass
