from django.urls import path
from . import views

app_name = 'ai_assistant'

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
]