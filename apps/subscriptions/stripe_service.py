"""
Stripe integration service for Procura subscriptions.
Handles checkout sessions, webhooks, and customer portal.
"""
import stripe
import logging
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta, timezone as dt_timezone


def _ts_to_datetime(ts):
    """Timestamp Stripe (epoch UTC) -> datetime aware.

    N'utilise PAS django.utils.timezone.utc (supprimé dans Django 5.0).
    """
    return datetime.fromtimestamp(ts, tz=dt_timezone.utc)

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
    def change_plan(organization, new_plan, billing_period=None):
        """Bascule l'abonnement Stripe existant sur le prix du nouveau plan
        (proratisé) et synchronise l'abonnement local.

        Sans cette répercussion côté Stripe, un « changement de plan » local
        laissait Stripe facturer l'ancien prix : l'app affichait Business,
        Stripe encaissait Pro.
        """
        StripeService._ensure_configured()
        try:
            sub = organization.subscription
        except Exception:
            sub = None
        if not sub or not sub.stripe_subscription_id:
            raise ValueError("Aucun abonnement Stripe actif : passez par le paiement sécurisé.")

        period = billing_period or sub.billing_period
        new_price_id = (
            new_plan.stripe_price_id_yearly if period == 'yearly'
            else new_plan.stripe_price_id_monthly
        )
        if not new_price_id:
            raise ValueError(f"Aucun prix Stripe configuré pour le plan '{new_plan.code}' ({period}).")

        stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
        items = stripe_sub['items']['data']

        # Ligne « plan » = celle qui n'est pas une ligne de siège.
        seat_price_ids = {
            sub.plan.stripe_seat_price_id_monthly,
            sub.plan.stripe_seat_price_id_yearly,
        } if sub.plan else set()
        seat_price_ids.discard('')
        plan_item = next(
            (i for i in items
             if i['price']['id'] not in seat_price_ids
             and (i['price'].get('metadata') or {}).get('kind') != 'seat'),
            None,
        )
        if plan_item is None:
            raise ValueError("Ligne d'abonnement principale introuvable côté Stripe.")

        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            items=[{'id': plan_item['id'], 'price': new_price_id}],
            proration_behavior='create_prorations',
            cancel_at_period_end=False,
            metadata={'plan_code': new_plan.code},
        )

        sub.plan = new_plan
        sub.billing_period = period
        sub.stripe_price_id = new_price_id
        sub.save()
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
        """Process a Stripe webhook event (idempotent)."""
        from django.core.cache import cache

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

        # Idempotence : Stripe rejoue les événements (retries, incidents réseau).
        # cache.add est atomique -> un event id déjà vu est ignoré sans retraiter
        # (sinon : paiements dupliqués dans l'historique, MRR faussé).
        event_id = event.get('id')
        if event_id and not cache.add(f"stripe_evt_{event_id}", 1, timeout=3 * 24 * 3600):
            logger.info(f"Stripe webhook déjà traité, ignoré : {event_id} ({event_type})")
            return event_type

        logger.info(f"Stripe webhook received: {event_type}")

        if event_type == 'checkout.session.completed':
            StripeService._handle_checkout_completed(event['data']['object'])
        elif event_type == 'invoice.payment_succeeded':
            StripeService._handle_payment_succeeded(event['data']['object'])
        elif event_type == 'invoice.payment_failed':
            StripeService._handle_payment_failed(event['data']['object'])
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
                period_start = _ts_to_datetime(stripe_sub['current_period_start'])
                period_end = _ts_to_datetime(stripe_sub['current_period_end'])
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

        # Récupère le lien de la facture PDF Stripe (nécessite un appel API : le
        # checkout.session ne porte que l'id de la facture, pas ses liens).
        invoice_pdf_url, invoice_hosted_url = '', ''
        invoice_id = session.get('invoice')
        if invoice_id:
            try:
                stripe_invoice = stripe.Invoice.retrieve(invoice_id)
                invoice_pdf_url = stripe_invoice.get('invoice_pdf') or ''
                invoice_hosted_url = stripe_invoice.get('hosted_invoice_url') or ''
            except Exception as e:
                logger.warning(f"Could not fetch Stripe invoice {invoice_id}: {e}")

        # Historique de paiement, dédupliqué sur la facture Stripe : l'événement
        # invoice.payment_succeeded porte la MÊME facture — sans clé commune, le
        # premier règlement était compté deux fois (webhook + confirm-session).
        txn_id = invoice_id or session.get('id') or ''
        payment_defaults = dict(
            amount=amount,
            currency='EUR',
            status='completed',
            payment_method='stripe',
            stripe_payment_intent_id=session.get('payment_intent') or '',
            invoice_pdf_url=invoice_pdf_url,
            invoice_hosted_url=invoice_hosted_url,
        )
        created = True
        if txn_id:
            _, created = SubscriptionPayment.objects.get_or_create(
                subscription=sub, transaction_id=txn_id, defaults=payment_defaults,
            )
        else:
            SubscriptionPayment.objects.create(subscription=sub, **payment_defaults)

        # Reçu par email — seulement pour un NOUVEAU paiement (dedup txn_id :
        # confirm-session ET le webhook appellent tous deux ce chemin pour le
        # premier règlement, un seul des deux doit envoyer le reçu).
        if created:
            StripeService._send_receipt_email(sub, amount, 'EUR', invoice_pdf_url, invoice_hosted_url)

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
            sub.current_period_start = _ts_to_datetime(stripe_sub['current_period_start'])
            sub.current_period_end = _ts_to_datetime(stripe_sub['current_period_end'])
            sub.save()
            # Dédupliqué sur l'id de facture Stripe (retries webhook + recouvrement
            # avec checkout.session.completed pour le premier règlement).
            txn_id = invoice.get('id') or ''
            invoice_pdf_url = invoice.get('invoice_pdf') or ''
            invoice_hosted_url = invoice.get('hosted_invoice_url') or ''
            payment_defaults = dict(
                amount=invoice.get('amount_paid', 0) / 100,
                currency=invoice.get('currency', 'eur').upper(),
                status='completed',
                payment_method='stripe',
                stripe_payment_intent_id=invoice.get('payment_intent') or '',
                invoice_pdf_url=invoice_pdf_url,
                invoice_hosted_url=invoice_hosted_url,
            )
            created = True
            if txn_id:
                payment, created = SubscriptionPayment.objects.get_or_create(
                    subscription=sub, transaction_id=txn_id, defaults=payment_defaults,
                )
            else:
                SubscriptionPayment.objects.create(subscription=sub, **payment_defaults)

            # Reçu par email — seulement pour un NOUVEAU paiement (created=True),
            # jamais sur un rejeu du webhook (même txn_id déjà traité).
            if created:
                StripeService._send_receipt_email(
                    sub, payment_defaults['amount'], payment_defaults['currency'],
                    invoice_pdf_url, invoice_hosted_url,
                )
        except Subscription.DoesNotExist:
            logger.warning(f"No subscription found for stripe_sub_id={stripe_sub_id}")

    @staticmethod
    def _send_receipt_email(sub, amount, currency, invoice_pdf_url='', invoice_hosted_url=''):
        """Envoie le reçu de paiement à l'admin de l'organisation (best-effort,
        ne doit jamais faire échouer le traitement du webhook)."""
        try:
            from apps.core.email_utils import send_subscription_receipt_email
            admin = sub.organization.users.filter(role='admin', is_active=True).first()
            if admin and admin.email:
                send_subscription_receipt_email(
                    admin, sub.organization, sub.plan.name, amount, currency,
                    invoice_pdf_url=invoice_pdf_url, invoice_hosted_url=invoice_hosted_url,
                )
        except Exception as e:
            logger.warning(f"Receipt email failed for subscription {sub.id}: {e}")

    @staticmethod
    def _handle_payment_failed(invoice):
        """Échec de prélèvement : statut past_due + notification aux admins.

        Sans ce handler, un client dont la carte échouait gardait silencieusement
        son accès (jusqu'au subscription.updated éventuel) et personne n'était
        prévenu — churn involontaire garanti.
        """
        from .models import Subscription, SubscriptionPayment
        stripe_sub_id = invoice.get('subscription')
        if not stripe_sub_id:
            return
        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
        except Subscription.DoesNotExist:
            logger.warning(f"No subscription found for stripe_sub_id={stripe_sub_id}")
            return

        sub.status = 'past_due'
        sub.save()

        # Trace de l'échec dans l'historique (dédupliquée par facture+tentative).
        txn_id = invoice.get('id') or ''
        attempt = invoice.get('attempt_count') or 1
        if txn_id:
            SubscriptionPayment.objects.get_or_create(
                subscription=sub,
                transaction_id=f"{txn_id}#fail{attempt}",
                defaults=dict(
                    amount=invoice.get('amount_due', 0) / 100,
                    currency=invoice.get('currency', 'eur').upper(),
                    status='failed',
                    payment_method='stripe',
                    stripe_payment_intent_id=invoice.get('payment_intent') or '',
                ),
            )

        # Prévenir les admins/managers (push + notification in-app).
        try:
            from apps.accounts.models import CustomUser
            from apps.ai_assistant.web_push_service import send_push_to_user
            admins = CustomUser.objects.filter(
                organization=sub.organization,
                role__in=['admin', 'manager'],
                is_active=True,
            )
            for admin in admins:
                send_push_to_user(
                    admin,
                    push_type='paiement_echoue',
                    title="Échec de paiement de votre abonnement",
                    body="Le prélèvement de votre abonnement a échoué. "
                         "Mettez à jour votre moyen de paiement pour conserver l'accès.",
                    url='/settings',
                    tag=f"payment-failed-{txn_id or stripe_sub_id}",
                )
        except Exception as e:
            logger.warning(f"Notification échec de paiement impossible : {e}")

        logger.warning(f"Paiement échoué : subscription={stripe_sub_id} org={sub.organization_id}")

    @staticmethod
    def _handle_subscription_deleted(stripe_sub):
        """Fin d'abonnement Stripe : retour au plan gratuit (modèle freemium).

        Laisser le statut à 'cancelled' bloquait TOUTE l'application
        (is_active_or_trial=False -> QuotaService refuse chaque action) au lieu
        de ramener l'organisation au plan gratuit comme à l'expiration d'essai.
        """
        from .models import Subscription
        stripe_sub_id = stripe_sub.get('id')
        try:
            sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
            sub.cancelled_at = sub.cancelled_at or timezone.now()
            # L'abonnement Stripe n'existe plus ; on garde le customer_id pour
            # faciliter une future re-souscription.
            sub.stripe_subscription_id = ''
            sub.stripe_price_id = ''
            sub.extra_seats = 0
            sub.save()
            if not sub.downgrade_to_free():
                sub.status = 'cancelled'
                sub.save(update_fields=['status', 'updated_at'])
            logger.info(f"Subscription ended, org back to free plan: {stripe_sub_id}")
        except Subscription.DoesNotExist:
            pass

    @staticmethod
    def _handle_subscription_updated(stripe_sub):
        from .models import Subscription, SubscriptionPlan
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

            # Synchronise les dates de période (source de vérité : Stripe).
            try:
                if stripe_sub.get('current_period_start'):
                    sub.current_period_start = _ts_to_datetime(stripe_sub['current_period_start'])
                if stripe_sub.get('current_period_end'):
                    sub.current_period_end = _ts_to_datetime(stripe_sub['current_period_end'])
            except Exception as e:
                logger.warning(f"Period sync failed for {stripe_sub_id}: {e}")

            # Annulation programmée depuis le portail Stripe -> tracée localement.
            if stripe_sub.get('cancel_at_period_end') and not sub.cancelled_at:
                sub.cancelled_at = timezone.now()

            items = (stripe_sub.get('items') or {}).get('data') or []
            all_seat_price_ids = set()

            # Synchronise le PLAN depuis le price de la ligne principale : un
            # changement de formule via le portail Stripe (upgrade/downgrade)
            # doit se refléter dans l'app, sinon les modules débloqués divergent
            # de ce qui est facturé.
            try:
                price_to_plan = {}
                for p in SubscriptionPlan.objects.filter(is_active=True):
                    for pid in (p.stripe_price_id_monthly, p.stripe_price_id_yearly):
                        if pid:
                            price_to_plan[pid] = (p, 'monthly' if pid == p.stripe_price_id_monthly else 'yearly')
                    for pid in (p.stripe_seat_price_id_monthly, p.stripe_seat_price_id_yearly):
                        if pid:
                            all_seat_price_ids.add(pid)
                for it in items:
                    price = it.get('price') or {}
                    pid = price.get('id')
                    if pid in price_to_plan and (price.get('metadata') or {}).get('kind') != 'seat':
                        new_plan, period = price_to_plan[pid]
                        if sub.plan_id != new_plan.id or sub.billing_period != period:
                            logger.info(
                                f"Plan sync Stripe: org={sub.organization_id} "
                                f"{sub.plan.code}/{sub.billing_period} -> {new_plan.code}/{period}"
                            )
                        sub.plan = new_plan
                        sub.billing_period = period
                        sub.stripe_price_id = pid
                        break
            except Exception as e:
                logger.warning(f"Plan sync failed for {stripe_sub_id}: {e}")

            # Synchronise les sièges payés depuis la quantité de la ligne "siège"
            # (ex. si l'utilisateur ajuste la quantité via le portail Stripe).
            try:
                plan = sub.plan
                seat_price_ids = {
                    plan.stripe_seat_price_id_monthly,
                    plan.stripe_seat_price_id_yearly,
                } if plan else set()
                seat_price_ids |= all_seat_price_ids
                seat_price_ids.discard('')
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
