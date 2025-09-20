from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db.models import Q, Sum
from django.utils import timezone
from .models import PurchaseOrder, PurchaseOrderItem
from .forms import PurchaseOrderForm, PurchaseOrderItemForm, PurchaseOrderSearchForm
from apps.suppliers.models import Supplier
import json

@login_required
def purchase_order_list(request):
    """Liste des bons de commande avec recherche et filtres"""
    search_form = PurchaseOrderSearchForm(request.GET)
    purchase_orders = PurchaseOrder.objects.all().order_by('-created_at')
    
    if search_form.is_valid():
        if search_form.cleaned_data.get('search'):
            search_term = search_form.cleaned_data['search']
            purchase_orders = purchase_orders.filter(
                Q(po_number__icontains=search_term) |
                Q(title__icontains=search_term) |
                Q(description__icontains=search_term)
            )
        
        if search_form.cleaned_data.get('status'):
            purchase_orders = purchase_orders.filter(status=search_form.cleaned_data['status'])
        
        if search_form.cleaned_data.get('supplier'):
            purchase_orders = purchase_orders.filter(supplier=search_form.cleaned_data['supplier'])
        
        if search_form.cleaned_data.get('date_from'):
            purchase_orders = purchase_orders.filter(created_at__gte=search_form.cleaned_data['date_from'])
        
        if search_form.cleaned_data.get('date_to'):
            purchase_orders = purchase_orders.filter(created_at__lte=search_form.cleaned_data['date_to'])
    
    paginator = Paginator(purchase_orders, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'search_form': search_form,
        'total_count': purchase_orders.count(),
    }
    return render(request, 'purchase_orders/purchase_order_list.html', context)

@login_required
def purchase_order_detail(request, pk):
    """Détail d'un bon de commande"""
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    items = purchase_order.items.all()
    
    context = {
        'purchase_order': purchase_order,
        'items': items,
    }
    return render(request, 'purchase_orders/purchase_order_detail.html', context)

@login_required
def purchase_order_create(request):
    """Création d'un nouveau bon de commande"""
    if request.method == 'POST':
        form = PurchaseOrderForm(request.POST)
        if form.is_valid():
            purchase_order = form.save(commit=False)
            purchase_order.created_by = request.user
            purchase_order.save()
            messages.success(request, f'Bon de commande {purchase_order.po_number} créé avec succès.')
            return redirect('purchase_orders:purchase_order_detail', pk=purchase_order.pk)
    else:
        form = PurchaseOrderForm()
    
    context = {
        'form': form,
        'title': 'Nouveau Bon de Commande',
    }
    return render(request, 'purchase_orders/purchase_order_form.html', context)

@login_required
def purchase_order_edit(request, pk):
    """Modification d'un bon de commande"""
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    if request.method == 'POST':
        form = PurchaseOrderForm(request.POST, instance=purchase_order)
        if form.is_valid():
            form.save()
            messages.success(request, f'Bon de commande {purchase_order.po_number} modifié avec succès.')
            return redirect('purchase_orders:purchase_order_detail', pk=purchase_order.pk)
    else:
        form = PurchaseOrderForm(instance=purchase_order)
    
    context = {
        'form': form,
        'purchase_order': purchase_order,
        'title': f'Modifier {purchase_order.po_number}',
    }
    return render(request, 'purchase_orders/purchase_order_form.html', context)

@login_required
def purchase_order_delete(request, pk):
    """Suppression d'un bon de commande"""
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    if request.method == 'POST':
        po_number = purchase_order.po_number
        purchase_order.delete()
        messages.success(request, f'Bon de commande {po_number} supprimé avec succès.')
        return redirect('purchase_orders:purchase_order_list')
    
    context = {
        'purchase_order': purchase_order,
    }
    return render(request, 'purchase_orders/purchase_order_confirm_delete.html', context)

@login_required
def purchase_order_print(request, pk, template='standard'):
    """Impression d'un bon de commande"""
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    # Template mapping
    template_map = {
        'standard': 'purchase_orders/print/standard.html',
        'detailed': 'purchase_orders/print/detailed.html',
        'minimal': 'purchase_orders/print/minimal.html',
    }
    
    template_name = template_map.get(template, 'purchase_orders/print/standard.html')
    
    context = {
        'po': purchase_order,
        'template': template,
    }
    
    return render(request, template_name, context)

@login_required
def purchase_order_print_latest(request):
    """Impression du dernier bon de commande"""
    latest_po = PurchaseOrder.objects.order_by('-created_at').first()
    if latest_po:
        return redirect('purchase_orders:purchase_order_print', pk=latest_po.pk)
    else:
        messages.warning(request, 'Aucun bon de commande trouvé.')
        return redirect('purchase_orders:purchase_order_list')

