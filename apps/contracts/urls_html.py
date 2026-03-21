"""
URLs HTML pour le module Contrats
"""
from django.urls import path
from . import views_html

app_name = 'contracts'

urlpatterns = [
    # Liste & création
    path('', views_html.contract_list, name='contract_list'),
    path('create/', views_html.contract_create, name='contract_create'),
    path('save/', views_html.contract_save, name='contract_save'),

    # API IA & modèles
    path('ai/generate/', views_html.contract_ai_generate, name='contract_ai_generate'),
    path('templates/', views_html.contract_template_library, name='contract_template_library'),
    path('templates/<int:template_pk>/prefill/', views_html.contract_template_prefill, name='contract_template_prefill'),

    # Détail, édition, suppression
    path('<uuid:pk>/', views_html.contract_detail, name='contract_detail'),
    path('<uuid:pk>/edit/', views_html.contract_edit, name='contract_edit'),
    path('<uuid:pk>/delete/', views_html.contract_delete, name='contract_delete'),

    # Actions
    path('<uuid:pk>/status/', views_html.contract_status_change, name='contract_status_change'),
    path('<uuid:pk>/sign/', views_html.contract_sign, name='contract_sign'),
    path('<uuid:pk>/documents/upload/', views_html.contract_upload_document, name='contract_upload_document'),
    path('<uuid:pk>/export/pdf/', views_html.contract_export_pdf, name='contract_export_pdf'),
]
