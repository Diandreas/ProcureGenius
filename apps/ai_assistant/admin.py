from django.contrib import admin
from .models import AIAssistant, MessageFeedback


@admin.register(AIAssistant)
class AIAssistantAdmin(admin.ModelAdmin):
    """Administration de l'assistant IA"""
    pass


@admin.register(MessageFeedback)
class MessageFeedbackAdmin(admin.ModelAdmin):
    """Feedbacks utilisateurs sur les réponses IA (boucle qualité)."""
    list_display = ('created_at', 'user', 'rating', 'short_comment', 'message_preview')
    list_filter = ('rating', 'created_at')
    search_fields = ('comment', 'user__username', 'message__content')
    readonly_fields = ('message', 'user', 'rating', 'comment', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'

    def short_comment(self, obj):
        return obj.comment[:80]
    short_comment.short_description = 'Commentaire'

    def message_preview(self, obj):
        return obj.message.content[:100]
    message_preview.short_description = 'Réponse évaluée'
