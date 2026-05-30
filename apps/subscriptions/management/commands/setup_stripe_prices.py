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


# Plans payants à configurer dans Stripe (les autres : free=gratuit,
# enterprise=sur devis, n'ont pas de prix Stripe).
PAID_PLAN_CODES = ['pro', 'business']


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
        plans = SubscriptionPlan.objects.filter(code__in=PAID_PLAN_CODES)

        for plan in plans:
            if plan.stripe_price_id_monthly and plan.stripe_price_id_yearly and not force:
                self.stdout.write(
                    f'[SKIP] {plan.name} déjà lié '
                    f'(m={plan.stripe_price_id_monthly}, y={plan.stripe_price_id_yearly})'
                )
                continue

            currency = (plan.currency or 'EUR').lower()

            # Produit Stripe (réutilisé via metadata plan_code).
            product = stripe.Product.create(
                name=f'Procura {plan.name}',
                description=plan.description[:300] if plan.description else None,
                metadata={'plan_code': plan.code},
            )

            price_monthly = stripe.Price.create(
                product=product.id,
                unit_amount=int(plan.price_monthly * 100),
                currency=currency,
                recurring={'interval': 'month'},
                metadata={'plan_code': plan.code, 'period': 'monthly'},
            )
            price_yearly = stripe.Price.create(
                product=product.id,
                unit_amount=int(plan.price_yearly * 100),
                currency=currency,
                recurring={'interval': 'year'},
                metadata={'plan_code': plan.code, 'period': 'yearly'},
            )

            plan.stripe_price_id_monthly = price_monthly.id
            plan.stripe_price_id_yearly = price_yearly.id
            plan.save(update_fields=['stripe_price_id_monthly', 'stripe_price_id_yearly'])

            self.stdout.write(self.style.SUCCESS(
                f'[OK] {plan.name}: produit {product.id} | '
                f'mensuel {price_monthly.id} ({plan.price_monthly}{currency.upper()}) | '
                f'annuel {price_yearly.id} ({plan.price_yearly}{currency.upper()})'
            ))

        self.stdout.write(self.style.SUCCESS('\n[SUCCESS] Prix Stripe configurés.'))
