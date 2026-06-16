"""
Management command to populate the 4 subscription plans:
Libre (free), Pro, Business, Enterprise
"""
from django.core.management.base import BaseCommand
from apps.subscriptions.models import SubscriptionPlan


PLANS = [
    {
        'code': 'free',
        'defaults': {
            'name': 'Libre',
            'description': 'Plan gratuit pour démarrer. Clients, produits et facturation de base.',
            'price_monthly': 0,
            'price_yearly': 0,
            'currency': 'EUR',
            'max_invoices_per_month': 30,
            'max_clients': 20,
            'max_products': 50,
            'max_purchase_orders_per_month': 0,  # verrouillé (has_purchase_orders=False)
            'max_suppliers': 0,                  # verrouillé (has_suppliers=False)
            'max_storage_mb': 100,
            'max_ai_requests_per_month': 0,      # verrouillé (has_ai_assistant=False)
            'has_ads': True,
            'has_ai_assistant': False,
            'has_purchase_orders': False,
            'has_suppliers': False,
            'has_e_sourcing': False,
            'has_contracts': False,
            'has_analytics': False,
            'has_accounting': False,
            'included_users': 1,
            'extra_user_price': 5,
            'trial_days': 0,
            'is_active': True,
            'sort_order': 1,
        }
    },
    {
        'code': 'pro',
        'defaults': {
            'name': 'Pro',
            'description': 'Pour les PME qui veulent gagner en efficacité. IA, contrats, analytics inclus.',
            'price_monthly': 9,
            'price_yearly': 79,
            'currency': 'EUR',
            'max_invoices_per_month': None,  # illimité
            'max_clients': None,             # illimité
            'max_products': None,            # illimité
            'max_purchase_orders_per_month': None,  # illimité
            'max_suppliers': None,           # illimité
            'max_storage_mb': 5120,  # 5 GB
            'max_ai_requests_per_month': 100,
            'has_ads': False,
            'has_ai_assistant': True,
            'has_purchase_orders': True,
            'has_suppliers': True,
            'has_e_sourcing': False,
            'has_contracts': True,
            'has_analytics': True,
            'has_accounting': True,
            'included_users': 2,
            'extra_user_price': 5,
            'trial_days': 30,  # 1 mois d'essai gratuit (sans carte)
            'is_active': True,
            'sort_order': 2,
        }
    },
    {
        'code': 'business',
        'defaults': {
            'name': 'Business',
            'description': 'Pour les équipes qui ont besoin de tout sans limites. E-Sourcing et support prioritaire inclus.',
            'price_monthly': 29,
            'price_yearly': 249,
            'currency': 'EUR',
            'max_invoices_per_month': None,  # illimité
            'max_clients': None,
            'max_products': None,
            'max_purchase_orders_per_month': None,
            'max_suppliers': None,
            'max_storage_mb': 51200,  # 50 GB
            'max_ai_requests_per_month': -1,  # illimité
            'has_ads': False,
            'has_ai_assistant': True,
            'has_purchase_orders': True,
            'has_suppliers': True,
            'has_e_sourcing': True,
            'has_contracts': True,
            'has_analytics': True,
            'has_accounting': True,
            'included_users': 10,
            'extra_user_price': 5,
            'trial_days': 30,  # 1 mois d'essai gratuit (sans carte)
            'is_active': True,
            'sort_order': 3,
        }
    },
    {
        'code': 'enterprise',
        'defaults': {
            'name': 'Enterprise',
            'description': 'Déploiement sur mesure, intégrations personnalisées, SLA garanti et compte manager dédié.',
            'price_monthly': 0,
            'price_yearly': 0,
            'currency': 'EUR',
            'max_invoices_per_month': None,
            'max_clients': None,
            'max_products': None,
            'max_purchase_orders_per_month': None,
            'max_suppliers': None,
            'max_storage_mb': None,
            'max_ai_requests_per_month': -1,
            'has_ads': False,
            'has_ai_assistant': True,
            'has_purchase_orders': True,
            'has_suppliers': True,
            'has_e_sourcing': True,
            'has_contracts': True,
            'has_analytics': True,
            'has_accounting': True,
            'included_users': 999,
            'extra_user_price': 0,
            'trial_days': 0,
            'is_active': True,
            'sort_order': 4,
        }
    },
]


class Command(BaseCommand):
    help = 'Populate the 4 subscription plans (Libre, Pro, Business, Enterprise)'

    def handle(self, *args, **options):
        self.stdout.write('Creating/updating subscription plans...\n')

        for plan_def in PLANS:
            plan, created = SubscriptionPlan.objects.update_or_create(
                code=plan_def['code'],
                defaults=plan_def['defaults'],
            )
            action = 'created' if created else 'updated'
            self.stdout.write(self.style.SUCCESS(f'[OK] Plan {plan.name} {action}'))

        # Désactiver les plans legacy (standard/premium) qui ne font plus partie
        # de l'offre canonique free/pro/business/enterprise.
        canonical = [p['code'] for p in PLANS]
        legacy = SubscriptionPlan.objects.exclude(code__in=canonical).filter(is_active=True)
        for plan in legacy:
            plan.is_active = False
            plan.save(update_fields=['is_active'])
            self.stdout.write(self.style.WARNING(f'[OK] Plan legacy {plan.name} désactivé'))

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('\n[SUCCESS] Subscription plans successfully populated!\n'))
        self.stdout.write('=' * 60 + '\n')

        self.stdout.write('\nPlan Summary:')
        self.stdout.write('-' * 60)
        for plan in SubscriptionPlan.objects.filter(code__in=['free', 'pro', 'business', 'enterprise']).order_by('sort_order'):
            ai = 'Illimité' if plan.max_ai_requests_per_month == -1 else (f'{plan.max_ai_requests_per_month}/mois' if plan.max_ai_requests_per_month else 'Non inclus')
            self.stdout.write(f'\n{plan.name.upper()} - {plan.price_monthly}€/mois | {plan.price_yearly}€/an')
            self.stdout.write(f'  • Factures: {plan.max_invoices_per_month or "Illimité"}/mois')
            self.stdout.write(f'  • Clients: {plan.max_clients or "Illimité"}')
            self.stdout.write(f'  • BC: {plan.max_purchase_orders_per_month or "Illimité"}/mois')
            self.stdout.write(f'  • IA: {ai}')
            self.stdout.write(f'  • E-Sourcing: {"Oui" if plan.has_e_sourcing else "Non"}')
            self.stdout.write(f'  • Essai: {plan.trial_days} jours')
