from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from .models import PurchaseOrder, PurchaseOrderItem


@login_required
def purchase_order_list(request):
    """Liste des bons de commande"""
    pos = PurchaseOrder.objects.all().order_by('-created_at')
    
    # Pagination
    paginator = Paginator(pos, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'title': 'Bons de commande'
    }
    return render(request, 'purchase_orders/list.html', context)


@login_required
def purchase_order_detail(request, po_id):
    """Détail d'un bon de commande"""
    po = get_object_or_404(PurchaseOrder, id=po_id)
    items = PurchaseOrderItem.objects.filter(purchase_order=po)
    
    context = {
        'purchase_order': po,
        'items': items,
        'title': f'BC {po.po_number}'
    }
    return render(request, 'purchase_orders/detail.html', context)


@login_required
def purchase_order_create(request):
    """Créer un nouveau bon de commande"""
    if request.method == 'POST':
        # Logique de création simplifiée
        messages.success(request, 'Bon de commande créé avec succès !')
        return redirect('purchase_orders:list')
    
    context = {
        'title': 'Nouveau bon de commande'
    }
    return render(request, 'purchase_orders/create.html', context)


# API Views
@login_required
def api_purchase_orders(request):
    """API pour les bons de commande"""
    pos = PurchaseOrder.objects.all()[:10]
    data = []
    
    for po in pos:
        data.append({
            'id': str(po.id),
            'po_number': po.po_number,
            'title': po.title,
            'status': po.status,
            'total_amount': float(po.total_amount),
            'created_at': po.created_at.isoformat(),
        })
    
    return JsonResponse({'purchase_orders': data})


@login_required
def api_purchase_order_detail(request, po_id):
    """API détail d'un bon de commande"""
    try:
        po = PurchaseOrder.objects.get(id=po_id)
        items = PurchaseOrderItem.objects.filter(purchase_order=po)
        
        data = {
            'id': str(po.id),
            'po_number': po.po_number,
            'title': po.title,
            'status': po.status,
            'total_amount': float(po.total_amount),
            'created_at': po.created_at.isoformat(),
            'items': [
                {
                    'id': str(item.id),
                    'product_code': item.product_code,
                    'description': item.description,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                }
                for item in items
            ]
        }
        
        return JsonResponse(data)
    except PurchaseOrder.DoesNotExist:
        return JsonResponse({'error': 'Bon de commande non trouvé'}, status=404)
