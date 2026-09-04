"""
URL patterns for Vaccination app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api

app_name = 'vaccination'

router = DefaultRouter()
router.register('records', api.VaccinationRecordViewSet, basename='vaccination-record')

urlpatterns = [
    # Categories
    path('categories/', api.VaccineCategoryListCreateView.as_view(), name='category-list'),
    path('categories/<uuid:pk>/', api.VaccineCategoryDetailView.as_view(), name='category-detail'),

    # Vaccine types (catalogue)
    path('vaccine-types/', api.VaccineTypeListCreateView.as_view(), name='vaccine-type-list'),
    path('vaccine-types/<uuid:pk>/', api.VaccineTypeDetailView.as_view(), name='vaccine-type-detail'),

    # Patient history
    path('patient/<uuid:patient_id>/history/', api.PatientVaccinationHistoryView.as_view(), name='patient-vaccination-history'),

    path('', include(router.urls)),
]
