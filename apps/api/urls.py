from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views
from . import quick_create_views
from apps.accounts import api_views as accounts_api_views
from apps.accounts import auth_api_views

app_name = 'api'

# Router automatique pour ViewSets
router = DefaultRouter()
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'supplier-categories', views.SupplierCategoryViewSet)
router.register(r'supplier-products', views.SupplierProductViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'product-categories', views.ProductCategoryViewSet)
router.register(r'warehouses', views.WarehouseViewSet)
router.register(r'clients', views.ClientViewSet)
router.register(r'purchase-orders', views.PurchaseOrderViewSet)
router.register(r'invoices', views.InvoiceViewSet)

urlpatterns = [
    # Authentication - Enhanced
    path('auth/token/', obtain_auth_token, name='api_token_auth'),
    path('auth/register/', auth_api_views.api_register, name='api_register'),
    path('auth/login/', auth_api_views.api_login, name='api_login'),
    path('auth/logout/', auth_api_views.api_logout, name='api_logout'),
    path('auth/verify-email/', auth_api_views.api_verify_email, name='api_verify_email'),
    path('auth/forgot-password/', auth_api_views.api_forgot_password, name='api_forgot_password'),
    path('auth/reset-password/', auth_api_views.api_reset_password, name='api_reset_password'),

    # Accounts & User management APIs
    path('accounts/profile/', accounts_api_views.api_profile, name='api_profile'),
    path('accounts/preferences/', accounts_api_views.api_user_preferences, name='api_user_preferences'),
    path('accounts/modules/', accounts_api_views.api_user_modules, name='api_user_modules'),
    path('accounts/profile-types/', accounts_api_views.api_profile_types, name='api_profile_types'),
    path('accounts/organization/settings/', accounts_api_views.api_organization_settings, name='api_organization_settings'),
    path('accounts/organization/users/', accounts_api_views.api_organization_users, name='api_organization_users'),
    path('accounts/organization/users/<uuid:user_id>/', accounts_api_views.api_organization_user_detail, name='api_organization_user_detail'),
    path('accounts/organization/users/<uuid:user_id>/permissions/', accounts_api_views.api_user_permissions, name='api_user_permissions'),

    # Router URLs
    path('', include(router.urls)),

    # Custom API endpoints
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/recent/', views.RecentActivityView.as_view(), name='recent-activity'),

    # Quick Create endpoints (avec détection de doublons)
    path('quick-create/client/', quick_create_views.quick_create_client, name='quick-create-client'),
    path('quick-create/supplier/', quick_create_views.quick_create_supplier, name='quick-create-supplier'),
    path('quick-create/product/', quick_create_views.quick_create_product, name='quick-create-product'),

    # AI Assistant endpoints
    path('ai/', include('apps.ai_assistant.api_urls')),

    # E-Sourcing endpoints
    path('e-sourcing/', include('apps.e_sourcing.urls')),

    # Contracts endpoints
    path('contracts/', include('apps.contracts.urls')),

    # Data Migration endpoints
    path('migration/', include('apps.data_migration.urls')),

    # Reports endpoints
    path('reports/', include('apps.reports.urls')),

    # Analytics - Dashboard amélioré
    path('analytics/', include('apps.analytics.api_urls')),

    # Subscriptions - Plans, quotas, billing
    path('subscriptions/', include('apps.subscriptions.urls')),

    # Core - Currencies and system utilities
    path('core/', include('apps.core.api_urls')),

    # Keep existing endpoints if they exist
    # path('integrations/', include('apps.integrations.api_urls')),
]