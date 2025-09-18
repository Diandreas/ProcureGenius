from django.urls import path
from . import views

app_name = 'integrations'

urlpatterns = [
    # Gestion des intégrations
    path('', views.integration_list, name='list'),
    path('<uuid:pk>/', views.integration_detail, name='detail'),
    
    # Webhooks
    path('webhook/<str:endpoint_path>/', views.webhook_handler, name='webhook_handler'),
]