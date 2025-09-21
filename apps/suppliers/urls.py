from django.urls import path
from . import views

app_name = 'suppliers'

urlpatterns = [
    path('', views.supplier_list, name='list'),
    path('create/', views.supplier_create, name='create'),
    path('import/', views.supplier_import, name='import'),
    path('export/', views.supplier_export, name='export'),
    path('<uuid:supplier_id>/', views.supplier_detail, name='detail'),
    path('<uuid:supplier_id>/edit/', views.supplier_edit, name='edit'),
    path('<uuid:supplier_id>/toggle-status/', views.supplier_toggle_status, name='toggle_status'),
    
    # API URLs
    path('api/', views.api_suppliers, name='api_list'),
]
