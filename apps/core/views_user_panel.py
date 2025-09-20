"""
Panel utilisateur simple et compact - Interface principale de l'application
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta
import json

from django.contrib.auth import get_user_model
from apps.invoicing.models import Invoice, InvoiceItem
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from apps.suppliers.models import Supplier

User = get_user_model()


@login_required
def user_dashboard(request):
    """Dashboard principal utilisateur - Interface simple et compacte"""

    # Statistiques de base pour l'utilisateur
    user_invoices = Invoice.objects.filter(created_by=request.user)
    user_pos = PurchaseOrder.objects.filter(created_by=request.user)

    # Stats rapides
    stats = {
        'total_invoices': user_invoices.count(),
        'total_purchase_orders': user_pos.count(),
        'total_suppliers': Supplier.objects.filter(is_active=True).count(),
        'monthly_revenue': user_invoices.filter(
            created_at__month=timezone.now().month
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
    }

    # Activités récentes (2 dernières pour mobile compact)
    recent_invoices = user_invoices.order_by('-created_at')[:2]
    recent_pos = user_pos.order_by('-created_at')[:2]

    # Factures par statut
    invoice_stats = user_invoices.values('status').annotate(count=Count('id'))
    invoice_by_status = {stat['status']: stat['count'] for stat in invoice_stats}

    context = {
        'stats': stats,
        'recent_invoices': recent_invoices,
        'recent_purchase_orders': recent_pos,
        'invoice_by_status': invoice_by_status,
    }

    return render(request, 'core/user_panel_tailwind.html', context)


@login_required
def user_invoices(request):
    """Liste des factures de l'utilisateur - Vue simple"""

    # Filtres simples
    status_filter = request.GET.get('status', '')
    search_query = request.GET.get('q', '')

    # Factures de l'utilisateur
    invoices = Invoice.objects.filter(created_by=request.user).order_by('-created_at')

    # Appliquer les filtres
    if status_filter:
        invoices = invoices.filter(status=status_filter)

    if search_query:
        invoices = invoices.filter(
            Q(invoice_number__icontains=search_query) |
            Q(title__icontains=search_query)
        )

    # Pagination simple
    paginator = Paginator(invoices, 10)  # 10 par page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Stats pour les filtres
    all_invoices = Invoice.objects.filter(created_by=request.user)
    status_counts = all_invoices.values('status').annotate(count=Count('id'))

    context = {
        'page_obj': page_obj,
        'status_filter': status_filter,
        'search_query': search_query,
        'status_counts': {stat['status']: stat['count'] for stat in status_counts},
        'total_count': all_invoices.count(),
    }

    return render(request, 'core/user_invoices_tailwind.html', context)


@login_required
def user_purchase_orders(request):
    """Liste des bons de commande de l'utilisateur - Vue simple"""

    # Filtres simples
    status_filter = request.GET.get('status', '')
    search_query = request.GET.get('q', '')

    # Bons de commande de l'utilisateur
    purchase_orders = PurchaseOrder.objects.filter(created_by=request.user).select_related('supplier').order_by('-created_at')

    # Appliquer les filtres
    if status_filter:
        purchase_orders = purchase_orders.filter(status=status_filter)

    if search_query:
        purchase_orders = purchase_orders.filter(
            Q(po_number__icontains=search_query) |
            Q(title__icontains=search_query)
        )

    # Pagination simple
    paginator = Paginator(purchase_orders, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Stats
    all_pos = PurchaseOrder.objects.filter(created_by=request.user)
    status_counts = all_pos.values('status').annotate(count=Count('id'))

    context = {
        'page_obj': page_obj,
        'status_filter': status_filter,
        'search_query': search_query,
        'status_counts': {stat['status']: stat['count'] for stat in status_counts},
    }

    return render(request, 'core/user_purchase_orders_tailwind.html', context)


@login_required
def user_suppliers(request):
    """Liste des fournisseurs - Vue simple"""

    search_query = request.GET.get('q', '')
    active_filter = request.GET.get('active', 'all')

    # Tous les fournisseurs (pas limité à l'utilisateur)
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
    paginator = Paginator(suppliers, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    total_suppliers = Supplier.objects.count()
    active_suppliers = Supplier.objects.filter(is_active=True).count()
    inactive_suppliers = total_suppliers - active_suppliers

    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'active_filter': active_filter,
        'total_suppliers': total_suppliers,
        'active_suppliers': active_suppliers,
        'inactive_suppliers': inactive_suppliers,
    }

    return render(request, 'core/user_suppliers_tailwind.html', context)


@login_required
def quick_stats_api(request):
    """API pour les stats rapides"""

    user_invoices = Invoice.objects.filter(created_by=request.user)
    user_pos = PurchaseOrder.objects.filter(created_by=request.user)

    stats = {
        'invoices_count': user_invoices.count(),
        'invoices_total': float(user_invoices.aggregate(total=Sum('total_amount'))['total'] or 0),
        'pos_count': user_pos.count(),
        'pos_total': float(user_pos.aggregate(total=Sum('total_amount'))['total'] or 0),
        'suppliers_count': Supplier.objects.filter(is_active=True).count(),
        'recent_invoices': list(user_invoices.order_by('-created_at')[:3].values(
            'invoice_number', 'title', 'total_amount', 'status', 'created_at'
        )),
    }

    return JsonResponse(stats)