"""
Decorators for quota and feature access verification
Apply these decorators to views/API endpoints to enforce subscription limits
"""
from functools import wraps
from django.utils.translation import gettext_lazy as _
from rest_framework.response import Response
from rest_framework import status
from .quota_service import QuotaService, QuotaExceededException


def require_quota(quota_type):
    """
    Decorator to check quota before executing a view

    Usage:
        @api_view(['POST'])
        @permission_classes([IsAuthenticated])
        @require_quota('invoices')
        def create_invoice(request):
            # Will only execute if quota allows
            ...

    Args:
        quota_type: Type of quota to check ('invoices', 'purchase_orders', 'ai_requests', etc.)
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Get organization from user
            user = request.user
            if not user or not user.is_authenticated:
                return Response(
                    {'error': _('Authentication required')},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            organization = user.organization
            if not organization:
                return Response(
                    {'error': _('No organization found')},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check quota
            try:
                quota_status = QuotaService.check_quota(
                    organization,
                    quota_type,
                    raise_exception=True
                )
                # Store quota status in request for potential use in view
                request.quota_status = quota_status
            except QuotaExceededException as e:
                return Response(
                    {
                        'error': str(e.detail),
                        'code': 'quota_exceeded',
                        'quota_type': quota_type,
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            # Execute view
            response = view_func(request, *args, **kwargs)

            # Auto-increment usage on successful creation (2xx status codes)
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                # Only increment for POST/PUT requests (creation/update)
                if request.method in ['POST', 'PUT']:
                    QuotaService.increment_usage(organization, quota_type)

            return response

        return wrapper
    return decorator


def require_feature(feature_name):
    """
    Decorator to check if organization has access to a feature

    Usage:
        @api_view(['GET'])
        @permission_classes([IsAuthenticated])
        @require_feature('ai_assistant')
        def ai_chat(request):
            # Will only execute if plan includes AI
            ...

    Args:
        feature_name: Name of feature to check ('ai_assistant', 'e_sourcing', 'contracts', etc.)
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Get organization from user
            user = request.user
            if not user or not user.is_authenticated:
                return Response(
                    {'error': _('Authentication required')},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            organization = user.organization
            if not organization:
                return Response(
                    {'error': _('No organization found')},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check feature access
            has_access = QuotaService.check_feature_access(organization, feature_name)

            if not has_access:
                return Response(
                    {
                        'error': _(f'This feature is not available in your current plan. Please upgrade to access {feature_name}.'),
                        'code': 'feature_not_available',
                        'feature': feature_name,
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator


def track_usage(quota_type):
    """
    Decorator to track usage without blocking (just increment counter)

    Usage:
        @api_view(['POST'])
        @permission_classes([IsAuthenticated])
        @track_usage('ai_requests')
        def ai_generate(request):
            # Will execute regardless, but increment counter
            ...

    Args:
        quota_type: Type of quota to track
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Execute view first
            response = view_func(request, *args, **kwargs)

            # Track usage on successful response
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                user = request.user
                if user and user.is_authenticated and hasattr(user, 'organization'):
                    organization = user.organization
                    if organization:
                        QuotaService.increment_usage(organization, quota_type)

            return response

        return wrapper
    return decorator


def check_quota_middleware(quota_type):
    """
    Middleware-style decorator that checks quota but doesn't auto-increment
    Useful when you need manual control over incrementing

    Usage:
        @api_view(['POST'])
        @permission_classes([IsAuthenticated])
        @check_quota_middleware('invoices')
        def create_invoice(request):
            # Create invoice...
            # Manually increment if needed:
            # QuotaService.increment_usage(request.user.organization, 'invoices')
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Get organization from user
            user = request.user
            if not user or not user.is_authenticated:
                return Response(
                    {'error': _('Authentication required')},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            organization = user.organization
            if not organization:
                return Response(
                    {'error': _('No organization found')},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check quota
            try:
                quota_status = QuotaService.check_quota(
                    organization,
                    quota_type,
                    raise_exception=True
                )
                # Store quota status in request
                request.quota_status = quota_status
            except QuotaExceededException as e:
                return Response(
                    {
                        'error': str(e.detail),
                        'code': 'quota_exceeded',
                        'quota_type': quota_type,
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            # Execute view (no auto-increment)
            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator


# Class-based view mixin
class QuotaMixin:
    """
    Mixin for class-based views to check quota

    Usage:
        class InvoiceCreateView(QuotaMixin, APIView):
            quota_type = 'invoices'

            def post(self, request):
                # Quota already checked by dispatch
                ...
    """
    quota_type = None

    def dispatch(self, request, *args, **kwargs):
        if not self.quota_type:
            return super().dispatch(request, *args, **kwargs)

        # Get organization
        user = request.user
        if not user or not user.is_authenticated:
            return Response(
                {'error': _('Authentication required')},
                status=status.HTTP_401_UNAUTHORIZED
            )

        organization = user.organization
        if not organization:
            return Response(
                {'error': _('No organization found')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check quota
        try:
            quota_status = QuotaService.check_quota(
                organization,
                self.quota_type,
                raise_exception=True
            )
            request.quota_status = quota_status
        except QuotaExceededException as e:
            return Response(
                {
                    'error': str(e.detail),
                    'code': 'quota_exceeded',
                    'quota_type': self.quota_type,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        # Execute view
        response = super().dispatch(request, *args, **kwargs)

        # Auto-increment on successful POST/PUT
        if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
            if request.method in ['POST', 'PUT']:
                QuotaService.increment_usage(organization, self.quota_type)

        return response


class FeatureMixin:
    """
    Mixin for class-based views to check feature access

    Usage:
        class AIAssistantView(FeatureMixin, APIView):
            required_feature = 'ai_assistant'

            def post(self, request):
                # Feature access already checked
                ...
    """
    required_feature = None

    def dispatch(self, request, *args, **kwargs):
        if not self.required_feature:
            return super().dispatch(request, *args, **kwargs)

        # Get organization
        user = request.user
        if not user or not user.is_authenticated:
            return Response(
                {'error': _('Authentication required')},
                status=status.HTTP_401_UNAUTHORIZED
            )

        organization = user.organization
        if not organization:
            return Response(
                {'error': _('No organization found')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check feature access
        has_access = QuotaService.check_feature_access(organization, self.required_feature)

        if not has_access:
            return Response(
                {
                    'error': _(f'This feature is not available in your current plan.'),
                    'code': 'feature_not_available',
                    'feature': self.required_feature,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        return super().dispatch(request, *args, **kwargs)
