"""
URL patterns for Patients app
"""
from django.urls import path
from . import api

app_name = 'patients'

urlpatterns = [
    # Patient endpoints
    path('patients/', api.PatientListCreateView.as_view(), name='patient-list'),
    path('patients/<uuid:pk>/', api.PatientDetailView.as_view(), name='patient-detail'),
    path('patients/search/', api.PatientSearchView.as_view(), name='patient-search'),
    path('patients/<uuid:patient_id>/history/', api.PatientHistoryView.as_view(), name='patient-history'),
    
    # Visit endpoints
    path('visits/', api.PatientVisitListCreateView.as_view(), name='visit-list'),
    path('visits/<uuid:pk>/', api.PatientVisitDetailView.as_view(), name='visit-detail'),
    path('visits/<uuid:pk>/status/', api.VisitStatusUpdateView.as_view(), name='visit-status'),
    path('visits/today/', api.TodayVisitsView.as_view(), name='visits-today'),
    
    # Check-in endpoint
    path('check-in/', api.CheckInView.as_view(), name='check-in'),
]
