"""URLs du Suivi patients."""
from django.urls import path

from . import api

app_name = 'crm'

urlpatterns = [
    path('patients/', api.CrmPatientListView.as_view(), name='patient-list'),
    path('patients/export/', api.CrmPatientExportView.as_view(), name='patient-export'),
]
