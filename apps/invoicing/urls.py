from django.urls import path
from . import views

app_name = 'invoicing'

urlpatterns = [
    # Vues principales
    path('', views.invoice_list, name='list'),
    path('create/', views.invoice_create, name='create'),
    path('<uuid:pk>/', views.invoice_detail, name='detail'),
    path('<uuid:pk>/edit/', views.invoice_edit, name='edit'),
    
    # Actions factures
    path('<uuid:pk>/send/', views.invoice_send, name='send'),
    path('<uuid:pk>/cancel/', views.invoice_cancel, name='cancel'),
    path('<uuid:pk>/duplicate/', views.invoice_duplicate, name='duplicate'),
    
    # Paiements
    path('<uuid:pk>/record-payment/', views.invoice_record_payment, name='record_payment'),
    path('<uuid:pk>/pay-paypal/', views.invoice_pay_paypal, name='pay_paypal'),
    path('<uuid:pk>/paypal-success/', views.paypal_success, name='paypal_success'),
    path('<uuid:pk>/paypal-cancel/', views.paypal_cancel, name='paypal_cancel'),
    path('payments/', views.payment_list, name='payments'),
    
    # Webhooks
    path('webhook/paypal/', views.paypal_webhook, name='paypal_webhook'),
    
    # Relances
    path('reminders/', views.automated_reminders_view, name='reminders'),
    path('send-bulk-reminders/', views.send_bulk_reminders, name='send_bulk_reminders'),
    
    # Récurrent
    path('recurring/', views.recurring_invoices, name='recurring'),
    path('recurring/create/', views.create_recurring_invoice, name='create_recurring'),
    
    # Rapports
    path('reports/', views.invoice_reports, name='reports'),
    path('aging-report/', views.aging_report, name='aging_report'),
    
    # Export/PDF
    path('export/', views.export_invoices, name='export'),
    path('<uuid:pk>/pdf/', views.invoice_pdf, name='pdf'),
]