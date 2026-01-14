"""
URL patterns for Laboratory (LIMS) app
"""
from django.urls import path
from . import api
from . import api, views_pdf
from .views_pdf import LabResultPDFView

app_name = 'laboratory'

urlpatterns = [
    # Test Categories (accessible at /healthcare/laboratory/categories/)
    path('categories/', api.LabTestCategoryListCreateView.as_view(), name='category-list'),
    path('categories/<uuid:pk>/', api.LabTestCategoryDetailView.as_view(), name='category-detail'),

    # Lab Tests (Catalog) (accessible at /healthcare/laboratory/tests/)
    path('tests/', api.LabTestListCreateView.as_view(), name='test-list'),
    path('tests/<uuid:pk>/', api.LabTestDetailView.as_view(), name='test-detail'),

    # Lab Orders (accessible at /healthcare/laboratory/orders/)
    path('orders/', api.LabOrderListView.as_view(), name='order-list'),
    path('orders/create/', api.LabOrderCreateView.as_view(), name='order-create'),
    path('orders/<uuid:pk>/', api.LabOrderDetailView.as_view(), name='order-detail'),
    path('orders/<uuid:pk>/status/', api.LabOrderStatusUpdateView.as_view(), name='order-status'),
    path('orders/<uuid:pk>/results/', api.EnterLabResultsView.as_view(), name='enter-results'),
    path('orders/<uuid:pk>/pdf/', LabResultPDFView.as_view(), name='order-pdf'),
    path('orders/<uuid:pk>/receipt/', views_pdf.LabOrderReceiptView.as_view(), name='order-receipt'),
    path('orders/<uuid:pk>/barcodes/', views_pdf.LabBarcodeView.as_view(), name='order-barcodes'),
    path('orders/<uuid:pk>/bench-sheet/', views_pdf.LabBenchSheetView.as_view(), name='order-bench-sheet'),
    path('orders/bulk-bench-sheets/', views_pdf.LabBulkBenchSheetView.as_view(), name='bulk-bench-sheets'),
    path('orders/<uuid:pk>/generate-invoice/', api.GenerateLabOrderInvoiceView.as_view(), name='generate-invoice'),

    # Dashboard views
    path('orders/today/', api.TodayLabOrdersView.as_view(), name='orders-today'),

    # Patient lab history
    path('patient/<uuid:patient_id>/history/', api.PatientLabHistoryView.as_view(), name='patient-lab-history'),
]
