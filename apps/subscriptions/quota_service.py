"""
QuotaService - Service centralizing quota verification and usage tracking
Used to enforce subscription limits throughout the application
"""
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import APIException
from rest_framework import status


class QuotaExceededException(APIException):
    """Exception raised when quota limit is exceeded"""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = _('Quota limit exceeded. Please upgrade your subscription.')
    default_code = 'quota_exceeded'


class QuotaService:
    """
    Service for checking and managing subscription quotas

    Usage:
        from apps.subscriptions.quota_service import QuotaService

        # Check quota before action
        QuotaService.check_quota(organization, 'invoices')

        # Increment usage after action
        QuotaService.increment_usage(organization, 'invoices')
    """

    QUOTA_TYPES = {
        'invoices': {
            'field': 'invoices_this_month',
            'limit_field': 'max_invoices_per_month',
            'name': _('Factures'),
            'unit': _('ce mois'),
        },
        'purchase_orders': {
            'field': 'purchase_orders_this_month',
            'limit_field': 'max_purchase_orders_per_month',
            'name': _('Bons de commande'),
            'unit': _('ce mois'),
        },
        'ai_requests': {
            'field': 'ai_requests_this_month',
            'limit_field': 'max_ai_requests_per_month',
            'name': _('Requêtes IA'),
            'unit': _('ce mois'),
        },
        'clients': {
            'limit_field': 'max_clients',
            'name': _('Clients'),
            'unit': _('total'),
            'count_model': 'apps.accounts.models.Client',
            'count_filter': 'organization',
        },
        'suppliers': {
            'limit_field': 'max_suppliers',
            'name': _('Fournisseurs'),
            'unit': _('total'),
            'count_model': 'apps.suppliers.models.Supplier',
            'count_filter': 'organization',
        },
        'products': {
            'limit_field': 'max_products',
            'name': _('Produits'),
            'unit': _('total'),
            'count_model': 'apps.invoicing.models.Product',
            'count_filter': 'organization',
        },
    }

    @classmethod
    def get_subscription(cls, organization):
        """Get active subscription for an organization"""
        try:
            return organization.subscription
        except:
            return None

    @classmethod
    def check_quota(cls, organization, quota_type, raise_exception=True):
        """
        Check if organization can perform an action based on quota

        Args:
            organization: Organization instance
            quota_type: Type of quota to check ('invoices', 'purchase_orders', 'ai_requests', etc.)
            raise_exception: If True, raise QuotaExceededException when limit is reached

        Returns:
            dict: {
                'can_proceed': bool,
                'used': int,
                'limit': int or None,
                'percentage': float,
                'remaining': int,
            }

        Raises:
            QuotaExceededException: If quota is exceeded and raise_exception=True
        """
        subscription = cls.get_subscription(organization)

        if not subscription:
            # No subscription = default to free plan restrictions
            if raise_exception:
                raise QuotaExceededException(
                    detail=_('No active subscription found. Please subscribe to continue.')
                )
            return {
                'can_proceed': False,
                'used': 0,
                'limit': 0,
                'percentage': 100,
                'remaining': 0,
            }

        # Check if subscription is active
        if not subscription.is_active_or_trial:
            if raise_exception:
                raise QuotaExceededException(
                    detail=_('Your subscription is not active. Please renew to continue.')
                )
            return {
                'can_proceed': False,
                'used': 0,
                'limit': 0,
                'percentage': 100,
                'remaining': 0,
            }

        # Get quota information from subscription
        can_proceed, used, limit = subscription.check_quota(quota_type)

        # Calculate additional info
        if limit is None or limit == -1:
            # Unlimited quota
            percentage = 0
            remaining = -1  # Unlimited
        else:
            percentage = (used / limit * 100) if limit > 0 else 100
            remaining = max(0, limit - used)

        result = {
            'can_proceed': can_proceed,
            'used': used,
            'limit': limit,
            'percentage': percentage,
            'remaining': remaining,
        }

        # Raise exception if quota exceeded
        if not can_proceed and raise_exception:
            quota_info = cls.QUOTA_TYPES.get(quota_type, {})
            quota_name = quota_info.get('name', quota_type)

            raise QuotaExceededException(
                detail=_(
                    f'Vous avez atteint la limite de {quota_name} pour votre plan '
                    f'({used}/{limit}). Passez à un plan supérieur pour continuer.'
                )
            )

        return result

    @classmethod
    def increment_usage(cls, organization, quota_type):
        """
        Increment usage counter for a quota type

        Args:
            organization: Organization instance
            quota_type: Type of quota to increment

        Returns:
            bool: True if successfully incremented, False otherwise
        """
        subscription = cls.get_subscription(organization)

        if not subscription:
            return False

        try:
            subscription.increment_usage(quota_type)
            return True
        except Exception as e:
            # Log error but don't fail the request
            print(f"Error incrementing usage for {quota_type}: {e}")
            return False

    @classmethod
    def get_quota_status(cls, organization):
        """
        Get status of all quotas for an organization

        Returns:
            dict: Status of all quota types
        """
        subscription = cls.get_subscription(organization)

        if not subscription:
            return {}

        quota_status = {}

        for quota_type in cls.QUOTA_TYPES.keys():
            try:
                status = cls.check_quota(organization, quota_type, raise_exception=False)
                quota_status[quota_type] = status
            except Exception as e:
                print(f"Error checking quota {quota_type}: {e}")
                quota_status[quota_type] = {
                    'can_proceed': False,
                    'error': str(e)
                }

        return quota_status

    @classmethod
    def check_feature_access(cls, organization, feature_name):
        """
        Check if organization has access to a specific feature

        Args:
            organization: Organization instance
            feature_name: Feature to check (e.g., 'ai_assistant', 'e_sourcing', 'contracts')

        Returns:
            bool: True if organization has access to the feature
        """
        subscription = cls.get_subscription(organization)

        if not subscription:
            return False

        plan = subscription.plan
        feature_attr = f'has_{feature_name}'

        return getattr(plan, feature_attr, False)

    @classmethod
    def get_plan_features(cls, organization):
        """
        Get all features available for organization's plan

        Returns:
            dict: Feature flags and their status
        """
        subscription = cls.get_subscription(organization)

        if not subscription:
            return {}

        plan = subscription.plan

        return {
            'has_ads': plan.has_ads,
            'has_ai_assistant': plan.has_ai_assistant,
            'has_purchase_orders': plan.has_purchase_orders,
            'has_suppliers': plan.has_suppliers,
            'has_e_sourcing': plan.has_e_sourcing,
            'has_contracts': plan.has_contracts,
            'has_analytics': plan.has_analytics,
        }
