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

        # Healthcare modules
        if 'patients' in enabled_modules:
            stats['patients'] = self.get_patients_stats()

        if 'consultations' in enabled_modules:
            stats['consultations'] = self.get_consultations_stats()

        if 'laboratory' in enabled_modules:
            stats['laboratory'] = self.get_laboratory_stats()

        if 'pharmacy' in enabled_modules:
            stats['pharmacy'] = self.get_pharmacy_stats()

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

        # Clients actifs (avec factures récentes) - FILTERED BY ORGANIZATION
        # Inclure paid, sent et overdue pour avoir une vue complète
        active_with_invoices = Client.objects.filter(
            organization=self.organization,
            invoices__status__in=['paid', 'sent', 'overdue'],
            invoices__created_at__gte=self.start_date,
            invoices__created_at__lte=self.end_date
        ).distinct().count()

        # Top clients par chiffre d'affaires - FILTERED BY ORGANIZATION
        # Inclure toutes les factures pertinentes (pas seulement paid)
        top_clients = Client.objects.filter(
            organization=self.organization,
            invoices__status__in=['paid', 'sent', 'overdue'],
            invoices__created_at__gte=self.start_date,
            invoices__created_at__lte=self.end_date
        ).annotate(
            total_invoices=Count('invoices', distinct=True),
            total_revenue=Sum('invoices__total_amount')
        ).order_by('-total_revenue')[:5]

        top_clients_data = [
            {
                'id': str(c.id),
                'name': c.name or str(c.id),
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
        # Inclure toutes les factures pertinentes (paid, sent, overdue)
        from apps.invoicing.models import InvoiceItem
        top_products = Product.objects.filter(
            organization=self.organization,
            invoice_items__invoice__created_at__gte=self.start_date,
            invoice_items__invoice__created_at__lte=self.end_date,
            invoice_items__invoice__status__in=['paid', 'sent', 'overdue'],
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

        # Revenus (factures payées et envoyées) - comptabilité d'engagement
        # Note: Si vous préférez seulement 'paid', changez status__in
        revenue = Invoice.objects.filter(
            created_by__organization=self.organization,
            status__in=['paid', 'sent', 'overdue'],
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

    def get_patients_stats(self) -> Dict:
        """Statistiques patients et visites"""
        if not self.organization:
            return {}

        from apps.accounts.models import Client
        from apps.patients.models import PatientVisit

        # Total patients
        patients = Client.objects.filter(
            organization=self.organization,
            client_type__in=['patient', 'both']
        )

        patients_count = patients.count()

        # Nouveaux patients dans la période
        new_patients = patients.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).count()

        # Visites par statut
        visits = PatientVisit.objects.filter(
            organization=self.organization,
            arrived_at__gte=self.start_date,
            arrived_at__lte=self.end_date
        )

        visits_by_status = {
            'waiting': visits.filter(status='waiting').count(),
            'in_consultation': visits.filter(status='in_consultation').count(),
            'at_lab': visits.filter(status='at_lab').count(),
            'at_pharmacy': visits.filter(status='at_pharmacy').count(),
            'completed': visits.filter(status='completed').count(),
            'cancelled': visits.filter(status='cancelled').count(),
        }

        return {
            'patients_count': patients_count,
            'new_patients': new_patients,
            'total_visits': visits.count(),
            'visits_by_status': visits_by_status,
            'active_patients': patients.filter(
                visits__arrived_at__gte=self.start_date - timedelta(days=90)
            ).distinct().count()
        }

    def get_consultations_stats(self) -> Dict:
        """Statistiques consultations médicales"""
        if not self.organization:
            return {}

        from apps.consultations.models import Consultation
        from apps.invoicing.models import Invoice

        consultations = Consultation.objects.filter(
            organization=self.organization,
            consultation_date__gte=self.start_date,
            consultation_date__lte=self.end_date
        )

        total_count = consultations.count()

        # Revenus consultations
        consultation_invoices = Invoice.objects.filter(
            organization=self.organization,
            invoice_type='healthcare_consultation',
            issue_date__gte=self.start_date,
            issue_date__lte=self.end_date
        )

        revenue = consultation_invoices.filter(
            status__in=['paid', 'sent']
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

        # Consultations par docteur
        by_doctor = consultations.values(
            'doctor__first_name', 'doctor__last_name'
        ).annotate(count=Count('id')).order_by('-count')[:5]

        # Follow-ups
        follow_ups_required = consultations.filter(follow_up_required=True).count()
        follow_ups_done = consultations.filter(
            follow_up_required=True,
            follow_up_date__isnull=False
        ).count()

        return {
            'total_consultations': total_count,
            'revenue': float(revenue),
            'top_doctors': list(by_doctor),
            'follow_up_rate': (follow_ups_done / follow_ups_required * 100) if follow_ups_required > 0 else 0,
            'avg_per_day': total_count / self.period_days if self.period_days > 0 else 0
        }

    def get_laboratory_stats(self) -> Dict:
        """Statistiques laboratoire (LIMS)"""
        if not self.organization:
            return {}

        from apps.laboratory.models import LabOrder, LabOrderItem
        from apps.invoicing.models import Invoice

        lab_orders = LabOrder.objects.filter(
            organization=self.organization,
            order_date__gte=self.start_date,
            order_date__lte=self.end_date
        )

        # Par statut
        by_status = {
            'pending': lab_orders.filter(status='pending').count(),
            'sample_collected': lab_orders.filter(status='sample_collected').count(),
            'in_progress': lab_orders.filter(status='in_progress').count(),
            'completed': lab_orders.filter(status='completed').count(),
            'results_ready': lab_orders.filter(status='results_ready').count(),
            'results_delivered': lab_orders.filter(status='results_delivered').count(),
        }

        # Revenus laboratoire
        lab_invoices = Invoice.objects.filter(
            organization=self.organization,
            invoice_type='healthcare_laboratory',
            issue_date__gte=self.start_date,
            issue_date__lte=self.end_date
        )

        revenue = lab_invoices.filter(
            status__in=['paid', 'sent']
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

        # Tests les plus demandés
        top_tests = LabOrderItem.objects.filter(
            lab_order__organization=self.organization,
            lab_order__order_date__gte=self.start_date,
            lab_order__order_date__lte=self.end_date
        ).values('lab_test__name').annotate(count=Count('id')).order_by('-count')[:5]

        # Résultats critiques
        critical_results = LabOrderItem.objects.filter(
            lab_order__organization=self.organization,
            lab_order__order_date__gte=self.start_date,
            lab_order__order_date__lte=self.end_date,
            is_critical=True
        ).count()

        # Temps moyen de traitement (turnaround time)
        completed_orders = lab_orders.filter(
            status__in=['completed', 'results_ready', 'results_delivered'],
            results_completed_at__isnull=False
        )

        avg_turnaround = None
        if completed_orders.exists():
            turnaround_times = [
                (order.results_completed_at - order.order_date).total_seconds() / 3600
                for order in completed_orders
                if order.results_completed_at and order.order_date
            ]
            avg_turnaround = sum(turnaround_times) / len(turnaround_times) if turnaround_times else None

        return {
            'total_orders': lab_orders.count(),
            'by_status': by_status,
            'revenue': float(revenue),
            'top_tests': list(top_tests),
            'critical_results': critical_results,
            'avg_turnaround_hours': round(avg_turnaround, 2) if avg_turnaround else None
        }

    def get_pharmacy_stats(self) -> Dict:
        """Statistiques pharmacie"""
        if not self.organization:
            return {}

        from apps.pharmacy.models import PharmacyDispensing, DispensingItem
        from apps.consultations.models import Prescription
        from apps.invoicing.models import Invoice

        dispensings = PharmacyDispensing.objects.filter(
            organization=self.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        )

        total_dispensings = dispensings.count()

        # Revenus pharmacie
        pharmacy_invoices = Invoice.objects.filter(
            organization=self.organization,
            invoice_type='healthcare_pharmacy',
            issue_date__gte=self.start_date,
            issue_date__lte=self.end_date
        )

        revenue = pharmacy_invoices.filter(
            status__in=['paid', 'sent']
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

        # Médicaments les plus dispensés
        top_medications = DispensingItem.objects.filter(
            dispensing__organization=self.organization,
            dispensing__created_at__gte=self.start_date,
            dispensing__created_at__lte=self.end_date
        ).values('medication__name').annotate(
            total_qty=Sum('quantity_dispensed')
        ).order_by('-total_qty')[:5]

        # Taux de remplissage des prescriptions
        prescriptions = Prescription.objects.filter(
            organization=self.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        )

        filled_prescriptions = prescriptions.filter(status='filled').count()
        total_prescriptions = prescriptions.count()
        fill_rate = (filled_prescriptions / total_prescriptions * 100) if total_prescriptions > 0 else 0

        # Marge profit (estimée via DispensingItem.profit property)
        total_profit = sum(
            item.profit for item in DispensingItem.objects.filter(
                dispensing__organization=self.organization,
                dispensing__created_at__gte=self.start_date,
                dispensing__created_at__lte=self.end_date
            ) if item.profit
        )

        return {
            'total_dispensings': total_dispensings,
            'revenue': float(revenue),
            'profit': float(total_profit),
            'profit_margin': (total_profit / revenue * 100) if revenue > 0 else 0,
            'top_medications': list(top_medications),
            'prescription_fill_rate': round(fill_rate, 2),
            'pending_prescriptions': prescriptions.filter(status='pending').count()
        }

    def get_payment_method_stats(self) -> Dict:
        """Statistiques par mode de paiement (Mobile Money vs Cash)"""
        from apps.invoicing.models import Payment
        from django.db.models import Sum, Count

        if not self.organization:
            return {
                'mobile_money': {'count': 0, 'total': 0},
                'cash': {'count': 0, 'total': 0},
                'ratio': 0
            }

        # Paiements dans la période
        payments = Payment.objects.filter(
            invoice__organization=self.organization,
            payment_date__gte=self.start_date,
            payment_date__lte=self.end_date,
            status='success'  # Seulement les paiements réussis
        )

        # Statistiques Mobile Money
        mobile_money_agg = payments.filter(payment_method='mobile_money').aggregate(
            total=Sum('amount'),
            count=Count('id')
        )
        mobile_money_total = mobile_money_agg['total'] or 0
        mobile_money_count = mobile_money_agg['count'] or 0

        # Statistiques Cash
        cash_agg = payments.filter(payment_method='cash').aggregate(
            total=Sum('amount'),
            count=Count('id')
        )
        cash_total = cash_agg['total'] or 0
        cash_count = cash_agg['count'] or 0

        # Calcul du ratio Mobile Money / Total
        total_amount = mobile_money_total + cash_total
        ratio = (mobile_money_total / total_amount * 100) if total_amount > 0 else 0

        return {
            'mobile_money': {
                'count': mobile_money_count,
                'total': float(mobile_money_total)
            },
            'cash': {
                'count': cash_count,
                'total': float(cash_total)
            },
            'ratio': round(ratio, 2),  # Pourcentage de paiements en Mobile Money
            'total_amount': float(total_amount)
        }

    def get_detailed_stock_stats(self) -> Dict:
        """Statistiques stock avancées pour page dédiée"""
        from apps.invoicing.models import Product, StockMovement
        from django.db.models import Q, F, Sum, Count, Avg
        from django.db.models.functions import Abs
        from datetime import timedelta

        products = Product.objects.filter(
            organization=self.organization,
            product_type='physical',
            is_active=True
        )

        # 1. Produits à commander (stock bas ou rupture)
        to_order = products.filter(
            Q(stock_quantity__lte=F('low_stock_threshold')) | Q(stock_quantity=0)
        ).annotate(
            shortage=F('low_stock_threshold') - F('stock_quantity'),
            value_to_order=F('shortage') * F('cost_price'),
            stock_in_sell_units=F('stock_quantity') / F('conversion_factor')
        ).order_by('-value_to_order')[:20]

        to_order_list = []
        for product in to_order:
            to_order_list.append({
                'id': str(product.id),
                'name': product.name,
                'reference': product.reference,
                'current_stock': product.stock_quantity,
                'stock_in_sell_units': round(product.stock_in_sell_units, 2),
                'base_unit': product.get_base_unit_display(),
                'sell_unit': product.get_sell_unit_display(),
                'threshold': product.low_stock_threshold,
                'shortage': max(0, product.shortage),
                'estimated_cost': float(product.value_to_order) if product.value_to_order else 0,
                'supplier_name': product.supplier.name if product.supplier else None
            })

        # 2. Produits à risque (rupture fréquente dans les 90 derniers jours)
        ninety_days_ago = self.start_date - timedelta(days=90)
        risk_products = Product.objects.filter(
            organization=self.organization,
            product_type='physical',
            stock_movements__movement_type='loss',
            stock_movements__created_at__gte=ninety_days_ago
        ).annotate(
            loss_count=Count('stock_movements', filter=Q(
                stock_movements__movement_type='loss',
                stock_movements__created_at__gte=ninety_days_ago
            ))
        ).filter(loss_count__gte=3).order_by('-loss_count')[:15]

        risk_products_list = []
        for product in risk_products:
            risk_products_list.append({
                'id': str(product.id),
                'name': product.name,
                'reference': product.reference,
                'loss_count': product.loss_count,
                'current_stock': product.stock_quantity,
                'stock_in_sell_units': round(product.get_stock_in_sell_units(), 2),
                'sell_unit': product.get_sell_unit_display()
            })

        # 3. Top produits vendus (basé sur les mouvements de type 'sale')
        top_movers = products.annotate(
            total_sold=Sum(
                Abs('stock_movements__quantity'),
                filter=Q(
                    stock_movements__created_at__gte=self.start_date,
                    stock_movements__movement_type='sale'
                )
            )
        ).filter(total_sold__gt=0).order_by('-total_sold')[:10]

        top_movers_list = []
        for product in top_movers:
            top_movers_list.append({
                'id': str(product.id),
                'name': product.name,
                'reference': product.reference,
                'total_sold': product.total_sold or 0,
                'total_sold_sell_units': round(product.convert_to_sell_unit(product.total_sold or 0), 2),
                'sell_unit': product.get_sell_unit_display(),
                'current_stock': product.stock_quantity,
                'revenue': float(product.total_sold or 0) * float(product.price)
            })

        # 4. Produits dormants (pas de mouvement depuis 90 jours)
        dormant = products.exclude(
            stock_movements__created_at__gte=ninety_days_ago
        ).filter(stock_quantity__gt=0)

        dormant_value = dormant.aggregate(
            total_value=Sum(F('stock_quantity') * F('cost_price'))
        )['total_value'] or 0

        dormant_list = []
        for product in dormant[:15]:
            dormant_list.append({
                'id': str(product.id),
                'name': product.name,
                'reference': product.reference,
                'stock_quantity': product.stock_quantity,
                'stock_in_sell_units': round(product.get_stock_in_sell_units(), 2),
                'sell_unit': product.get_sell_unit_display(),
                'immobilized_value': float(product.stock_quantity * product.cost_price),
                'last_movement': None  # Could be calculated with an additional query
            })

        return {
            'to_order': to_order_list,
            'to_order_count': to_order.count(),
            'risk_products': risk_products_list,
            'risk_products_count': risk_products.count(),
            'top_movers': top_movers_list,
            'dormant': dormant_list,
            'dormant_count': dormant.count(),
            'dormant_value': float(dormant_value)
        }
