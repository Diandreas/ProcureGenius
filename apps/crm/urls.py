"""URLs du Suivi patients."""
from django.urls import path

from . import api

app_name = 'crm'

urlpatterns = [
    path('patients/', api.CrmPatientListView.as_view(), name='patient-list'),
    path('patients/export/', api.CrmPatientExportView.as_view(), name='patient-export'),
    path('patients/search/', api.CrmPatientSearchView.as_view(), name='patient-search'),
    path('passages/', api.CrmPassageListCreateView.as_view(), name='passage-list'),
    path('passages/<uuid:pk>/', api.CrmPassageDetailView.as_view(), name='passage-detail'),
]
