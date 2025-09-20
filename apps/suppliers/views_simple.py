from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Supplier


@login_required
def supplier_list(request):
    """Liste des fournisseurs"""
    suppliers = Supplier.objects.filter(is_active=True).order_by('name')
    
    context = {
        'suppliers': suppliers,
        'title': 'Fournisseurs'
    }
    return render(request, 'suppliers/list.html', context)


@login_required
def supplier_detail(request, supplier_id):
    """Détail d'un fournisseur"""
    supplier = get_object_or_404(Supplier, id=supplier_id)
    
    context = {
        'supplier': supplier,
        'title': supplier.name
    }
    return render(request, 'suppliers/detail.html', context)


# API Views
@login_required
def api_suppliers(request):
    """API pour les fournisseurs"""
    suppliers = Supplier.objects.filter(is_active=True)[:10]
    data = []
    
    for supplier in suppliers:
        data.append({
            'id': str(supplier.id),
            'name': supplier.name,
            'contact_person': supplier.contact_person,
            'email': supplier.email,
            'phone': supplier.phone,
            'is_active': supplier.is_active,
        })
    
    return JsonResponse({'suppliers': data})
