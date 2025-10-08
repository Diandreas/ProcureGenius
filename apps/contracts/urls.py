from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContractViewSet,
    ContractClauseViewSet,
    ContractMilestoneViewSet,
    ContractDocumentViewSet
)

router = DefaultRouter()
router.register(r'', ContractViewSet, basename='contract')
router.register(r'clauses', ContractClauseViewSet, basename='contract-clause')
router.register(r'milestones', ContractMilestoneViewSet, basename='contract-milestone')
router.register(r'documents', ContractDocumentViewSet, basename='contract-document')

urlpatterns = [
    path('', include(router.urls)),
]
