from django.urls import path
from . import views, api

app_name = 'analytics'

urlpatterns = [
    path('', views.analytics_dashboard, name='dashboard'),
    path('reports/', views.reports, name='reports'),

    # API endpoints
    path('api/stock/detailed/', api.DetailedStockStatsView.as_view(), name='api-stock-detailed'),
]
