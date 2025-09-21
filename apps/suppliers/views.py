from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.db.models import Q, Count, Avg
import csv
from .models import Supplier
from .forms import SupplierForm


@login_required
def supplier_list(request):
    """Liste des fournisseurs"""
    suppliers = Supplier.objects.all().order_by('name')
    
    # Filtrage par recherche
    search_query = request.GET.get('search', '')
    if search_query:
        suppliers = suppliers.filter(
            Q(name__icontains=search_query) |
            Q(contact_person__icontains=search_query) |
            Q(email__icontains=search_query)
        )
    
    # Filtrage par statut
    status = request.GET.get('status')
    if status:
        suppliers = suppliers.filter(status=status)
    
    # Pagination
    paginator = Paginator(suppliers, 12)  # 12 fournisseurs par page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Statistiques
    stats = {
        'total_suppliers': Supplier.objects.count(),
        'active_suppliers': Supplier.objects.filter(status='active').count(),
        'pending_suppliers': Supplier.objects.filter(status='pending').count(),
        'avg_rating': Supplier.objects.aggregate(Avg('rating'))['rating__avg'] or 0
    }
    
    context = {
        'suppliers': page_obj,
        'title': 'Fournisseurs',
        'stats': stats,
        'can_add_supplier': True,  # À adapter selon les permissions
        'form': {'search': search_query, 'status': status}  # Pour pré-remplir les filtres
    }
    return render(request, 'suppliers/supplier_list.html', context)


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


@login_required
def supplier_import(request):
    """Import de fournisseurs depuis un fichier CSV"""
    if request.method == 'POST' and request.FILES.get('csv_file'):
        csv_file = request.FILES['csv_file']
        if not csv_file.name.endswith('.csv'):
            messages.error(request, 'Le fichier doit être au format CSV.')
            return redirect('suppliers:list')
        
        try:
            # Lecture du fichier CSV
            decoded_file = csv_file.read().decode('utf-8').splitlines()
            reader = csv.DictReader(decoded_file)
            
            count = 0
            for row in reader:
                # Création du fournisseur si n'existe pas
                supplier, created = Supplier.objects.get_or_create(
                    email=row.get('email', ''),
                    defaults={
                        'name': row.get('name', ''),
                        'contact_person': row.get('contact_person', ''),
                        'phone': row.get('phone', ''),
                        'address': row.get('address', ''),
                        'city': row.get('city', ''),
                        'status': row.get('status', 'pending'),
                    }
                )
                if created:
                    count += 1
            
            messages.success(request, f'{count} fournisseurs importés avec succès.')
        except Exception as e:
            messages.error(request, f'Erreur lors de l\'import : {str(e)}')
        
        return redirect('suppliers:list')
    
    return render(request, 'suppliers/import.html', {'title': 'Importer des fournisseurs'})


@login_required
def supplier_export(request):
    """Export des fournisseurs en CSV"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="fournisseurs.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Nom', 'Contact', 'Email', 'Téléphone', 'Ville', 'Statut', 'Note'])
    
    suppliers = Supplier.objects.all().order_by('name')
    for supplier in suppliers:
        writer.writerow([
            supplier.name,
            supplier.contact_person,
            supplier.email,
            supplier.phone,
            supplier.city,
            supplier.get_status_display(),
            supplier.rating
        ])
    
    return response


@login_required
@require_POST
def supplier_toggle_status(request, supplier_id):
    """Activer/Désactiver un fournisseur"""
    supplier = get_object_or_404(Supplier, id=supplier_id)
    
    # Toggle status
    if supplier.status == 'active':
        supplier.status = 'inactive'
        message = f'Fournisseur "{supplier.name}" désactivé.'
    else:
        supplier.status = 'active'
        message = f'Fournisseur "{supplier.name}" activé.'
    
    supplier.save()
    messages.success(request, message)
    
    # Redirection selon d'où vient la requête
    next_url = request.POST.get('next', 'suppliers:list')
    return redirect(next_url)
