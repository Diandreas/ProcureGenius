"""URLs Django (non-API) pour l'interface mobile Boris — coupons."""
from django.urls import path
from .views import coupon_manager_view

urlpatterns = [
    path('', coupon_manager_view, name='coupon-manager-mobile'),
]
