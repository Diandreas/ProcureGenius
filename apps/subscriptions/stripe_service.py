"""
Stripe integration service for Procura subscriptions.
Handles checkout sessions, webhooks, and customer portal.
"""
import stripe
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


class StripeNotConfigured(ValueError):
    """Levée quand aucune clé Stripe n'est configurée (mode local / paiement off)."""


class StripeService:

    @staticmethod
    def _ensure_configured():
        """Recharge la clé API et vérifie que Stripe est configuré.

        La clé est lue au moment de l'appel (et non seulement à l'import) afin de
        fonctionner même si les settings sont chargés après ce module.
        """
        key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        stripe.api_key = key
        if not key:
            raise StripeNotConfigured(
                "Le paiement par carte n'est pas encore activé. "
                "Configurez STRIPE_SECRET_KEY pour activer les abonnements payants."
            )

    @staticmethod
    def get_or_create_customer(organization, user):
        """Get existing Stripe customer or create one."""
        from .models import Subscription
        try:
            sub = organization.subscription
            if sub.stripe_customer_id:
                return sub.stripe_customer_id
        except Exception:
            pass

        customer = stripe.Customer.create(
            email=user.email,
            name=organization.name,
            metadata={'organization_id': str(organization.id)},
        )
        return customer.id

    @staticmethod
    def create_checkout_session(organization, user, plan, billing_period, success_url, cancel_url):
        """Create a Stripe Checkout Session for the given plan."""
        StripeService._ensure_configured()
        price_id = (
            plan.stripe_price_id_yearly
            if billing_period == 'yearly'
            else plan.stripe_price_id_monthly
        )
        if not price_id:
            raise ValueError(f"No Stripe price configured for plan '{plan.code}' ({billing_period})")

        customer_id = StripeService.get_or_create_customer(organization, user)

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url=success_url + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=cancel_url,
            metadata={
                'organization_id': str(organization.id),
                'plan_code': plan.code,
                'billing_period': billing_period,
            },
            subscription_data={
                'metadata': {
                    'organization_id': str(organization.id),
                    'plan_code': plan.code,
                }
            },
            allow_promotion_codes=True,
        )
        return session

    @staticmethod
    def create_portal_session(organization, return_url):
        """Create a Stripe customer portal session."""
        StripeService._ensure_configured()
        try:
            customer_id = organization.subscription.stripe_customer_id
        except Exception:
            raise ValueError("No Stripe customer found for this organization")

        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session

    @staticmethod
    def handle_webhook(payload, sig_header):
        """Process a Stripe webhook event."""
        StripeService._ensure_configured()
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
        if not webhook_secret:
            raise StripeNotConfigured("STRIPE_WEBHOOK_SECRET non configuré.")
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Stripe webhook signature error: {e}")
            raise

        event_type = event['type']
        logger.info(f"Stripe webhook received: {event_type}")

        if event_type == 'checkout.session.completed':
            StripeService._handle_checkout_completed(event['data']['object'])
        elif event_type == 'invoice.payment_succeeded':
            StripeService._handle_payment_succeeded(event['data']['object'])
        elif event_type == 'customer.subscription.deleted':
            StripeService._handle_subscription_deleted(event['data']['object'])
        elif event_type == 'customer.subscription.updated':
            StripeService._handle_subscription_updated(event['data']['object'])

        return event_type

    @staticmethod
    def _handle_checkout_completed(session):
        from .models import Subscription, SubscriptionPlan, SubscriptionPayment
        from apps.accounts.models import Organization

        org_id = session.get('metadata', {}).get('organization_id')
        plan_code = session.get('metadata', {}).get('plan_code')
        billing_period = session.get('metadata', {}).get('billing_period', 'monthly')

        if not org_id or not plan_code:
            logger.error("Missing metadata in checkout.session.completed")
            return

        try:
            organization = Organization.objects.get(id=org_id)
            plan = SubscriptionPlan.objects.get(code=plan_code)
        except Exception as e:
            logger.error(f"Stripe checkout: could not find org/plan: {e}")
            return

        stripe_sub_id = session.get('subscription', '')
        customer_id = session.get('customer', '')
        amount = session.get('amount_total', 0) / 100

        # Determine period dates from Stripe subscription
        period_start = timezone.now()
        period_end = period_start + timedelta(days=365 if billing_period == 'yearly' else 30)

        if stripe_sub_id:
            try:
                stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)
                from datetime import datetime
                period_start = datetime.utcfromtimestamp(stripe_sub['current_period_start']).replace(tzinfo=timezone.utc)
                period_end = datetime.utcfromtimestamp(stripe_sub['current_period_end']).replace(tzinfo=timezone.utc)
            except Exception:
                pass

        sub, _ = Subscription.objects.get_or_create(
            organization=organization,
            defaults={
                'plan': plan,
                'status': 'active',
                'billing_period': billing_period,
                'current_period_start': period_start,
                'current_period_end': period_end,
            }
        )
        sub.plan = plan
        sub.status = 'active'
        sub.billing_period = billing_period
        sub.payment_method = 'stripe'
        sub.stripe_customer_id = customer_id
        sub.stripe_subscription_id = stripe_sub_id
        sub.stripe_price_id = session.get('metadata', {}).get('price_id', '')
        sub.current_period_start = period_start
        sub.current_period_end = period_end
        sub.save()

        SubscriptionPayment.objects.create(
            subscription=sub,
            amount=amount,
            currency='EUR',
            status='completed',
            payment_method='stripe',
            stripe_payment_intent_id=session.get('payment_intent', ''),
        )
        logger.info(f"Subscription activated: org={org_id} plan={plan_code}")

    @staticmethod
    def _handle_payment_succeeded(invoice):
        from .models import Subscription, SubscriptionPayment
        stripe_sub_id = invoice.get('subscription')
        if not stripe_sub_id:
            return
        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
            sub.status = 'active'
            # Refresh period
            stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)
            from datetime import datetime
            sub.current_period_start = datetime.utcfromtimestamp(stripe_sub['current_period_start']).replace(tzinfo=timezone.utc)
            sub.current_period_end = datetime.utcfromtimestamp(stripe_sub['current_period_end']).replace(tzinfo=timezone.utc)
            sub.save()
            SubscriptionPayment.objects.create(
                subscription=sub,
                amount=invoice.get('amount_paid', 0) / 100,
                currency=invoice.get('currency', 'eur').upper(),
                status='completed',
                payment_method='stripe',
            )
        except Subscription.DoesNotExist:
            logger.warning(f"No subscription found for stripe_sub_id={stripe_sub_id}")

    @staticmethod
    def _handle_subscription_deleted(stripe_sub):
        from .models import Subscription
        stripe_sub_id = stripe_sub.get('id')
        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
            sub.status = 'cancelled'
            sub.cancelled_at = timezone.now()
            sub.save()
            logger.info(f"Subscription cancelled: {stripe_sub_id}")
        except Subscription.DoesNotExist:
            pass

    @staticmethod
    def _handle_subscription_updated(stripe_sub):
        from .models import Subscription
        stripe_sub_id = stripe_sub.get('id')
        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
            stripe_status = stripe_sub.get('status')
            status_map = {
                'active': 'active',
                'past_due': 'past_due',
                'canceled': 'cancelled',
                'unpaid': 'past_due',
                'trialing': 'trial',
            }
            sub.status = status_map.get(stripe_status, sub.status)
            sub.save()
        except Subscription.DoesNotExist:
            pass
