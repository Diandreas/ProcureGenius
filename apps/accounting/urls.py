from django.urls import path
from . import views

urlpatterns = [
    # Plan Comptable
    path('accounts/', views.AccountListCreateView.as_view(), name='account-list'),
    path('accounts/<uuid:pk>/', views.AccountDetailView.as_view(), name='account-detail'),

    # Journaux
    path('journals/', views.JournalListCreateView.as_view(), name='journal-list'),

    # Écritures
    path('entries/', views.JournalEntryListCreateView.as_view(), name='entry-list'),
    path('entries/<uuid:pk>/', views.JournalEntryDetailView.as_view(), name='entry-detail'),
    path('entries/<uuid:pk>/post/', views.JournalEntryPostView.as_view(), name='entry-post'),
    path('entries/<uuid:pk>/cancel/', views.JournalEntryCancelView.as_view(), name='entry-cancel'),

    # Rapports
    path('reports/trial-balance/', views.TrialBalanceView.as_view(), name='trial-balance'),
    path('reports/general-ledger/', views.GeneralLedgerView.as_view(), name='general-ledger'),
    path('reports/income-statement/', views.IncomeStatementView.as_view(), name='income-statement'),

    # Dashboard
    path('dashboard/', views.AccountingDashboardView.as_view(), name='accounting-dashboard'),

    # Sync depuis facture
    path('sync-invoice/<uuid:invoice_id>/', views.SyncInvoiceView.as_view(), name='sync-invoice'),
]
