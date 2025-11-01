"""
API Views for Subscription Management
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils.translation import gettext as _
from django.utils import timezone

from .models import SubscriptionPlan, Subscription, SubscriptionPayment
from .serializers import (
    SubscriptionPlanSerializer,
    SubscriptionSerializer,
    SubscriptionStatusSerializer,
    SubscribeRequestSerializer,
    ChangePlanSerializer,
    CancelSubscriptionSerializer,
    SubscriptionPaymentSerializer,
)
from .quota_service import QuotaService


@api_view(['GET'])
@permission_classes([AllowAny])
def list_plans(request):
    """
    List all available subscription plans (public endpoint)

    GET /api/v1/subscriptions/plans/
    """
    plans = SubscriptionPlan.objects.filter(is_active=True).order_by('sort_order')
    serializer = SubscriptionPlanSerializer(plans, many=True)

    return Response({
        'plans': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_status(request):
    """
    Get current subscription status including quotas and features

    GET /api/v1/subscriptions/status/

    Returns:
        - Current subscription details
        - All quota statuses
        - Feature access flags
        - Warnings (if any quotas are > 80%)
    """
    organization = request.user.organization

    if not organization:
        return Response(
            {'error': _('No organization found')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get subscription
    subscription = QuotaService.get_subscription(organization)

    if not subscription:
        return Response(
            {'error': _('No active subscription found')},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get quota status
    quota_status = QuotaService.get_quota_status(organization)

    # Get features
    features = QuotaService.get_plan_features(organization)

    # Generate warnings
    warnings = []
    for quota_type, quota_info in quota_status.items():
        if quota_info.get('percentage', 0) >= 80 and quota_info.get('limit') not in [None, -1]:
            warnings.append(
                f"{quota_type}: {quota_info['used']}/{quota_info['limit']} ({quota_info['percentage']:.0f}%)"
            )

    # Prepare response
    data = {
        'subscription': SubscriptionSerializer(subscription).data,
        'quotas': quota_status,
        'features': features,
    }

    if warnings:
        data['warnings'] = warnings

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_quota_status(request):
    """
    Get quota status only (lighter endpoint)

    GET /api/v1/subscriptions/quotas/
    """
    organization = request.user.organization

    if not organization:
        return Response(
            {'error': _('No organization found')},
            status=status.HTTP_400_BAD_REQUEST
        )

    quota_status = QuotaService.get_quota_status(organization)

    return Response({'quotas': quota_status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe(request):
    """
    Subscribe to a plan (create new subscription)

    POST /api/v1/subscriptions/subscribe/

    Body:
        {
            "plan_code": "standard",
            "billing_period": "monthly",
            "payment_method": "paypal",
            "paypal_subscription_id": "I-XXX..."  // Optional
        }
    """
    organization = request.user.organization

    if not organization:
        return Response(
            {'error': _('No organization found')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if already has subscription
    if hasattr(organization, 'subscription'):
        return Response(
            {'error': _('Organization already has an active subscription. Use /change-plan/ instead.')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate request
    serializer = SubscribeRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Get plan
    try:
        plan = SubscriptionPlan.objects.get(code=data['plan_code'], is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {'error': _('Invalid plan code')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create subscription
    subscription = Subscription.objects.create(
        organization=organization,
        plan=plan,
        billing_period=data['billing_period'],
        payment_method=data['payment_method'],
        paypal_subscription_id=data.get('paypal_subscription_id', ''),
    )

    return Response(
        {
            'message': _('Subscription created successfully'),
            'subscription': SubscriptionSerializer(subscription).data
        },
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan(request):
    """
    Change subscription plan (upgrade or downgrade)

    POST /api/v1/subscriptions/change-plan/

    Body:
        {
            "new_plan_code": "premium",
            "billing_period": "yearly",  // Optional
            "immediately": false  // If true, changes immediately. If false, at end of period
        }
    """
    organization = request.user.organization

    if not organization:
        return Response(
            {'error': _('No organization found')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get current subscription
    subscription = QuotaService.get_subscription(organization)

    if not subscription:
        return Response(
            {'error': _('No active subscription found. Use /subscribe/ instead.')},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate request
    serializer = ChangePlanSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Get new plan
    try:
        new_plan = SubscriptionPlan.objects.get(code=data['new_plan_code'], is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {'error': _('Invalid plan code')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if same plan
    if subscription.plan.code == new_plan.code:
        return Response(
            {'error': _('You are already on this plan')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update subscription
    old_plan_name = subscription.plan.name
    subscription.plan = new_plan

    if data.get('billing_period'):
        subscription.billing_period = data['billing_period']

    if data.get('immediately', False):
        # Change immediately
        subscription.current_period_start = timezone.now()
        if subscription.billing_period == 'monthly':
            from datetime import timedelta
            subscription.current_period_end = timezone.now() + timedelta(days=30)
        else:
            from datetime import timedelta
            subscription.current_period_end = timezone.now() + timedelta(days=365)

    subscription.save()

    return Response({
        'message': _(f'Plan changed from {old_plan_name} to {new_plan.name}'),
        'subscription': SubscriptionSerializer(subscription).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """
    Cancel subscription

    POST /api/v1/subscriptions/cancel/

    Body:
        {
            "immediately": false,  // If true, cancels immediately. If false, at end of period
            "reason": "Too expensive"  // Optional
        }
    """
    organization = request.user.organization

    if not organization:
        return Response(
            {'error': _('No organization found')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get subscription
    subscription = QuotaService.get_subscription(organization)

    if not subscription:
        return Response(
            {'error': _('No active subscription found')},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate request
    serializer = CancelSubscriptionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Cancel subscription
    subscription.cancel(immediately=data.get('immediately', False))

    # Save cancellation reason in notes
    if data.get('reason'):
        subscription.notes = f"Cancellation reason: {data['reason']}\n" + subscription.notes
        subscription.save()

    return Response({
        'message': _('Subscription cancelled successfully'),
        'cancelled_at': subscription.cancelled_at,
        'ends_at': subscription.current_period_end if not data.get('immediately') else subscription.cancelled_at,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history(request):
    """
    Get payment history for organization

    GET /api/v1/subscriptions/payments/
    """
    organization = request.user.organization

    if not organization:
        return Response(
            {'error': _('No organization found')},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get subscription
    subscription = QuotaService.get_subscription(organization)

    if not subscription:
        return Response(
            {'error': _('No active subscription found')},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get payments
    payments = SubscriptionPayment.objects.filter(
        subscription=subscription
    ).order_by('-created_at')

    serializer = SubscriptionPaymentSerializer(payments, many=True)

    return Response({
        'payments': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_feature_access(request, feature_name):
    """
    Check if organization has access to a specific feature

    GET /api/v1/subscriptions/features/<feature_name>/

    Returns: {"has_access": true/false}
    """
    organization = request.user.organization

    if not organization:
        return Response(
            {'error': _('No organization found')},
            status=status.HTTP_400_BAD_REQUEST
        )

    has_access = QuotaService.check_feature_access(organization, feature_name)

    return Response({
        'feature': feature_name,
        'has_access': has_access,
    })
