"""URLs du Suivi patients."""
from django.urls import path

from . import api, api_suivi

app_name = 'crm'

urlpatterns = [
    path('patients/', api.CrmPatientListView.as_view(), name='patient-list'),
    path('patients/export/', api.CrmPatientExportView.as_view(), name='patient-export'),
    path('patients/search/', api.CrmPatientSearchView.as_view(), name='patient-search'),
    path('passages/', api.CrmPassageListCreateView.as_view(), name='passage-list'),
    path('passages/<uuid:pk>/', api.CrmPassageDetailView.as_view(), name='passage-detail'),
    path('origins/', api.CrmOriginListView.as_view(), name='origin-list'),
    path('patients/<uuid:pk>/profile/', api.CrmPatientProfileView.as_view(), name='patient-profile'),
    path('reports/financial-patients/', api.CrmFinancialReportView.as_view(), name='report-financial'),
    path('reports/schedule/', api.CrmReportScheduleView.as_view(), name='report-schedule'),
    path('reports/spending-profile/', api.CrmSpendingProfileView.as_view(), name='report-spending-profile'),
    path('reasons/', api_suivi.CrmReasonListView.as_view(), name='reason-list'),
    path('settings/reasons/', api_suivi.CrmReasonSettingsView.as_view(), name='reason-settings'),
    path('settings/reasons/<uuid:pk>/', api_suivi.CrmReasonSettingsDetailView.as_view(), name='reason-settings-detail'),
    path('settings/origins/', api_suivi.CrmOriginSettingsView.as_view(), name='origin-settings'),
    path('settings/origins/<uuid:pk>/', api_suivi.CrmOriginSettingsDetailView.as_view(), name='origin-settings-detail'),
    path('campaigns/', api_suivi.CrmCampaignListView.as_view(), name='campaign-list'),
    path('campaigns/<uuid:pk>/', api_suivi.CrmCampaignDetailView.as_view(), name='campaign-detail'),
    path('contacts/', api_suivi.CrmRelanceListCreateView.as_view(), name='contact-list'),
    path('contacts/<uuid:pk>/', api_suivi.CrmRelanceDetailView.as_view(), name='contact-detail'),
    path('patients/<uuid:pk>/summary/', api_suivi.CrmPatientSummaryView.as_view(), name='patient-summary'),
    path('invoices/<uuid:pk>/info/', api_suivi.CrmInvoiceInfoView.as_view(), name='invoice-info'),
    path('stats/', api_suivi.CrmStatsView.as_view(), name='stats'),
]
