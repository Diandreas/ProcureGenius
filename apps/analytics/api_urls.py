from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .api_views import (
    EnhancedDashboardStatsView,
    DashboardExportView,
    DashboardConfigView,
    SavedDashboardViewsView
)
from .widget_views import (
    WidgetListView,
    DashboardLayoutViewSet,
    WidgetDataView
)

app_name = 'analytics_api'

# Router for ViewSets
router = DefaultRouter()
router.register(r'layouts', DashboardLayoutViewSet, basename='layout')

urlpatterns = [
    # Dashboard stats avec personnalisation
    path('stats/', EnhancedDashboardStatsView.as_view(), name='enhanced_dashboard_stats'),

    # Export dashboard (PDF/Excel)
    path('export/', DashboardExportView.as_view(), name='dashboard_export'),

    # Configuration utilisateur
    path('config/', DashboardConfigView.as_view(), name='dashboard_config'),

    # Vues sauvegardées
    path('saved-views/', SavedDashboardViewsView.as_view(), name='saved_dashboard_views'),
    path('saved-views/<uuid:view_id>/', SavedDashboardViewsView.as_view(), name='saved_dashboard_view_detail'),

    # Widgets
    path('widgets/', WidgetListView.as_view(), name='widgets_list'),
    path('widget-data/<str:widget_code>/', WidgetDataView.as_view(), name='widget_data'),

    # Include router URLs (layouts)
    path('', include(router.urls)),
]
