"""
URL patterns for Patients app
"""
from django.urls import path
from . import api, views_pdf

app_name = 'patients'

urlpatterns = [
    # Patient endpoints
    path('', api.PatientListCreateView.as_view(), name='patient-list'),
    path('<uuid:pk>/', api.PatientDetailView.as_view(), name='patient-detail'),
    path('search/', api.PatientSearchView.as_view(), name='patient-search'),
    path('<uuid:patient_id>/history/', api.PatientHistoryView.as_view(), name='patient-history'),
    path('<uuid:patient_id>/care-history/', api.PatientCareHistoryView.as_view(), name='patient-care-history'),
    path('<uuid:patient_id>/complete-history/', api.PatientCompleteHistoryView.as_view(), name='patient-complete-history'),
    path('<uuid:patient_id>/medical-summary/', api.PatientMedicalSummaryView.as_view(), name='patient-medical-summary'),
    path('<uuid:patient_id>/timeline/', api.PatientTimelineView.as_view(), name='patient-timeline'),
    path('<uuid:patient_id>/care-services/', api.CreateCareServiceView.as_view(), name='patient-care-services'),
    path('<uuid:patient_id>/quick-invoice/', api.PatientQuickInvoiceView.as_view(), name='patient-quick-invoice'),

    # Visit endpoints (will be accessible at /healthcare/patients/visits/)
    path('visits/', api.PatientVisitListCreateView.as_view(), name='visit-list'),
    path('visits/<uuid:pk>/', api.PatientVisitDetailView.as_view(), name='visit-detail'),
    path('visits/<uuid:pk>/status/', api.VisitStatusUpdateView.as_view(), name='visit-status'),
    path('visits/today/', api.TodayVisitsView.as_view(), name='visits-today'),

    # Check-in endpoint
    path('visits/check-in/', api.CheckInView.as_view(), name='check-in'),

    # Document endpoints
    path('<uuid:patient_id>/documents/', api.PatientDocumentListCreateView.as_view(), name='patient-documents'),
    path('documents/<uuid:pk>/', api.PatientDocumentDetailView.as_view(), name='patient-document-detail'),
    
    # PDF
    path('<uuid:pk>/summary/', views_pdf.PatientSummaryView.as_view(), name='patient-summary'),
]
