"""
URL patterns for Consultations app
"""
from django.urls import path
from . import api
from . import api, views_pdf

app_name = 'consultations'

urlpatterns = [
    # Consultation endpoints (accessible at /healthcare/consultations/)
    path('', api.ConsultationListCreateView.as_view(), name='consultation-list'),
    path('<uuid:pk>/', api.ConsultationDetailView.as_view(), name='consultation-detail'),
    path('<uuid:pk>/vitals/', api.UpdateVitalSignsView.as_view(), name='update-vitals'),
    path('<uuid:pk>/end/', api.EndConsultationView.as_view(), name='end-consultation'),
    path('today/', api.TodayConsultationsView.as_view(), name='today-consultations'),

    # Start consultation from visit
    path('visit/<uuid:visit_id>/start/', api.StartConsultationView.as_view(), name='start-consultation'),

    # Workflow & Queue Management
    path('queue/', api.ConsultationQueueView.as_view(), name='consultation-queue'),
    path('next-patient/', api.NextPatientView.as_view(), name='next-patient'),
    path('<uuid:pk>/take-vitals/', api.TakeVitalsView.as_view(), name='take-vitals'),
    path('<uuid:pk>/start-consultation/', api.StartConsultationWorkflowView.as_view(), name='start-consultation-workflow'),
    path('<uuid:pk>/complete/', api.CompleteConsultationWorkflowView.as_view(), name='complete-consultation'),

    # PDF endpoints
    path('<uuid:pk>/receipt/', views_pdf.ConsultationReceiptView.as_view(), name='consultation-receipt'),
    path('<uuid:pk>/report/', views_pdf.ConsultationReportView.as_view(), name='consultation-report'),

    # Generate invoice (manual)
    path('<uuid:pk>/generate-invoice/', api.GenerateConsultationInvoiceView.as_view(), name='generate-invoice'),

    # Prescription endpoints
    path('prescriptions/', api.PrescriptionListView.as_view(), name='prescription-list'),
    path('prescriptions/create/', api.PrescriptionCreateView.as_view(), name='prescription-create'),
    path('prescriptions/<uuid:pk>/', api.PrescriptionDetailView.as_view(), name='prescription-detail'),
    path('prescriptions/<uuid:pk>/cancel/', api.PrescriptionCancelView.as_view(), name='prescription-cancel'),
    path('prescriptions/<uuid:pk>/pdf/', views_pdf.PrescriptionPDFView.as_view(), name='prescription-pdf'),

    # Lab order endpoints
    path('lab-orders/create/', api.CreateLabOrderView.as_view(), name='create-lab-order'),

    # Patient medical history
    path('patient/<uuid:patient_id>/history/', api.PatientMedicalHistoryView.as_view(), name='patient-history'),
]
