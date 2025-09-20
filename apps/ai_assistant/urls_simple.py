from django.urls import path
from . import views

app_name = 'ai_assistant'

urlpatterns = [
    path('chat/', views.ai_chat, name='chat'),
    path('suggestions/', views.ai_suggestions, name='suggestions'),
]
