from django.urls import path
from . import views_simple as views
from . import views_admin
from . import views_user_panel

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),

    # Panel utilisateur principal (remplace le dashboard)
    path('app/', views_user_panel.user_dashboard, name='dashboard'),
    path('dashboard/', views_user_panel.user_dashboard, name='user_dashboard'),

    # Panel utilisateur - Gestion simplifiée
    path('mes-factures/', views_user_panel.user_invoices, name='user_invoices'),
    path('mes-commandes/', views_user_panel.user_purchase_orders, name='user_purchase_orders'),
    path('fournisseurs/', views_user_panel.user_suppliers, name='user_suppliers'),

    # API pour stats rapides
    path('api/quick-stats/', views_user_panel.quick_stats_api, name='quick_stats_api'),
    path('api/dashboard/stats/', views.api_dashboard_stats, name='api_dashboard_stats'),

    # URLs de l'interface d'administration moderne (pour admin seulement)
    path('admin-panel/', views_admin.admin_dashboard, name='admin_dashboard'),
    path('admin-panel/invoices/', views_admin.admin_invoices, name='admin_invoices'),
    path('admin-panel/purchase-orders/', views_admin.admin_purchase_orders, name='admin_purchase_orders'),
    path('admin-panel/suppliers/', views_admin.admin_suppliers, name='admin_suppliers'),
    path('admin-panel/users/', views_admin.admin_users, name='admin_users'),
    path('admin-panel/settings/', views_admin.admin_settings, name='admin_settings'),
    path('admin-panel/analytics/', views_admin.admin_analytics, name='admin_analytics'),
    path('admin-panel/api/stats/', views_admin.admin_api_stats, name='admin_api_stats'),
]
