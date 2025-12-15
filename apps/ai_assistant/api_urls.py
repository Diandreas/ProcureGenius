from django.urls import path
from . import views

app_name = 'ai_assistant_api'

urlpatterns = [
    # Chat endpoints
    path('chat/', views.ChatView.as_view(), name='chat'),
    path('conversations/', views.ConversationListView.as_view(), name='conversations'),
    path('conversations/<uuid:conversation_id>/', views.ConversationDetailView.as_view(), name='conversation_detail'),

    # Analyse de documents
    path('analyze-document/', views.DocumentAnalysisView.as_view(), name='analyze_document'),

    # Transcription vocale
    path('transcribe/', views.VoiceTranscriptionView.as_view(), name='transcribe'),

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

    # Import Reviews
    path('import-reviews/', views.ImportReviewListView.as_view(), name='import_reviews_list'),
    path('import-reviews/<uuid:review_id>/', views.ImportReviewDetailView.as_view(), name='import_review_detail'),
    path('import-reviews/<uuid:review_id>/approve/', views.ImportReviewApproveView.as_view(), name='import_review_approve'),
    path('import-reviews/<uuid:review_id>/reject/', views.ImportReviewRejectView.as_view(), name='import_review_reject'),

    # Conversations Proactives
    path('proactive-conversations/', views.ProactiveConversationListView.as_view(), name='proactive_conversations_list'),
    path('proactive-conversations/<uuid:conversation_id>/accept/', views.ProactiveConversationAcceptView.as_view(), name='proactive_conversation_accept'),
    path('proactive-conversations/<uuid:conversation_id>/dismiss/', views.ProactiveConversationDismissView.as_view(), name='proactive_conversation_dismiss'),

    # AI Usage Monitoring
    path('', views.AIUsageViewSet.as_view({'get': 'list'}), name='ai-usage-list'),
    path('usage/', views.AIUsageViewSet.as_view({'get': 'list'}), name='ai-usage-list'),
    path('usage/stats/', views.AIUsageViewSet.as_view({'get': 'stats'}), name='ai-usage-stats'),
    path('usage/logs/', views.AIUsageViewSet.as_view({'get': 'logs'}), name='ai-usage-logs'),
    path('usage/budget-status/', views.AIUsageViewSet.as_view({'get': 'budget_status'}), name='ai-usage-budget'),
    path('usage/my-usage/', views.AIUsageViewSet.as_view({'get': 'my_usage'}), name='ai-usage-my-usage'),
    path('usage/summary/', views.AIUsageViewSet.as_view({'get': 'summary'}), name='ai-usage-summary'),
]
