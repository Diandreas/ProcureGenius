"""
Crée les produits et prix Stripe pour les plans payants et lie les
stripe_price_id aux SubscriptionPlan.

Idempotent : si un plan a déjà ses price IDs, il est ignoré (sauf --force).
Nécessite STRIPE_SECRET_KEY configuré dans l'environnement.

Usage:
    python manage.py setup_stripe_prices
    python manage.py setup_stripe_prices --force   # recrée même si déjà liés
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.subscriptions.models import SubscriptionPlan
from apps.subscriptions.stripe_service import DEVISES_SANS_CENTIMES


def unite_stripe(montant, devise):
    """Montant réel -> plus petite unité Stripe (pas de centimes en FCFA)."""
    montant = float(montant or 0)
    return int(round(montant if devise.upper() in DEVISES_SANS_CENTIMES else montant * 100))


# Plans payants à configurer dans Stripe (les autres : free=gratuit,
# enterprise=sur devis, n'ont pas de prix Stripe). On inclut les codes legacy
# (standard/premium) tant qu'ils sont encore proposés/actifs.
PAID_PLAN_CODES = ['pro', 'business', 'standard', 'premium']


class Command(BaseCommand):
    help = 'Crée les produits/prix Stripe et les lie aux plans payants'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Recrée les prix même si le plan a déjà des price IDs',
        )

    def handle(self, *args, **options):
        import stripe

        key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        if not key:
            self.stderr.write(self.style.ERROR(
                'STRIPE_SECRET_KEY non configuré. Abandon.'
            ))
            return
        stripe.api_key = key

        force = options['force']
        # Formules actives seulement : les anciennes (standard, premium) ne sont
        # plus vendues et ne doivent pas créer de produits dans le compte Stripe.
        plans = SubscriptionPlan.objects.filter(code__in=PAID_PLAN_CODES, is_active=True)

        for plan in plans:
            currency = (plan.currency or 'EUR').lower()
            update_fields = []
            seat_unit = float(plan.extra_user_price or 0)

            need_plan = force or not (plan.stripe_price_id_monthly and plan.stripe_price_id_yearly)
            need_seat = seat_unit > 0 and (force or not (plan.stripe_seat_price_id_monthly and plan.stripe_seat_price_id_yearly))

            if not need_plan and not need_seat:
                self.stdout.write(f'[SKIP] {plan.name} déjà lié (plan + sièges).')
                continue

            # Prix du plan (mensuel/annuel).
            if need_plan:
                product = stripe.Product.create(
                    name=f'Procura {plan.name}',
                    description=plan.description[:300] if plan.description else None,
                    metadata={'plan_code': plan.code},
                )
                price_monthly = stripe.Price.create(
                    product=product.id, unit_amount=unite_stripe(plan.price_monthly, currency),
                    currency=currency, recurring={'interval': 'month'},
                    metadata={'plan_code': plan.code, 'period': 'monthly'},
                )
                price_yearly = stripe.Price.create(
                    product=product.id, unit_amount=unite_stripe(plan.price_yearly, currency),
                    currency=currency, recurring={'interval': 'year'},
                    metadata={'plan_code': plan.code, 'period': 'yearly'},
                )
                plan.stripe_price_id_monthly = price_monthly.id
                plan.stripe_price_id_yearly = price_yearly.id
                update_fields += ['stripe_price_id_monthly', 'stripe_price_id_yearly']

            # Prix par siège supplémentaire (récurrent, quantité variable).
            if need_seat:
                seat_product = stripe.Product.create(
                    name=f'Procura {plan.name} — siège supplémentaire',
                    metadata={'plan_code': plan.code, 'kind': 'seat'},
                )
                seat_monthly = stripe.Price.create(
                    product=seat_product.id, unit_amount=unite_stripe(seat_unit, currency),
                    currency=currency, recurring={'interval': 'month'},
                    metadata={'plan_code': plan.code, 'kind': 'seat', 'period': 'monthly'},
                )
                seat_yearly = stripe.Price.create(
                    # Annuel = 10 mois (2 mois offerts), comme les formules.
                    product=seat_product.id, unit_amount=unite_stripe(seat_unit * 10, currency),
                    currency=currency, recurring={'interval': 'year'},
                    metadata={'plan_code': plan.code, 'kind': 'seat', 'period': 'yearly'},
                )
                plan.stripe_seat_price_id_monthly = seat_monthly.id
                plan.stripe_seat_price_id_yearly = seat_yearly.id
                update_fields += ['stripe_seat_price_id_monthly', 'stripe_seat_price_id_yearly']

            plan.save(update_fields=update_fields)
            self.stdout.write(self.style.SUCCESS(
                f'[OK] {plan.name}: plan(m={plan.stripe_price_id_monthly}, '
                f'y={plan.stripe_price_id_yearly}) | siège m={plan.stripe_seat_price_id_monthly or "—"}'
            ))

        self.stdout.write(self.style.SUCCESS('\n[SUCCESS] Prix Stripe configurés.'))
