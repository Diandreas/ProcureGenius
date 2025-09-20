from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.utils.translation import gettext as _
from django.core.paginator import Paginator
from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay
from django.utils import timezone
from datetime import datetime, timedelta, date
import json
import csv

from .models import CustomReport, ReportExecution, AnalyticsDashboard, BudgetPlan, BudgetCategory, KPIMetric
from .forms import CustomReportForm, BudgetPlanForm, AnalyticsDashboardForm
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.invoicing.models import Invoice, Payment
from apps.suppliers.models import Supplier, Product


# ===== VUES PRINCIPALES =====

@login_required
def analytics_dashboard(request):
    """Tableau de bord analytics principal"""
    
    # Période par défaut : 12 derniers mois
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=365)
    
    # Métriques principales
    main_metrics = _get_main_metrics(start_date, end_date)
    
    # Tendances mensuelles
    monthly_trends = _get_monthly_trends(start_date, end_date)
    
    # Top fournisseurs
    top_suppliers = _get_top_suppliers(start_date, end_date)
    
    # Analyse des dépenses par catégorie
    category_spending = _get_category_spending(start_date, end_date)
    
    # KPIs personnalisés
    custom_kpis = KPIMetric.objects.filter(
        created_by=request.user,
        is_active=True
    )[:6]
    
    # Dashboards personnalisés
    custom_dashboards = AnalyticsDashboard.objects.filter(
        Q(created_by=request.user) | Q(is_public=True)
    ).order_by('-created_at')[:5]
    
    context = {
        'main_metrics': main_metrics,
        'monthly_trends': monthly_trends,
        'top_suppliers': top_suppliers,
        'category_spending': category_spending,
        'custom_kpis': custom_kpis,
        'custom_dashboards': custom_dashboards,
        'period_start': start_date,
        'period_end': end_date,
    }
    
    return render(request, 'analytics/dashboard.html', context)


@login_required
def spend_analysis(request):
    """Analyse détaillée des dépenses"""
    
    # Paramètres de période
    period = request.GET.get('period', '12months')
    
    if period == '12months':
        start_date = timezone.now().date() - timedelta(days=365)
    elif period == '6months':
        start_date = timezone.now().date() - timedelta(days=180)
    elif period == '3months':
        start_date = timezone.now().date() - timedelta(days=90)
    else:
        start_date = timezone.now().date() - timedelta(days=365)
    
    end_date = timezone.now().date()
    
    # Analyse des dépenses
    spend_data = {
        'total_spend': _get_total_spend(start_date, end_date),
        'spend_by_month': _get_spend_by_month(start_date, end_date),
        'spend_by_supplier': _get_spend_by_supplier(start_date, end_date),
        'spend_by_category': _get_spend_by_category(start_date, end_date),
        'spend_trends': _get_spend_trends(start_date, end_date),
    }
    
    # Analyse IA des dépenses
    if request.GET.get('ai_analysis') == 'true':
        from apps.ai_assistant.services import MistralAIService
        ai_service = MistralAIService()
        ai_analysis = ai_service.generate_spend_analysis(spend_data)
        spend_data['ai_analysis'] = ai_analysis
    
    context = {
        'spend_data': spend_data,
        'period': period,
        'start_date': start_date,
        'end_date': end_date,
        'period_choices': [
            ('3months', _('3 derniers mois')),
            ('6months', _('6 derniers mois')),
            ('12months', _('12 derniers mois')),
        ]
    }
    
    return render(request, 'analytics/spend_analysis.html', context)


@login_required
def supplier_analysis(request):
    """Analyse de performance des fournisseurs"""
    
    # Top fournisseurs par volume
    top_by_volume = Supplier.objects.annotate(
        total_orders=Count('purchaseorder'),
        total_amount=Sum('purchaseorder__total_amount')
    ).filter(
        total_orders__gt=0
    ).order_by('-total_amount')[:10]
    
    # Fournisseurs par performance IA
    top_by_performance = Supplier.objects.filter(
        status='active',
        ai_performance_score__gt=0
    ).order_by('-ai_performance_score')[:10]
    
    # Analyse des délais de livraison
    delivery_analysis = _get_delivery_performance_analysis()
    
    # Diversité des fournisseurs
    diversity_stats = {
        'local_suppliers': Supplier.objects.filter(is_local=True, is_active=True).count(),
        'minority_owned': Supplier.objects.filter(is_minority_owned=True, is_active=True).count(),
        'woman_owned': Supplier.objects.filter(is_woman_owned=True, is_active=True).count(),
        'indigenous': Supplier.objects.filter(is_indigenous=True, is_active=True).count(),
        'total_active': Supplier.objects.filter(is_active=True).count(),
    }
    
    context = {
        'top_by_volume': top_by_volume,
        'top_by_performance': top_by_performance,
        'delivery_analysis': delivery_analysis,
        'diversity_stats': diversity_stats,
    }
    
    return render(request, 'analytics/supplier_analysis.html', context)


