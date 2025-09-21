from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Supplier
from .forms import SupplierForm


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


@login_required
def supplier_create(request):
    """Création d'un nouveau fournisseur"""
    if request.method == 'POST':
        form = SupplierForm(request.POST)
        if form.is_valid():
            supplier = form.save()
            messages.success(request, f'Fournisseur "{supplier.name}" créé avec succès.')
            return redirect('suppliers:detail', supplier_id=supplier.id)
        else:
            messages.error(request, 'Erreurs dans le formulaire. Veuillez corriger et réessayer.')
    else:
        form = SupplierForm()
    
    context = {
        'form': form,
        'title': 'Nouveau Fournisseur'
    }
    return render(request, 'suppliers/supplier_form.html', context)


@login_required
def supplier_edit(request, supplier_id):
    """Modification d'un fournisseur"""
    supplier = get_object_or_404(Supplier, id=supplier_id)
    
    if request.method == 'POST':
        form = SupplierForm(request.POST, instance=supplier)
        if form.is_valid():
            supplier = form.save()
            messages.success(request, f'Fournisseur "{supplier.name}" modifié avec succès.')
            return redirect('suppliers:detail', supplier_id=supplier.id)
        else:
            messages.error(request, 'Erreurs dans le formulaire. Veuillez corriger et réessayer.')
    else:
        form = SupplierForm(instance=supplier)
    
    context = {
        'form': form,
        'supplier': supplier,
        'title': f'Modifier {supplier.name}'
    }
    return render(request, 'suppliers/supplier_form.html', context)


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
