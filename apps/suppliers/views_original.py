from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.utils.translation import gettext as _
from django.core.paginator import Paginator
from django.db.models import Q, Count, Avg, Sum
from django.urls import reverse
from django.views.generic import CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
import json

from .models import (
    Supplier, Product, Client, ProductCategory, 
    SupplierContact, SupplierDocument, SupplierPerformance
)
from .forms import (
    SupplierForm, ProductForm, ClientForm, ProductCategoryForm,
    SupplierContactForm, SupplierDocumentForm, SupplierSearchForm, ProductSearchForm
)


# ===== VUES FOURNISSEURS =====

@login_required
def supplier_list(request):
    """Liste des fournisseurs avec recherche et filtres"""
    
    form = SupplierSearchForm(request.GET)
    queryset = Supplier.objects.select_related().prefetch_related('categories')
    
    if form.is_valid():
        search = form.cleaned_data.get('search')
        status = form.cleaned_data.get('status')
        province = form.cleaned_data.get('province')
        category = form.cleaned_data.get('category')
        is_local = form.cleaned_data.get('is_local')
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(city__icontains=search) |
                Q(contact_person__icontains=search)
            )
        
        if status:
            queryset = queryset.filter(status=status)
        
        if province:
            queryset = queryset.filter(province=province)
        
        if category:
            queryset = queryset.filter(categories=category)
        
        if is_local:
            queryset = queryset.filter(is_local=True)
    
    # Statistiques
    stats = {
        'total_suppliers': queryset.count(),
        'active_suppliers': queryset.filter(status='active').count(),
        'pending_suppliers': queryset.filter(status='pending').count(),
        'avg_rating': queryset.filter(status='active').aggregate(
            avg_rating=Avg('rating')
        )['avg_rating'] or 0,
    }
    
    # Pagination
    paginator = Paginator(queryset.order_by('name'), 25)
    page_number = request.GET.get('page')
    suppliers = paginator.get_page(page_number)
    
    context = {
        'suppliers': suppliers,
        'form': form,
        'stats': stats,
        'can_add_supplier': request.user.role in ['admin', 'manager', 'buyer'],
    }
    
    return render(request, 'suppliers/supplier_list.html', context)


@login_required
def supplier_detail(request, pk):
    """Détail d'un fournisseur"""
    
    supplier = get_object_or_404(Supplier, pk=pk)
    
    # Contacts
    contacts = supplier.contacts.filter(is_active=True).order_by('-is_primary', 'name')
    
    # Documents
    documents = supplier.documents.order_by('-upload_date')[:10]
    
    # Produits récents
    recent_products = supplier.products.filter(is_available=True).order_by('-created_at')[:10]
    
    # Performance récente
    recent_performance = supplier.performance_records.order_by('-period_end').first()
    
    # Statistiques
    stats = {
        'total_products': supplier.products.count(),
        'active_products': supplier.products.filter(is_available=True).count(),
        'total_orders': 0,  # Sera calculé avec les bons de commande
        'avg_delivery_time': recent_performance.delivery_score if recent_performance else 0,
    }
    
    context = {
        'supplier': supplier,
        'contacts': contacts,
        'documents': documents,
        'recent_products': recent_products,
        'recent_performance': recent_performance,
        'stats': stats,
        'can_edit': request.user.role in ['admin', 'manager', 'buyer'],
    }
    
    return render(request, 'suppliers/supplier_detail.html', context)


@login_required
def supplier_create(request):
    """Création d'un nouveau fournisseur"""
    
    if request.user.role not in ['admin', 'manager', 'buyer']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('suppliers:list')
    
    if request.method == 'POST':
        form = SupplierForm(request.POST)
        if form.is_valid():
            supplier = form.save()
            messages.success(request, _('Fournisseur créé avec succès.'))
            return redirect('suppliers:detail', pk=supplier.pk)
    else:
        form = SupplierForm()
    
    context = {
        'form': form,
        'title': _('Nouveau fournisseur'),
    }
    
    return render(request, 'suppliers/supplier_form.html', context)


