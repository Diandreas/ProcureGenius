"""
URL patterns for Patients app
"""
from django.urls import path
from . import api

app_name = 'patients'

urlpatterns = [
    # Patient endpoints
    path('', api.PatientListCreateView.as_view(), name='patient-list'),
    path('<uuid:pk>/', api.PatientDetailView.as_view(), name='patient-detail'),
    path('search/', api.PatientSearchView.as_view(), name='patient-search'),
    path('<uuid:patient_id>/history/', api.PatientHistoryView.as_view(), name='patient-history'),

    # Visit endpoints (will be accessible at /healthcare/patients/visits/)
    path('visits/', api.PatientVisitListCreateView.as_view(), name='visit-list'),
    path('visits/<uuid:pk>/', api.PatientVisitDetailView.as_view(), name='visit-detail'),
    path('visits/<uuid:pk>/status/', api.VisitStatusUpdateView.as_view(), name='visit-status'),
    path('visits/today/', api.TodayVisitsView.as_view(), name='visits-today'),

    # Check-in endpoint
    path('visits/check-in/', api.CheckInView.as_view(), name='check-in'),
]
