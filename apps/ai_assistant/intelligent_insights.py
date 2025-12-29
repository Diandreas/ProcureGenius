"""
Service d'analyse intelligente pour générer des suggestions vraiment utiles
basées sur l'analyse des données réelles de l'utilisateur.

CONTEXTE: Application comptable type Sage
- Les clients enregistrés sont généralement des clients RÉCURRENTS (pas les ventes comptoir)
- Pas tous les commerces font du paiement échelonné
- Focus sur: stock, marges, CA, TVA, factures brouillon
"""
from django.db.models import Sum, Avg, Count, F, Q, Max, Min
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class IntelligentInsightsEngine:
    """Moteur d'analyse intelligente pour générer des suggestions impactantes"""

    def __init__(self, user):
        self.user = user
        self.organization = user.organization

    def generate_all_insights(self):
        """Génère toutes les analyses intelligentes"""
        insights = []

        try:
            # 1. Factures brouillon oubliées (TRÈS UTILE)
            insights.extend(self._detect_draft_invoices())

            # 2. Rupture de stock imminente (CRITIQUE)
            insights.extend(self._predict_stock_issues())

            # 3. Stock mort / produits invendus (UTILE)
            insights.extend(self._detect_dead_stock())

            # 4. Comparaison CA mois/mois (UTILE)
            insights.extend(self._compare_revenue())

            # 5. Baisse de marge sur produits (UTILE)
            insights.extend(self._analyze_profitability())

            # 6. Top produits du mois (INFO)
            insights.extend(self._analyze_top_products())

            # 7. Commandes fournisseur récurrentes (SUGGESTION)
            insights.extend(self._find_recurring_orders())

        except Exception as e:
            logger.error(f"Erreur génération insights: {e}")

        # Trier par priorité (impact potentiel)
        insights.sort(key=lambda x: x.get('priority', 5), reverse=True)

        return insights

    def _detect_draft_invoices(self):
        """Détecte les factures en brouillon oubliées"""
        from apps.invoicing.models import Invoice

        insights = []

        try:
            # Factures brouillon de plus de 24h
            threshold = timezone.now() - timedelta(hours=24)

            draft_invoices = Invoice.objects.filter(
                created_by__organization=self.organization,
                status='draft',
                created_at__lt=threshold
            ).select_related('client').order_by('-created_at')[:5]

            if draft_invoices.exists():
                count = draft_invoices.count()
                total_amount = sum(inv.total_amount or 0 for inv in draft_invoices)
                oldest = draft_invoices.last()
                days_old = (timezone.now() - oldest.created_at).days if oldest else 0

                # Liste des factures pour le détail
                invoice_details = []
                for inv in draft_invoices[:3]:
                    client_name = inv.client.name if inv.client else "Sans client"
                    invoice_details.append(f"• #{inv.invoice_number} - {client_name}: {inv.total_amount or 0:.2f}€")

                insights.append({
                    'type': 'alert',
                    'priority': 10,
                    'title': f'📝 {count} facture(s) brouillon en attente',
                    'message': f'Vous avez {count} facture(s) non finalisée(s) pour un total de **{total_amount:.2f}€**.\n'
                               f'La plus ancienne date de {days_old} jour(s).',
                    'detail': '\n'.join(invoice_details),
                    'action_label': 'Voir les brouillons',
                    'action_url': '/invoices?status=draft',
                    'impact': f'Trésorerie bloquée: {total_amount:.2f}€',
                    'insight_key': 'draft_invoices',
                    'conseil_context': {
                        'type': 'factures_brouillon',
                        'count': count,
                        'total_amount': float(total_amount),
                        'days_old': days_old,
                        'oldest_invoice_days': days_old
                    },
                    'data': {
                        'count': count,
                        'total_amount': float(total_amount),
                        'invoice_ids': [str(inv.id) for inv in draft_invoices]
                    }
                })
        except Exception as e:
            logger.error(f"Erreur _detect_draft_invoices: {e}")

        return insights

    def _predict_stock_issues(self):
        """Prédit les ruptures de stock basées sur les ventes"""
        from apps.invoicing.models import Product

        insights = []

        try:
            last_30_days = timezone.now() - timedelta(days=30)

            # Produits avec stock faible et ventes récentes
            products = Product.objects.filter(
                organization=self.organization,
                stock_quantity__gt=0,
                stock_quantity__lt=20
            ).annotate(
                units_sold=Sum('invoice_items__quantity',
                              filter=Q(invoice_items__invoice__created_at__gte=last_30_days))
            ).filter(units_sold__isnull=False, units_sold__gt=0)

            critical_products = []
            for product in products:
                daily_rate = product.units_sold / 30.0
                days_until_stockout = product.stock_quantity / daily_rate if daily_rate > 0 else 999

                if days_until_stockout < 7:  # Rupture dans moins de 7 jours
                    critical_products.append({
                        'name': product.name,
                        'stock': product.stock_quantity,
                        'daily_rate': daily_rate,
                        'days_left': int(days_until_stockout),
                        'id': str(product.id)
                    })

            if critical_products:
                # Trier par urgence
                critical_products.sort(key=lambda x: x['days_left'])

                product_list = '\n'.join([
                    f"• **{p['name']}**: {p['stock']} restants (~{p['days_left']}j)"
                    for p in critical_products[:3]
                ])

                insights.append({
                    'type': 'alert',
                    'priority': 9,
                    'title': f'🚨 {len(critical_products)} produit(s) en rupture imminente',
                    'message': f'Ces produits seront en rupture très bientôt selon vos ventes actuelles:\n{product_list}',
                    'action_label': 'Créer bon de commande',
                    'action_url': '/ai-chat',
                    'impact': f'Risque de perte de CA dans {critical_products[0]["days_left"]} jours',
                    'insight_key': 'stock_rupture',
                    'conseil_context': {
                        'type': 'rupture_stock',
                        'products': critical_products,
                        'most_urgent_product': critical_products[0]['name'],
                        'days_left': critical_products[0]['days_left'],
                        'count': len(critical_products)
                    },
                    'data': {
                        'products': critical_products,
                        'analysis_prompt': f'Crée un bon de commande pour réapprovisionner les produits en rupture: {", ".join([p["name"] for p in critical_products[:3]])}'
                    }
                })
        except Exception as e:
            logger.error(f"Erreur _predict_stock_issues: {e}")

        return insights

    def _detect_dead_stock(self):
        """Détecte le stock mort (produits invendus depuis longtemps)"""
        from apps.invoicing.models import Product

        insights = []

        try:
            last_90_days = timezone.now() - timedelta(days=90)

            # Produits avec stock mais pas de ventes depuis 90 jours
            dead_stock = Product.objects.filter(
                organization=self.organization,
                stock_quantity__gt=0
            ).annotate(
                recent_sales=Sum('invoice_items__quantity',
                                filter=Q(invoice_items__invoice__created_at__gte=last_90_days))
            ).filter(
                Q(recent_sales__isnull=True) | Q(recent_sales=0)
            )

            if dead_stock.exists():
                count = dead_stock.count()
                # Calculer valeur du stock mort
                total_value = sum(
                    (p.stock_quantity * (p.cost_price or p.price or 0))
                    for p in dead_stock
                )

                product_list = '\n'.join([
                    f"• {p.name}: {p.stock_quantity} unités ({(p.stock_quantity * (p.cost_price or p.price or 0)):.2f}€)"
                    for p in dead_stock[:3]
                ])

                insights.append({
                    'type': 'suggestion',
                    'priority': 6,
                    'title': f'📦 {count} produit(s) invendu(s) depuis 3 mois',
                    'message': f'Stock dormant représentant **{total_value:.2f}€** de capital immobilisé:\n{product_list}',
                    'action_label': 'Analyser',
                    'action_url': '/ai-chat',
                    'impact': f'Capital immobilisé: {total_value:.2f}€',
                    'insight_key': 'dead_stock',
                    'conseil_context': {
                        'type': 'stock_dormant',
                        'count': count,
                        'total_value': float(total_value),
                        'products': [{'name': p.name, 'qty': p.stock_quantity, 'value': float(p.stock_quantity * (p.cost_price or p.price or 0))} for p in dead_stock[:5]],
                        'months_inactive': 3
                    },
                    'data': {
                        'count': count,
                        'total_value': float(total_value),
                        'product_ids': [str(p.id) for p in dead_stock[:5]],
                        'analysis_prompt': 'Suggère des actions pour le stock dormant: promotion, bundle, ou retrait'
                    }
                })
        except Exception as e:
            logger.error(f"Erreur _detect_dead_stock: {e}")

        return insights

    def _compare_revenue(self):
        """Compare le CA du mois en cours vs mois précédent"""
        from apps.invoicing.models import Invoice

        insights = []

        try:
            now = timezone.now()
            # Début du mois courant
            current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            # Début du mois précédent
            if current_month_start.month == 1:
                previous_month_start = current_month_start.replace(year=current_month_start.year - 1, month=12)
            else:
                previous_month_start = current_month_start.replace(month=current_month_start.month - 1)

            # CA mois courant
            current_revenue = Invoice.objects.filter(
                created_by__organization=self.organization,
                status__in=['sent', 'paid'],
                created_at__gte=current_month_start
            ).aggregate(total=Sum('total_amount'))['total'] or 0

            # CA mois précédent (période équivalente)
            days_in_current_month = (now - current_month_start).days + 1
            previous_month_end = previous_month_start + timedelta(days=days_in_current_month)

            previous_revenue = Invoice.objects.filter(
                created_by__organization=self.organization,
                status__in=['sent', 'paid'],
                created_at__gte=previous_month_start,
                created_at__lt=previous_month_end
            ).aggregate(total=Sum('total_amount'))['total'] or 0

            if previous_revenue > 0:
                change_pct = ((current_revenue - previous_revenue) / previous_revenue) * 100

                if abs(change_pct) >= 10:  # Changement significatif (±10%)
                    if change_pct > 0:
                        emoji = '📈'
                        trend = 'hausse'
                        priority = 5
                        insight_type = 'insight'
                    else:
                        emoji = '📉'
                        trend = 'baisse'
                        priority = 7
                        insight_type = 'alert'

                    if change_pct > 0:
                        conseil = ('Bonne dynamique ! Identifiez les facteurs de cette croissance '
                                   '(nouveaux clients, produits phares, saisonnalité) pour la maintenir. '
                                   'Vérifiez que votre trésorerie suit et anticipez vos besoins en stock.')
                    else:
                        conseil = ('Une baisse de CA peut avoir plusieurs causes : saisonnalité, perte de clients, '
                                   'concurrence. Analysez vos ventes par produit et par client pour identifier '
                                   'l\'origine. Ajustez vos charges variables en conséquence.')

                    insights.append({
                        'type': insight_type,
                        'priority': priority,
                        'title': f'{emoji} CA en {trend} de {abs(change_pct):.1f}%',
                        'message': f'Votre CA ce mois: **{current_revenue:.2f}€** vs **{previous_revenue:.2f}€** le mois dernier '
                                   f'(sur la même période de {days_in_current_month} jours).',
                        'conseil': conseil,
                        'action_label': 'Analyser',
                        'action_url': '/ai-chat',
                        'impact': f'{trend.capitalize()} de {abs(current_revenue - previous_revenue):.2f}€',
                        'data': {
                            'current_revenue': float(current_revenue),
                            'previous_revenue': float(previous_revenue),
                            'change_pct': float(change_pct),
                            'analysis_prompt': f'Analyse l\'évolution du CA: {change_pct:+.1f}% ce mois vs mois dernier'
                        }
                    })
        except Exception as e:
            logger.error(f"Erreur _compare_revenue: {e}")

        return insights

    def _analyze_profitability(self):
        """Analyse les baisses de marge significatives"""
        from apps.invoicing.models import Product, InvoiceItem

        insights = []

        try:
            now = timezone.now()
            last_30_days = now - timedelta(days=30)
            previous_30_days = now - timedelta(days=60)

            # Produits avec cost_price défini (sinon impossible de calculer marge)
            products = Product.objects.filter(
                organization=self.organization,
                cost_price__isnull=False,
                cost_price__gt=0
            )

            margin_drops = []
            for product in products[:20]:  # Limiter pour performance
                # Marge actuelle
                recent = InvoiceItem.objects.filter(
                    invoice__created_by__organization=self.organization,
                    invoice__created_at__gte=last_30_days,
                    product=product
                ).aggregate(
                    revenue=Sum(F('quantity') * F('unit_price')),
                    qty=Sum('quantity')
                )

                # Marge précédente
                previous = InvoiceItem.objects.filter(
                    invoice__created_by__organization=self.organization,
                    invoice__created_at__gte=previous_30_days,
                    invoice__created_at__lt=last_30_days,
                    product=product
                ).aggregate(
                    revenue=Sum(F('quantity') * F('unit_price')),
                    qty=Sum('quantity')
                )

                if recent['qty'] and previous['qty'] and recent['qty'] > 0 and previous['qty'] > 0:
                    current_avg_price = recent['revenue'] / recent['qty']
                    previous_avg_price = previous['revenue'] / previous['qty']

                    current_margin = current_avg_price - float(product.cost_price)
                    previous_margin = previous_avg_price - float(product.cost_price)

                    if previous_margin > 0:
                        margin_change = ((current_margin - previous_margin) / previous_margin) * 100

                        if margin_change < -15:  # Baisse > 15%
                            margin_drops.append({
                                'name': product.name,
                                'change': margin_change,
                                'current': current_margin,
                                'previous': previous_margin,
                                'id': str(product.id)
                            })

            if margin_drops:
                margin_drops.sort(key=lambda x: x['change'])  # Pire en premier
                worst = margin_drops[0]

                insights.append({
                    'type': 'alert',
                    'priority': 8,
                    'title': f'📉 Marge en baisse sur {len(margin_drops)} produit(s)',
                    'message': f'Le produit **{worst["name"]}** a perdu **{abs(worst["change"]):.1f}%** de marge '
                               f'(de {worst["previous"]:.2f}€ à {worst["current"]:.2f}€/unité).',
                    'conseil': 'La marge est le nerf de la guerre. Deux leviers possibles : '
                               '(1) Renégociez vos prix d\'achat avec le fournisseur, '
                               '(2) Ajustez vos prix de vente si le marché le permet. '
                               'Attention à ne pas sacrifier la marge pour le volume sans calcul précis.',
                    'action_label': 'Analyser',
                    'action_url': '/ai-chat',
                    'impact': f'Érosion de marge: {abs(worst["change"]):.1f}%',
                    'data': {
                        'products': margin_drops[:3],
                        'analysis_prompt': f'Analyse la baisse de marge sur {worst["name"]} et suggère des actions'
                    }
                })
        except Exception as e:
            logger.error(f"Erreur _analyze_profitability: {e}")

        return insights

    def _analyze_top_products(self):
        """Identifie les produits les plus vendus ce mois"""
        from apps.invoicing.models import Product

        insights = []

        try:
            current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            top_products = Product.objects.filter(
                organization=self.organization
            ).annotate(
                month_qty=Sum('invoice_items__quantity',
                             filter=Q(invoice_items__invoice__created_at__gte=current_month_start)),
                month_revenue=Sum(
                    F('invoice_items__quantity') * F('invoice_items__unit_price'),
                    filter=Q(invoice_items__invoice__created_at__gte=current_month_start)
                )
            ).filter(month_qty__isnull=False, month_qty__gt=0).order_by('-month_revenue')[:5]

            if top_products:
                total_revenue = sum(p.month_revenue or 0 for p in top_products)

                product_list = '\n'.join([
                    f"• **{p.name}**: {p.month_qty} vendus ({p.month_revenue:.2f}€)"
                    for p in top_products[:3]
                ])

                insights.append({
                    'type': 'insight',
                    'priority': 4,
                    'title': f'⭐ Top produits ce mois',
                    'message': f'Vos meilleurs produits représentent **{total_revenue:.2f}€** de CA:\n{product_list}',
                    'conseil': 'Vos produits phares méritent une attention particulière : '
                               'assurez un stock suffisant pour ne jamais être en rupture, '
                               'surveillez leur marge, et envisagez des ventes additionnelles '
                               '(accessoires, produits complémentaires) pour maximiser le panier moyen.',
                    'action_label': 'Voir analyse',
                    'action_url': '/ai-chat',
                    'data': {
                        'products': [
                            {'name': p.name, 'qty': p.month_qty, 'revenue': float(p.month_revenue or 0), 'id': str(p.id)}
                            for p in top_products
                        ],
                        'total_revenue': float(total_revenue)
                    }
                })
        except Exception as e:
            logger.error(f"Erreur _analyze_top_products: {e}")

        return insights

    def _find_recurring_orders(self):
        """Détecte les patterns de commandes fournisseur récurrentes"""
        from apps.purchase_orders.models import PurchaseOrder
        from apps.suppliers.models import Supplier

        insights = []

        try:
            # Fournisseurs avec au moins 5 commandes
            suppliers = Supplier.objects.filter(
                organization=self.organization
            ).annotate(
                po_count=Count('purchaseorder'),
                total_amount=Sum('purchaseorder__total_amount')
            ).filter(po_count__gte=5).order_by('-po_count')[:3]

            if suppliers:
                top = suppliers[0]
                insights.append({
                    'type': 'suggestion',
                    'priority': 3,
                    'title': f'🔄 Commandes récurrentes: {top.name}',
                    'message': f'Vous avez passé **{top.po_count} commandes** chez {top.name} '
                               f'pour un total de **{top.total_amount or 0:.2f}€**.',
                    'conseil': 'Un volume d\'achat régulier est un levier de négociation. '
                               'Contactez ce fournisseur pour négocier des remises volume, '
                               'des conditions de paiement plus favorables, ou des frais de port offerts. '
                               'Montrez-lui votre historique de commandes.',
                    'action_label': 'Préparer commande',
                    'action_url': '/ai-chat',
                    'data': {
                        'supplier_id': str(top.id),
                        'supplier_name': top.name,
                        'order_count': top.po_count,
                        'analysis_prompt': f'Prépare un bon de commande type pour {top.name} basé sur l\'historique'
                    }
                })
        except Exception as e:
            logger.error(f"Erreur _find_recurring_orders: {e}")

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
            'detail': insight.get('detail', ''),
            'conseil': insight.get('conseil', ''),  # Conseil professionnel
            'impact': insight.get('impact', ''),
            'action_label': insight.get('action_label', ''),
            'action_url': insight.get('action_url', ''),
            'trigger_conditions': {},
            'priority': insight.get('priority', 5),
            'is_active': True,
            'max_displays': 2,
            'data': insight.get('data', {})
        })

    return suggestions