@login_required
def purchase_order_print_template(request, template):
    """Impression avec un modèle spécifique"""
    # Cette vue peut être utilisée pour imprimer plusieurs BC avec le même modèle
    purchase_orders = PurchaseOrder.objects.filter(status='approved')[:5]  # Exemple
    
    context = {
        'purchase_orders': purchase_orders,
        'template': template,
    }
    
    return render(request, f'purchase_orders/print/batch_{template}.html', context)

@login_required
def purchase_order_item_add(request, po_pk):
    """Ajouter un item à un bon de commande"""
    purchase_order = get_object_or_404(PurchaseOrder, pk=po_pk)
    
    if request.method == 'POST':
        form = PurchaseOrderItemForm(request.POST)
        if form.is_valid():
            item = form.save(commit=False)
            item.purchase_order = purchase_order
            item.save()
            
            # Recalculer le total du bon de commande
            purchase_order.recalculate_totals()
            
            messages.success(request, 'Article ajouté avec succès.')
            return redirect('purchase_orders:purchase_order_detail', pk=purchase_order.pk)
    else:
        form = PurchaseOrderItemForm()
    
    context = {
        'form': form,
        'purchase_order': purchase_order,
    }
    return render(request, 'purchase_orders/purchase_order_item_form.html', context)

@login_required
def purchase_order_item_edit(request, pk):
    """Modifier un item de bon de commande"""
    item = get_object_or_404(PurchaseOrderItem, pk=pk)
    
    if request.method == 'POST':
        form = PurchaseOrderItemForm(request.POST, instance=item)
        if form.is_valid():
            form.save()
            
            # Recalculer le total du bon de commande
            item.purchase_order.recalculate_totals()
            
            messages.success(request, 'Article modifié avec succès.')
            return redirect('purchase_orders:purchase_order_detail', pk=item.purchase_order.pk)
    else:
        form = PurchaseOrderItemForm(instance=item)
    
    context = {
        'form': form,
        'item': item,
        'purchase_order': item.purchase_order,
    }
    return render(request, 'purchase_orders/purchase_order_item_form.html', context)

@login_required
def purchase_order_item_delete(request, pk):
    """Supprimer un item de bon de commande"""
    item = get_object_or_404(PurchaseOrderItem, pk=pk)
    purchase_order = item.purchase_order
    
    if request.method == 'POST':
        item.delete()
        
        # Recalculer le total du bon de commande
        purchase_order.recalculate_totals()
        
        messages.success(request, 'Article supprimé avec succès.')
        return redirect('purchase_orders:purchase_order_detail', pk=purchase_order.pk)
    
    context = {
        'item': item,
        'purchase_order': purchase_order,
    }
    return render(request, 'purchase_orders/purchase_order_item_confirm_delete.html', context)

@login_required
@require_http_methods(["POST"])
def purchase_order_bulk_action(request):
    """Actions en lot sur les bons de commande"""
    action = request.POST.get('action')
    po_ids = request.POST.getlist('po_ids')
    
    if not po_ids:
        messages.warning(request, 'Aucun bon de commande sélectionné.')
        return redirect('purchase_orders:purchase_order_list')
    
    purchase_orders = PurchaseOrder.objects.filter(pk__in=po_ids)
    
    if action == 'approve':
        purchase_orders.update(status='approved', approved_by=request.user)
        messages.success(request, f'{len(purchase_orders)} bon(s) de commande approuvé(s).')
    elif action == 'send':
        purchase_orders.update(status='sent')
        messages.success(request, f'{len(purchase_orders)} bon(s) de commande envoyé(s).')
    elif action == 'cancel':
        purchase_orders.update(status='cancelled')
        messages.success(request, f'{len(purchase_orders)} bon(s) de commande annulé(s).')
    elif action == 'delete':
        count = purchase_orders.count()
        purchase_orders.delete()
        messages.success(request, f'{count} bon(s) de commande supprimé(s).')
    
    return redirect('purchase_orders:purchase_order_list')

@login_required
def api_purchase_order_stats(request):
    """API pour les statistiques des bons de commande"""
    stats = {
        'total': PurchaseOrder.objects.count(),
        'draft': PurchaseOrder.objects.filter(status='draft').count(),
        'pending': PurchaseOrder.objects.filter(status='pending').count(),
        'approved': PurchaseOrder.objects.filter(status='approved').count(),
        'sent': PurchaseOrder.objects.filter(status='sent').count(),
        'received': PurchaseOrder.objects.filter(status='received').count(),
        'invoiced': PurchaseOrder.objects.filter(status='invoiced').count(),
        'cancelled': PurchaseOrder.objects.filter(status='cancelled').count(),
        'total_amount': PurchaseOrder.objects.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        'this_month': PurchaseOrder.objects.filter(
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year
        ).count(),
    }
    
    return JsonResponse(stats)