from django.urls import path
from . import views

app_name = 'suppliers'

urlpatterns = [
    # Fournisseurs
    path('', views.supplier_list, name='list'),
    path('create/', views.supplier_create, name='create'),
    path('<uuid:pk>/', views.supplier_detail, name='detail'),
    path('<uuid:pk>/edit/', views.supplier_edit, name='edit'),
    path('<uuid:pk>/performance/', views.supplier_performance, name='performance'),
    path('<uuid:pk>/toggle-status/', views.supplier_toggle_status, name='toggle_status'),
    
    # Catalogue
    path('catalog/', views.product_catalog, name='catalog'),
    path('catalog/search/', views.catalog_search, name='catalog_search'),
    path('products/<uuid:pk>/', views.product_detail, name='product_detail'),
    path('products/create/', views.product_create, name='product_create'),
    
    # Clients (pour facturation)
    path('clients/', views.client_list, name='client_list'),
    path('clients/create/', views.client_create, name='client_create'),
    path('clients/<uuid:pk>/', views.client_detail, name='client_detail'),
    
    # Évaluation/Scoring
    path('evaluation/', views.supplier_evaluation, name='evaluation'),
    
    # Import/Export
    path('import/', views.import_suppliers, name='import'),
    path('export/', views.export_suppliers, name='export'),
    
    # AJAX
    path('ajax/search/', views.ajax_supplier_search, name='ajax_search'),
    path('ajax/products/<uuid:supplier_id>/', views.ajax_supplier_products, name='ajax_products'),
]