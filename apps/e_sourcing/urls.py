from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SourcingEventViewSet,
    SupplierInvitationViewSet,
    SupplierBidViewSet,
    BidItemViewSet,
    public_sourcing_event,
    public_submit_bid,
    send_invitations,
    request_otp,
    verify_otp
)

router = DefaultRouter()
router.register(r'events', SourcingEventViewSet, basename='sourcing-event')
router.register(r'invitations', SupplierInvitationViewSet, basename='supplier-invitation')
router.register(r'bids', SupplierBidViewSet, basename='supplier-bid')
router.register(r'bid-items', BidItemViewSet, basename='bid-item')

urlpatterns = [
    path('', include(router.urls)),
    # URLs publiques pour soumission via token
    path('public/<str:token>/', public_sourcing_event, name='public-sourcing-event'),
    path('public/<str:token>/submit/', public_submit_bid, name='public-submit-bid'),
    # URLs pour envoi d'emails
    path('events/<uuid:event_id>/send-invitations/', send_invitations, name='send-invitations'),
    # URLs pour OTP (protection DDoS)
    path('events/<uuid:event_id>/request-otp/', request_otp, name='request-otp'),
    path('events/<uuid:event_id>/verify-otp/', verify_otp, name='verify-otp'),
]
