"""
Management command to populate the database with all available widgets
"""
from django.core.management.base import BaseCommand
from apps.analytics.models import Widget


class Command(BaseCommand):
    help = 'Populates the database with all available dashboard widgets'

    def handle(self, *args, **kwargs):
        widgets_data = [
            # GLOBAL WIDGETS
            {
                'code': 'financial_summary',
                'name': 'Vue Financière Globale',
                'description': 'Résumé des revenus, dépenses, profit net et marge',
                'module': 'global',
                'type': 'stats',
                'default_size': 'xlarge',
                'icon': 'DollarSign',
                'order': 1,
                'default_config': {'period': 'last_30_days'}
            },
            {
                'code': 'recent_activity',
                'name': 'Activité Récente',
                'description': 'Feed des dernières activités sur tous les modules',
                'module': 'global',
                'type': 'timeline',
                'default_size': 'medium',
                'icon': 'Activity',
                'order': 2,
                'default_config': {'limit': 10}
            },
            {
                'code': 'alerts_notifications',
                'name': 'Alertes et Notifications',
                'description': 'Centre de notifications consolidé',
                'module': 'global',
                'type': 'alert',
                'default_size': 'medium',
                'icon': 'Bell',
                'order': 3,
                'default_config': {}
            },
            {
                'code': 'global_performance',
                'name': 'Performance Globale',
                'description': 'Indicateurs clés de performance globaux',
                'module': 'global',
                'type': 'stats',
                'default_size': 'large',
                'icon': 'TrendingUp',
                'order': 4,
                'default_config': {}
            },

            # PRODUCTS WIDGETS
            {
                'code': 'products_overview',
                'name': 'Aperçu Stock',
                'description': 'Total produits, actifs, stock bas et ruptures',
                'module': 'products',
                'type': 'stats',
                'default_size': 'small',
                'icon': 'Package',
                'order': 1,
                'default_config': {}
            },
            {
                'code': 'top_selling_products',
                'name': 'Produits les Plus Vendus',
                'description': 'Top 5 des produits par volume de ventes',
                'module': 'products',
                'type': 'table',
                'default_size': 'medium',
                'icon': 'TrendingUp',
                'order': 2,
                'default_config': {'limit': 5}
            },
            {
                'code': 'stock_alerts',
                'name': 'Alertes Stock',
                'description': 'Produits en rupture ou stock bas',
                'module': 'products',
                'type': 'alert',
                'default_size': 'medium',
                'icon': 'AlertTriangle',
                'order': 3,
                'default_config': {}
            },
            {
                'code': 'margin_analysis',
                'name': 'Analyse Marges',
                'description': 'Marges par catégorie et distribution',
                'module': 'products',
                'type': 'chart',
                'default_size': 'large',
                'icon': 'BarChart3',
                'order': 4,
                'default_config': {}
            },
            {
                'code': 'stock_movements',
                'name': 'Mouvements de Stock',
                'description': 'Historique des derniers mouvements',
                'module': 'products',
                'type': 'timeline',
                'default_size': 'medium',
                'icon': 'ArrowRightLeft',
                'order': 5,
                'default_config': {'limit': 10}
            },

            # CLIENTS WIDGETS
            {
                'code': 'clients_overview',
                'name': 'Aperçu Clients',
                'description': 'Total, actifs et nouveaux clients',
                'module': 'clients',
                'type': 'stats',
                'default_size': 'small',
                'icon': 'Users',
                'order': 1,
                'default_config': {}
            },
            {
                'code': 'top_clients',
                'name': 'Top Clients',
                'description': 'Meilleurs clients par chiffre d\'affaires',
                'module': 'clients',
                'type': 'table',
                'default_size': 'medium',
                'icon': 'Award',
                'order': 2,
                'default_config': {'limit': 10}
            },
            {
                'code': 'clients_at_risk',
                'name': 'Clients à Risque',
                'description': 'Clients avec factures en retard',
                'module': 'clients',
                'type': 'alert',
                'default_size': 'medium',
                'icon': 'AlertCircle',
                'order': 3,
                'default_config': {}
            },
            {
                'code': 'client_acquisition',
                'name': 'Acquisition Clients',
                'description': 'Évolution du nombre de nouveaux clients',
                'module': 'clients',
                'type': 'chart',
                'default_size': 'large',
                'icon': 'UserPlus',
                'order': 4,
                'default_config': {}
            },
            {
                'code': 'client_segmentation',
                'name': 'Segmentation Clients',
                'description': 'Répartition par CA et statut',
                'module': 'clients',
                'type': 'chart',
                'default_size': 'medium',
                'icon': 'PieChart',
                'order': 5,
                'default_config': {}
            },

            # INVOICES WIDGETS
            {
                'code': 'invoices_overview',
                'name': 'Aperçu Factures',
                'description': 'Total factures, montant et taux de paiement',
                'module': 'invoices',
                'type': 'stats',
                'default_size': 'small',
                'icon': 'FileText',
                'order': 1,
                'default_config': {}
            },
            {
                'code': 'invoices_status',
                'name': 'Statut Factures',
                'description': 'Répartition par statut (brouillon, envoyées, payées, etc.)',
                'module': 'invoices',
                'type': 'chart',
                'default_size': 'medium',
                'icon': 'PieChart',
                'order': 2,
                'default_config': {}
            },
            {
                'code': 'revenue_chart',
                'name': 'Revenus',
                'description': 'Graphique d\'évolution des revenus',
                'module': 'invoices',
                'type': 'chart',
                'default_size': 'large',
                'icon': 'TrendingUp',
                'order': 3,
                'default_config': {'period': 'last_30_days'}
            },
            {
                'code': 'overdue_invoices',
                'name': 'Factures en Retard',
                'description': 'Liste des factures impayées en retard',
                'module': 'invoices',
                'type': 'alert',
                'default_size': 'medium',
                'icon': 'AlertOctagon',
                'order': 4,
                'default_config': {}
            },
            {
                'code': 'payment_performance',
                'name': 'Performance Paiements',
                'description': 'Délai moyen et taux de paiement',
                'module': 'invoices',
                'type': 'stats',
                'default_size': 'medium',
                'icon': 'Clock',
                'order': 5,
                'default_config': {}
            },
            {
                'code': 'recent_invoices',
                'name': 'Factures Récentes',
                'description': 'Dernières factures créées',
                'module': 'invoices',
                'type': 'list',
                'default_size': 'medium',
                'icon': 'List',
                'order': 6,
                'default_config': {'limit': 10}
            },

            # PURCHASE ORDERS WIDGETS
            {
                'code': 'po_overview',
                'name': 'Aperçu Bons de Commande',
                'description': 'Total BCs, montant et statuts',
                'module': 'purchase_orders',
                'type': 'stats',
                'default_size': 'small',
                'icon': 'ShoppingCart',
                'order': 1,
                'default_config': {}
            },
            {
                'code': 'po_status',
                'name': 'Statut Bons de Commande',
                'description': 'Répartition par statut',
                'module': 'purchase_orders',
                'type': 'chart',
                'default_size': 'medium',
                'icon': 'PieChart',
                'order': 2,
                'default_config': {}
            },
            {
                'code': 'expenses_chart',
                'name': 'Dépenses Achats',
                'description': 'Évolution des dépenses d\'achat',
                'module': 'purchase_orders',
                'type': 'chart',
                'default_size': 'large',
                'icon': 'TrendingDown',
                'order': 3,
                'default_config': {'period': 'last_30_days'}
            },
            {
                'code': 'overdue_po',
                'name': 'BCs en Retard',
                'description': 'Bons de commande en retard de livraison',
                'module': 'purchase_orders',
                'type': 'alert',
                'default_size': 'medium',
                'icon': 'AlertTriangle',
                'order': 4,
                'default_config': {}
            },
            {
                'code': 'supplier_performance',
                'name': 'Performance Fournisseurs',
                'description': 'Top fournisseurs et taux de livraison',
                'module': 'purchase_orders',
                'type': 'table',
                'default_size': 'medium',
                'icon': 'Award',
                'order': 5,
                'default_config': {'limit': 5}
            },
            {
                'code': 'pending_approvals',
                'name': 'Approbations en Attente',
                'description': 'BCs en attente d\'approbation',
                'module': 'purchase_orders',
                'type': 'list',
                'default_size': 'medium',
                'icon': 'CheckSquare',
                'order': 6,
                'default_config': {}
            },
            {
                'code': 'budget_tracking',
                'name': 'Suivi Budget Achats',
                'description': 'Budget vs dépenses réalisées',
                'module': 'purchase_orders',
                'type': 'gauge',
                'default_size': 'medium',
                'icon': 'Target',
                'order': 7,
                'default_config': {'budget': 100000}
            },

            # AI WIDGETS (simplifié selon vos instructions)
            {
                'code': 'ai_usage',
                'name': 'Utilisation IA',
                'description': 'Statistiques d\'utilisation de l\'assistant IA',
                'module': 'ai',
                'type': 'stats',
                'default_size': 'small',
                'icon': 'Bot',
                'order': 1,
                'default_config': {}
            },
            {
                'code': 'ai_documents',
                'name': 'Documents Traités',
                'description': 'Derniers documents scannés et traités',
                'module': 'ai',
                'type': 'list',
                'default_size': 'medium',
                'icon': 'FileSearch',
                'order': 2,
                'default_config': {'limit': 10}
            },
            {
                'code': 'ai_last_conversation',
                'name': 'Dernière Conversation',
                'description': 'Actions récentes de la dernière conversation IA',
                'module': 'ai',
                'type': 'timeline',
                'default_size': 'medium',
                'icon': 'MessageSquare',
                'order': 3,
                'default_config': {}
            },
        ]

        created_count = 0
        updated_count = 0

        for widget_data in widgets_data:
            widget, created = Widget.objects.update_or_create(
                code=widget_data['code'],
                defaults={
                    'name': widget_data['name'],
                    'description': widget_data['description'],
                    'module': widget_data['module'],
                    'type': widget_data['type'],
                    'default_size': widget_data['default_size'],
                    'icon': widget_data['icon'],
                    'order': widget_data['order'],
                    'default_config': widget_data['default_config'],
                    'is_active': True,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'[+] Created widget: {widget.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'[~] Updated widget: {widget.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n[SUCCESS] Populated widgets: {created_count} created, {updated_count} updated'
            )
        )
