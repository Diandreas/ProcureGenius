from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContractViewSet,
    ContractClauseViewSet,
    ContractMilestoneViewSet,
    ContractDocumentViewSet,
    ContractTemplateViewSet,
    ContractSectionViewSet
)

router = DefaultRouter()
router.register(r'clauses', ContractClauseViewSet, basename='contract-clause')
router.register(r'milestones', ContractMilestoneViewSet, basename='contract-milestone')
router.register(r'documents', ContractDocumentViewSet, basename='contract-document')
router.register(r'templates', ContractTemplateViewSet, basename='contract-template')
router.register(r'sections', ContractSectionViewSet, basename='contract-section')
router.register(r'', ContractViewSet, basename='contract')

urlpatterns = [
    path('', include(router.urls)),
]
