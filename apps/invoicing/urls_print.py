from django.urls import path
from . import views_print

app_name = 'invoicing_print'

urlpatterns = [
    # Impression des factures
    path('invoice/<uuid:invoice_id>/print/', views_print.print_invoice_view, name='print_invoice'),
    path('invoice/<uuid:invoice_id>/preview/', views_print.print_preview_invoice, name='preview_invoice'),
    path('invoice/<uuid:invoice_id>/pdf/', views_print.download_invoice_pdf, name='download_invoice_pdf'),

    # Impression des bons de commande
    path('purchase-order/<uuid:po_id>/print/', views_print.print_purchase_order_view, name='print_purchase_order'),
    path('purchase-order/<uuid:po_id>/preview/', views_print.print_preview_purchase_order, name='preview_purchase_order'),
    path('purchase-order/<uuid:po_id>/pdf/', views_print.download_purchase_order_pdf, name='download_purchase_order_pdf'),

    # Configuration et historique
    path('configure/', views_print.configure_print_template, name='configure_template'),
    path('history/', views_print.print_history_view, name='print_history'),
]