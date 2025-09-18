from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import (
    AIConversation, AIMessage, AIAction, AINotification,
    AILearningData, AIAnalytics, AIPromptTemplate
)


@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'conversation_type', 'message_count', 'is_active', 'updated_at']
    list_filter = ['conversation_type', 'is_active', 'created_at', 'updated_at']
    search_fields = ['title', 'user__username', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    def message_count(self, obj):
        return obj.get_message_count()
    message_count.short_description = _('Messages')


class AIMessageInline(admin.TabularInline):
    model = AIMessage
    extra = 0
    fields = ['role', 'content_preview', 'model_used', 'tokens_used', 'user_rating']
    readonly_fields = ['content_preview', 'timestamp']
    
    def content_preview(self, obj):
        return obj.content[:100] + ('...' if len(obj.content) > 100 else '')
    content_preview.short_description = _('Contenu')


@admin.register(AIMessage)
class AIMessageAdmin(admin.ModelAdmin):
    list_display = [
        'conversation', 'role', 'content_preview', 'model_used',
        'tokens_used', 'user_rating', 'timestamp'
    ]
    list_filter = ['role', 'model_used', 'user_rating', 'timestamp']
    search_fields = ['content', 'conversation__title']
    readonly_fields = ['timestamp']
    
    def content_preview(self, obj):
        return obj.content[:100] + ('...' if len(obj.content) > 100 else '')
    content_preview.short_description = _('Contenu')


@admin.register(AIAction)
class AIActionAdmin(admin.ModelAdmin):
    list_display = [
        'action_type', 'user', 'status_colored', 'success',
        'confidence_score', 'requires_approval', 'executed_at'
    ]
    list_filter = [
        'action_type', 'status', 'success', 'requires_approval',
        'executed_at'
    ]
    search_fields = ['user__username', 'reasoning', 'error_message']
    readonly_fields = ['executed_at']
    
    def status_colored(self, obj):
        colors = {
            'pending': '#ffc107',
            'approved': '#28a745',
            'rejected': '#dc3545',
            'executed': '#17a2b8',
            'failed': '#dc3545',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_colored.short_description = _('Statut')


@admin.register(AINotification)
class AINotificationAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'user', 'notification_type', 'priority_colored',
        'is_read', 'created_at'
    ]
    list_filter = [
        'notification_type', 'priority', 'is_read', 'created_at'
    ]
    search_fields = ['title', 'message', 'user__username']
    readonly_fields = ['created_at', 'read_at']
    
    def priority_colored(self, obj):
        colors = {
            'low': '#6c757d',
            'medium': '#007bff',
            'high': '#ffc107',
            'critical': '#dc3545',
        }
        color = colors.get(obj.priority, '#007bff')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_priority_display()
        )
    priority_colored.short_description = _('Priorité')


@admin.register(AIPromptTemplate)
class AIPromptTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'category', 'usage_count', 'is_active',
        'created_by', 'created_at'
    ]
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'prompt_template']
    readonly_fields = ['usage_count', 'created_at', 'updated_at']


@admin.register(AILearningData)
class AILearningDataAdmin(admin.ModelAdmin):
    list_display = [
        'data_type', 'user', 'confidence_level', 'created_at'
    ]
    list_filter = ['data_type', 'confidence_level', 'created_at']
    search_fields = ['user__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AIAnalytics)
class AIAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'metric_type', 'user', 'value', 'period', 'date'
    ]
    list_filter = ['metric_type', 'period', 'date']
    search_fields = ['user__username']
    readonly_fields = ['created_at']