@login_required
def supplier_edit(request, pk):
    """Modification d'un fournisseur"""
    
    supplier = get_object_or_404(Supplier, pk=pk)
    
    if request.user.role not in ['admin', 'manager', 'buyer']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('suppliers:detail', pk=pk)
    
    if request.method == 'POST':
        form = SupplierForm(request.POST, instance=supplier)
        if form.is_valid():
            form.save()
            messages.success(request, _('Fournisseur modifié avec succès.'))
            return redirect('suppliers:detail', pk=pk)
    else:
        form = SupplierForm(instance=supplier)
    
    context = {
        'form': form,
        'supplier': supplier,
        'title': _('Modifier le fournisseur'),
    }
    
    return render(request, 'suppliers/supplier_form.html', context)


@login_required
def supplier_performance(request, pk):
    """Évaluation de performance d'un fournisseur"""
    
    supplier = get_object_or_404(Supplier, pk=pk)
    
    # Historique des performances
    performances = supplier.performance_records.order_by('-period_end')[:12]
    
    # Graphique des performances (données JSON pour Chart.js)
    performance_data = {
        'labels': [p.period_end.strftime('%m/%Y') for p in performances[:6]],
        'datasets': [
            {
                'label': _('Score global'),
                'data': [float(p.overall_score) for p in performances[:6]],
                'borderColor': 'rgb(75, 192, 192)',
                'tension': 0.1
            },
            {
                'label': _('Livraisons à temps'),
                'data': [float(p.delivery_score) for p in performances[:6]],
                'borderColor': 'rgb(255, 99, 132)',
                'tension': 0.1
            }
        ]
    }
    
    context = {
        'supplier': supplier,
        'performances': performances,
        'performance_data': json.dumps(performance_data),
    }
    
    return render(request, 'suppliers/supplier_performance.html', context)


# ===== VUES CATALOGUE/PRODUITS =====

@login_required
def product_catalog(request):
    """Catalogue de produits avec recherche"""
    
    form = ProductSearchForm(request.GET)
    queryset = Product.objects.select_related('supplier', 'category')
    
    if form.is_valid():
        search = form.cleaned_data.get('search')
        supplier = form.cleaned_data.get('supplier')
        category = form.cleaned_data.get('category')
        available_only = form.cleaned_data.get('available_only')
        min_price = form.cleaned_data.get('min_price')
        max_price = form.cleaned_data.get('max_price')
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(sku__icontains=search) |
                Q(description__icontains=search)
            )
        
        if supplier:
            queryset = queryset.filter(supplier=supplier)
        
        if category:
            queryset = queryset.filter(category=category)
        
        if available_only:
            queryset = queryset.filter(is_available=True)
        
        if min_price:
            queryset = queryset.filter(unit_price__gte=min_price)
        
        if max_price:
            queryset = queryset.filter(unit_price__lte=max_price)
    
    # Catégories populaires
    popular_categories = ProductCategory.objects.annotate(
        product_count=Count('product')
    ).filter(product_count__gt=0).order_by('-product_count')[:10]
    
    # Pagination
    paginator = Paginator(queryset.order_by('name'), 24)
    page_number = request.GET.get('page')
    products = paginator.get_page(page_number)
    
    context = {
        'products': products,
        'form': form,
        'popular_categories': popular_categories,
    }
    
    return render(request, 'suppliers/product_catalog.html', context)


@login_required
def product_detail(request, pk):
    """Détail d'un produit"""
    
    product = get_object_or_404(Product, pk=pk)
    
    # Produits similaires
    similar_products = Product.objects.filter(
        category=product.category,
        is_available=True
    ).exclude(pk=product.pk)[:6]
    
    # Historique des prix (simulé)
    price_history = [
        {'date': '2024-01', 'price': float(product.unit_price) * 0.95},
        {'date': '2024-02', 'price': float(product.unit_price) * 0.98},
        {'date': '2024-03', 'price': float(product.unit_price)},
    ]
    
    context = {
        'product': product,
        'similar_products': similar_products,
        'price_history': json.dumps(price_history),
        'can_order': request.user.role in ['admin', 'manager', 'buyer'],
    }
    
    return render(request, 'suppliers/product_detail.html', context)


