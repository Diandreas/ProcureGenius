from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import (
    CustomReport, ReportExecution, AnalyticsDashboard,
    BudgetPlan, BudgetCategory, KPIMetric, KPIValue, AnalyticsSnapshot
)


@admin.register(CustomReport)
class CustomReportAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'report_type', 'created_by', 'frequency',
        'run_count', 'is_active', 'last_run'
    ]
    list_filter = ['report_type', 'frequency', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['run_count', 'last_run', 'created_at', 'updated_at']


@admin.register(AnalyticsDashboard)
class AnalyticsDashboardAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'created_by', 'is_default', 'is_public', 'created_at'
    ]
    list_filter = ['is_default', 'is_public', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']


class BudgetCategoryInline(admin.TabularInline):
    model = BudgetCategory
    extra = 1
    fields = ['name', 'allocated_amount', 'description']


@admin.register(BudgetPlan)
class BudgetPlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'fiscal_year', 'total_budget', 'is_active',
        'is_approved', 'created_by'
    ]
    list_filter = ['fiscal_year', 'is_active', 'is_approved', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'approved_at']
    inlines = [BudgetCategoryInline]


@admin.register(KPIMetric)
class KPIMetricAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'metric_type', 'aggregation_period',
        'target_value', 'is_active', 'created_by'
    ]
    list_filter = ['metric_type', 'aggregation_period', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']