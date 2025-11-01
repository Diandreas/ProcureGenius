"""
URL Configuration for Subscriptions API
"""
from django.urls import path
from . import api_views

app_name = 'subscriptions'

urlpatterns = [
    # Public endpoint - List plans
    path('plans/', api_views.list_plans, name='list_plans'),

    # Subscription status
    path('status/', api_views.get_subscription_status, name='get_subscription_status'),
    path('quotas/', api_views.get_quota_status, name='get_quota_status'),

    # Subscription management
    path('subscribe/', api_views.subscribe, name='subscribe'),
    path('change-plan/', api_views.change_plan, name='change_plan'),
    path('cancel/', api_views.cancel_subscription, name='cancel_subscription'),

    # Payment history
    path('payments/', api_views.payment_history, name='payment_history'),

    # Feature access check
    path('features/<str:feature_name>/', api_views.check_feature_access, name='check_feature_access'),
]
