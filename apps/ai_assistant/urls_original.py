from django.urls import path
from . import views

app_name = 'ai_assistant'

urlpatterns = [
    # Interface principale
    path('', views.ai_chat_interface, name='chat_interface'),
    path('dashboard/', views.ai_dashboard, name='dashboard'),
    
    # Conversations
    path('conversations/', views.ai_conversations_list, name='conversations'),
    path('conversations/<uuid:conversation_id>/', views.ai_conversation_detail, name='conversation_detail'),
    
    # API Chat
    path('process-message/', views.ai_process_message, name='process_message'),
    path('new-conversation/', views.ai_new_conversation, name='new_conversation'),
    
    # Actions
    path('actions/', views.ai_actions_list, name='actions'),
    path('actions/<uuid:action_id>/approve/', views.ai_approve_action, name='approve_action'),
    
    # Notifications
    path('notifications/', views.ai_notifications_list, name='notifications'),
    path('notifications/mark-read/', views.ai_mark_notifications_read, name='mark_notifications_read'),
    
    # Messages
    path('messages/<uuid:message_id>/rate/', views.ai_rate_message, name='rate_message'),
    
    # Configuration
    path('settings/', views.ai_settings, name='settings'),
    path('training/', views.ai_training_data, name='training'),
    
    # Utilitaires
    path('extract-invoice-data/', views.ai_extract_invoice_data, name='extract_invoice_data'),
    path('analyze-document/', views.ai_analyze_document, name='analyze_document'),
]