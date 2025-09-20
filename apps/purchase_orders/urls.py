from django.urls import path
from . import views

app_name = 'purchase_orders'

urlpatterns = [
    path('', views.purchase_order_list, name='list'),
    path('create/', views.purchase_order_create, name='create'),
    path('<uuid:po_id>/', views.purchase_order_detail, name='detail'),
    
    # API URLs
    path('api/stats/', views.api_purchase_order_stats, name='api_stats'),
]
