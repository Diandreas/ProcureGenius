"""
Vues de l'interface d'administration moderne
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta
import json

from apps.invoicing.models import Invoice, InvoiceItem, PrintTemplate, PrintConfiguration, PrintHistory
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.suppliers.models import Supplier

User = get_user_model()


def is_admin_or_manager(user):
    """Vérifie si l'utilisateur a les droits d'administration"""
    return user.is_authenticated and (user.is_staff or user.role in ['admin', 'manager'])


@login_required
@user_passes_test(is_admin_or_manager)
def admin_dashboard(request):
    """Dashboard principal de l'administration"""

    # Statistiques générales
    total_invoices = Invoice.objects.count()
    total_purchase_orders = PurchaseOrder.objects.count()
    total_suppliers = Supplier.objects.filter(is_active=True).count()
    total_users = User.objects.filter(is_active=True).count()

    # Statistiques financières
    current_month = timezone.now().replace(day=1)
    monthly_invoice_total = Invoice.objects.filter(
        created_at__gte=current_month
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    monthly_po_total = PurchaseOrder.objects.filter(
        created_at__gte=current_month
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    # Factures par statut
    invoice_stats = Invoice.objects.values('status').annotate(count=Count('id'))
    invoice_by_status = {stat['status']: stat['count'] for stat in invoice_stats}

    # Bons de commande par statut
    po_stats = PurchaseOrder.objects.values('status').annotate(count=Count('id'))
    po_by_status = {stat['status']: stat['count'] for stat in po_stats}

    # Activités récentes
    recent_invoices = Invoice.objects.order_by('-created_at')[:5]
    recent_purchase_orders = PurchaseOrder.objects.order_by('-created_at')[:5]
    recent_print_history = PrintHistory.objects.order_by('-printed_at')[:10]

    # Données pour les graphiques (30 derniers jours)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    daily_stats = []

    for i in range(30):
        date = thirty_days_ago + timedelta(days=i)
        day_invoices = Invoice.objects.filter(
            created_at__date=date.date()
        ).aggregate(
            count=Count('id'),
            total=Sum('total_amount')
        )

        day_pos = PurchaseOrder.objects.filter(
            created_at__date=date.date()
        ).aggregate(
            count=Count('id'),
            total=Sum('total_amount')
        )

        daily_stats.append({
            'date': date.strftime('%Y-%m-%d'),
            'invoices_count': day_invoices['count'] or 0,
            'invoices_total': float(day_invoices['total'] or 0),
            'pos_count': day_pos['count'] or 0,
            'pos_total': float(day_pos['total'] or 0),
        })

    context = {
        'total_invoices': total_invoices,
        'total_purchase_orders': total_purchase_orders,
        'total_suppliers': total_suppliers,
        'total_users': total_users,
        'monthly_invoice_total': monthly_invoice_total,
        'monthly_po_total': monthly_po_total,
        'invoice_by_status': invoice_by_status,
        'po_by_status': po_by_status,
        'recent_invoices': recent_invoices,
        'recent_purchase_orders': recent_purchase_orders,
        'recent_print_history': recent_print_history,
        'daily_stats': json.dumps(daily_stats),
    }

    return render(request, 'admin/dashboard.html', context)


@login_required
@user_passes_test(is_admin_or_manager)
def admin_invoices(request):
    """Gestion des factures"""

    # Filtres
    status_filter = request.GET.get('status', '')
    search_query = request.GET.get('q', '')
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')

    # Query de base
    invoices = Invoice.objects.all().order_by('-created_at')

    # Appliquer les filtres
    if status_filter:
        invoices = invoices.filter(status=status_filter)

    if search_query:
        invoices = invoices.filter(
            Q(invoice_number__icontains=search_query) |
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query)
        )

    if date_from:
        invoices = invoices.filter(created_at__date__gte=date_from)

    if date_to:
        invoices = invoices.filter(created_at__date__lte=date_to)

    # Pagination
    paginator = Paginator(invoices, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Statistiques pour les filtres
    all_invoices = Invoice.objects.all()
    status_counts = all_invoices.values('status').annotate(count=Count('id'))

    context = {
        'page_obj': page_obj,
        'status_filter': status_filter,
        'search_query': search_query,
        'date_from': date_from,
        'date_to': date_to,
        'status_counts': {stat['status']: stat['count'] for stat in status_counts},
        'total_count': all_invoices.count(),
    }

    return render(request, 'admin/invoices.html', context)


@login_required
@user_passes_test(is_admin_or_manager)
def admin_purchase_orders(request):
    """Gestion des bons de commande"""

    # Filtres similaires aux factures
    status_filter = request.GET.get('status', '')
    search_query = request.GET.get('q', '')
    supplier_filter = request.GET.get('supplier', '')

    # Query de base
    purchase_orders = PurchaseOrder.objects.select_related('supplier', 'created_by').order_by('-created_at')

    # Appliquer les filtres
    if status_filter:
        purchase_orders = purchase_orders.filter(status=status_filter)

    if search_query:
        purchase_orders = purchase_orders.filter(
            Q(po_number__icontains=search_query) |
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query)
        )

    if supplier_filter:
        purchase_orders = purchase_orders.filter(supplier_id=supplier_filter)

    # Pagination
    paginator = Paginator(purchase_orders, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Données pour les filtres
    suppliers = Supplier.objects.filter(is_active=True).order_by('name')
    status_counts = PurchaseOrder.objects.values('status').annotate(count=Count('id'))

    context = {
        'page_obj': page_obj,
        'status_filter': status_filter,
        'search_query': search_query,
        'supplier_filter': supplier_filter,
        'suppliers': suppliers,
        'status_counts': {stat['status']: stat['count'] for stat in status_counts},
    }

    return render(request, 'admin/purchase_orders.html', context)


@login_required
@user_passes_test(is_admin_or_manager)
def admin_suppliers(request):
    """Gestion des fournisseurs"""

    search_query = request.GET.get('q', '')
    active_filter = request.GET.get('active', 'all')

    # Query de base
    suppliers = Supplier.objects.all().order_by('name')

    # Appliquer les filtres
    if search_query:
        suppliers = suppliers.filter(
            Q(name__icontains=search_query) |
            Q(contact_person__icontains=search_query) |
            Q(email__icontains=search_query)
        )

    if active_filter == 'active':
        suppliers = suppliers.filter(is_active=True)
    elif active_filter == 'inactive':
        suppliers = suppliers.filter(is_active=False)

    # Pagination
    paginator = Paginator(suppliers, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'active_filter': active_filter,
        'total_suppliers': Supplier.objects.count(),
        'active_suppliers': Supplier.objects.filter(is_active=True).count(),
    }

    return render(request, 'admin/suppliers.html', context)


@login_required
@user_passes_test(is_admin_or_manager)
def admin_users(request):
    """Gestion des utilisateurs"""

    search_query = request.GET.get('q', '')
    role_filter = request.GET.get('role', '')
    active_filter = request.GET.get('active', 'all')

    # Query de base
    users = User.objects.all().order_by('-date_joined')

    # Appliquer les filtres
    if search_query:
        users = users.filter(
            Q(username__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query) |
            Q(email__icontains=search_query)
        )

    if role_filter:
        users = users.filter(role=role_filter)

    if active_filter == 'active':
        users = users.filter(is_active=True)
    elif active_filter == 'inactive':
        users = users.filter(is_active=False)

    # Pagination
    paginator = Paginator(users, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Statistiques
    role_counts = User.objects.values('role').annotate(count=Count('id'))

    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'role_filter': role_filter,
        'active_filter': active_filter,
        'role_counts': {stat['role']: stat['count'] for stat in role_counts},
        'total_users': User.objects.count(),
        'active_users': User.objects.filter(is_active=True).count(),
    }

    return render(request, 'admin/users.html', context)


@login_required
@user_passes_test(is_admin_or_manager)
def admin_settings(request):
    """Paramètres de l'application"""

    if request.method == 'POST':
        # Traitement des paramètres
        action = request.POST.get('action')

        if action == 'update_print_settings':
            # Mise à jour des paramètres d'impression
            config = PrintConfiguration.objects.filter(is_default=True).first()
            if config:
                config.paper_size = request.POST.get('paper_size', 'A4')
                config.orientation = request.POST.get('orientation', 'portrait')
                config.font_family = request.POST.get('font_family', 'Arial')
                config.save()
                messages.success(request, 'Paramètres d\'impression mis à jour avec succès.')

        elif action == 'update_company_info':
            # Mise à jour des informations entreprise dans OrganizationSettings
            if hasattr(request.user, 'organization') and request.user.organization:
                org_settings, _ = OrganizationSettings.objects.get_or_create(
                    organization=request.user.organization
                )
                org_settings.company_name = request.POST.get('company_name', '')
                org_settings.company_address = request.POST.get('company_address', '')
                org_settings.company_phone = request.POST.get('company_phone', '')
                org_settings.company_email = request.POST.get('company_email', '')
                org_settings.save()
                messages.success(request, 'Informations entreprise mises à jour avec succès.')
            else:
                messages.error(request, 'Aucune organisation associée à cet utilisateur.')

        return redirect('core:admin_settings')

    # Récupération des paramètres actuels
    print_config = PrintConfiguration.objects.filter(is_default=True).first()
    
    # Récupérer OrganizationSettings au lieu de PrintTemplate
    org_settings = None
    if hasattr(request.user, 'organization') and request.user.organization:
        org_settings = OrganizationSettings.objects.filter(
            organization=request.user.organization
        ).first()

    # Statistiques système
    system_stats = {
        'total_invoices': Invoice.objects.count(),
        'total_purchase_orders': PurchaseOrder.objects.count(),
        'total_suppliers': Supplier.objects.count(),
        'total_users': User.objects.count(),
        'total_print_history': PrintHistory.objects.count(),
        'database_size': '~15 MB',  # Placeholder
        'last_backup': 'Jamais',   # Placeholder
    }

    context = {
        'print_config': print_config,
        'org_settings': org_settings,
        'system_stats': system_stats,
    }

    return render(request, 'admin/settings.html', context)


@login_required
@user_passes_test(is_admin_or_manager)
def admin_analytics(request):
    """Analytics et rapports"""

    # Période sélectionnée
    period = request.GET.get('period', '30')  # 7, 30, 90, 365 jours

    end_date = timezone.now()
    start_date = end_date - timedelta(days=int(period))

    # Données pour les graphiques
    invoices_data = []
    pos_data = []

    for i in range(int(period)):
        date = start_date + timedelta(days=i)

        daily_invoices = Invoice.objects.filter(
            created_at__date=date.date()
        ).aggregate(
            count=Count('id'),
            total=Sum('total_amount')
        )

        daily_pos = PurchaseOrder.objects.filter(
            created_at__date=date.date()
        ).aggregate(
            count=Count('id'),
            total=Sum('total_amount')
        )

        invoices_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': daily_invoices['count'] or 0,
            'total': float(daily_invoices['total'] or 0)
        })

        pos_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': daily_pos['count'] or 0,
            'total': float(daily_pos['total'] or 0)
        })

    # Top fournisseurs
    top_suppliers = Supplier.objects.annotate(
        po_count=Count('purchaseorder'),
        po_total=Sum('purchaseorder__total_amount')
    ).order_by('-po_total')[:10]

    # Tendances
    current_period_total = Invoice.objects.filter(
        created_at__gte=start_date
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    previous_start = start_date - timedelta(days=int(period))
    previous_period_total = Invoice.objects.filter(
        created_at__gte=previous_start,
        created_at__lt=start_date
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    growth_rate = 0
    if previous_period_total > 0:
        growth_rate = ((current_period_total - previous_period_total) / previous_period_total) * 100

    context = {
        'period': period,
        'invoices_data': json.dumps(invoices_data),
        'pos_data': json.dumps(pos_data),
        'top_suppliers': top_suppliers,
        'current_period_total': current_period_total,
        'previous_period_total': previous_period_total,
        'growth_rate': round(growth_rate, 2),
        'start_date': start_date,
        'end_date': end_date,
    }

    return render(request, 'admin/analytics.html', context)


@login_required
@user_passes_test(is_admin_or_manager)
def admin_api_stats(request):
    """API pour les statistiques en temps réel"""

    stats = {
        'total_invoices': Invoice.objects.count(),
        'total_purchase_orders': PurchaseOrder.objects.count(),
        'total_suppliers': Supplier.objects.filter(is_active=True).count(),
        'monthly_revenue': float(Invoice.objects.filter(
            created_at__month=timezone.now().month
        ).aggregate(total=Sum('total_amount'))['total'] or 0),
        'pending_invoices': Invoice.objects.filter(status='sent').count(),
        'pending_pos': PurchaseOrder.objects.filter(status='pending').count(),
    }

    return JsonResponse(stats)