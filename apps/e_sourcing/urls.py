from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SourcingEventViewSet,
    SupplierInvitationViewSet,
    SupplierBidViewSet,
    BidItemViewSet
)

router = DefaultRouter()
router.register(r'events', SourcingEventViewSet, basename='sourcing-event')
router.register(r'invitations', SupplierInvitationViewSet, basename='supplier-invitation')
router.register(r'bids', SupplierBidViewSet, basename='supplier-bid')
router.register(r'bid-items', BidItemViewSet, basename='bid-item')

urlpatterns = [
    path('', include(router.urls)),
]
