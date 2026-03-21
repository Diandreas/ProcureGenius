from django.urls import path
from . import views
from .views_pdf import InvoicePDFView
from .views_debug import debug_organization_data

app_name = 'invoicing'

urlpatterns = [
    path('', views.invoice_list, name='invoice_list'),
    path('create/', views.invoice_create, name='invoice_create'),
    path('<uuid:pk>/', views.invoice_detail, name='invoice_detail'),
    path('<uuid:pk>/edit/', views.invoice_edit, name='invoice_edit'),
    path('<uuid:pk>/delete/', views.invoice_delete, name='invoice_delete'),
    path('<uuid:pk>/items/add/', views.invoice_item_add, name='invoice_item_add'),
    path('items/<uuid:pk>/edit/', views.invoice_item_edit, name='invoice_item_edit'),
    path('items/<uuid:pk>/delete/', views.invoice_item_delete, name='invoice_item_delete'),
    path('bulk-action/', views.invoice_bulk_action, name='invoice_bulk_action'),
    path('api/stats/', views.api_invoice_stats, name='api_invoice_stats'),

    # PDF URLs - WeasyPrint
    path('<uuid:pk>/pdf/', InvoicePDFView.as_view(), name='invoice_pdf'),

    # Print URLs
    path('print/latest/', views.invoice_print_latest, name='invoice_print_latest'),
    path('print/template/<str:template>/', views.invoice_print_template, name='invoice_print_template'),
    path('<uuid:pk>/print/', views.invoice_print, name='invoice_print'),
    path('<uuid:pk>/print/<str:template>/', views.invoice_print, name='invoice_print_template'),

    # Debug URL (temporaire)
    path('debug/organization/', debug_organization_data, name='debug_organization'),

    # Produits
    path('products/', views.product_list, name='product_list'),
    path('products/create/', views.product_create, name='product_create'),
    path('products/<uuid:pk>/', views.product_detail, name='product_detail'),
    path('products/<uuid:pk>/edit/', views.product_edit, name='product_edit'),
    path('products/<uuid:pk>/delete/', views.product_delete, name='product_delete'),
    path('products/<uuid:pk>/batches/add/', views.product_batch_add, name='product_batch_add'),
    path('products/batches/<uuid:batch_pk>/write-off/', views.product_batch_write_off, name='product_batch_write_off'),
    path('api/products/<uuid:pk>/batches/', views.api_product_batches, name='api_product_batches'),
]