@login_required
def product_create(request):
    """Création d'un nouveau produit"""
    
    if request.user.role not in ['admin', 'manager']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('suppliers:catalog')
    
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save()
            messages.success(request, _('Produit créé avec succès.'))
            return redirect('suppliers:product_detail', pk=product.pk)
    else:
        form = ProductForm()
    
    context = {
        'form': form,
        'title': _('Nouveau produit'),
    }
    
    return render(request, 'suppliers/product_form.html', context)


# ===== VUES CLIENTS =====

@login_required
def client_list(request):
    """Liste des clients"""
    
    search = request.GET.get('search', '')
    queryset = Client.objects.all()
    
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(email__icontains=search) |
            Q(contact_person__icontains=search)
        )
    
    # Pagination
    paginator = Paginator(queryset.order_by('name'), 25)
    page_number = request.GET.get('page')
    clients = paginator.get_page(page_number)
    
    context = {
        'clients': clients,
        'search': search,
        'can_add_client': request.user.role in ['admin', 'manager', 'accountant'],
    }
    
    return render(request, 'suppliers/client_list.html', context)


@login_required
def client_detail(request, pk):
    """Détail d'un client"""
    
    client = get_object_or_404(Client, pk=pk)
    
    # Statistiques factures (sera implémenté avec le module invoicing)
    stats = {
        'total_invoices': 0,
        'paid_invoices': 0,
        'outstanding_amount': 0,
        'avg_payment_days': 0,
    }
    
    context = {
        'client': client,
        'stats': stats,
        'can_edit': request.user.role in ['admin', 'manager', 'accountant'],
    }
    
    return render(request, 'suppliers/client_detail.html', context)


@login_required
def client_create(request):
    """Création d'un nouveau client"""
    
    if request.user.role not in ['admin', 'manager', 'accountant']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('suppliers:client_list')
    
    if request.method == 'POST':
        form = ClientForm(request.POST)
        if form.is_valid():
            client = form.save()
            messages.success(request, _('Client créé avec succès.'))
            return redirect('suppliers:client_detail', pk=client.pk)
    else:
        form = ClientForm()
    
    context = {
        'form': form,
        'title': _('Nouveau client'),
    }
    
    return render(request, 'suppliers/client_form.html', context)


# ===== VUES AJAX ET API =====

@login_required
def ajax_supplier_search(request):
    """Recherche AJAX de fournisseurs pour autocomplete"""
    
    query = request.GET.get('q', '')
    
    if len(query) < 2:
        return JsonResponse({'results': []})
    
    suppliers = Supplier.objects.filter(
        Q(name__icontains=query) |
        Q(contact_person__icontains=query),
        status='active'
    ).values('id', 'name', 'contact_person')[:10]
    
    results = [
        {
            'id': str(supplier['id']),
            'text': f"{supplier['name']} ({supplier['contact_person']})"
        }
        for supplier in suppliers
    ]
    
    return JsonResponse({'results': results})


@login_required
def ajax_supplier_products(request, supplier_id):
    """Obtenir les produits d'un fournisseur via AJAX"""
    
    try:
        supplier = Supplier.objects.get(id=supplier_id)
        products = supplier.products.filter(is_available=True).values(
            'id', 'name', 'sku', 'unit_price', 'lead_time_days'
        )[:20]
        
        return JsonResponse({
            'success': True,
            'products': list(products)
        })
        
    except Supplier.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': _('Fournisseur introuvable')
        })


