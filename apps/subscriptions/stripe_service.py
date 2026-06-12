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
    def create_checkout_session(organization, user, plan, billing_period, success_url, cancel_url, extra_seats=0):
        """Create a Stripe Checkout Session for the given plan (+ optional seats)."""
        StripeService._ensure_configured()
        price_id = (
            plan.stripe_price_id_yearly
            if billing_period == 'yearly'
            else plan.stripe_price_id_monthly
        )
        if not price_id:
            raise ValueError(f"No Stripe price configured for plan '{plan.code}' ({billing_period})")

        customer_id = StripeService.get_or_create_customer(organization, user)

        line_items = [{'price': price_id, 'quantity': 1}]

        # Sièges supplémentaires (facturés à la quantité).
        extra_seats = int(extra_seats or 0)
        seat_price_id = (
            plan.stripe_seat_price_id_yearly
            if billing_period == 'yearly'
            else plan.stripe_seat_price_id_monthly
        )
        if extra_seats > 0 and seat_price_id:
            line_items.append({'price': seat_price_id, 'quantity': extra_seats})

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=line_items,
            mode='subscription',
            success_url=success_url + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=cancel_url,
            metadata={
                'organization_id': str(organization.id),
                'plan_code': plan.code,
                'billing_period': billing_period,
                'extra_seats': str(extra_seats),
            },
            subscription_data={
                'metadata': {
                    'organization_id': str(organization.id),
                    'plan_code': plan.code,
                    'extra_seats': str(extra_seats),
                }
            },
            allow_promotion_codes=True,
        )
        return session

    @staticmethod
    def set_seats(organization, total_extra_seats):
        """Met à jour le nombre de sièges supplémentaires sur l'abonnement Stripe
        existant (proratisé), et synchronise Subscription.extra_seats.

        total_extra_seats = nombre de sièges AU-DELÀ de ceux inclus dans le plan.
        """
        StripeService._ensure_configured()
        try:
            sub = organization.subscription
        except Exception:
            sub = None
        if not sub or not sub.stripe_subscription_id:
            raise ValueError("Aucun abonnement payant actif : passez à un plan payant pour ajouter des sièges.")

        plan = sub.plan
        seat_price_id = (
            plan.stripe_seat_price_id_yearly
            if sub.billing_period == 'yearly'
            else plan.stripe_seat_price_id_monthly
        )
        if not seat_price_id:
            raise ValueError("Sièges supplémentaires indisponibles pour ce plan.")

        total_extra_seats = max(0, int(total_extra_seats or 0))
        stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
        items = stripe_sub['items']['data']
        seat_item = next(
            (i for i in items
             if i['price']['id'] == seat_price_id or (i['price'].get('metadata') or {}).get('kind') == 'seat'),
            None,
        )

        if total_extra_seats == 0:
            if seat_item:
                stripe.SubscriptionItem.delete(seat_item['id'], proration_behavior='create_prorations')
        elif seat_item:
            stripe.SubscriptionItem.modify(seat_item['id'], quantity=total_extra_seats, proration_behavior='create_prorations')
        else:
            stripe.SubscriptionItem.create(
                subscription=sub.stripe_subscription_id,
                price=seat_price_id,
                quantity=total_extra_seats,
                proration_behavior='create_prorations',
            )

        sub.extra_seats = total_extra_seats
        sub.save(update_fields=['extra_seats'])
        return sub

    @staticmethod
    def cancel_subscription(organization, immediately=False):
        """Annule l'abonnement côté Stripe.

        - immediately=False : `cancel_at_period_end=True` (reste actif jusqu'à la
          fin de période, puis se termine — comportement attendu in-app).
        - immediately=True : suppression immédiate.
        No-op si pas d'abonnement Stripe (essai/gratuit géré côté local).
        """
        StripeService._ensure_configured()
        try:
            sub = organization.subscription
        except Exception:
            sub = None
        if not sub or not sub.stripe_subscription_id:
            return sub
        try:
            if immediately:
                stripe.Subscription.delete(sub.stripe_subscription_id)
            else:
                stripe.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=True)
        except Exception as e:
            logger.warning(f"Stripe cancel failed for {sub.stripe_subscription_id}: {e}")
        return sub

    @staticmethod
    def create_portal_session(organization, return_url):
        """Create a Stripe customer portal session.

        Lève ValueError (→ 400 côté API) si l'organisation n'a pas encore de
        client Stripe (pas d'abonnement payant) ou si Stripe refuse le client,
        plutôt qu'une 500 alarmante.
        """
        StripeService._ensure_configured()
        try:
            customer_id = organization.subscription.stripe_customer_id
        except Exception:
            customer_id = None

        if not customer_id:
            raise ValueError("Aucun abonnement payant : pas de client Stripe à gérer.")

        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
        except stripe.error.InvalidRequestError as e:
            # Client introuvable / portail non configuré → traiter comme "rien à gérer"
            raise ValueError(f"Facturation indisponible : {e.user_message or str(e)}")
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
        # Sièges supplémentaires payés (depuis la metadata du checkout).
        try:
            sub.extra_seats = int(session.get('metadata', {}).get('extra_seats', 0) or 0)
        except (TypeError, ValueError):
            sub.extra_seats = 0
        sub.current_period_start = period_start
        sub.current_period_end = period_end
        sub.save()

        SubscriptionPayment.objects.create(
            subscription=sub,
            amount=amount,
            currency='EUR',
            status='completed',
            payment_method='stripe',
            stripe_payment_intent_id=session.get('payment_intent') or '',
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

            # Synchronise les sièges payés depuis la quantité de la ligne "siège"
            # (ex. si l'utilisateur ajuste la quantité via le portail Stripe).
            try:
                plan = sub.plan
                seat_price_ids = {
                    plan.stripe_seat_price_id_monthly,
                    plan.stripe_seat_price_id_yearly,
                } if plan else set()
                seat_price_ids.discard('')
                items = (stripe_sub.get('items') or {}).get('data') or []
                seat_qty = 0
                for it in items:
                    price = it.get('price') or {}
                    is_seat = price.get('id') in seat_price_ids or (price.get('metadata') or {}).get('kind') == 'seat'
                    if is_seat:
                        seat_qty += int(it.get('quantity') or 0)
                if items:  # on ne touche extra_seats que si on a bien la liste des lignes
                    sub.extra_seats = seat_qty
            except Exception as e:
                logger.warning(f"Seat sync failed for {stripe_sub_id}: {e}")

            sub.save()
        except Subscription.DoesNotExist:
            pass
