from django.urls import path
from . import views

app_name = 'purchase_orders'

urlpatterns = [
    # Vues principales
    path('', views.purchase_order_list, name='list'),
    path('create/', views.purchase_order_create, name='create'),
    path('<uuid:pk>/', views.purchase_order_detail, name='detail'),
    path('<uuid:pk>/edit/', views.purchase_order_edit, name='edit'),
    
    # Actions sur les bons de commande
    path('<uuid:pk>/approve/', views.purchase_order_approve, name='approve'),
    path('<uuid:pk>/send/', views.purchase_order_send, name='send'),
    path('<uuid:pk>/cancel/', views.purchase_order_cancel, name='cancel'),
    
    # Réception
    path('<uuid:pk>/receive/', views.purchase_order_receive, name='receive'),
    
    # Actions rapides AJAX
    path('ajax/quick-actions/', views.ajax_po_quick_actions, name='ajax_quick_actions'),
    path('ajax/supplier-info/<uuid:supplier_id>/', views.ajax_supplier_info, name='ajax_supplier_info'),
    path('ajax/product-search/', views.ajax_product_search, name='ajax_product_search'),
    
    # Rapports et export
    path('reports/', views.purchase_order_reports, name='reports'),
    path('export/', views.export_purchase_orders, name='export'),
]