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
]
