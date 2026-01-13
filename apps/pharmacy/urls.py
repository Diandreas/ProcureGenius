"""
URL patterns for Pharmacy app
"""
from django.urls import path
from . import api

app_name = 'pharmacy'

urlpatterns = [
    # Dispensing endpoints (accessible at /healthcare/pharmacy/dispensings/)
    path('dispensings/', api.DispensingListView.as_view(), name='dispensing-list'),
    path('dispensings/create/', api.DispensingCreateView.as_view(), name='dispensing-create'),
    path('dispensings/<uuid:pk>/', api.DispensingDetailView.as_view(), name='dispensing-detail'),
    path('dispensings/<uuid:pk>/cancel/', api.DispensingCancelView.as_view(), name='dispensing-cancel'),
    path('dispensings/<uuid:pk>/pdf/', api.DispensingPDFView.as_view(), name='dispensing-pdf'),

    # Medication endpoints (accessible at /healthcare/pharmacy/medications/)
    path('medications/', api.MedicationListView.as_view(), name='medication-list'),
    path('medications/search/', api.MedicationSearchView.as_view(), name='medication-search'),
    path('medications/check-stock/', api.StockCheckView.as_view(), name='check-stock'),
    path('medications/low-stock/', api.LowStockMedicationsView.as_view(), name='low-stock'),

    # Dashboard
    path('today/', api.TodayDispensingView.as_view(), name='today-summary'),

    # Patient history
    path('patient/<uuid:patient_id>/history/', api.PatientPharmacyHistoryView.as_view(), name='patient-history'),
]
