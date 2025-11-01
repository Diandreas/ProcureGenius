"""
Subscriptions app - Gestion des abonnements ProcureGenius
Plans: Free, Standard, Premium

Quick imports:
    from apps.subscriptions import QuotaService, require_quota, require_feature
"""
default_app_config = 'apps.subscriptions.apps.SubscriptionsConfig'

# Make common imports easier
from .quota_service import QuotaService, QuotaExceededException
from .decorators import require_quota, require_feature, track_usage, QuotaMixin, FeatureMixin

__all__ = [
    'QuotaService',
    'QuotaExceededException',
    'require_quota',
    'require_feature',
    'track_usage',
    'QuotaMixin',
    'FeatureMixin',
]
