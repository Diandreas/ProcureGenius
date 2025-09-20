"""
URL configuration for saas_procurement project - Minimal version.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # APIs REST
    path('api/v1/', include('apps.api.urls')),
    
    # Authentification simple (sans allauth)
    path('accounts/', include('apps.accounts.urls')),
    
    # Apps principales
    path('', include('apps.core.urls')),  # Dashboard principal
    path('purchase-orders/', include('apps.purchase_orders.urls')),
    path('invoicing/', include('apps.invoicing.urls')),
    path('suppliers/', include('apps.suppliers.urls')),
    path('analytics/', include('apps.analytics.urls')),
    path('ai/', include('apps.ai_assistant.urls')),
    path('integrations/', include('apps.integrations.urls')),
]

# Fichiers média en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Gestion d'erreurs
handler404 = 'apps.core.views.custom_404'
handler500 = 'apps.core.views.custom_500'
