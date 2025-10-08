from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MigrationJobViewSet, MigrationLogViewSet
from . import quickbooks_views

router = DefaultRouter()
router.register(r'jobs', MigrationJobViewSet, basename='migration-job')
router.register(r'logs', MigrationLogViewSet, basename='migration-log')

urlpatterns = [
    path('', include(router.urls)),

    # QuickBooks OAuth endpoints
    path('quickbooks/auth-url/', quickbooks_views.quickbooks_auth_url, name='quickbooks-auth-url'),
    path('quickbooks/callback/', quickbooks_views.quickbooks_callback, name='quickbooks-callback'),
    path('quickbooks/status/', quickbooks_views.quickbooks_status, name='quickbooks-status'),
    path('quickbooks/disconnect/', quickbooks_views.quickbooks_disconnect, name='quickbooks-disconnect'),
    path('quickbooks/test/', quickbooks_views.quickbooks_test_connection, name='quickbooks-test'),
    path('quickbooks/preview/', quickbooks_views.quickbooks_preview_data, name='quickbooks-preview'),
]
