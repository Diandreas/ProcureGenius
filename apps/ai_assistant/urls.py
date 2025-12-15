from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'ai_assistant'

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'usage', views.AIUsageViewSet, basename='ai-usage')

urlpatterns = [
    # Chat endpoints
    path('chat/', views.ChatView.as_view(), name='chat'),
    path('process-message/', views.ChatView.as_view(), name='process_message'),  # Alias pour compatibilité template
    path('conversations/', views.ConversationListView.as_view(), name='conversations'),
    path('conversations/<uuid:conversation_id>/', views.ConversationDetailView.as_view(), name='conversation_detail'),

    # Analyse de documents
    path('analyze-document/', views.DocumentAnalysisView.as_view(), name='analyze_document'),

    # Transcription vocale
    path('voice-transcription/', views.VoiceTranscriptionView.as_view(), name='voice_transcription'),

    # Actions rapides
    path('quick-actions/', views.QuickActionsView.as_view(), name='quick_actions'),

    # Suggestions proactives
    path('suggestions/', views.ProactiveSuggestionsView.as_view(), name='suggestions'),
    path('suggestions/count/', views.SuggestionsCountView.as_view(), name='suggestions_count'),
    path('suggestions/<uuid:suggestion_id>/dismiss/', views.SuggestionDismissView.as_view(), name='suggestion_dismiss'),
    path('suggestions/<uuid:suggestion_id>/action-taken/', views.SuggestionActionTakenView.as_view(), name='suggestion_action_taken'),

    # Notifications push IA
    path('notifications/', views.AINotificationsView.as_view(), name='notifications'),
    path('notifications/count/', views.AINotificationsCountView.as_view(), name='notifications_count'),
    path('notifications/<uuid:notification_id>/mark-read/', views.AINotificationMarkReadView.as_view(), name='notification_mark_read'),

    # AI Usage Monitoring (ViewSet routes)
    path('', include(router.urls)),
]