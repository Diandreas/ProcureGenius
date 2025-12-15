"""
Service d'analyse intelligente pour générer des suggestions vraiment utiles
basées sur l'analyse des données réelles de l'utilisateur
"""
from django.db.models import Sum, Avg, Count, F, Q, Max
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal


class IntelligentInsightsEngine:
    """Moteur d'analyse intelligente pour générer des suggestions impactantes"""

    def __init__(self, user):
        self.user = user
        self.organization = user.organization

    def generate_all_insights(self):
        """Génère toutes les analyses intelligentes"""
        insights = []

        # 1. Analyse de rentabilité
        insights.extend(self._analyze_profitability())

        # 2. Détection d'anomalies
        insights.extend(self._detect_anomalies())

        # 3. Clients à risque
        insights.extend(self._identify_at_risk_clients())

        # 4. Opportunités d'automatisation
        insights.extend(self._find_automation_opportunities())

        # 5. Analyse de performance produits
        insights.extend(self._analyze_product_performance())

        # 6. Prédictions de stock
        insights.extend(self._predict_stock_issues())

        # Trier par priorité (impact potentiel)
        insights.sort(key=lambda x: x.get('priority', 5), reverse=True)

        return insights

    def _analyze_profitability(self):
        """Analyse la rentabilité et détecte les baisses de marge"""
        from apps.invoices.models import Invoice, InvoiceItem
        from apps.products.models import Product

        insights = []

        # Analyser les marges par catégorie sur les 30 derniers jours vs 30 jours précédents
        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        previous_30_days = now - timedelta(days=60)

        # Récupérer les produits avec catégories
        products = Product.objects.filter(organization=self.organization).select_related('category')

        for product in products:
            # Calculer marge actuelle
            recent_items = InvoiceItem.objects.filter(
                invoice__organization=self.organization,
                invoice__issue_date__gte=last_30_days,
                product=product
            ).aggregate(
                total_revenue=Sum(F('quantity') * F('unit_price')),
                avg_margin=Avg(F('unit_price') - F('product__cost'))
            )

            # Calculer marge période précédente
            previous_items = InvoiceItem.objects.filter(
                invoice__organization=self.organization,
                invoice__issue_date__gte=previous_30_days,
                invoice__issue_date__lt=last_30_days,
                product=product
            ).aggregate(
                total_revenue=Sum(F('quantity') * F('unit_price')),
                avg_margin=Avg(F('unit_price') - F('product__cost'))
            )

            if recent_items['avg_margin'] and previous_items['avg_margin']:
                margin_change = ((recent_items['avg_margin'] - previous_items['avg_margin']) /
                                previous_items['avg_margin'] * 100)

                if margin_change < -10:  # Baisse de plus de 10%
                    insights.append({
                        'type': 'alert',
                        'priority': 9,
                        'title': f'📉 Baisse de marge sur {product.name}',
                        'message': f'La marge sur "{product.name}" a baissé de {abs(margin_change):.1f}% ce mois-ci. '
                                   f'L\'IA peut analyser les causes et suggérer des actions.',
                        'action_label': 'Analyser avec l\'IA',
                        'action_url': '/ai-chat',
                        'data': {
                            'product_id': product.id,
                            'margin_change': float(margin_change),
                            'analysis_prompt': f'Analyse pourquoi la marge sur {product.name} a baissé de {abs(margin_change):.1f}%'
                        }
                    })

        return insights

    def _detect_anomalies(self):
        """Détecte les anomalies dans les factures (montants inhabituels)"""
        from apps.invoices.models import Invoice

        insights = []

        # Récupérer les factures récentes (7 derniers jours)
        recent_date = timezone.now() - timedelta(days=7)
        recent_invoices = Invoice.objects.filter(
            organization=self.organization,
            issue_date__gte=recent_date
        ).select_related('client')

        for invoice in recent_invoices:
            # Calculer moyenne des factures pour ce client
            client_avg = Invoice.objects.filter(
                organization=self.organization,
                client=invoice.client,
                issue_date__lt=invoice.issue_date
            ).aggregate(avg_total=Avg('total'))['avg_total']

            if client_avg and invoice.total > client_avg * 2.5:  # 2.5x la moyenne
                deviation = ((invoice.total - client_avg) / client_avg * 100)

                insights.append({
                    'type': 'alert',
                    'priority': 8,
                    'title': f'⚠️ Facture inhabituelle détectée',
                    'message': f'La facture #{invoice.invoice_number} de {invoice.total}€ pour {invoice.client.get_full_name()} '
                               f'est {deviation:.0f}% plus élevée que la moyenne. Vérifiez qu\'il n\'y a pas d\'erreur.',
                    'action_label': 'Voir la facture',
                    'action_url': f'/invoices/{invoice.id}',
                    'data': {
                        'invoice_id': invoice.id,
                        'deviation': float(deviation)
                    }
                })

        return insights

    def _identify_at_risk_clients(self):
        """Identifie les clients inactifs qui risquent de partir"""
        from apps.clients.models import Client
        from apps.invoices.models import Invoice

        insights = []

        # Trouver clients qui n'ont pas commandé depuis 60+ jours
        inactive_threshold = timezone.now() - timedelta(days=60)

        clients = Client.objects.filter(
            organization=self.organization
        ).annotate(
            last_invoice_date=Max('invoices__issue_date'),
            total_invoices=Count('invoices')
        ).filter(
            total_invoices__gte=3,  # Au moins 3 commandes historiques
            last_invoice_date__lt=inactive_threshold  # Pas de commande depuis 60j
        )

        for client in clients[:5]:  # Top 5 clients à risque
            days_inactive = (timezone.now().date() - client.last_invoice_date).days

            insights.append({
                'type': 'insight',
                'priority': 7,
                'title': f'🎯 Client inactif: {client.get_full_name()}',
                'message': f'{client.get_full_name()} n\'a pas commandé depuis {days_inactive} jours. '
                           f'L\'IA peut générer une offre personnalisée pour le réengager.',
                'action_label': 'Générer une offre',
                'action_url': '/ai-chat',
                'data': {
                    'client_id': client.id,
                    'days_inactive': days_inactive,
                    'analysis_prompt': f'Génère une offre promotionnelle personnalisée pour réengager {client.get_full_name()}'
                }
            })

        return insights

    def _find_automation_opportunities(self):
        """Trouve des opportunités d'automatisation basées sur les patterns"""
        from apps.purchase_orders.models import PurchaseOrder
        from apps.suppliers.models import Supplier

        insights = []

        # Détecter les commandes récurrentes au même fournisseur
        suppliers = Supplier.objects.filter(
            organization=self.organization
        ).annotate(
            po_count=Count('purchase_orders')
        ).filter(po_count__gte=5)

        for supplier in suppliers[:3]:
            # Analyser la récurrence
            pos = PurchaseOrder.objects.filter(
                supplier=supplier,
                organization=self.organization
            ).order_by('-order_date')[:10]

            if len(pos) >= 5:
                insights.append({
                    'type': 'suggestion',
                    'priority': 6,
                    'title': f'🤖 Automatisation possible avec {supplier.company_name}',
                    'message': f'Vous commandez régulièrement chez {supplier.company_name}. '
                               f'L\'IA peut automatiquement créer vos bons de commande récurrents.',
                    'action_label': 'Configurer l\'automatisation',
                    'action_url': '/ai-chat',
                    'data': {
                        'supplier_id': supplier.id,
                        'analysis_prompt': f'Configure une automatisation pour les commandes récurrentes chez {supplier.company_name}'
                    }
                })

        return insights

    def _analyze_product_performance(self):
        """Analyse la performance des produits et suggère des optimisations"""
        from apps.products.models import Product
        from apps.invoices.models import InvoiceItem

        insights = []

        # Trouver les produits bestsellers
        last_90_days = timezone.now() - timedelta(days=90)

        top_products = Product.objects.filter(
            organization=self.organization
        ).annotate(
            total_sold=Sum('invoice_items__quantity', filter=Q(invoice_items__invoice__issue_date__gte=last_90_days)),
            total_revenue=Sum(
                F('invoice_items__quantity') * F('invoice_items__unit_price'),
                filter=Q(invoice_items__invoice__issue_date__gte=last_90_days)
            )
        ).filter(total_sold__isnull=False).order_by('-total_revenue')[:3]

        if top_products:
            product_names = ', '.join([p.name for p in top_products])
            insights.append({
                'type': 'insight',
                'priority': 6,
                'title': f'⭐ Vos produits stars: {product_names}',
                'message': f'Ces produits génèrent le plus de revenus. '
                           f'L\'IA peut analyser pourquoi et suggérer comment répliquer ce succès.',
                'action_label': 'Analyser la performance',
                'action_url': '/ai-chat',
                'data': {
                    'product_ids': [p.id for p in top_products],
                    'analysis_prompt': 'Analyse pourquoi ces produits performent bien et suggère comment augmenter les ventes d\'autres produits'
                }
            })

        # Trouver les produits sous-performants
        low_performers = Product.objects.filter(
            organization=self.organization,
            stock__gt=0
        ).annotate(
            total_sold=Sum('invoice_items__quantity', filter=Q(invoice_items__invoice__issue_date__gte=last_90_days))
        ).filter(Q(total_sold__isnull=True) | Q(total_sold__lte=2))[:5]

        if low_performers:
            insights.append({
                'type': 'suggestion',
                'priority': 5,
                'title': f'💡 {len(low_performers)} produits ne se vendent pas',
                'message': f'Vous avez du stock qui ne bouge pas. '
                           f'L\'IA peut suggérer des actions: promotion, reconditionnement, ou retrait.',
                'action_label': 'Voir les suggestions',
                'action_url': '/ai-chat',
                'data': {
                    'product_ids': [p.id for p in low_performers],
                    'analysis_prompt': 'Que faire avec les produits qui ne se vendent pas? Suggère des actions concrètes'
                }
            })

        return insights

    def _predict_stock_issues(self):
        """Prédit les ruptures de stock basées sur les ventes"""
        from apps.products.models import Product
        from apps.invoices.models import InvoiceItem

        insights = []

        # Analyser le taux de vente sur les 30 derniers jours
        last_30_days = timezone.now() - timedelta(days=30)

        products = Product.objects.filter(
            organization=self.organization,
            stock__gt=0,
            stock__lt=20  # Stock faible
        ).annotate(
            units_sold=Sum('invoice_items__quantity', filter=Q(invoice_items__invoice__issue_date__gte=last_30_days))
        ).filter(units_sold__isnull=False, units_sold__gt=0)

        for product in products:
            # Calculer taux de vente journalier
            daily_rate = product.units_sold / 30.0
            days_until_stockout = product.stock / daily_rate if daily_rate > 0 else 999

            if days_until_stockout < 10:  # Rupture dans moins de 10 jours
                insights.append({
                    'type': 'alert',
                    'priority': 9,
                    'title': f'🚨 Rupture de stock imminente: {product.name}',
                    'message': f'"{product.name}" sera en rupture dans ~{int(days_until_stockout)} jours '
                               f'selon vos ventes actuelles ({daily_rate:.1f} unités/jour). '
                               f'L\'IA peut créer un bon de commande fournisseur automatiquement.',
                    'action_label': 'Créer bon de commande',
                    'action_url': '/ai-chat',
                    'data': {
                        'product_id': product.id,
                        'days_until_stockout': int(days_until_stockout),
                        'daily_rate': float(daily_rate),
                        'analysis_prompt': f'Crée un bon de commande pour réapprovisionner {product.name} avant rupture de stock'
                    }
                })

        return insights


def generate_intelligent_suggestions(user):
    """
    Point d'entrée principal pour générer des suggestions intelligentes
    basées sur l'analyse des données réelles
    """
    engine = IntelligentInsightsEngine(user)
    insights = engine.generate_all_insights()

    # Convertir en format ProactiveSuggestion
    suggestions = []
    for insight in insights[:5]:  # Max 5 suggestions les plus importantes
        suggestions.append({
            'suggestion_type': insight['type'],
            'title': insight['title'],
            'message': insight['message'],
            'action_label': insight.get('action_label', ''),
            'action_url': insight.get('action_url', ''),
            'trigger_conditions': {},  # Déjà évalué par l'engine
            'priority': insight.get('priority', 5),
            'is_active': True,
            'max_displays': 2,
            'data': insight.get('data', {})
        })

    return suggestions
