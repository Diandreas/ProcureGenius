"""
Management command to populate the 3 subscription plans
FREE, STANDARD, PREMIUM with correct quotas and features
"""
from django.core.management.base import BaseCommand
from apps.subscriptions.models import SubscriptionPlan


class Command(BaseCommand):
    help = 'Populate the 3 subscription plans (Free, Standard, Premium)'

    def handle(self, *args, **options):
        self.stdout.write('Creating/updating subscription plans...\n')

        # Plan FREE
        free_plan, created = SubscriptionPlan.objects.update_or_create(
            code='free',
            defaults={
                'name': 'Free',
                'description': 'Plan gratuit avec publicités. Parfait pour débuter avec les fonctionnalités de base : clients, produits et facturation.',
                'price_monthly': 0,
                'price_yearly': 0,
                'currency': 'EUR',

                # Quotas FREE
                'max_invoices_per_month': 10,
                'max_clients': 20,
                'max_products': 50,
                'max_purchase_orders_per_month': None,  # Pas d'accès aux BC
                'max_suppliers': None,  # Pas d'accès aux fournisseurs
                'max_storage_mb': 100,  # 100 MB
                'max_ai_requests_per_month': None,  # Pas d'accès à l'IA

                # Features FREE
                'has_ads': True,  # Publicités Google AdSense
                'has_ai_assistant': False,
                'has_purchase_orders': False,
                'has_suppliers': False,
                'has_e_sourcing': False,
                'has_contracts': False,
                'has_analytics': False,

                'trial_days': 0,  # Pas d'essai pour FREE
                'is_active': True,
                'sort_order': 1,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'[OK] Plan FREE {"created" if created else "updated"}')
        )

        # Plan STANDARD
        standard_plan, created = SubscriptionPlan.objects.update_or_create(
            code='standard',
            defaults={
                'name': 'Standard',
                'description': 'Plan professionnel idéal pour entrepreneurs. Inclut facturation, produits, bons de commande, fournisseurs, contrats et assistant IA. Sans publicité.',
                'price_monthly': 10,
                'price_yearly': 100,  # ~17% de réduction
                'currency': 'EUR',

                # Quotas STANDARD
                'max_invoices_per_month': 200,  # Augmenté
                'max_clients': 200,  # Augmenté
                'max_products': 1000,  # Augmenté
                'max_purchase_orders_per_month': 100,  # Augmenté
                'max_suppliers': 100,  # Augmenté
                'max_storage_mb': 5120,  # 5 GB (Augmenté)
                'max_ai_requests_per_month': 200,  # Augmenté significativement

                # Features STANDARD
                'has_ads': False,  # Sans publicité
                'has_ai_assistant': True,
                'has_purchase_orders': True,
                'has_suppliers': True,
                'has_e_sourcing': False,
                'has_contracts': True,  # Activé pour entrepreneurs
                'has_analytics': True,  # Activé pour entrepreneurs

                'trial_days': 7,  # Étendu à 7 jours
                'is_active': True,
                'sort_order': 2,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'[OK] Plan STANDARD {"created" if created else "updated"}')
        )

        # Plan PREMIUM
        premium_plan, created = SubscriptionPlan.objects.update_or_create(
            code='premium',
            defaults={
                'name': 'Premium',
                'description': 'Solution complète pour grandes entreprises. Tous les modules (E-Sourcing, Contrats, Analytics avancés), quotas très élevés et IA illimitée.',
                'price_monthly': 199,
                'price_yearly': 1900,  # ~20% de réduction
                'currency': 'EUR',

                # Quotas PREMIUM - Très élevés
                'max_invoices_per_month': 5000,
                'max_clients': 1000,
                'max_products': 10000,
                'max_purchase_orders_per_month': 2000,
                'max_suppliers': 500,
                'max_storage_mb': 51200,  # 50 GB
                'max_ai_requests_per_month': -1,  # Illimité

                # Features PREMIUM - Tout inclus
                'has_ads': False,
                'has_ai_assistant': True,
                'has_purchase_orders': True,
                'has_suppliers': True,
                'has_e_sourcing': True,
                'has_contracts': True,
                'has_analytics': True,

                'trial_days': 3,
                'is_active': True,
                'sort_order': 3,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'[OK] Plan PREMIUM {"created" if created else "updated"}')
        )

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\n[SUCCESS] Subscription plans successfully populated!\n'))
        self.stdout.write('='*60 + '\n')

        # Display summary
        self.stdout.write('\nPlan Summary:')
        self.stdout.write('-' * 60)

        plans = SubscriptionPlan.objects.all().order_by('sort_order')
        for plan in plans:
            self.stdout.write(f'\n{plan.name.upper()} - {plan.price_monthly}€/mois')
            self.stdout.write(f'  • Factures: {plan.max_invoices_per_month or "N/A"}/mois')
            self.stdout.write(f'  • Clients: {plan.max_clients or "N/A"}')
            self.stdout.write(f'  • Produits: {plan.max_products or "N/A"}')
            self.stdout.write(f'  • Bons de commande: {plan.max_purchase_orders_per_month or "N/A"}/mois')
            self.stdout.write(f'  • Fournisseurs: {plan.max_suppliers or "N/A"}')
            self.stdout.write(f'  • IA: {"Illimité" if plan.max_ai_requests_per_month == -1 else (f"{plan.max_ai_requests_per_month}/mois" if plan.max_ai_requests_per_month else "Non inclus")}')
            self.stdout.write(f'  • Publicités: {"Oui" if plan.has_ads else "Non"}')
            self.stdout.write(f'  • Essai gratuit: {plan.trial_days} jours' if plan.trial_days > 0 else '')
