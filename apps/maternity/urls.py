from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api

app_name = 'maternity'

router = DefaultRouter()
router.register('pregnancies', api.PregnancyRecordViewSet, basename='pregnancy')
router.register('prenatal-visits', api.PrenatalVisitViewSet, basename='prenatal-visit')
router.register('deliveries', api.DeliveryViewSet, basename='delivery')
router.register('newborns', api.NewbornViewSet, basename='newborn')
router.register('postnatal-visits', api.PostnatalVisitViewSet, basename='postnatal-visit')

urlpatterns = [
    path('patient/<uuid:patient_id>/info/', api.PatientMaternityInfoView.as_view(), name='patient-maternity-info'),
    path('', include(router.urls)),
]
