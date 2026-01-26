"""
Analytics API URLs - New simplified dashboard system
Healthcare and Inventory Analytics endpoints
"""
from django.urls import path
from .healthcare_analytics import (
    ExamStatusByPatientView,
    ExamTypesByPeriodView,
    DemographicAnalysisView,
    RevenueAnalyticsView,
    HealthcareDashboardStatsView,
    ActivityIndicatorsView
)
from .inventory_analytics import (
    ReorderQuantitiesView,
    StockoutRiskAnalysisView,
    AtRiskProductsView,
    MovementAnalysisView,
    InventoryDashboardStatsView
)

app_name = 'analytics_api'

urlpatterns = [
    # Healthcare Analytics
    path('healthcare/exam-status/', ExamStatusByPatientView.as_view(), name='healthcare_exam_status'),
    path('healthcare/exam-types/', ExamTypesByPeriodView.as_view(), name='healthcare_exam_types'),
    path('healthcare/demographics/', DemographicAnalysisView.as_view(), name='healthcare_demographics'),
    path('healthcare/revenue/', RevenueAnalyticsView.as_view(), name='healthcare_revenue'),
    path('healthcare/dashboard-stats/', HealthcareDashboardStatsView.as_view(), name='healthcare_dashboard_stats'),
    path('healthcare/activity-indicators/', ActivityIndicatorsView.as_view(), name='healthcare_activity_indicators'),

    # Inventory Analytics
    path('inventory/reorder/', ReorderQuantitiesView.as_view(), name='inventory_reorder'),
    path('inventory/stockout-risk/', StockoutRiskAnalysisView.as_view(), name='inventory_stockout_risk'),
    path('inventory/at-risk/', AtRiskProductsView.as_view(), name='inventory_at_risk'),
    path('inventory/movements/', MovementAnalysisView.as_view(), name='inventory_movements'),
    path('inventory/dashboard-stats/', InventoryDashboardStatsView.as_view(), name='inventory_dashboard_stats'),
]
