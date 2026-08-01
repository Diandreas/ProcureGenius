"""
URL patterns for Imaging app
"""
from django.urls import path
from . import api
from . import views_pdf

app_name = 'imaging'

urlpatterns = [
    # Categories
    path('categories/', api.ImagingExamCategoryListCreateView.as_view(), name='category-list'),
    path('categories/<uuid:pk>/', api.ImagingExamCategoryDetailView.as_view(), name='category-detail'),

    # Exam types (catalogue)
    path('exam-types/', api.ImagingExamTypeListCreateView.as_view(), name='exam-type-list'),
    path('exam-types/<uuid:pk>/', api.ImagingExamTypeDetailView.as_view(), name='exam-type-detail'),

    # Imaging orders
    path('orders/', api.ImagingOrderListView.as_view(), name='order-list'),
    path('orders/create/', api.ImagingOrderCreateView.as_view(), name='order-create'),
    path('orders/today/', api.TodayImagingOrdersView.as_view(), name='orders-today'),
    path('orders/<uuid:pk>/', api.ImagingOrderDetailView.as_view(), name='order-detail'),
    path('orders/<uuid:pk>/status/', api.ImagingOrderStatusUpdateView.as_view(), name='order-status'),
    path('orders/<uuid:pk>/results/', api.EnterImagingResultsView.as_view(), name='enter-results'),
    path('orders/<uuid:pk>/pdf/', views_pdf.ImagingResultPDFView.as_view(), name='order-pdf'),
    path('orders/<uuid:pk>/generate-invoice/', api.GenerateImagingOrderInvoiceView.as_view(), name='generate-invoice'),

    # Result files
    path('items/<uuid:item_id>/files/', api.ImagingResultFileUploadView.as_view(), name='item-files'),
    path('files/<uuid:pk>/', api.ImagingResultFileDetailView.as_view(), name='file-detail'),

    # Patient history
    path('patient/<uuid:patient_id>/history/', api.PatientImagingHistoryView.as_view(), name='patient-imaging-history'),

    # Subcontractor batch order (réutilise les sous-traitants du module Laboratoire)
    path(
        'subcontractors/<uuid:subcontractor_id>/batch-order/',
        api.ImagingSubcontractorBatchOrderView.as_view(),
        name='subcontractor-batch-order'
    ),
]
