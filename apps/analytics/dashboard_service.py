"""
Service complet pour le dashboard avec statistiques personnalisables et export
"""
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Avg, F, Q, Max, Min
from django.utils import timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class DashboardStatsService:
    """Service centralisé pour toutes les statistiques du dashboard"""

    def __init__(self, user, start_date=None, end_date=None, compare_previous=False):
        """
        Initialize dashboard stats service

        Args:
            user: Django User instance
            start_date: Date de début (None = 30 derniers jours)
            end_date: Date de fin (None = aujourd'hui)
            compare_previous: Si True, compare avec la période précédente
        """
        self.user = user
        self.organization = getattr(user, 'organization', None)
        self.end_date = end_date or timezone.now()

        # Calcul de la date de début
        if start_date:
            self.start_date = start_date
        else:
            # Par défaut: 30 derniers jours
            self.start_date = self.end_date - timedelta(days=30)

        self.compare_previous = compare_previous
        self.period_days = (self.end_date - self.start_date).days

        # Période de comparaison (même durée avant start_date)
        if compare_previous:
            self.compare_end_date = self.start_date
            self.compare_start_date = self.compare_end_date - timedelta(days=self.period_days)

    def get_enabled_modules(self) -> List[str]:
        """Récupère les modules activés pour l'utilisateur"""
        from apps.core.modules import get_user_accessible_modules
        return get_user_accessible_modules(self.user)

    def get_comprehensive_stats(self) -> Dict:
        """
        Retourne toutes les statistiques du dashboard
        """
        enabled_modules = self.get_enabled_modules()

        stats = {
            'metadata': {
                'start_date': self.start_date.isoformat(),
                'end_date': self.end_date.isoformat(),
                'period_days': self.period_days,
                'generated_at': timezone.now().isoformat(),
                'compare_previous': self.compare_previous,
            },
            'enabled_modules': enabled_modules,
        }

        # Ajouter stats par module
        if 'suppliers' in enabled_modules:
            stats['suppliers'] = self.get_supplier_stats()

        if 'purchase_orders' in enabled_modules:
            stats['purchase_orders'] = self.get_purchase_order_stats()

        if 'invoices' in enabled_modules:
            stats['invoices'] = self.get_invoice_stats()

        if 'clients' in enabled_modules:
            stats['clients'] = self.get_client_stats()

        if 'products' in enabled_modules:
            stats['products'] = self.get_product_stats()

        # Stats financières globales
        if 'invoices' in enabled_modules or 'purchase_orders' in enabled_modules:
            stats['financial'] = self.get_financial_stats()

        # Performance globale
        stats['performance'] = self.get_performance_metrics()

        # Alertes et Activité Récente
        stats['alerts'] = self.get_alerts()
        stats['recent_activity'] = self.get_recent_activity()

        return stats

    def get_alerts(self) -> List[Dict]:
        """Génère les alertes pour le dashboard"""
        alerts = []
        
        if not self.organization:
            return alerts

        from apps.invoicing.models import Invoice, Product
        
        # 1. Factures en retard
        overdue_count = Invoice.objects.filter(
            created_by__organization=self.organization,
            status='overdue'
        ).count()
        
        if overdue_count > 0:
            alerts.append({
                'type': 'error',
                'message': f"{overdue_count} facture(s) en retard de paiement",
                'action_link': '/invoices?status=overdue'
            })

        # 2. Stock faible
        low_stock_count = Product.objects.filter(
            organization=self.organization,
            product_type='physical',
            stock_quantity__lte=F('low_stock_threshold'),
            stock_quantity__gt=0
        ).count()
        
        if low_stock_count > 0:
            alerts.append({
                'type': 'warning',
                'message': f"{low_stock_count} produit(s) en stock faible",
                'action_link': '/products?status=low_stock'
            })

        # 3. Rupture de stock
        out_of_stock_count = Product.objects.filter(
            organization=self.organization,
            product_type='physical',
            stock_quantity=0
        ).count()
        
        if out_of_stock_count > 0:
            alerts.append({
                'type': 'error',
                'message': f"{out_of_stock_count} produit(s) en rupture de stock",
                'action_link': '/products?status=out_of_stock'
            })

        return alerts

    def get_recent_activity(self) -> List[Dict]:
        """Récupère l'activité récente (créations)"""
        activity = []
        
        if not self.organization:
            return activity

        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder
        from apps.accounts.models import Client
        
        # Récupérer les 5 derniers de chaque type
        recent_invoices = Invoice.objects.filter(
            created_by__organization=self.organization
        ).select_related('client').order_by('-created_at')[:5]
        
        recent_orders = PurchaseOrder.objects.filter(
            created_by__organization=self.organization
        ).select_related('supplier').order_by('-created_at')[:5]
        
        recent_clients = Client.objects.filter(
            organization=self.organization
        ).order_by('-created_at')[:5]

        # Formater
        for inv in recent_invoices:
            client_name = f"{inv.client.first_name} {inv.client.last_name}" if inv.client.first_name else inv.client.company
            activity.append({
                'type': 'invoice',
                'description': f"Facture #{inv.invoice_number} créée pour {client_name}",
                'date': inv.created_at,
                'link': f"/invoices/{inv.id}"
            })
            
        for po in recent_orders:
            activity.append({
                'type': 'order',
                'description': f"Commande #{po.order_number} créée pour {po.supplier.name}",
                'date': po.created_at,
                'link': f"/purchase-orders/{po.id}"
            })
            
        for client in recent_clients:
            name = f"{client.first_name} {client.last_name}" if client.first_name else client.company
            activity.append({
                'type': 'client',
                'description': f"Nouveau client ajouté : {name}",
                'date': client.created_at,
                'link': f"/clients/{client.id}"
            })

        # Trier par date décroissante et prendre les 10 premiers
        activity.sort(key=lambda x: x['date'], reverse=True)
        return activity[:10]

    def get_supplier_stats(self) -> Dict:
        """Statistiques détaillées des fournisseurs"""
        from apps.suppliers.models import Supplier

        # Si pas d'organisation, retourner des stats vides
        if not self.organization:
            return {'total': 0, 'active': 0, 'inactive': 0, 'new_in_period': 0, 'by_rating': {}, 'top_suppliers': []}

        # Stats de base - FILTERED BY ORGANIZATION
        total = Supplier.objects.filter(organization=self.organization).count()
        active = Supplier.objects.filter(organization=self.organization, is_active=True, status='active').count()

        # Stats de la période - FILTERED BY ORGANIZATION
        period_suppliers = Supplier.objects.filter(
            organization=self.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        )
        new_suppliers = period_suppliers.count()

        # Par note - FILTERED BY ORGANIZATION
        by_rating = {
            '5_stars': Supplier.objects.filter(organization=self.organization, rating=5).count(),
            '4_stars': Supplier.objects.filter(organization=self.organization, rating=4).count(),
            '3_stars': Supplier.objects.filter(organization=self.organization, rating=3).count(),
            'below_3': Supplier.objects.filter(organization=self.organization, rating__lt=3, rating__gte=0).count(),
            'no_rating': Supplier.objects.filter(organization=self.organization).filter(Q(rating__isnull=True) | Q(rating=0)).count(),
        }

        # Top fournisseurs par volume de commandes - FILTERED BY ORGANIZATION
        from apps.purchase_orders.models import PurchaseOrder
        top_suppliers = Supplier.objects.filter(
            organization=self.organization,
            purchaseorder__created_at__gte=self.start_date,
            purchaseorder__created_at__lte=self.end_date
        ).annotate(
            total_orders=Count('purchaseorder'),
            total_amount=Sum('purchaseorder__total_amount')
        ).order_by('-total_amount')[:5]

        top_suppliers_data = [
            {
                'id': str(s.id),
                'name': s.name,
                'total_orders': s.total_orders,
                'total_amount': float(s.total_amount or 0)
            }
            for s in top_suppliers
        ]

        stats = {
            'total': total,
            'active': active,
            'inactive': total - active,
            'new_in_period': new_suppliers,
            'by_rating': by_rating,
            'top_suppliers': top_suppliers_data,
        }

        # Comparaison avec période précédente - FILTERED BY ORGANIZATION
        if self.compare_previous:
            previous_new = Supplier.objects.filter(
                organization=self.organization,
                created_at__gte=self.compare_start_date,
                created_at__lt=self.compare_end_date
            ).count()
            stats['comparison'] = {
                'previous_new': previous_new,
                'change': new_suppliers - previous_new,
                'percent_change': ((new_suppliers - previous_new) / previous_new * 100) if previous_new > 0 else 0
            }

        return stats

    def get_purchase_order_stats(self) -> Dict:
        """Statistiques détaillées des bons de commande"""
        from apps.purchase_orders.models import PurchaseOrder

        # Si pas d'organisation, retourner des stats vides
        if not self.organization:
            return {'total': 0, 'by_status': {}, 'period': {'count': 0, 'total_amount': 0, 'average_amount': 0, 'daily_trend': []}}

        # Stats globales - FILTERED BY ORGANIZATION
        total = PurchaseOrder.objects.filter(created_by__organization=self.organization).count()

        # Par statut - FILTERED BY ORGANIZATION
        by_status = {
            'draft': PurchaseOrder.objects.filter(created_by__organization=self.organization, status='draft').count(),
            'pending': PurchaseOrder.objects.filter(created_by__organization=self.organization, status='pending').count(),
            'approved': PurchaseOrder.objects.filter(created_by__organization=self.organization, status='approved').count(),
            'sent': PurchaseOrder.objects.filter(created_by__organization=self.organization, status='sent').count(),
            'received': PurchaseOrder.objects.filter(created_by__organization=self.organization, status='received').count(),
            'cancelled': PurchaseOrder.objects.filter(created_by__organization=self.organization, status='cancelled').count(),
        }

        # Stats de la période - FILTERED BY ORGANIZATION
        period_pos = PurchaseOrder.objects.filter(
            created_by__organization=self.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        )

        new_count = period_pos.count()
        total_amount = period_pos.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        average_amount = period_pos.aggregate(Avg('total_amount'))['total_amount__avg'] or 0

        # Tendance par jour
        daily_trend = []
        current_date = self.start_date.date()
        end_date_only = self.end_date.date()

        while current_date <= end_date_only:
            next_date = current_date + timedelta(days=1)
            day_count = period_pos.filter(
                created_at__date=current_date
            ).count()
            day_amount = period_pos.filter(
                created_at__date=current_date
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            daily_trend.append({
                'date': current_date.isoformat(),
                'count': day_count,
                'amount': float(day_amount)
            })
            current_date = next_date

        stats = {
            'total': total,
            'by_status': by_status,
            'period': {
                'count': new_count,
                'total_amount': float(total_amount),
                'average_amount': float(average_amount),
                'daily_trend': daily_trend
            }
        }

        # Comparaison avec période précédente - FILTERED BY ORGANIZATION
        if self.compare_previous:
            previous_pos = PurchaseOrder.objects.filter(
                created_by__organization=self.organization,
                created_at__gte=self.compare_start_date,
                created_at__lt=self.compare_end_date
            )
            previous_count = previous_pos.count()
            previous_amount = previous_pos.aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            stats['comparison'] = {
                'previous_count': previous_count,
                'previous_amount': float(previous_amount),
                'count_change': new_count - previous_count,
                'amount_change': float(total_amount - previous_amount),
                'count_percent_change': ((new_count - previous_count) / previous_count * 100) if previous_count > 0 else 0,
                'amount_percent_change': ((total_amount - previous_amount) / previous_amount * 100) if previous_amount > 0 else 0
            }

        return stats

    def get_invoice_stats(self) -> Dict:
        """Statistiques détaillées des factures"""
        from apps.invoicing.models import Invoice

        # Si pas d'organisation, retourner des stats vides
        if not self.organization:
            return {'total': 0, 'by_status': {}, 'period': {'count': 0, 'total_amount': 0, 'paid_amount': 0, 'pending_amount': 0, 'payment_rate': 0, 'daily_trend': []}}

        # Stats globales - FILTERED BY ORGANIZATION
        total = Invoice.objects.filter(created_by__organization=self.organization).count()

        # Par statut - FILTERED BY ORGANIZATION
        by_status = {
            'draft': Invoice.objects.filter(created_by__organization=self.organization, status='draft').count(),
            'sent': Invoice.objects.filter(created_by__organization=self.organization, status='sent').count(),
            'paid': Invoice.objects.filter(created_by__organization=self.organization, status='paid').count(),
            'overdue': Invoice.objects.filter(created_by__organization=self.organization, status='overdue').count(),
            'cancelled': Invoice.objects.filter(created_by__organization=self.organization, status='cancelled').count(),
        }

        # Stats de la période - FILTERED BY ORGANIZATION
        period_invoices = Invoice.objects.filter(
            created_by__organization=self.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        )

        new_count = period_invoices.count()
        total_amount = period_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        paid_amount = period_invoices.filter(status='paid').aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        pending_amount = period_invoices.filter(status='sent').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        # Tendance quotidienne
        daily_trend = []
        current_date = self.start_date.date()
        end_date_only = self.end_date.date()

        while current_date <= end_date_only:
            next_date = current_date + timedelta(days=1)
            day_count = period_invoices.filter(created_at__date=current_date).count()
            day_amount = period_invoices.filter(created_at__date=current_date).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            day_paid = period_invoices.filter(
                payments__payment_date=current_date,
                status='paid'
            ).distinct().aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            daily_trend.append({
                'date': current_date.isoformat(),
                'count': day_count,
                'amount': float(day_amount),
                'paid_amount': float(day_paid)
            })
            current_date = next_date

        # Taux de paiement
        payment_rate = (paid_amount / total_amount * 100) if total_amount > 0 else 0

        stats = {
            'total': total,
            'by_status': by_status,
            'period': {
                'count': new_count,
                'total_amount': float(total_amount),
                'paid_amount': float(paid_amount),
                'pending_amount': float(pending_amount),
                'payment_rate': float(payment_rate),
                'daily_trend': daily_trend
            }
        }

        # Comparaison avec période précédente - FILTERED BY ORGANIZATION
        if self.compare_previous:
            previous_invoices = Invoice.objects.filter(
                created_by__organization=self.organization,
                created_at__gte=self.compare_start_date,
                created_at__lt=self.compare_end_date
            )
            previous_count = previous_invoices.count()
            previous_amount = previous_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            previous_paid = previous_invoices.filter(status='paid').aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            stats['comparison'] = {
                'previous_count': previous_count,
                'previous_amount': float(previous_amount),
                'previous_paid': float(previous_paid),
                'count_change': new_count - previous_count,
                'amount_change': float(total_amount - previous_amount),
                'count_percent_change': ((new_count - previous_count) / previous_count * 100) if previous_count > 0 else 0,
                'amount_percent_change': ((total_amount - previous_amount) / previous_amount * 100) if previous_amount > 0 else 0
            }

        return stats

    def get_client_stats(self) -> Dict:
        """Statistiques détaillées des clients"""
        from apps.accounts.models import Client
        from apps.invoicing.models import Invoice

        # Si pas d'organisation, retourner des stats vides
        if not self.organization:
            return {'total': 0, 'active': 0, 'new_in_period': 0, 'active_with_revenue': 0, 'top_clients': []}

        # Stats globales - FILTERED BY ORGANIZATION
        total = Client.objects.filter(organization=self.organization).count()
        active = Client.objects.filter(organization=self.organization, is_active=True).count()

        # Nouveaux clients dans la période - FILTERED BY ORGANIZATION
        new_clients = Client.objects.filter(
            organization=self.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).count()

        # Clients actifs (avec factures payées récemment) - FILTERED BY ORGANIZATION
        active_with_invoices = Client.objects.filter(
            organization=self.organization,
            invoices__status='paid',
            invoices__created_at__gte=self.start_date,
            invoices__created_at__lte=self.end_date
        ).distinct().count()

        # Top clients par chiffre d'affaires - FILTERED BY ORGANIZATION
        # Utiliser created_at des factures au lieu de payments__payment_date
        top_clients = Client.objects.filter(
            organization=self.organization,
            invoices__status='paid',
            invoices__created_at__gte=self.start_date,
            invoices__created_at__lte=self.end_date
        ).annotate(
            total_invoices=Count('invoices', distinct=True),
            total_revenue=Sum('invoices__total_amount')
        ).order_by('-total_revenue')[:5]

        top_clients_data = [
            {
                'id': str(c.id),
                'name': c.company or (f"{c.first_name} {c.last_name}".strip() if c.first_name else str(c.id)),
                'total_invoices': c.total_invoices or 0,
                'total_revenue': float(c.total_revenue or 0)
            }
            for c in top_clients
        ]

        stats = {
            'total': total,
            'active': active,
            'new_in_period': new_clients,
            'active_with_revenue': active_with_invoices,
            'top_clients': top_clients_data
        }

        # Comparaison avec période précédente - FILTERED BY ORGANIZATION
        if self.compare_previous:
            previous_new = Client.objects.filter(
                organization=self.organization,
                created_at__gte=self.compare_start_date,
                created_at__lt=self.compare_end_date
            ).count()

            stats['comparison'] = {
                'previous_new': previous_new,
                'change': new_clients - previous_new,
                'percent_change': ((new_clients - previous_new) / previous_new * 100) if previous_new > 0 else 0
            }

        return stats

    def get_product_stats(self) -> Dict:
        """Statistiques détaillées des produits et stock"""
        from apps.invoicing.models import Product

        if not self.organization:
            return {'total': 0, 'active': 0, 'by_type': {}, 'stock': {}, 'top_products': []}

        # Stats globales
        total = Product.objects.filter(organization=self.organization).count()
        active = Product.objects.filter(organization=self.organization, is_active=True).count()
        physical = Product.objects.filter(organization=self.organization, product_type='physical').count()
        services = Product.objects.filter(organization=self.organization, product_type='service').count()

        # Stock
        low_stock = Product.objects.filter(
            organization=self.organization,
            product_type='physical',
            stock_quantity__lte=F('low_stock_threshold'),
            stock_quantity__gt=0
        ).count()

        out_of_stock = Product.objects.filter(
            organization=self.organization,
            product_type='physical',
            stock_quantity=0
        ).count()

        # Valeur du stock
        stock_value = Product.objects.filter(
            organization=self.organization,
            product_type='physical'
        ).annotate(
            value=F('stock_quantity') * F('cost_price')
        ).aggregate(total=Sum('value'))['total'] or 0

        # Produits les plus vendus (via factures)
        from apps.invoicing.models import InvoiceItem
        top_products = Product.objects.filter(
            organization=self.organization,
            invoice_items__invoice__created_at__gte=self.start_date,
            invoice_items__invoice__created_at__lte=self.end_date,
            invoice_items__invoice__status='paid',
            invoice_items__invoice__created_by__organization=self.organization
        ).annotate(
            quantity_sold=Sum('invoice_items__quantity'),
            revenue=Sum(F('invoice_items__quantity') * F('invoice_items__unit_price'))
        ).filter(revenue__gt=0).order_by('-revenue')[:5]

        top_products_data = [
            {
                'id': str(p.id),
                'name': p.name,
                'quantity_sold': p.quantity_sold or 0,
                'revenue': float(p.revenue or 0)
            }
            for p in top_products
        ]

        stats = {
            'total': total,
            'active': active,
            'by_type': {
                'physical': physical,
                'service': services
            },
            'stock': {
                'low_stock': low_stock,
                'out_of_stock': out_of_stock,
                'total_value': float(stock_value)
            },
            'top_products': top_products_data
        }

        return stats

    def get_financial_stats(self) -> Dict:
        """Statistiques financières globales"""
        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder

        if not self.organization:
            return {'revenue': 0, 'expenses': 0, 'net_profit': 0, 'profit_margin': 0, 'pending_revenue': 0}

        # Revenus (factures payées) - utiliser created_at si status='paid'
        # Note: Si vous avez un champ paid_date, remplacez created_at par paid_date
        revenue = Invoice.objects.filter(
            created_by__organization=self.organization,
            status='paid',
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        # Dépenses (BCs approuvés/reçus)
        expenses = PurchaseOrder.objects.filter(
            created_by__organization=self.organization,
            status__in=['approved', 'sent', 'received'],
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        # Profit net
        net_profit = revenue - expenses
        profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0

        # Revenus en attente
        pending_revenue = Invoice.objects.filter(
            created_by__organization=self.organization,
            status='sent'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        stats = {
            'revenue': float(revenue),
            'expenses': float(expenses),
            'net_profit': float(net_profit),
            'profit_margin': float(profit_margin),
            'pending_revenue': float(pending_revenue)
        }

        # Comparaison avec période précédente
        if self.compare_previous:
            previous_revenue = Invoice.objects.filter(
                created_by__organization=self.organization,
                status='paid',
                created_at__gte=self.compare_start_date,
                created_at__lt=self.compare_end_date
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            previous_expenses = PurchaseOrder.objects.filter(
                created_by__organization=self.organization,
                status__in=['approved', 'sent', 'received'],
                created_at__gte=self.compare_start_date,
                created_at__lt=self.compare_end_date
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            previous_profit = previous_revenue - previous_expenses

            stats['comparison'] = {
                'previous_revenue': float(previous_revenue),
                'previous_expenses': float(previous_expenses),
                'previous_profit': float(previous_profit),
                'revenue_change': float(revenue - previous_revenue),
                'expenses_change': float(expenses - previous_expenses),
                'profit_change': float(net_profit - previous_profit),
                'revenue_percent_change': ((revenue - previous_revenue) / previous_revenue * 100) if previous_revenue > 0 else 0,
                'profit_percent_change': ((net_profit - previous_profit) / previous_profit * 100) if previous_profit != 0 else 0
            }

        return stats

    def get_performance_metrics(self) -> Dict:
        """Métriques de performance globales"""
        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder

        # Délai moyen de paiement des factures
        # Annoter chaque facture avec sa date de paiement la plus récente
        paid_invoices = Invoice.objects.filter(
            status='paid',
            payments__payment_date__gte=self.start_date,
            payments__payment_date__lte=self.end_date
        ).annotate(
            latest_payment_date=Max('payments__payment_date')
        ).distinct()

        avg_payment_delay = None
        if paid_invoices.exists():
            delays = [
                (inv.latest_payment_date - inv.created_at.date()).days
                for inv in paid_invoices
                if inv.latest_payment_date and inv.created_at
            ]
            avg_payment_delay = sum(delays) / len(delays) if delays else None

        # Taux de conversion devis -> factures (si module e-sourcing actif)
        # Pour l'instant, on utilise draft -> paid
        draft_invoices = Invoice.objects.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
            status='draft'
        ).count()

        paid_from_period = Invoice.objects.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
            status='paid'
        ).count()

        total_invoices_period = draft_invoices + paid_from_period
        conversion_rate = (paid_from_period / total_invoices_period * 100) if total_invoices_period > 0 else 0

        stats = {
            'avg_payment_delay_days': float(avg_payment_delay) if avg_payment_delay else None,
            'invoice_conversion_rate': float(conversion_rate)
        }

        return stats
