from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, Http404
from django.views.decorators.http import require_http_methods
from django.utils.translation import gettext as _
from django.utils import timezone
from django.db.models import Count, Sum, Q
from django.core.paginator import Paginator
from datetime import datetime, timedelta
import json

from .models import DashboardWidget, SystemNotification, UserNotificationRead, QuickAction
from apps.purchase_orders.models import PurchaseOrder
from apps.invoicing.models import Invoice
from apps.suppliers.models import Supplier


@login_required
def dashboard(request):
    """Tableau de bord principal"""
    
    # Statistiques rapides
    stats = get_dashboard_stats(request.user)
    
    # Widgets personnalisés de l'utilisateur
    widgets = DashboardWidget.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('position_y', 'position_x')
    
    # Notifications non lues
    unread_notifications = get_unread_notifications(request.user)
    
    # Actions rapides
    quick_actions = QuickAction.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('order')[:6]
    
    # Activités récentes
    recent_activities = get_recent_activities(request.user)
    
    context = {
        'stats': stats,
        'widgets': widgets,
        'unread_notifications': unread_notifications,
        'quick_actions': quick_actions,
        'recent_activities': recent_activities,
        'show_ai_mode_toggle': True,
    }
    
    return render(request, 'core/dashboard.html', context)


@login_required
def admin_dashboard(request):
    """Tableau de bord administrateur"""
    
    if request.user.role != 'admin':
        messages.error(request, _('Accès non autorisé.'))
        return redirect('core:dashboard')
    
    # Statistiques globales
    global_stats = get_admin_stats()
    
    # Utilisateurs récents
    recent_users = request.user.__class__.objects.order_by('-date_joined')[:10]
    
    # Activité système
    system_activities = get_system_activities()
    
    context = {
        'global_stats': global_stats,
        'recent_users': recent_users,
        'system_activities': system_activities,
    }
    
    return render(request, 'core/admin_dashboard.html', context)


@login_required
def manager_dashboard(request):
    """Tableau de bord gestionnaire"""
    
    if request.user.role not in ['admin', 'manager', 'accountant']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('core:dashboard')
    
    # Statistiques de gestion
    management_stats = get_management_stats(request.user)
    
    # Éléments nécessitant une approbation
    pending_approvals = get_pending_approvals(request.user)
    
    # Rapports rapides
    quick_reports = get_quick_reports()
    
    context = {
        'management_stats': management_stats,
        'pending_approvals': pending_approvals,
        'quick_reports': quick_reports,
    }
    
    return render(request, 'core/manager_dashboard.html', context)


@login_required
@require_http_methods(["POST"])
def save_widget_layout(request):
    """Sauvegarde la disposition des widgets"""
    
    try:
        layout_data = json.loads(request.body)
        
        for widget_data in layout_data.get('widgets', []):
            try:
                widget = DashboardWidget.objects.get(
                    id=widget_data['id'],
                    user=request.user
                )
                widget.position_x = widget_data.get('x', 0)
                widget.position_y = widget_data.get('y', 0)
                widget.width = widget_data.get('width', 4)
                widget.height = widget_data.get('height', 300)
                widget.save()
            except DashboardWidget.DoesNotExist:
                continue
        
        return JsonResponse({
            'status': 'success',
            'message': _('Disposition sauvegardée avec succès.')
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': _('Données invalides.')
        }, status=400)


@login_required
def add_widget(request):
    """Ajouter un widget au tableau de bord"""
    
    if request.method == 'POST':
        widget_type = request.POST.get('widget_type')
        title = request.POST.get('title')
        
        if widget_type and title:
            widget = DashboardWidget.objects.create(
                user=request.user,
                widget_type=widget_type,
                title=title,
                position_x=0,
                position_y=0,
                width=4,
                height=300
            )
            
            messages.success(request, _('Widget ajouté avec succès.'))
            return redirect('core:dashboard')
    
    widget_types = DashboardWidget.WIDGET_TYPES
    context = {'widget_types': widget_types}
    
    return render(request, 'core/add_widget.html', context)


