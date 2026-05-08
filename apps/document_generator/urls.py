from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrganizationDocumentViewSet, HealthPackageViewSet, DocumentRenderView,
    CouponViewSet, CouponValidateView, CouponApplyView, coupon_manager_view,
)

router = DefaultRouter()
router.register(r'documents', OrganizationDocumentViewSet, basename='documents')
router.register(r'packages', HealthPackageViewSet, basename='packages')
router.register(r'coupons', CouponViewSet, basename='coupons')

urlpatterns = [
    # Paths spécifiques AVANT le router pour éviter la capture par le ViewSet
    path('coupons/validate/', CouponValidateView.as_view(), name='coupon-validate'),
    path('coupons/apply/', CouponApplyView.as_view(), name='coupon-apply'),
    path('admin/coupons/', coupon_manager_view, name='coupon-manager'),
    path('generate/<str:doc_type>/pdf/', DocumentRenderView.as_view(), name='document-render-pdf'),

    path('', include(router.urls)),
]
