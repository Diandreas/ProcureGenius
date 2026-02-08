"""
URL Configuration for Core API
Includes currency endpoints and system-wide utilities
"""
from django.urls import path
from . import api_views

app_name = 'core'

urlpatterns = [
    # Currency endpoints
    path('currencies/', api_views.api_currencies_list, name='currencies_list'),
    path('currencies/<str:currency_code>/', api_views.api_currency_info, name='currency_info'),
    path('currencies/format/', api_views.api_format_currency, name='format_currency'),

    # User currency preference
    path('user/currency/', api_views.api_user_currency_preference, name='user_currency_preference'),

    # Module notification counts (lightweight polling)
    path('module-counts/', api_views.api_module_notification_counts, name='module_notification_counts'),
]
