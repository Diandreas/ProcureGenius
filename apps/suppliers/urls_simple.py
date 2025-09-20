from django.urls import path
from . import views

app_name = 'suppliers'

urlpatterns = [
    path('', views.supplier_list, name='list'),
    path('<uuid:supplier_id>/', views.supplier_detail, name='detail'),
    
    # API URLs
    path('api/', views.api_suppliers, name='api_list'),
]