@login_required
@require_http_methods(["POST"])
def remove_widget(request, widget_id):
    """Supprimer un widget"""
    
    try:
        widget = DashboardWidget.objects.get(
            id=widget_id,
            user=request.user
        )
        widget.delete()
        
        return JsonResponse({
            'status': 'success',
            'message': _('Widget supprimé avec succès.')
        })
        
    except DashboardWidget.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': _('Widget introuvable.')
        }, status=404)


@login_required
def notifications(request):
    """Liste des notifications"""
    
    # Marquer les notifications comme lues
    unread_notifications = get_unread_notifications(request.user)
    for notification in unread_notifications:
        UserNotificationRead.objects.get_or_create(
            user=request.user,
            notification=notification
        )
    
    # Toutes les notifications
    all_notifications = SystemNotification.objects.filter(
        Q(target_all_users=True) |
        Q(target_users=request.user) |
        Q(target_roles__contains=[request.user.role]),
        is_active=True,
        start_date__lte=timezone.now()
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=timezone.now())
    ).order_by('-created_at')
    
    paginator = Paginator(all_notifications, 20)
    page_number = request.GET.get('page')
    notifications_page = paginator.get_page(page_number)
    
    context = {
        'notifications': notifications_page,
    }
    
    return render(request, 'core/notifications.html', context)


@login_required
def quick_actions_manage(request):
    """Gérer les actions rapides"""
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'add':
            title = request.POST.get('title')
            url = request.POST.get('url')
            icon = request.POST.get('icon', 'bi-plus-circle')
            description = request.POST.get('description', '')
            
            if title and url:
                QuickAction.objects.create(
                    user=request.user,
                    title=title,
                    url=url,
                    icon=icon,
                    description=description
                )
                messages.success(request, _('Action rapide ajoutée.'))
        
        elif action == 'delete':
            action_id = request.POST.get('action_id')
            try:
                quick_action = QuickAction.objects.get(
                    id=action_id,
                    user=request.user
                )
                quick_action.delete()
                messages.success(request, _('Action rapide supprimée.'))
            except QuickAction.DoesNotExist:
                messages.error(request, _('Action rapide introuvable.'))
        
        return redirect('core:quick_actions_manage')
    
    quick_actions = QuickAction.objects.filter(
        user=request.user
    ).order_by('order')
    
    context = {
        'quick_actions': quick_actions,
    }
    
    return render(request, 'core/quick_actions_manage.html', context)


def custom_404(request, exception):
    """Page d'erreur 404 personnalisée"""
    return render(request, 'core/404.html', status=404)


def custom_500(request):
    """Page d'erreur 500 personnalisée"""
    return render(request, 'core/500.html', status=500)


# ===== FONCTIONS UTILITAIRES =====

