from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # Dashboards
    path('', views.analytics_dashboard, name='dashboard'),
    path('spend-analysis/', views.spend_analysis, name='spend_analysis'),
    path('supplier-analysis/', views.supplier_analysis, name='supplier_analysis'),
    path('invoice-analysis/', views.invoice_analysis, name='invoice_analysis'),
    
    # Rapports prédéfinis
    path('reports/monthly/', views.monthly_report, name='monthly_report'),
    path('reports/quarterly/', views.quarterly_report, name='quarterly_report'),
    path('reports/annual/', views.annual_report, name='annual_report'),
    
    # Rapports personnalisés
    path('custom-reports/', views.custom_reports, name='custom_reports'),
    path('custom-reports/builder/', views.report_builder, name='report_builder'),
    path('custom-reports/<uuid:report_id>/', views.custom_report_detail, name='custom_report_detail'),
    
    # APIs pour graphiques
    path('api/spend-trends/', views.api_spend_trends, name='api_spend_trends'),
    path('api/supplier-performance/', views.api_supplier_performance, name='api_supplier_performance'),
    path('api/cash-flow/', views.api_cash_flow_forecast, name='api_cash_flow'),
    
    # Export
    path('export/<str:report_type>/', views.export_report, name='export_report'),
]