from django.urls import path
from . import views

app_name = 'purchase_orders'

urlpatterns = [
    # Purchase Order URLs
    path('', views.purchase_order_list, name='list'),
    path('create/', views.purchase_order_create, name='create'),
    path('<uuid:pk>/', views.purchase_order_detail, name='detail'),
    path('<uuid:pk>/edit/', views.purchase_order_edit, name='edit'),
    path('<uuid:pk>/delete/', views.purchase_order_delete, name='delete'),
    path('<uuid:pk>/print/', views.purchase_order_print, name='print'),
    path('<uuid:pk>/print/<str:template>/', views.purchase_order_print, name='print_template'),
    path('print/latest/', views.purchase_order_print_latest, name='print_latest'),
    path('print/<str:template>/', views.purchase_order_print_template, name='print_template_general'),
    
    # Purchase Order Item URLs
    path('<uuid:po_pk>/items/add/', views.purchase_order_item_add, name='item_add'),
    path('items/<uuid:pk>/edit/', views.purchase_order_item_edit, name='item_edit'),
    path('items/<uuid:pk>/delete/', views.purchase_order_item_delete, name='item_delete'),
    
    # Bulk Actions
    path('bulk-action/', views.purchase_order_bulk_action, name='bulk_action'),
    
    # API URLs
    path('api/stats/', views.api_purchase_order_stats, name='api_stats'),
]
