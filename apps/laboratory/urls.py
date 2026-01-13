"""
URL patterns for Laboratory (LIMS) app
"""
from django.urls import path
from . import api

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
    path('orders/<uuid:pk>/pdf/', api.LabResultPDFView.as_view(), name='order-pdf'),

    # Dashboard views
    path('orders/today/', api.TodayLabOrdersView.as_view(), name='orders-today'),

    # Patient lab history
    path('patient/<uuid:patient_id>/history/', api.PatientLabHistoryView.as_view(), name='patient-lab-history'),
]
