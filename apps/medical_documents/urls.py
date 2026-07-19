from django.urls import path
from .views import MedicalDocumentViewSet

document_list = MedicalDocumentViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

urlpatterns = [
    path('', document_list, name='medical-document-list'),
    path('<uuid:pk>/', MedicalDocumentViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'put': 'update',
        'delete': 'destroy',
    }), name='medical-document-detail'),
    path('<uuid:pk>/pdf/', MedicalDocumentViewSet.as_view({
        'get': 'generate_pdf',
    }), name='medical-document-pdf'),
]