@login_required
def invoice_analysis(request):
    """Analyse des factures et paiements"""
    
    # Période par défaut : 12 derniers mois
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=365)
    
    # Métriques de facturation
    invoice_metrics = {
        'total_invoices': Invoice.objects.filter(
            invoice_date__gte=start_date,
            invoice_date__lte=end_date
        ).count(),
        'total_revenue': Invoice.objects.filter(
            invoice_date__gte=start_date,
            invoice_date__lte=end_date,
            status='paid'
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
        'outstanding_amount': Invoice.objects.filter(
            status__in=['sent', 'viewed', 'partial']
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
        'overdue_amount': Invoice.objects.filter(
            status__in=['sent', 'viewed', 'partial'],
            due_date__lt=end_date
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
    }
    
    # Analyse des délais de paiement
    payment_analysis = _get_payment_analysis(start_date, end_date)
    
    # Tendances de facturation
    invoice_trends = Invoice.objects.filter(
        invoice_date__gte=start_date,
        invoice_date__lte=end_date
    ).annotate(
        month=TruncMonth('invoice_date')
    ).values('month').annotate(
        count=Count('id'),
        total_amount=Sum('total_amount'),
        paid_amount=Sum('total_amount', filter=Q(status='paid'))
    ).order_by('month')
    
    # Top clients par revenus
    top_clients = Invoice.objects.filter(
        invoice_date__gte=start_date,
        invoice_date__lte=end_date,
        status='paid'
    ).values('client__name').annotate(
        total_revenue=Sum('total_amount'),
        invoice_count=Count('id')
    ).order_by('-total_revenue')[:10]
    
    context = {
        'invoice_metrics': invoice_metrics,
        'payment_analysis': payment_analysis,
        'invoice_trends': list(invoice_trends),
        'top_clients': top_clients,
        'start_date': start_date,
        'end_date': end_date,
    }
    
    return render(request, 'analytics/invoice_analysis.html', context)


# ===== VUES DE RAPPORTS =====

@login_required
def custom_reports(request):
    """Liste des rapports personnalisés"""
    
    reports = CustomReport.objects.filter(
        Q(created_by=request.user) | Q(is_public=True)
    ).order_by('-created_at')
    
    # Rapports récemment exécutés
    recent_executions = ReportExecution.objects.filter(
        report__in=reports,
        status='completed'
    ).select_related('report').order_by('-completed_at')[:10]
    
    context = {
        'reports': reports,
        'recent_executions': recent_executions,
        'can_create': request.user.role in ['admin', 'manager'],
    }
    
    return render(request, 'analytics/custom_reports.html', context)


@login_required
def report_builder(request):
    """Constructeur de rapports personnalisés"""
    
    if request.user.role not in ['admin', 'manager']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('analytics:custom_reports')
    
    if request.method == 'POST':
        form = CustomReportForm(request.POST)
        if form.is_valid():
            report = form.save(commit=False)
            report.created_by = request.user
            report.save()
            
            messages.success(request, _('Rapport créé avec succès.'))
            return redirect('analytics:custom_report_detail', report_id=report.id)
    else:
        form = CustomReportForm()
    
    # Données disponibles pour les rapports
    available_data = {
        'models': [
            ('purchase_orders', _('Bons de commande')),
            ('invoices', _('Factures')),
            ('suppliers', _('Fournisseurs')),
            ('products', _('Produits')),
        ],
        'fields': {
            'purchase_orders': ['number', 'supplier', 'total_amount', 'status', 'order_date'],
            'invoices': ['number', 'client', 'total_amount', 'status', 'invoice_date'],
            'suppliers': ['name', 'rating', 'province', 'categories'],
            'products': ['name', 'unit_price', 'supplier', 'category'],
        }
    }
    
    context = {
        'form': form,
        'available_data': available_data,
    }
    
    return render(request, 'analytics/report_builder.html', context)


@login_required
def custom_report_detail(request, report_id):
    """Détail et exécution d'un rapport personnalisé"""
    
    report = get_object_or_404(CustomReport, id=report_id)
    
    # Vérifier les permissions
    if report.created_by != request.user and not report.is_public:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('analytics:custom_reports')
    
    # Historique d'exécution
    executions = report.executions.order_by('-started_at')[:20]
    
    # Dernière exécution réussie
    last_execution = executions.filter(status='completed').first()
    
    context = {
        'report': report,
        'executions': executions,
        'last_execution': last_execution,
        'can_execute': request.user.role in ['admin', 'manager'],
        'can_edit': report.created_by == request.user,
    }
    
    return render(request, 'analytics/custom_report_detail.html', context)


# ===== APIS POUR GRAPHIQUES =====

@login_required
def api_spend_trends(request):
    """API pour les tendances de dépenses (Chart.js)"""
    
    period = request.GET.get('period', '12')
    months = int(period)
    
    start_date = timezone.now().date() - timedelta(days=months * 30)
    
    trends = PurchaseOrder.objects.filter(
        order_date__gte=start_date,
        status__in=['approved', 'sent', 'received', 'completed']
    ).annotate(
        month=TruncMonth('order_date')
    ).values('month').annotate(
        total_amount=Sum('total_amount'),
        count=Count('id')
    ).order_by('month')
    
    # Formater pour Chart.js
    labels = []
    amounts = []
    counts = []
    
    for trend in trends:
        labels.append(trend['month'].strftime('%Y-%m'))
        amounts.append(float(trend['total_amount'].amount) if trend['total_amount'] else 0)
        counts.append(trend['count'])
    
    data = {
        'labels': labels,
        'datasets': [
            {
                'label': _('Montant des dépenses'),
                'data': amounts,
                'borderColor': 'rgb(75, 192, 192)',
                'backgroundColor': 'rgba(75, 192, 192, 0.2)',
                'yAxisID': 'y'
            },
            {
                'label': _('Nombre de commandes'),
                'data': counts,
                'borderColor': 'rgb(255, 99, 132)',
                'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                'yAxisID': 'y1'
            }
        ]
    }
    
    return JsonResponse(data)


@login_required
def api_supplier_performance(request):
    """API pour la performance des fournisseurs"""
    
    suppliers = Supplier.objects.filter(
        status='active'
    ).annotate(
        order_count=Count('purchaseorder'),
        total_amount=Sum('purchaseorder__total_amount')
    ).filter(
        order_count__gt=0
    ).order_by('-total_amount')[:10]
    
    data = {
        'labels': [supplier.name for supplier in suppliers],
        'datasets': [
            {
                'label': _('Montant total'),
                'data': [
                    float(supplier.total_amount.amount) if supplier.total_amount else 0 
                    for supplier in suppliers
                ],
                'backgroundColor': [
                    f'rgba({50 + i*20}, {100 + i*15}, {200 - i*10}, 0.8)'
                    for i in range(len(suppliers))
                ]
            }
        ]
    }
    
    return JsonResponse(data)


@login_required
def api_cash_flow_forecast(request):
    """API pour les prévisions de flux de trésorerie"""
    
    # Factures à recevoir (prévisions)
    upcoming_payments = Invoice.objects.filter(
        status__in=['sent', 'viewed', 'partial'],
        due_date__gte=timezone.now().date(),
        due_date__lte=timezone.now().date() + timedelta(days=90)
    ).values('due_date').annotate(
        expected_amount=Sum('total_amount')
    ).order_by('due_date')
    
    # Commandes à payer (estimations)
    upcoming_expenses = PurchaseOrder.objects.filter(
        status__in=['approved', 'sent', 'confirmed'],
        expected_delivery__gte=timezone.now().date(),
        expected_delivery__lte=timezone.now().date() + timedelta(days=90)
    ).values('expected_delivery').annotate(
        expected_amount=Sum('total_amount')
    ).order_by('expected_delivery')
    
    # Formater pour graphique
    dates = []
    inflows = []
    outflows = []
    
    # Créer une série de dates pour les 90 prochains jours
    current_date = timezone.now().date()
    for i in range(90):
        date_point = current_date + timedelta(days=i)
        dates.append(date_point.strftime('%Y-%m-%d'))
        
        # Calculer les entrées prévues pour cette date
        inflow = sum(
            float(payment['expected_amount'].amount)
            for payment in upcoming_payments
            if payment['due_date'] == date_point
        )
        inflows.append(inflow)
        
        # Calculer les sorties prévues pour cette date
        outflow = sum(
            float(expense['expected_amount'].amount)
            for expense in upcoming_expenses
            if expense['expected_delivery'] == date_point
        )
        outflows.append(outflow)
    
    data = {
        'labels': dates,
        'datasets': [
            {
                'label': _('Entrées prévues'),
                'data': inflows,
                'borderColor': 'rgb(75, 192, 192)',
                'backgroundColor': 'rgba(75, 192, 192, 0.2)',
                'fill': True
            },
            {
                'label': _('Sorties prévues'),
                'data': outflows,
                'borderColor': 'rgb(255, 99, 132)',
                'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                'fill': True
            }
        ]
    }
    
    return JsonResponse(data)


# ===== VUES D'EXPORT =====

@login_required
def export_report(request, report_type):
    """Export de rapports vers CSV/Excel"""
    
    if report_type == 'spend_analysis':
        return _export_spend_analysis(request)
    elif report_type == 'supplier_performance':
        return _export_supplier_performance(request)
    elif report_type == 'invoice_aging':
        return _export_invoice_aging(request)
    else:
        messages.error(request, _('Type de rapport inconnu.'))
        return redirect('analytics:dashboard')


def _export_spend_analysis(request):
    """Export de l'analyse des dépenses"""
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="analyse_depenses.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Mois', 'Nombre de commandes', 'Montant total', 
        'Montant moyen', 'Fournisseur principal'
    ])
    
    # Données des 12 derniers mois
    start_date = timezone.now().date() - timedelta(days=365)
    
    monthly_data = PurchaseOrder.objects.filter(
        order_date__gte=start_date,
        status__in=['approved', 'sent', 'received', 'completed']
    ).annotate(
        month=TruncMonth('order_date')
    ).values('month').annotate(
        count=Count('id'),
        total_amount=Sum('total_amount'),
        avg_amount=Avg('total_amount')
    ).order_by('month')
    
    for data in monthly_data:
        # Trouver le fournisseur principal du mois
        top_supplier = PurchaseOrder.objects.filter(
            order_date__month=data['month'].month,
            order_date__year=data['month'].year,
            status__in=['approved', 'sent', 'received', 'completed']
        ).values('supplier__name').annotate(
            total=Sum('total_amount')
        ).order_by('-total').first()
        
        writer.writerow([
            data['month'].strftime('%Y-%m'),
            data['count'],
            float(data['total_amount'].amount) if data['total_amount'] else 0,
            float(data['avg_amount'].amount) if data['avg_amount'] else 0,
            top_supplier['supplier__name'] if top_supplier else ''
        ])
    
    return response


# ===== FONCTIONS UTILITAIRES =====

def _get_main_metrics(start_date, end_date):
    """Calcule les métriques principales"""
    
    # Dépenses
    total_spend = PurchaseOrder.objects.filter(
        order_date__gte=start_date,
        order_date__lte=end_date,
        status__in=['approved', 'sent', 'received', 'completed']
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    # Revenus
    total_revenue = Invoice.objects.filter(
        invoice_date__gte=start_date,
        invoice_date__lte=end_date,
        status='paid'
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    # Nombre de transactions
    po_count = PurchaseOrder.objects.filter(
        order_date__gte=start_date,
        order_date__lte=end_date
    ).count()
    
    invoice_count = Invoice.objects.filter(
        invoice_date__gte=start_date,
        invoice_date__lte=end_date
    ).count()
    
    # Fournisseurs actifs
    active_suppliers = Supplier.objects.filter(
        status='active',
        last_order_date__gte=start_date
    ).count()
    
    return {
        'total_spend': total_spend,
        'total_revenue': total_revenue,
        'po_count': po_count,
        'invoice_count': invoice_count,
        'active_suppliers': active_suppliers,
        'profit_margin': (total_revenue.amount - total_spend.amount) if total_revenue and total_spend else 0
    }


def _get_monthly_trends(start_date, end_date):
    """Calcule les tendances mensuelles"""
    
    trends = PurchaseOrder.objects.filter(
        order_date__gte=start_date,
        order_date__lte=end_date,
        status__in=['approved', 'sent', 'received', 'completed']
    ).annotate(
        month=TruncMonth('order_date')
    ).values('month').annotate(
        spend_amount=Sum('total_amount'),
        order_count=Count('id')
    ).order_by('month')
    
    return list(trends)


def _get_top_suppliers(start_date, end_date):
    """Obtient les top fournisseurs par volume"""
    
    return Supplier.objects.annotate(
        period_amount=Sum(
            'purchaseorder__total_amount',
            filter=Q(
                purchaseorder__order_date__gte=start_date,
                purchaseorder__order_date__lte=end_date,
                purchaseorder__status__in=['approved', 'sent', 'received', 'completed']
            )
        ),
        period_orders=Count(
            'purchaseorder',
            filter=Q(
                purchaseorder__order_date__gte=start_date,
                purchaseorder__order_date__lte=end_date
            )
        )
    ).filter(
        period_amount__isnull=False,
        period_orders__gt=0
    ).order_by('-period_amount')[:10]


def _get_category_spending(start_date, end_date):
    """Analyse des dépenses par catégorie"""
    
    from apps.suppliers.models import ProductCategory
    
    return ProductCategory.objects.annotate(
        spend_amount=Sum(
            'purchaseorderitem__total_price',
            filter=Q(
                purchaseorderitem__purchase_order__order_date__gte=start_date,
                purchaseorderitem__purchase_order__order_date__lte=end_date,
                purchaseorderitem__purchase_order__status__in=['approved', 'sent', 'received', 'completed']
            )
        )
    ).filter(
        spend_amount__isnull=False
    ).order_by('-spend_amount')[:15]


def _get_payment_analysis(start_date, end_date):
    """Analyse des délais de paiement"""
    
    paid_invoices = Invoice.objects.filter(
        invoice_date__gte=start_date,
        invoice_date__lte=end_date,
        status='paid'
    ).prefetch_related('payments')
    
    payment_delays = []
    
    for invoice in paid_invoices:
        last_payment = invoice.payments.order_by('-payment_date').first()
        if last_payment:
            delay = (last_payment.payment_date - invoice.due_date).days
            payment_delays.append(delay)
    
    if payment_delays:
        avg_delay = sum(payment_delays) / len(payment_delays)
        on_time_payments = len([d for d in payment_delays if d <= 0])
        on_time_rate = (on_time_payments / len(payment_delays)) * 100
    else:
        avg_delay = 0
        on_time_rate = 0
    
    return {
        'avg_payment_delay': round(avg_delay, 1),
        'on_time_payment_rate': round(on_time_rate, 1),
        'total_analyzed': len(payment_delays)
    }


def _get_delivery_performance_analysis():
    """Analyse de la performance de livraison"""
    
    # Bons de commande avec dates de livraison
    delivered_orders = PurchaseOrder.objects.filter(
        delivery_date__isnull=False,
        expected_delivery__isnull=False,
        status__in=['received', 'completed']
    )
    
    delivery_performance = []
    
    for order in delivered_orders:
        delay = (order.delivery_date - order.expected_delivery).days
        delivery_performance.append({
            'supplier': order.supplier.name,
            'delay_days': delay,
            'on_time': delay <= 0
        })
    
    if delivery_performance:
        on_time_count = len([p for p in delivery_performance if p['on_time']])
        on_time_rate = (on_time_count / len(delivery_performance)) * 100
        avg_delay = sum(p['delay_days'] for p in delivery_performance) / len(delivery_performance)
    else:
        on_time_rate = 0
        avg_delay = 0
    
    return {
        'on_time_delivery_rate': round(on_time_rate, 1),
        'avg_delivery_delay': round(avg_delay, 1),
        'total_analyzed': len(delivery_performance)
    }