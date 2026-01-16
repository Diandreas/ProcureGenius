"""
Service to provide data for each widget
Reuses DashboardStatsService and adds widget-specific methods
"""
from typing import Dict, Any
from django.db import models
from .dashboard_service import DashboardStatsService
import logging

logger = logging.getLogger(__name__)


class WidgetDataService:
    """Service to fetch data for specific widgets"""

    def __init__(self, user, start_date, end_date):
        self.user = user
        self.start_date = start_date
        self.end_date = end_date
        self.stats_service = DashboardStatsService(user, start_date, end_date, compare_previous=True)

    def get_widget_data(self, widget_code: str, limit: int = 10, compare: bool = False) -> Dict[str, Any]:
        """Route to appropriate widget data method"""

        # Map widget codes to methods - 21 widgets (16 standard + 5 healthcare)
        widget_methods = {
            # Global widgets (3)
            'financial_summary': self.get_financial_summary,
            'alerts_notifications': self.get_alerts_notifications,
            'cash_flow_summary': self.get_cash_flow_summary,

            # Clients widgets (3)
            'top_clients': lambda **kw: self.get_top_clients(limit, **kw),
            'clients_at_risk': self.get_clients_at_risk,
            'pareto_clients': self.get_pareto_clients,

            # Products widgets (3)
            'top_selling_products': lambda **kw: self.get_top_selling_products(limit, **kw),
            'stock_alerts': self.get_stock_alerts,
            'margin_analysis': self.get_margin_analysis,

            # Invoices widgets (2)
            'invoices_overview': self.get_invoices_overview,
            'overdue_invoices': self.get_overdue_invoices,

            # Purchase Orders widgets (4)
            'po_overview': self.get_po_overview,
            'overdue_po': self.get_overdue_po,
            'supplier_performance': lambda **kw: self.get_supplier_performance(limit, **kw),
            'pending_approvals': self.get_pending_approvals,

            # AI widget (1)
            'ai_suggestions': self.get_ai_suggestions,

            # Healthcare widgets (5)
            'patients_overview': self.get_patients_overview,
            'consultations_summary': self.get_consultations_summary,
            'lab_orders_status': self.get_lab_orders_status,
            'pharmacy_dispensing': self.get_pharmacy_dispensing,
            'healthcare_revenue': self.get_healthcare_revenue,
        }

        method = widget_methods.get(widget_code)
        if not method:
            raise ValueError(f"Widget code '{widget_code}' not found")

        return method(compare=compare)

    # ========== GLOBAL WIDGETS ==========

    def get_financial_summary(self, **kwargs):
        """Financial summary widget"""
        stats = self.stats_service.get_financial_stats()
        return {
            'revenue': stats.get('revenue', 0),
            'expenses': stats.get('expenses', 0),
            'net_profit': stats.get('net_profit', 0),
            'profit_margin': stats.get('profit_margin', 0),
            'pending_revenue': stats.get('pending_revenue', 0),
            'comparison': stats.get('comparison', {})
        }

    def get_recent_activity(self, limit, **kwargs):
        """Recent activity across all modules"""
        from .models import ActivityLog

        # Récupérer les activités récentes pour l'organisation
        activities = ActivityLog.objects.filter(
            organization=self.stats_service.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).select_related('user').order_by('-created_at')[:limit]

        activities_data = []
        for activity in activities:
            activities_data.append({
                'id': str(activity.id),
                'action_type': activity.action_type,
                'entity_type': activity.entity_type,
                'entity_id': activity.entity_id,
                'description': activity.description,
                'user': activity.user.username if activity.user else 'System',
                'user_full_name': activity.user.get_full_name() if activity.user and hasattr(activity.user, 'get_full_name') else (activity.user.username if activity.user else 'System'),
                'created_at': activity.created_at.isoformat(),
                'metadata': activity.metadata
            })

        return {
            'activities': activities_data,
            'count': len(activities_data)
        }

    def get_alerts_notifications(self, **kwargs):
        """Consolidated alerts"""
        from apps.invoicing.models import Invoice, Product
        from apps.purchase_orders.models import PurchaseOrder
        from django.utils import timezone

        alerts = []

        # Overdue invoices
        overdue_invoices = Invoice.objects.filter(
            created_by__organization=self.stats_service.organization,
            status__in=['sent', 'overdue'],
            due_date__lt=timezone.now().date()
        ).count()
        if overdue_invoices > 0:
            alerts.append({
                'type': 'warning',
                'module': 'invoices',
                'message': f'{overdue_invoices} facture(s) en retard',
                'count': overdue_invoices
            })

        # Low stock
        low_stock = Product.objects.filter(
            organization=self.stats_service.organization,
            product_type='physical',
            stock_quantity__lte=models.F('low_stock_threshold'),
            stock_quantity__gt=0
        ).count()
        if low_stock > 0:
            alerts.append({
                'type': 'warning',
                'module': 'products',
                'message': f'{low_stock} produit(s) en stock bas',
                'count': low_stock
            })

        # Out of stock
        out_of_stock = Product.objects.filter(
            organization=self.stats_service.organization,
            product_type='physical',
            stock_quantity=0
        ).count()
        if out_of_stock > 0:
            alerts.append({
                'type': 'error',
                'module': 'products',
                'message': f'{out_of_stock} produit(s) en rupture',
                'count': out_of_stock
            })

        # Pending approvals
        pending_po = PurchaseOrder.objects.filter(
            created_by__organization=self.stats_service.organization,
            status='pending'
        ).count()
        if pending_po > 0:
            alerts.append({
                'type': 'info',
                'module': 'purchase_orders',
                'message': f'{pending_po} BC(s) en attente d\'approbation',
                'count': pending_po
            })

        return {
            'alerts': alerts,
            'total_count': len(alerts)
        }

    def get_cash_flow_summary(self, **kwargs):
        """Cash flow summary: receivable vs payable"""
        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder
        from django.db.models import Sum

        # Montant à recevoir (factures envoyées + en retard)
        receivable = Invoice.objects.filter(
            created_by__organization=self.stats_service.organization,
            status__in=['sent', 'overdue']
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        # Montant à payer (BC approuvés + en attente, non reçus)
        payable = PurchaseOrder.objects.filter(
            created_by__organization=self.stats_service.organization,
            status__in=['pending', 'approved', 'sent']
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        return {
            'receivable': float(receivable),
            'payable': float(payable),
            'balance': float(receivable) - float(payable)
        }

    def get_pareto_clients(self, **kwargs):
        """Pareto analysis 80/20 for clients"""
        from apps.invoicing.models import Invoice
        from apps.accounts.models import Client
        from django.db.models import Sum, Count
        from decimal import Decimal

        if not self.stats_service.organization:
            return {
                'top_clients_percent': 0,
                'revenue_percent': 0,
                'top_clients_count': 0,
                'total_clients': 0,
                'top_revenue': 0,
                'total_revenue': 0
            }

        # Récupérer tous les clients avec leur CA (utiliser created_at au lieu de payments)
        # Inclure toutes les factures pertinentes (paid, sent, overdue)
        clients_with_revenue = Client.objects.filter(
            organization=self.stats_service.organization,
            invoices__status__in=['paid', 'sent', 'overdue'],
            invoices__created_at__gte=self.start_date,
            invoices__created_at__lte=self.end_date
        ).annotate(
            revenue=Sum('invoices__total_amount'),
            invoice_count=Count('invoices', distinct=True)
        ).filter(revenue__gt=0).order_by('-revenue')

        total_clients = clients_with_revenue.count()
        total_revenue = sum(c.revenue for c in clients_with_revenue)

        if total_clients == 0 or total_revenue == 0:
            return {
                'top_clients_percent': 0,
                'revenue_percent': 0,
                'top_clients_count': 0,
                'total_clients': 0,
                'top_revenue': 0,
                'total_revenue': 0
            }

        # Calculer combien de clients représentent 80% du CA
        cumulative_revenue = Decimal('0')
        target_revenue = total_revenue * Decimal('0.80')
        top_clients_count = 0

        for client in clients_with_revenue:
            cumulative_revenue += client.revenue
            top_clients_count += 1
            if cumulative_revenue >= target_revenue:
                break

        top_clients_percent = (top_clients_count / total_clients) * 100 if total_clients > 0 else 0
        revenue_percent = (cumulative_revenue / total_revenue) * 100 if total_revenue > 0 else 0

        return {
            'top_clients_percent': round(top_clients_percent, 1),
            'revenue_percent': round(revenue_percent, 1),
            'top_clients_count': top_clients_count,
            'total_clients': total_clients,
            'top_revenue': float(cumulative_revenue),
            'total_revenue': float(total_revenue)
        }

    # ========== PRODUCT WIDGETS ==========

    def get_products_overview(self, **kwargs):
        """Products overview stats"""
        stats = self.stats_service.get_product_stats()
        return stats

    def get_top_selling_products(self, limit, **kwargs):
        """Top selling products"""
        stats = self.stats_service.get_product_stats()
        return {
            'products': stats.get('top_products', [])[:limit]
        }

    def get_stock_alerts(self, **kwargs):
        """Stock alerts (low and out of stock)"""
        from apps.invoicing.models import Product
        from django.db.models import F

        low_stock = Product.objects.filter(
            organization=self.stats_service.organization,
            product_type='physical',
            stock_quantity__lte=F('low_stock_threshold'),
            stock_quantity__gt=0,
            is_active=True
        ).values('id', 'name', 'stock_quantity', 'low_stock_threshold')[:10]

        out_of_stock = Product.objects.filter(
            organization=self.stats_service.organization,
            product_type='physical',
            stock_quantity=0,
            is_active=True
        ).values('id', 'name')[:10]

        # Format data to match frontend expectations
        low_stock_products = [
            {
                'name': p['name'],
                'stock': p['stock_quantity'],
                'min_stock': p['low_stock_threshold']
            }
            for p in low_stock
        ]

        return {
            'low_stock_products': low_stock_products,
            'low_stock': list(low_stock),  # Keep for backward compatibility
            'out_of_stock': list(out_of_stock)
        }


    def get_stock_movements(self, limit, **kwargs):
        """Recent stock movements"""
        from apps.invoicing.models import StockMovement

        movements = StockMovement.objects.filter(
            product__organization=self.stats_service.organization
        ).select_related(
            'product', 'created_by'
        ).order_by('-created_at')[:limit]

        return {
            'movements': [
                {
                    'id': str(m.id),
                    'product': m.product.name,
                    'type': m.movement_type,
                    'quantity': m.quantity,
                    'date': m.created_at.isoformat()
                }
                for m in movements
            ]
        }

    def get_margin_analysis(self, **kwargs):
        """Margin analysis by category"""
        from apps.invoicing.models import Product, ProductCategory
        from decimal import Decimal

        # Calculer la marge moyenne globale
        products = Product.objects.filter(
            organization=self.stats_service.organization,
            is_active=True,
            cost_price__gt=0
        )
        
        total_margin = Decimal('0')
        total_margin_percent = Decimal('0')
        count = 0
        
        for product in products:
            if product.cost_price > 0:
                margin = product.price - product.cost_price
                margin_percent = ((product.price - product.cost_price) / product.cost_price) * 100
                total_margin += margin
                total_margin_percent += margin_percent
                count += 1
        
        average_margin = float(total_margin / count) if count > 0 else 0
        average_margin_percent = float(total_margin_percent / count) if count > 0 else 0

        # Si pas de produits avec prix de revient, retourner structure vide
        if count == 0:
            return {
                'average_margin': 0,
                'average_margin_percent': 0,
                'total_products': 0,
                'by_category': []
            }

        # Calculer les marges par catégorie
        categories_data = []
        categories = ProductCategory.objects.filter(
            products__organization=self.stats_service.organization
        ).distinct()
        
        for category in categories:
            cat_products = products.filter(category=category)
            cat_count = cat_products.count()
            
            if cat_count > 0:
                cat_total_margin = Decimal('0')
                cat_total_margin_percent = Decimal('0')
                cat_valid_count = 0
                
                for product in cat_products:
                    if product.cost_price > 0:
                        margin = product.price - product.cost_price
                        margin_percent = ((product.price - product.cost_price) / product.cost_price) * 100
                        cat_total_margin += margin
                        cat_total_margin_percent += margin_percent
                        cat_valid_count += 1
                
                if cat_valid_count > 0:
                    categories_data.append({
                        'category_id': str(category.id),
                        'category_name': category.name,
                        'product_count': cat_count,
                        'average_margin': float(cat_total_margin / cat_valid_count),
                        'average_margin_percent': float(cat_total_margin_percent / cat_valid_count),
                        'total_revenue': float(sum(p.price for p in cat_products)),
                        'total_cost': float(sum(p.cost_price for p in cat_products if p.cost_price > 0))
                    })

        return {
            'average_margin': average_margin,
            'average_margin_percent': average_margin_percent,
            'total_products': count,
            'by_category': categories_data
        }

    # ========== CLIENT WIDGETS ==========

    def get_clients_overview(self, **kwargs):
        """Clients overview"""
        stats = self.stats_service.get_client_stats()
        return stats

    def get_top_clients(self, limit, **kwargs):
        """Top clients by revenue"""
        stats = self.stats_service.get_client_stats()
        return {
            'clients': stats.get('top_clients', [])[:limit]
        }

    def get_clients_at_risk(self, **kwargs):
        """Clients with overdue invoices"""
        from apps.invoicing.models import Invoice
        from apps.accounts.models import Client
        from django.utils import timezone
        from django.db.models import Count, Sum

        clients = Client.objects.filter(
            organization=self.stats_service.organization,
            invoices__status__in=['sent', 'overdue'],
            invoices__due_date__lt=timezone.now().date()
        ).annotate(
            overdue_count=Count('invoices'),
            overdue_amount=Sum('invoices__total_amount')
        ).values('id', 'name', 'overdue_count', 'overdue_amount')[:10]

        # Format the response to match frontend expectations
        formatted_clients = []
        for client in clients:
            formatted_clients.append({
                'id': str(client['id']),
                'name': client['name'],
                'overdue_invoices': client['overdue_count'],
                'overdue_amount': float(client['overdue_amount'] or 0)
            })

        return {
            'clients': formatted_clients
        }

    def get_client_acquisition(self, **kwargs):
        """Client acquisition trend"""
        # Reuse comparison data
        stats = self.stats_service.get_client_stats()
        return {
            'new_in_period': stats.get('new_in_period', 0),
            'comparison': stats.get('comparison', {})
        }

    def get_client_segmentation(self, **kwargs):
        """Client segmentation"""
        stats = self.stats_service.get_client_stats()
        return {
            'active': stats.get('active', 0),
            'inactive': stats.get('total', 0) - stats.get('active', 0)
        }

    # ========== INVOICE WIDGETS ==========

    def get_invoices_overview(self, **kwargs):
        """Invoices overview with amounts by status"""
        from apps.invoicing.models import Invoice
        from django.db.models import Sum, Count

        stats = self.stats_service.get_invoice_stats()
        
        # Récupérer les montants par statut
        status_amounts = Invoice.objects.filter(
            created_by__organization=self.stats_service.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).values('status').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        )

        amounts = {}
        for item in status_amounts:
            amounts[item['status']] = float(item['total'] or 0)

        # Total amount
        total_amount = sum(amounts.values())

        return {
            'total': stats.get('total', 0),
            'total_amount': total_amount,
            'by_status': stats.get('by_status', {}),
            'amounts': amounts,
            'period': stats.get('period', {})
        }

    def get_invoices_status(self, **kwargs):
        """Invoice status distribution"""
        stats = self.stats_service.get_invoice_stats()
        return stats.get('by_status', {})

    def get_revenue_chart(self, **kwargs):
        """Revenue trend chart"""
        stats = self.stats_service.get_invoice_stats()
        return {
            'daily_trend': stats.get('period', {}).get('daily_trend', []),
            'total_amount': stats.get('period', {}).get('total_amount', 0),
            'comparison': stats.get('comparison', {})
        }

    def get_overdue_invoices(self, **kwargs):
        """Overdue invoices list"""
        from apps.invoicing.models import Invoice
        from django.utils import timezone

        invoices = Invoice.objects.filter(
            created_by__organization=self.stats_service.organization,
            status__in=['sent', 'overdue'],
            due_date__lt=timezone.now().date()
        ).select_related('client').order_by('due_date')[:10]

        return {
            'invoices': [
                {
                    'id': str(inv.id),
                    'invoice_number': inv.invoice_number,
                    'client_name': inv.client.name if inv.client else 'Sans client',
                    'total_amount': float(inv.total_amount),
                    'due_date': inv.due_date.isoformat() if inv.due_date else None,
                    'days_overdue': (timezone.now().date() - inv.due_date).days if inv.due_date else 0
                }
                for inv in invoices
            ] if invoices.exists() else []
        }

    def get_payment_performance(self, **kwargs):
        """Payment performance metrics"""
        perf = self.stats_service.get_performance_metrics()
        stats = self.stats_service.get_invoice_stats()
        return {
            'avg_payment_delay_days': perf.get('avg_payment_delay_days'),
            'payment_rate': stats.get('period', {}).get('payment_rate', 0)
        }

    def get_recent_invoices(self, limit, **kwargs):
        """Recent invoices"""
        from apps.invoicing.models import Invoice

        invoices = Invoice.objects.filter(
            created_by__organization=self.stats_service.organization
        ).select_related('client').order_by('-created_at')[:limit]

        return {
            'invoices': [
                {
                    'id': str(inv.id),
                    'invoice_number': inv.invoice_number,
                    'client': inv.client.company or f"{inv.client.first_name} {inv.client.last_name}",
                    'total_amount': float(inv.total_amount),
                    'status': inv.status,
                    'created_at': inv.created_at.isoformat()
                }
                for inv in invoices
            ]
        }

    # ========== PURCHASE ORDER WIDGETS ==========

    def get_po_overview(self, **kwargs):
        """Purchase orders overview with amounts by status"""
        from apps.purchase_orders.models import PurchaseOrder
        from django.db.models import Sum, Count

        stats = self.stats_service.get_purchase_order_stats()
        
        # Récupérer les montants par statut
        status_amounts = PurchaseOrder.objects.filter(
            created_by__organization=self.stats_service.organization,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).values('status').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        )

        amounts = {}
        for item in status_amounts:
            amounts[item['status']] = float(item['total'] or 0)

        # Total amount
        total_amount = sum(amounts.values())

        return {
            'total': stats.get('total', 0),
            'total_amount': total_amount,
            'by_status': stats.get('by_status', {}),
            'amounts': amounts,
            'period': stats.get('period', {})
        }

    def get_po_status(self, **kwargs):
        """PO status distribution"""
        stats = self.stats_service.get_purchase_order_stats()
        return stats.get('by_status', {})

    def get_expenses_chart(self, **kwargs):
        """Expenses trend chart"""
        stats = self.stats_service.get_purchase_order_stats()
        return {
            'daily_trend': stats.get('period', {}).get('daily_trend', []),
            'total_amount': stats.get('period', {}).get('total_amount', 0),
            'comparison': stats.get('comparison', {})
        }

    def get_overdue_po(self, **kwargs):
        """Overdue purchase orders"""
        from apps.purchase_orders.models import PurchaseOrder
        from django.utils import timezone

        pos = PurchaseOrder.objects.filter(
            created_by__organization=self.stats_service.organization,
            status__in=['approved', 'sent'],
            required_date__lt=timezone.now().date()
        ).select_related('supplier').order_by('required_date')[:10]

        return {
            'purchase_orders': [
                {
                    'id': str(po.id),
                    'po_number': po.po_number,
                    'supplier': po.supplier.name,
                    'total_amount': float(po.total_amount),
                    'required_date': po.required_date.isoformat() if po.required_date else None,
                    'days_overdue': (timezone.now().date() - po.required_date).days if po.required_date else 0
                }
                for po in pos
            ]
        }

    def get_supplier_performance(self, limit, **kwargs):
        """Top suppliers performance"""
        stats = self.stats_service.get_supplier_stats()
        suppliers = stats.get('top_suppliers', [])[:limit] if stats else []
        
        # Ensure consistent structure even if empty
        return {
            'suppliers': suppliers if suppliers else []
        }

    def get_pending_approvals(self, **kwargs):
        """POs pending approval"""
        from apps.purchase_orders.models import PurchaseOrder

        pos = PurchaseOrder.objects.filter(
            created_by__organization=self.stats_service.organization,
            status='pending'
        ).select_related('supplier', 'created_by').order_by('-created_at')[:10]

        return {
            'purchase_orders': [
                {
                    'id': str(po.id),
                    'po_number': po.po_number,
                    'supplier': po.supplier.name,
                    'total_amount': float(po.total_amount),
                    'created_by': po.created_by.username if po.created_by else None,
                    'created_at': po.created_at.isoformat()
                }
                for po in pos
            ]
        }

    def get_budget_tracking(self, **kwargs):
        """Budget tracking"""
        from .models import Budget
        from apps.purchase_orders.models import PurchaseOrder
        from django.db.models import Sum

        # Récupérer le budget actif pour la période
        active_budget = Budget.objects.filter(
            organization=self.stats_service.organization,
            is_active=True,
            start_date__lte=self.end_date,
            end_date__gte=self.start_date
        ).order_by('-start_date').first()

        # Calculer les dépenses (POs approuvés, envoyés ou reçus)
        total_spent = PurchaseOrder.objects.filter(
            created_by__organization=self.stats_service.organization,
            status__in=['approved', 'sent', 'received'],
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        if active_budget:
            budget_amount = float(active_budget.amount)
            spent = float(total_spent)
            remaining = budget_amount - spent
            percent_used = (spent / budget_amount * 100) if budget_amount > 0 else 0
            
            return {
                'budget_id': str(active_budget.id),
                'budget_name': active_budget.name,
                'budget': budget_amount,
                'spent': spent,
                'remaining': remaining,
                'percent_used': percent_used,
                'is_over_budget': spent > budget_amount,
                'period_type': active_budget.period_type,
                'start_date': active_budget.start_date.isoformat(),
                'end_date': active_budget.end_date.isoformat()
            }
        else:
            # Pas de budget défini, retourner juste les dépenses
            return {
                'budget': 0,
                'spent': float(total_spent),
                'remaining': 0,
                'percent_used': 0,
                'is_over_budget': False,
                'has_budget': False,
                'message': 'Aucun budget défini pour cette période'
            }

    # ========== AI WIDGETS ==========

    def get_ai_usage(self, **kwargs):
        """AI usage statistics"""
        from apps.ai_assistant.models import Conversation, Message, DocumentScan

        total_conversations = Conversation.objects.filter(user=self.user).count()
        active_conversations = Conversation.objects.filter(user=self.user, is_active=True).count()
        total_messages = Message.objects.filter(conversation__user=self.user).count()
        total_documents = DocumentScan.objects.filter(user=self.user).count()

        return {
            'total_conversations': total_conversations,
            'active_conversations': active_conversations,
            'total_messages': total_messages,
            'total_documents': total_documents
        }

    def get_ai_documents(self, limit, **kwargs):
        """Recently processed documents"""
        from apps.ai_assistant.models import DocumentScan

        documents = DocumentScan.objects.filter(
            user=self.user
        ).order_by('-created_at')[:limit]

        return {
            'documents': [
                {
                    'id': str(doc.id),
                    'filename': doc.filename,
                    'document_type': doc.document_type,
                    'is_processed': doc.is_processed,
                    'created_entity_type': doc.created_entity_type,
                    'created_at': doc.created_at.isoformat()
                }
                for doc in documents
            ]
        }

    def get_ai_last_conversation(self, **kwargs):
        """Recent actions from last conversation"""
        from apps.ai_assistant.models import Conversation, ActionHistory

        try:
            last_conversation = Conversation.objects.filter(
                user=self.user
            ).order_by('-last_message_at').first()

            if not last_conversation:
                return {'actions': []}

            # Get recent actions (not limited to conversation, showing all recent AI actions)
            actions = ActionHistory.objects.filter(
                user=self.user
            ).order_by('-created_at')[:10]

            return {
                'conversation_id': str(last_conversation.id) if last_conversation else None,
                'actions': [
                    {
                        'id': str(action.id),
                        'action_type': action.action_type,
                        'entity_type': action.entity_type,
                        'description': action.description,
                        'can_undo': action.can_undo,
                        'is_undone': action.is_undone,
                        'created_at': action.created_at.isoformat()
                    }
                    for action in actions
                ]
            }
        except Exception as e:
            logger.error(f"Error fetching AI last conversation: {e}")
            return {'actions': []}

    def get_ai_suggestions(self, **kwargs):
        """
        AI proactive suggestions intelligentes
        Combine suggestions statiques et analyses en temps réel des données
        """
        try:
            from apps.ai_assistant.suggestion_matcher import suggestion_matcher

            # Récupérer les suggestions pertinentes pour l'utilisateur
            suggestions_list = suggestion_matcher.get_suggestions_for_user(
                self.user,
                include_intelligent=True
            )

            # Formatter les suggestions pour le widget
            formatted_suggestions = []
            for suggestion in suggestions_list:
                # Si c'est une suggestion intelligente (dict)
                if isinstance(suggestion, dict):
                    formatted_suggestions.append({
                        'id': suggestion.get('data', {}).get('id', 'intelligent'),
                        'type': suggestion.get('suggestion_type', 'insight'),
                        'title': suggestion.get('title', ''),
                        'message': suggestion.get('message', ''),
                        'action_label': suggestion.get('action_label', ''),
                        'action_url': suggestion.get('action_url', ''),
                        'priority': suggestion.get('priority', 5),
                        'is_intelligent': suggestion.get('is_intelligent', False)
                    })
                # Si c'est une suggestion statique (modèle Django)
                else:
                    formatted_suggestions.append({
                        'id': str(suggestion.id),
                        'type': suggestion.suggestion_type,
                        'title': suggestion.title,
                        'message': suggestion.message,
                        'action_label': suggestion.action_label,
                        'action_url': suggestion.action_url,
                        'priority': suggestion.priority,
                        'is_intelligent': False
                    })

            return {
                'suggestions': formatted_suggestions,
                'count': len(formatted_suggestions),
                'message': 'Aucune suggestion pour le moment' if not formatted_suggestions else ''
            }

        except Exception as e:
            logger.error(f"Error fetching AI suggestions: {e}")
            return {
                'suggestions': [],
                'count': 0,
                'message': 'Erreur lors du chargement des suggestions'
            }

    # ========== HEALTHCARE WIDGETS ==========

    def get_patients_overview(self, **kwargs):
        """Patients overview widget"""
        try:
            stats = self.stats_service.get_patients_stats()
            return stats if stats else {}
        except Exception as e:
            logger.error(f"Error in get_patients_overview: {e}")
            return {}

    def get_consultations_summary(self, **kwargs):
        """Consultations summary widget"""
        try:
            stats = self.stats_service.get_consultations_stats()
            return stats if stats else {}
        except Exception as e:
            logger.error(f"Error in get_consultations_summary: {e}")
            return {}

    def get_lab_orders_status(self, **kwargs):
        """Laboratory orders status widget"""
        try:
            stats = self.stats_service.get_laboratory_stats()
            return stats if stats else {}
        except Exception as e:
            logger.error(f"Error in get_lab_orders_status: {e}")
            return {}

    def get_pharmacy_dispensing(self, **kwargs):
        """Pharmacy dispensing widget"""
        try:
            stats = self.stats_service.get_pharmacy_stats()
            return stats if stats else {}
        except Exception as e:
            logger.error(f"Error in get_pharmacy_dispensing: {e}")
            return {}

    def get_healthcare_revenue(self, **kwargs):
        """Healthcare revenue breakdown"""
        try:
            from apps.invoicing.models import Invoice
            from decimal import Decimal
            from django.db.models import Sum

            # Get healthcare-related invoices
            consultation_revenue = Invoice.objects.filter(
                created_by__organization=self.stats_service.organization,
                invoice_type='healthcare_consultation',
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
                status__in=['paid', 'sent']
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

            laboratory_revenue = Invoice.objects.filter(
                created_by__organization=self.stats_service.organization,
                invoice_type='healthcare_laboratory',
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
                status__in=['paid', 'sent']
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

            pharmacy_revenue = Invoice.objects.filter(
                created_by__organization=self.stats_service.organization,
                invoice_type='healthcare_pharmacy',
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
                status__in=['paid', 'sent']
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

            total_revenue = float(consultation_revenue + laboratory_revenue + pharmacy_revenue)

            return {
                'consultation_revenue': float(consultation_revenue),
                'laboratory_revenue': float(laboratory_revenue),
                'pharmacy_revenue': float(pharmacy_revenue),
                'total_revenue': total_revenue,
                'breakdown': [
                    {'name': 'Consultations', 'value': float(consultation_revenue)},
                    {'name': 'Laboratoire', 'value': float(laboratory_revenue)},
                    {'name': 'Pharmacie', 'value': float(pharmacy_revenue)}
                ]
            }
        except Exception as e:
            logger.error(f"Error in get_healthcare_revenue: {e}")
            return {
                'consultation_revenue': 0,
                'laboratory_revenue': 0,
                'pharmacy_revenue': 0,
                'total_revenue': 0,
                'breakdown': [
                    {'name': 'Consultations', 'value': 0},
                    {'name': 'Laboratoire', 'value': 0},
                    {'name': 'Pharmacie', 'value': 0}
                ]
            }
