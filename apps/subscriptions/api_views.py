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


def _count_active_users(organization):
    """Nombre d'utilisateurs actifs dans l'organisation (pour le compteur de sièges)."""
    if not organization:
        return 0
    try:
        from apps.accounts.models import CustomUser
        return CustomUser.objects.filter(organization=organization, is_active=True).count()
    except Exception:
        return 0


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
        # Pas d'abonnement = plan gratuit par défaut (réponse 200 gracieuse,
        # pas une erreur 404 qui pollue la console et casse le front).
        free_features = {
            'has_ads': True, 'has_ai_assistant': False, 'has_purchase_orders': False,
            'has_suppliers': False, 'has_e_sourcing': False, 'has_contracts': False,
            'has_analytics': False, 'has_accounting': False,
        }
        return Response({
            'subscription': None,
            'plan_code': 'free',
            'quotas': {},
            'features': free_features,
            'seat_limit': 1,
            'active_users': _count_active_users(organization),
        })

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
        'seat_limit': subscription.seat_limit,
        'active_users': _count_active_users(organization),
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
            "plan_code": "pro",
            "billing_period": "monthly",
            "payment_method": "stripe",
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
def start_trial(request):
    """
    Démarre un essai gratuit (sans carte) du palier choisi à l'inscription.

    POST /api/v1/subscriptions/start-trial/  { "plan_code": "pro" | "business" | "free" }

    - free : reste/repasse en plan gratuit
    - pro/business : essai de TRIAL_PERIOD_DAYS jours (status=trial), sans carte
    Refuse de toucher un abonnement déjà payant/actif via Stripe.
    """
    from django.conf import settings as dj_settings
    from datetime import timedelta

    organization = request.user.organization
    if not organization:
        return Response({'error': _('No organization found')}, status=status.HTTP_400_BAD_REQUEST)

    plan_code = (request.data.get('plan_code') or 'free').lower()
    try:
        plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': _('Invalid plan code')}, status=status.HTTP_400_BAD_REQUEST)

    sub = QuotaService.get_subscription(organization)
    # Ne pas écraser un abonnement déjà payé via Stripe
    if sub and getattr(sub, 'stripe_subscription_id', ''):
        return Response({'error': _('Un abonnement payant est déjà actif.')}, status=status.HTTP_400_BAD_REQUEST)

    trial_days = getattr(dj_settings, 'TRIAL_PERIOD_DAYS', 30)
    now = timezone.now()

    if plan_code == 'free':
        new_status, ends = 'active', now + timedelta(days=365 * 10)
        trial_ends = None
    else:
        new_status, ends = 'trial', now + timedelta(days=trial_days)
        trial_ends = ends

    if not sub:
        sub = Subscription(organization=organization)
    sub.plan = plan
    sub.status = new_status
    sub.billing_period = 'monthly'
    sub.current_period_start = now
    sub.current_period_end = ends
    sub.trial_ends_at = trial_ends
    sub.save()

    return Response({
        'message': _('Essai démarré') if new_status == 'trial' else _('Plan gratuit activé'),
        'subscription': SubscriptionSerializer(sub).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan(request):
    """
    Change subscription plan (upgrade or downgrade)

    POST /api/v1/subscriptions/change-plan/

    Body:
        {
            "new_plan_code": "business",
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


# ── Stripe Views ──────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def stripe_create_checkout(request):
    """
    Create a Stripe Checkout Session and return the redirect URL.
    POST /api/v1/subscriptions/stripe/create-checkout/
    Body: { plan_code, billing_period }
    """
    from django.conf import settings
    from .stripe_service import StripeService

    organization = request.user.organization
    if not organization:
        return Response({'error': _('No organization found')}, status=status.HTTP_400_BAD_REQUEST)

    plan_code = request.data.get('plan_code')
    billing_period = request.data.get('billing_period', 'monthly')

    if not plan_code:
        return Response({'error': _('plan_code is required')}, status=status.HTTP_400_BAD_REQUEST)

    try:
        plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': _('Plan not found')}, status=status.HTTP_404_NOT_FOUND)

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    success_url = f"{frontend_url}/subscription/success"
    cancel_url = f"{frontend_url}/pricing"

    try:
        session = StripeService.create_checkout_session(
            organization=organization,
            user=request.user,
            plan=plan,
            billing_period=billing_period,
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return Response({'checkout_url': session.url, 'session_id': session.id})
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': _('Stripe error: ') + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def stripe_confirm_session(request):
    """
    Active l'abonnement de façon synchrone après un paiement réussi, à partir
    du session_id Stripe — sans dépendre du webhook (fiabilité + redirection).

    POST/GET /api/v1/subscriptions/stripe/confirm-session/?session_id=cs_...
    """
    import stripe
    from django.conf import settings
    from .stripe_service import StripeService

    organization = request.user.organization
    if not organization:
        return Response({'error': _('No organization found')}, status=status.HTTP_400_BAD_REQUEST)

    session_id = request.data.get('session_id') or request.query_params.get('session_id')
    if not session_id:
        return Response({'error': 'session_id requis'}, status=status.HTTP_400_BAD_REQUEST)

    key = getattr(settings, 'STRIPE_SECRET_KEY', '')
    if not key:
        return Response({'error': 'Stripe non configuré'}, status=status.HTTP_400_BAD_REQUEST)
    stripe.api_key = key

    try:
        session = stripe.checkout.Session.retrieve(session_id, expand=['subscription'])
    except Exception as e:
        return Response({'error': f'Session introuvable: {e}'}, status=status.HTTP_404_NOT_FOUND)

    # Sécurité : la session doit appartenir à l'organisation de l'utilisateur
    sess_org = (session.get('metadata') or {}).get('organization_id')
    if sess_org and str(sess_org) != str(organization.id):
        return Response({'error': 'Session non autorisée'}, status=status.HTTP_403_FORBIDDEN)

    # Activer seulement si le paiement est confirmé
    if session.get('payment_status') == 'paid' or session.get('status') == 'complete':
        try:
            # Réutilise la logique d'activation du webhook (idempotente)
            StripeService._handle_checkout_completed(session)
        except Exception as e:
            return Response({'error': f'Activation échouée: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'activated': True})

    return Response({'activated': False, 'payment_status': session.get('payment_status')})


@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook(request):
    """
    Receive and process Stripe webhook events.
    POST /api/v1/subscriptions/stripe/webhook/
    """
    from .stripe_service import StripeService

    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

    try:
        event_type = StripeService.handle_webhook(payload, sig_header)
        return Response({'received': True, 'event': event_type})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stripe_portal(request):
    """
    Create a Stripe customer portal session.
    GET /api/v1/subscriptions/stripe/portal/
    """
    from django.conf import settings
    from .stripe_service import StripeService

    organization = request.user.organization
    if not organization:
        return Response({'error': _('No organization found')}, status=status.HTTP_400_BAD_REQUEST)

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return_url = f"{frontend_url}/settings"

    try:
        session = StripeService.create_portal_session(organization, return_url)
        return Response({'portal_url': session.url})
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': _('Stripe error: ') + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
