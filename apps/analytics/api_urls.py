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
    ActivityIndicatorsView,
    EnhancedRevenueAnalyticsView,
    ServiceRevenueAnalyticsView
)
from .report_views import ReportConfigView, ReportTestView
from .inventory_analytics import (
    ReorderQuantitiesView,
    StockoutRiskAnalysisView,
    AtRiskProductsView,
    MovementAnalysisView,
    InventoryDashboardStatsView,
    StockValueAnalyticsView,
    WilsonEOQView,
    ProductScoresView,
    EOQDashboardView,
    PredictiveRestockView,
    ConsumptionStatsView,
    UnifiedDashboardView,
)

app_name = 'analytics_api'

urlpatterns = [
    # Healthcare Analytics
    path('healthcare/exam-status/', ExamStatusByPatientView.as_view(), name='healthcare_exam_status'),
    path('healthcare/exam-types/', ExamTypesByPeriodView.as_view(), name='healthcare_exam_types'),
    path('healthcare/demographics/', DemographicAnalysisView.as_view(), name='healthcare_demographics'),
    path('healthcare/revenue/', RevenueAnalyticsView.as_view(), name='healthcare_revenue'),
    path('healthcare/revenue-enhanced/', EnhancedRevenueAnalyticsView.as_view(), name='healthcare_revenue_enhanced'),
    path('healthcare/dashboard-stats/', HealthcareDashboardStatsView.as_view(), name='healthcare_dashboard_stats'),
    path('healthcare/activity-indicators/', ActivityIndicatorsView.as_view(), name='healthcare_activity_indicators'),
    path('healthcare/service-revenue/', ServiceRevenueAnalyticsView.as_view(), name='healthcare_service_revenue'),

    # Inventory Analytics
    path('inventory/reorder/', ReorderQuantitiesView.as_view(), name='inventory_reorder'),
    path('inventory/stockout-risk/', StockoutRiskAnalysisView.as_view(), name='inventory_stockout_risk'),
    path('inventory/at-risk/', AtRiskProductsView.as_view(), name='inventory_at_risk'),
    path('inventory/movements/', MovementAnalysisView.as_view(), name='inventory_movements'),
    path('inventory/dashboard-stats/', InventoryDashboardStatsView.as_view(), name='inventory_dashboard_stats'),
    path('inventory/stock-value/', StockValueAnalyticsView.as_view(), name='inventory_stock_value'),

    # Wilson EOQ & Scoring
    path('inventory/wilson-eoq/', WilsonEOQView.as_view(), name='inventory_wilson_eoq'),
    path('inventory/product-scores/', ProductScoresView.as_view(), name='inventory_product_scores'),
    path('inventory/eoq-dashboard/', EOQDashboardView.as_view(), name='inventory_eoq_dashboard'),
    path('inventory/predictive-restock/', PredictiveRestockView.as_view(), name='inventory_predictive_restock'),
    path('inventory/consumption-stats/', ConsumptionStatsView.as_view(), name='inventory_consumption_stats'),

    # Unified Dashboard
    path('unified-dashboard/', UnifiedDashboardView.as_view(), name='unified_dashboard'),

    # Report Configuration
    path('report-config/', ReportConfigView.as_view(), name='report_config'),
    path('report-config/test/', ReportTestView.as_view(), name='report_config_test'),
]
