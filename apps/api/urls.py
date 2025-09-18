from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

# Import des ViewSets (à créer)
# from apps.purchase_orders.viewsets import PurchaseOrderViewSet
# from apps.invoicing.viewsets import InvoiceViewSet
# from apps.suppliers.viewsets import SupplierViewSet, ClientViewSet
# from apps.ai_assistant.viewsets import AIConversationViewSet

# Router automatique pour ViewSets
router = DefaultRouter()
# router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-orders')
# router.register(r'invoices', InvoiceViewSet, basename='invoices')
# router.register(r'suppliers', SupplierViewSet, basename='suppliers')
# router.register(r'clients', ClientViewSet, basename='clients')
# router.register(r'ai-conversations', AIConversationViewSet, basename='ai-conversations')

urlpatterns = [
    # Authentication
    path('auth/token/', obtain_auth_token, name='api_token_auth'),
    
    # Router URLs
    path('', include(router.urls)),
    
    # Custom API endpoints
    path('analytics/', include('apps.analytics.api_urls')),
    path('integrations/', include('apps.integrations.api_urls')),
]