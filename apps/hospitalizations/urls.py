from django.urls import path
from .views import HospitalizationViewSet

hospitalization_list = HospitalizationViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

urlpatterns = [
    path('', hospitalization_list, name='hospitalization-list'),
    path('<uuid:pk>/', HospitalizationViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'put': 'update',
        'delete': 'destroy',
    }), name='hospitalization-detail'),
    path('<uuid:pk>/discharge/', HospitalizationViewSet.as_view({
        'post': 'discharge',
    }), name='hospitalization-discharge'),
    path('<uuid:pk>/discharge-pdf/', HospitalizationViewSet.as_view({
        'get': 'generate_discharge_pdf',
    }), name='hospitalization-discharge-pdf'),
]
