from django.urls import path
from . import views

app_name = 'invoicing'

urlpatterns = [
    path('', views.invoice_list, name='list'),
    path('<uuid:invoice_id>/', views.invoice_detail, name='detail'),
    
    # API URLs
    path('api/', views.api_invoices, name='api_list'),
]
