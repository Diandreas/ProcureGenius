from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views

app_name = 'api'

# Router automatique pour ViewSets
router = DefaultRouter()
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'supplier-categories', views.SupplierCategoryViewSet)
router.register(r'products', views.ProductViewSet)
# router.register(r'clients', views.ClientViewSet)  # ClientViewSet commenté temporairement
router.register(r'purchase-orders', views.PurchaseOrderViewSet)
router.register(r'invoices', views.InvoiceViewSet)

urlpatterns = [
    # Authentication
    path('auth/token/', obtain_auth_token, name='api_token_auth'),
    
    # Router URLs
    path('', include(router.urls)),
    
    # Custom API endpoints
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/recent/', views.RecentActivityView.as_view(), name='recent-activity'),
    
    # AI endpoints temporaires
    path('ai/conversations/', views.AIConversationsView.as_view(), name='ai-conversations'),
    path('ai/quick-actions/', views.AIQuickActionsView.as_view(), name='ai-quick-actions'),
    
    # Keep existing endpoints if they exist
    # path('analytics/', include('apps.analytics.api_urls')),
    # path('integrations/', include('apps.integrations.api_urls')),
]