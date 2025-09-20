from django.contrib import admin
from .models import AIAssistant


@admin.register(AIAssistant)
class AIAssistantAdmin(admin.ModelAdmin):
    """Administration de l'assistant IA"""
    pass