def get_dashboard_stats(user):
    """Obtenir les statistiques du tableau de bord"""
    
    # Période : 30 derniers jours
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    stats = {
        'total_purchase_orders': PurchaseOrder.objects.count(),
        'pending_purchase_orders': PurchaseOrder.objects.filter(
            status__in=['draft', 'pending']
        ).count(),
        'total_invoices': Invoice.objects.count(),
        'overdue_invoices': Invoice.objects.filter(
            status__in=['sent', 'viewed'],
            due_date__lt=timezone.now().date()
        ).count(),
        'total_suppliers': Supplier.objects.filter(status='active').count(),
        'monthly_spend': PurchaseOrder.objects.filter(
            created_at__gte=thirty_days_ago,
            status__in=['approved', 'sent', 'received', 'completed']
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
    }
    
    return stats


def get_admin_stats():
    """Statistiques pour l'administrateur"""
    
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    stats = {
        'total_users': User.objects.count(),
        'active_users': User.objects.filter(is_active=True).count(),
        'total_tenants': 1,  # Sera mis à jour avec la logique multi-tenant
        'system_notifications': SystemNotification.objects.filter(is_active=True).count(),
    }
    
    return stats


def get_management_stats(user):
    """Statistiques pour les gestionnaires"""
    
    stats = {
        'pending_approvals': PurchaseOrder.objects.filter(
            status='pending'
        ).count(),
        'overdue_invoices': Invoice.objects.filter(
            status__in=['sent', 'viewed'],
            due_date__lt=timezone.now().date()
        ).count(),
        'this_month_orders': PurchaseOrder.objects.filter(
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year
        ).count(),
        'this_month_revenue': Invoice.objects.filter(
            status='paid',
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
    }
    
    return stats


def get_unread_notifications(user):
    """Obtenir les notifications non lues"""
    
    read_notification_ids = UserNotificationRead.objects.filter(
        user=user
    ).values_list('notification_id', flat=True)
    
    return SystemNotification.objects.filter(
        Q(target_all_users=True) |
        Q(target_users=user) |
        Q(target_roles__contains=[user.role]),
        is_active=True,
        start_date__lte=timezone.now()
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gte=timezone.now())
    ).exclude(
        id__in=read_notification_ids
    ).order_by('-created_at')[:5]


def get_recent_activities(user):
    """Obtenir les activités récentes"""
    
    activities = []
    
    # Bons de commande récents
    recent_pos = PurchaseOrder.objects.filter(
        created_by=user
    ).order_by('-created_at')[:5]
    
    for po in recent_pos:
        activities.append({
            'type': 'purchase_order',
            'title': f'BC {po.number}',
            'description': f'Créé pour {po.supplier.name}',
            'date': po.created_at,
            'url': f'/purchase-orders/{po.id}/',
            'icon': 'bi-cart3',
            'status': po.status
        })
    
    # Factures récentes
    recent_invoices = Invoice.objects.filter(
        created_by=user
    ).order_by('-created_at')[:5]
    
    for invoice in recent_invoices:
        activities.append({
            'type': 'invoice',
            'title': f'Facture {invoice.number}',
            'description': f'Client: {invoice.client.name}',
            'date': invoice.created_at,
            'url': f'/invoicing/{invoice.id}/',
            'icon': 'bi-receipt',
            'status': invoice.status
        })
    
    # Trier par date
    activities.sort(key=lambda x: x['date'], reverse=True)
    
    return activities[:10]


def get_pending_approvals(user):
    """Obtenir les éléments en attente d'approbation"""
    
    approvals = []
    
    # Bons de commande en attente
    if user.role in ['admin', 'manager']:
        pending_pos = PurchaseOrder.objects.filter(
            status='pending'
        ).order_by('-created_at')[:10]
        
        for po in pending_pos:
            approvals.append({
                'type': 'purchase_order',
                'title': f'BC {po.number}',
                'description': f'{po.supplier.name} - {po.total_amount}',
                'date': po.created_at,
                'url': f'/purchase-orders/{po.id}/',
                'priority': po.priority
            })
    
    return approvals


def get_quick_reports():
    """Obtenir les rapports rapides"""
    
    reports = [
        {
            'title': _('Dépenses mensuelles'),
            'url': '/analytics/spend-analysis/',
            'icon': 'bi-graph-up',
            'description': _('Analyse des dépenses par mois')
        },
        {
            'title': _('Performance fournisseurs'),
            'url': '/analytics/supplier-analysis/',
            'icon': 'bi-building',
            'description': _('Évaluation des fournisseurs')
        },
        {
            'title': _('Factures en retard'),
            'url': '/invoicing/aging-report/',
            'icon': 'bi-exclamation-triangle',
            'description': _('Factures impayées')
        },
    ]
    
    return reports


def get_system_activities():
    """Obtenir les activités système (pour admin)"""
    
    activities = []
    
    # Nouvelles inscriptions
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    recent_users = User.objects.order_by('-date_joined')[:5]
    for user in recent_users:
        activities.append({
            'type': 'user_registration',
            'title': _('Nouvel utilisateur'),
            'description': f'{user.get_full_name()} ({user.email})',
            'date': user.date_joined,
            'icon': 'bi-person-plus'
        })
    
    return activities