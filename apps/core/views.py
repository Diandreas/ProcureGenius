from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

# Import des modèles
from apps.purchase_orders.models import PurchaseOrder
from apps.invoicing.models import Invoice
from apps.suppliers.models import Supplier


@login_required
def dashboard(request):
    """Tableau de bord principal avec vraies données"""
    
    # Calcul des statistiques réelles
    now = timezone.now()
    current_month = now.month
    current_year = now.year
    
    # Bons de commande
    total_pos = PurchaseOrder.objects.count()
    pos_this_month = PurchaseOrder.objects.filter(
        created_at__month=current_month,
        created_at__year=current_year
    ).count()
    
    # Calcul du pourcentage de croissance des BC
    last_month = now - timedelta(days=30)
    pos_last_month = PurchaseOrder.objects.filter(
        created_at__gte=last_month,
        created_at__lt=now - timedelta(days=30)
    ).count()
    
    pos_growth = 0
    if pos_last_month > 0:
        pos_growth = round(((pos_this_month - pos_last_month) / pos_last_month) * 100, 1)
    elif pos_this_month > 0:
        pos_growth = 100
    
    # Factures en attente
    pending_invoices = Invoice.objects.filter(
        Q(status='draft') | Q(status='sent')
    ).count()
    
    # Factures en retard
    overdue_invoices = Invoice.objects.filter(
        due_date__lt=now.date(),
        status__in=['draft', 'sent']
    ).count()
    
    # Fournisseurs actifs
    active_suppliers = Supplier.objects.filter(is_active=True).count()
    
    # Nouveaux fournisseurs ce mois
    new_suppliers_count = Supplier.objects.filter(
        created_at__month=current_month,
        created_at__year=current_year
    ).count()
    
    # Total des dépenses ce mois
    this_month_total = PurchaseOrder.objects.filter(
        created_at__month=current_month,
        created_at__year=current_year,
        status__in=['approved', 'sent', 'received']
    ).aggregate(
        total=Sum('total_amount')
    )['total'] or Decimal('0.00')
    
    # Total du mois passé pour comparaison
    last_month_total = PurchaseOrder.objects.filter(
        created_at__month=(current_month - 1) if current_month > 1 else 12,
        created_at__year=current_year if current_month > 1 else current_year - 1,
        status__in=['approved', 'sent', 'received']
    ).aggregate(
        total=Sum('total_amount')
    )['total'] or Decimal('0.00')
    
    # Calcul de la croissance mensuelle
    monthly_growth = 0
    if last_month_total > 0:
        monthly_growth = round(((this_month_total - last_month_total) / last_month_total) * 100, 1)
    elif this_month_total > 0:
        monthly_growth = 100
    
    # Activités récentes
    recent_activities = []
    
    # Derniers bons de commande
    recent_pos = PurchaseOrder.objects.select_related('created_by').order_by('-created_at')[:3]
    for po in recent_pos:
        recent_activities.append({
            'type': 'purchase_order',
            'title': f'Bon de commande #{po.po_number}',
            'description': f'{po.title} • ${po.total_amount}',
            'timestamp': po.created_at,
            'status': po.status
        })
    
    # Dernières factures
    recent_invoices = Invoice.objects.select_related('created_by').order_by('-created_at')[:2]
    for invoice in recent_invoices:
        recent_activities.append({
            'type': 'invoice',
            'title': f'Facture #{invoice.invoice_number}',
            'description': f'{invoice.title} • ${invoice.total_amount}',
            'timestamp': invoice.created_at,
            'status': invoice.status
        })
    
    # Nouveaux fournisseurs
    new_suppliers = Supplier.objects.order_by('-created_at')[:2]
    for supplier in new_suppliers:
        recent_activities.append({
            'type': 'supplier',
            'title': 'Nouveau fournisseur ajouté',
            'description': f'{supplier.name} • {supplier.email}',
            'timestamp': supplier.created_at,
            'status': 'active' if supplier.is_active else 'inactive'
        })
    
    # Trier les activités par date
    recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)
    recent_activities = recent_activities[:5]  # Garder les 5 plus récentes
    
    context = {
        'user': request.user,
        'title': 'Tableau de bord - ProcureGenius',
        'stats': {
            'total_pos': total_pos,
            'pos_growth': pos_growth,
            'pending_invoices': pending_invoices,
            'overdue_invoices': overdue_invoices,
            'active_suppliers': active_suppliers,
            'new_suppliers_count': new_suppliers_count,
            'this_month_total': this_month_total,
            'monthly_growth': monthly_growth,
        },
        'recent_activities': recent_activities,
        'ai_suggestions': [
            {
                'type': 'optimization',
                'title': 'Optimisation des commandes',
                'description': 'Regrouper les commandes chez TechSupply Inc. pourrait économiser 12% sur les frais de livraison.',
                'potential_savings': 320,
                'confidence': 85
            },
            {
                'type': 'supplier',
                'title': 'Nouveau fournisseur recommandé',
                'description': 'Bureau Plus offre des prix 15% plus bas pour les fournitures de bureau.',
                'potential_savings': 150,
                'confidence': 78
            }
        ]
    }
    return render(request, 'core/dashboard.html', context)


def home(request):
    """Page d'accueil"""
    if request.user.is_authenticated:
        return dashboard(request)
    return render(request, 'core/home.html', {
        'title': 'Bienvenue sur ProcureGenius'
    })


@login_required
def api_dashboard_stats(request):
    """API pour les statistiques du tableau de bord"""
    stats = {
        'total_purchase_orders': 0,
        'pending_invoices': 0,
        'active_suppliers': 0,
        'this_month_total': '0.00',
        'recent_activities': []
    }
    return JsonResponse(stats)
