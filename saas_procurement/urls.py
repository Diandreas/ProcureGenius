"""
URL configuration for saas_procurement project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import i18n_patterns

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # APIs REST
    path('api/v1/', include('apps.api.urls')),
    
    # Authentification (allauth désactivé pour développement)
    # path('accounts/', include('allauth.urls')),
    path('accounts/', include('apps.accounts.urls')),
    
    # Langue
    path('i18n/', include('django.conf.urls.i18n')),
]

# URLs avec préfixe de langue
urlpatterns += i18n_patterns(
    # Apps principales
    path('', include('apps.core.urls')),  # Dashboard principal
    path('purchase-orders/', include('apps.purchase_orders.urls')),
    path('invoicing/', include('apps.invoicing.urls')),
    path('print/', include('apps.invoicing.urls_print')),
    path('suppliers/', include('apps.suppliers.urls')),
    # path('analytics/', include('apps.analytics.urls')),  # Temporairement commenté
    path('ai/', include('apps.ai_assistant.urls')),  # IA Assistant activé
    # path('integrations/', include('apps.integrations.urls')),  # Temporairement commenté
    
    # Fallback pour URLs sans préfixe
    prefix_default_language=False,
)

# Fichiers média en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Gestion d'erreurs (désactivé pour développement)
# handler404 = 'apps.core.views.custom_404'
# handler500 = 'apps.core.views.custom_500'