@login_required
def catalog_search(request):
    """Recherche avancée dans le catalogue"""
    
    query = request.GET.get('q', '')
    category_id = request.GET.get('category', '')
    supplier_id = request.GET.get('supplier', '')
    
    products = Product.objects.filter(is_available=True)
    
    if query:
        products = products.filter(
            Q(name__icontains=query) |
            Q(sku__icontains=query) |
            Q(description__icontains=query)
        )
    
    if category_id:
        products = products.filter(category_id=category_id)
    
    if supplier_id:
        products = products.filter(supplier_id=supplier_id)
    
    # Pagination AJAX
    page = int(request.GET.get('page', 1))
    paginator = Paginator(products, 12)
    products_page = paginator.get_page(page)
    
    # Préparer les données pour JSON
    products_data = []
    for product in products_page:
        products_data.append({
            'id': str(product.id),
            'name': product.name,
            'sku': product.sku,
            'supplier': product.supplier.name,
            'price': float(product.unit_price.amount),
            'currency': str(product.unit_price.currency),
            'image_url': product.image.url if product.image else None,
            'url': reverse('suppliers:product_detail', args=[product.id])
        })
    
    return JsonResponse({
        'products': products_data,
        'has_next': products_page.has_next(),
        'has_previous': products_page.has_previous(),
        'page_number': products_page.number,
        'total_pages': paginator.num_pages,
        'total_results': paginator.count
    })


@login_required
@require_http_methods(["POST"])
def supplier_toggle_status(request, pk):
    """Activer/désactiver un fournisseur"""
    
    if request.user.role not in ['admin', 'manager']:
        return JsonResponse({'error': _('Accès non autorisé')}, status=403)
    
    try:
        supplier = Supplier.objects.get(pk=pk)
        
        if supplier.status == 'active':
            supplier.status = 'inactive'
            message = _('Fournisseur désactivé.')
        else:
            supplier.status = 'active'
            message = _('Fournisseur activé.')
        
        supplier.save()
        
        return JsonResponse({
            'success': True,
            'message': message,
            'status': supplier.status
        })
        
    except Supplier.DoesNotExist:
        return JsonResponse({'error': _('Fournisseur introuvable')}, status=404)


# ===== VUES UTILITAIRES =====

@login_required
def supplier_evaluation(request):
    """Interface d'évaluation des fournisseurs"""
    
    if request.user.role not in ['admin', 'manager']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('suppliers:list')
    
    # Top 10 des fournisseurs par performance
    top_suppliers = Supplier.objects.filter(
        status='active'
    ).order_by('-ai_performance_score')[:10]
    
    # Fournisseurs nécessitant une attention
    attention_suppliers = Supplier.objects.filter(
        status='active',
        ai_performance_score__lt=60
    ).order_by('ai_performance_score')[:10]
    
    context = {
        'top_suppliers': top_suppliers,
        'attention_suppliers': attention_suppliers,
    }
    
    return render(request, 'suppliers/supplier_evaluation.html', context)


@login_required
def import_suppliers(request):
    """Import de fournisseurs via CSV"""
    
    if request.user.role not in ['admin', 'manager']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('suppliers:list')
    
    if request.method == 'POST':
        # Logique d'import CSV
        # TODO: Implémenter avec django-import-export
        messages.success(request, _('Import en cours de traitement.'))
        return redirect('suppliers:list')
    
    return render(request, 'suppliers/import_suppliers.html')


@login_required
def export_suppliers(request):
    """Export de fournisseurs vers CSV/Excel"""
    
    # TODO: Implémenter avec django-import-export
    from django.http import HttpResponse
    import csv
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="fournisseurs.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Nom', 'Email', 'Téléphone', 'Ville', 'Province', 
        'Statut', 'Note', 'Date création'
    ])
    
    suppliers = Supplier.objects.all()
    for supplier in suppliers:
        writer.writerow([
            supplier.name,
            supplier.email,
            supplier.phone,
            supplier.city,
            supplier.get_province_display(),
            supplier.get_status_display(),
            supplier.rating,
            supplier.created_at.strftime('%Y-%m-%d')
        ])
    
    return response