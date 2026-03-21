from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db.models import Q, Sum
from django.utils import timezone
from .models import Product, ProductBatch, ProductCategory, StockMovement, Invoice, InvoiceItem
from .forms_simple import InvoiceForm, InvoiceItemForm, InvoiceItemFormSet, InvoiceSearchForm
import json

User = get_user_model()

@login_required
def invoice_list(request):
    """Liste des factures avec recherche et filtres"""
    search_form = InvoiceSearchForm(request.GET)
    invoices = Invoice.objects.all().order_by('-created_at')
    
    if search_form.is_valid():
        if search_form.cleaned_data.get('search'):
            search_term = search_form.cleaned_data['search']
            invoices = invoices.filter(
                Q(invoice_number__icontains=search_term) |
                Q(title__icontains=search_term) |
                Q(description__icontains=search_term)
            )
        
        if search_form.cleaned_data.get('status'):
            invoices = invoices.filter(status=search_form.cleaned_data['status'])
        
        if search_form.cleaned_data.get('date_from'):
            invoices = invoices.filter(created_at__gte=search_form.cleaned_data['date_from'])
        
        if search_form.cleaned_data.get('date_to'):
            invoices = invoices.filter(created_at__lte=search_form.cleaned_data['date_to'])
    
    paginator = Paginator(invoices, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'search_form': search_form,
        'total_count': invoices.count(),
    }
    return render(request, 'invoicing/invoice_list.html', context)

@login_required
def invoice_detail(request, pk):
    """Détail d'une facture"""
    invoice = get_object_or_404(Invoice, pk=pk)
    items = invoice.items.all()
    
    context = {
        'invoice': invoice,
        'items': items,
    }
    return render(request, 'invoicing/invoice_detail.html', context)

@login_required
def invoice_create(request):
    """Création d'une nouvelle facture avec éléments multiples"""
    if request.method == 'POST':
        form = InvoiceForm(request.POST)
        formset = InvoiceItemFormSet(request.POST)
        
        if form.is_valid() and formset.is_valid():
            # Créer la facture
            invoice = form.save(commit=False)
            invoice.created_by = request.user
            
            # Initialiser les totaux
            invoice.subtotal = 0
            invoice.total_amount = 0
            invoice.save()
            
            # Sauvegarder les éléments
            formset.instance = invoice
            items = formset.save()
            
            # Déterminer le statut selon l'action
            action = request.POST.get('action', 'save_draft')
            if action == 'save_and_send':
                invoice.status = 'sent'
            else:
                invoice.status = 'draft'
            
            # Recalculer les totaux
            invoice.recalculate_totals()
            invoice.save()
            
            messages.success(request, f'Facture {invoice.invoice_number} créée avec succès avec {len(items)} élément(s).')
            return redirect('invoicing:invoice_detail', pk=invoice.pk)
        else:
            # Afficher les erreurs
            if form.errors:
                messages.error(request, 'Erreurs dans les informations de la facture.')
            if formset.errors:
                messages.error(request, 'Erreurs dans les éléments de la facture.')
    else:
        form = InvoiceForm()
        formset = InvoiceItemFormSet()
    
    # Récupérer les produits et clients pour l'interface
    products = Product.objects.filter(is_active=True).order_by('name')
    clients = User.objects.filter(is_staff=False, is_active=True).order_by('first_name', 'last_name')
    
    # Sérialiser les données pour JavaScript
    products_data = []
    for product in products:
        # Lots disponibles pour les produits physiques
        batches_data = []
        if product.product_type == 'physical':
            from django.utils import timezone as _tz
            _today = _tz.now().date()
            for b in product.batches.filter(is_active=True, current_quantity__gt=0).order_by('expiration_date'):
                batches_data.append({
                    'id': str(b.id),
                    'batch_number': b.batch_number,
                    'current_quantity': b.current_quantity,
                    'expiration_date': b.expiration_date.isoformat() if b.expiration_date else None,
                    'is_expired': b.is_expired,
                    'is_expiring_soon': b.is_expiring_soon,
                })
        products_data.append({
            'id': str(product.id),
            'name': product.name,
            'description': product.description,
            'reference': product.reference,
            'product_type': product.product_type,
            'price': float(product.price),
            'stock_quantity': product.stock_quantity,
            'low_stock_threshold': product.low_stock_threshold,
            'is_active': product.is_active,
            'batches': batches_data,
        })
    
    clients_data = []
    for client in clients:
        clients_data.append({
            'id': str(client.id),
            'username': client.username,
            'first_name': client.first_name or '',
            'last_name': client.last_name or '',
            'email': client.email or '',
        })
    
    context = {
        'form': form,
        'formset': formset,
        'products': products,
        'clients': clients,
        'products_json': json.dumps(products_data),
        'clients_json': json.dumps(clients_data),
        'title': 'Nouvelle Facture Intelligente',
    }
    return render(request, 'invoicing/invoice_form_compact.html', context)

@login_required
def invoice_edit(request, pk):
    """Modification d'une facture avec ses éléments"""
    invoice = get_object_or_404(Invoice, pk=pk)
    
    # Vérifier si la facture peut être modifiée
    if not invoice.can_be_edited():
        messages.warning(request, f'La facture {invoice.invoice_number} ne peut plus être modifiée car son statut est "{invoice.get_status_display()}".')
        return redirect('invoicing:invoice_detail', pk=invoice.pk)
    
    if request.method == 'POST':
        form = InvoiceForm(request.POST, instance=invoice)
        formset = InvoiceItemFormSet(request.POST, instance=invoice)
        
        if form.is_valid() and formset.is_valid():
            # Sauvegarder la facture
            invoice = form.save()
            
            # Sauvegarder les éléments
            items = formset.save()
            
            # Déterminer le statut selon l'action
            action = request.POST.get('action', 'save_draft')
            if action == 'save_and_send':
                invoice.status = 'sent'
                invoice.save()
            
            # Recalculer les totaux
            invoice.recalculate_totals()
            
            messages.success(request, f'Facture {invoice.invoice_number} modifiée avec succès. {len(items)} élément(s) sauvegardé(s).')
            return redirect('invoicing:invoice_detail', pk=invoice.pk)
        else:
            # Afficher les erreurs
            if form.errors:
                messages.error(request, 'Erreurs dans les informations de la facture.')
            if formset.errors:
                messages.error(request, 'Erreurs dans les éléments de la facture.')
    else:
        form = InvoiceForm(instance=invoice)
        formset = InvoiceItemFormSet(instance=invoice)
    
    context = {
        'form': form,
        'formset': formset,
        'invoice': invoice,
        'title': f'Modifier {invoice.invoice_number}',
    }
    return render(request, 'invoicing/invoice_form.html', context)

@login_required
def invoice_delete(request, pk):
    """Suppression d'une facture"""
    invoice = get_object_or_404(Invoice, pk=pk)
    
    if request.method == 'POST':
        invoice_number = invoice.invoice_number
        invoice.delete()
        messages.success(request, f'Facture {invoice_number} supprimée avec succès.')
        return redirect('invoicing:invoice_list')
    
    context = {
        'invoice': invoice,
    }
    return render(request, 'invoicing/invoice_confirm_delete.html', context)

@login_required
def invoice_print(request, pk, template='standard'):
    """Impression d'une facture"""
    invoice = get_object_or_404(Invoice, pk=pk)
    
    # Template mapping
    template_map = {
        'standard': 'invoicing/print/standard.html',
        'detailed': 'invoicing/print/detailed.html',
        'minimal': 'invoicing/print/minimal.html',
    }
    
    template_name = template_map.get(template, 'invoicing/print/standard.html')
    
    context = {
        'invoice': invoice,
        'template': template,
    }
    
    return render(request, template_name, context)

@login_required
def invoice_print_latest(request):
    """Impression de la dernière facture"""
    latest_invoice = Invoice.objects.order_by('-created_at').first()
    if latest_invoice:
        return redirect('invoicing:invoice_print', pk=latest_invoice.pk)
    else:
        messages.warning(request, 'Aucune facture trouvée.')
        return redirect('invoicing:invoice_list')

@login_required
def invoice_print_template(request, template):
    """Impression avec un modèle spécifique"""
    # Cette vue peut être utilisée pour imprimer plusieurs factures avec le même modèle
    invoices = Invoice.objects.filter(status='sent')[:5]  # Exemple
    
    context = {
        'invoices': invoices,
        'template': template,
    }
    
    return render(request, f'invoicing/print/batch_{template}.html', context)

@login_required
def invoice_item_add(request, invoice_pk):
    """Ajouter un item à une facture"""
    invoice = get_object_or_404(Invoice, pk=invoice_pk)
    
    # Vérifier si la facture peut être modifiée
    if not invoice.can_be_edited():
        messages.warning(request, f'La facture {invoice.invoice_number} ne peut plus être modifiée car son statut est "{invoice.get_status_display()}".')
        return redirect('invoicing:invoice_detail', pk=invoice.pk)
    
    if request.method == 'POST':
        form = InvoiceItemForm(request.POST)
        if form.is_valid():
            item = form.save(commit=False)
            item.invoice = invoice
            item.save()
            
            # Recalculer le total de la facture
            invoice.recalculate_totals()
            
            # Gérer les actions
            action = request.POST.get('action', 'save')
            if action == 'save_and_add':
                messages.success(request, 'Élément ajouté avec succès. Vous pouvez en ajouter un autre.')
                return redirect('invoicing:invoice_item_add', invoice_pk=invoice.pk)
            else:
                messages.success(request, f'Élément "{item.description}" ajouté avec succès.')
                return redirect('invoicing:invoice_detail', pk=invoice.pk)
        else:
            messages.error(request, 'Erreurs dans le formulaire. Veuillez corriger et réessayer.')
    else:
        form = InvoiceItemForm()
    
    context = {
        'form': form,
        'invoice': invoice,
        'title': f'Ajouter un élément - {invoice.invoice_number}',
    }
    return render(request, 'invoicing/invoice_item_form.html', context)

@login_required
def invoice_item_edit(request, pk):
    """Modifier un item de facture"""
    item = get_object_or_404(InvoiceItem, pk=pk)
    invoice = item.invoice
    
    # Vérifier si la facture peut être modifiée
    if not invoice.can_be_edited():
        messages.warning(request, f'La facture {invoice.invoice_number} ne peut plus être modifiée car son statut est "{invoice.get_status_display()}".')
        return redirect('invoicing:invoice_detail', pk=invoice.pk)
    
    if request.method == 'POST':
        form = InvoiceItemForm(request.POST, instance=item)
        if form.is_valid():
            updated_item = form.save()
            
            # Recalculer le total de la facture
            invoice.recalculate_totals()
            
            messages.success(request, f'Élément "{updated_item.description}" modifié avec succès.')
            return redirect('invoicing:invoice_detail', pk=invoice.pk)
        else:
            messages.error(request, 'Erreurs dans le formulaire. Veuillez corriger et réessayer.')
    else:
        form = InvoiceItemForm(instance=item)
    
    context = {
        'form': form,
        'item': item,
        'invoice': invoice,
        'title': f'Modifier l\'élément - {invoice.invoice_number}',
    }
    return render(request, 'invoicing/invoice_item_form.html', context)

@login_required
def invoice_item_delete(request, pk):
    """Supprimer un item de facture"""
    item = get_object_or_404(InvoiceItem, pk=pk)
    invoice = item.invoice
    
    # Vérifier si la facture peut être modifiée
    if not invoice.can_be_edited():
        messages.warning(request, f'La facture {invoice.invoice_number} ne peut plus être modifiée car son statut est "{invoice.get_status_display()}".')
        return redirect('invoicing:invoice_detail', pk=invoice.pk)
    
    if request.method == 'POST':
        item_description = item.description
        item.delete()
        
        # Recalculer le total de la facture
        invoice.recalculate_totals()
        
        # Vérifier si la facture n'a plus d'éléments
        if not invoice.has_items():
            messages.warning(request, f'Élément "{item_description}" supprimé. La facture n\'a plus d\'éléments. Veuillez en ajouter ou supprimer la facture.')
        else:
            messages.success(request, f'Élément "{item_description}" supprimé avec succès.')
        
        return redirect('invoicing:invoice_detail', pk=invoice.pk)
    
    context = {
        'item': item,
        'invoice': invoice,
    }
    return render(request, 'invoicing/invoice_item_confirm_delete.html', context)

@login_required
@require_http_methods(["POST"])
def invoice_bulk_action(request):
    """Actions en lot sur les factures"""
    action = request.POST.get('action')
    invoice_ids = request.POST.getlist('invoice_ids')
    
    if not invoice_ids:
        messages.warning(request, 'Aucune facture sélectionnée.')
        return redirect('invoicing:invoice_list')
    
    invoices = Invoice.objects.filter(pk__in=invoice_ids)
    
    if action == 'send':
        invoices.update(status='sent')
        messages.success(request, f'{len(invoices)} facture(s) envoyée(s).')
    elif action == 'mark_paid':
        invoices.update(status='paid')
        messages.success(request, f'{len(invoices)} facture(s) marquée(s) comme payée(s).')
    elif action == 'cancel':
        invoices.update(status='cancelled')
        messages.success(request, f'{len(invoices)} facture(s) annulée(s).')
    elif action == 'delete':
        count = invoices.count()
        invoices.delete()
        messages.success(request, f'{count} facture(s) supprimée(s).')
    
    return redirect('invoicing:invoice_list')

@login_required
def api_invoice_stats(request):
    """API pour les statistiques des factures"""
    stats = {
        'total': Invoice.objects.count(),
        'draft': Invoice.objects.filter(status='draft').count(),
        'sent': Invoice.objects.filter(status='sent').count(),
        'paid': Invoice.objects.filter(status='paid').count(),
        'overdue': Invoice.objects.filter(status='overdue').count(),
        'cancelled': Invoice.objects.filter(status='cancelled').count(),
        'total_amount': Invoice.objects.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        'this_month': Invoice.objects.filter(
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year
        ).count(),
    }
    
    return JsonResponse(stats)


# =============================================
# VUES PRODUITS
# =============================================

@login_required
def product_list(request):
    """Liste des produits avec recherche et filtres"""
    products = Product.objects.all().order_by('name')

    search = request.GET.get('search', '')
    product_type = request.GET.get('type', '')
    stock_status = request.GET.get('stock', '')

    if search:
        products = products.filter(Q(name__icontains=search) | Q(reference__icontains=search))
    if product_type:
        products = products.filter(product_type=product_type)
    if stock_status == 'low':
        # low stock: physical with quantity <= threshold
        products = [p for p in products if p.product_type == 'physical' and p.is_low_stock]
        total_count = len(products)
    elif stock_status == 'out':
        products = [p for p in products if p.product_type == 'physical' and p.is_out_of_stock]
        total_count = len(products)
    else:
        total_count = products.count()

    # Stats
    from django.utils import timezone as tz
    all_products = Product.objects.all()
    total_products = all_products.count()
    physical_products = all_products.filter(product_type='physical')
    low_stock_count = sum(1 for p in physical_products if p.is_low_stock)
    out_stock_count = sum(1 for p in physical_products if p.is_out_of_stock)
    expired_batches = ProductBatch.objects.filter(
        expiration_date__lt=tz.now().date(),
        current_quantity__gt=0,
        is_active=True
    ).count()

    paginator = Paginator(products, 20)
    page_obj = paginator.get_page(request.GET.get('page'))

    context = {
        'page_obj': page_obj,
        'search': search,
        'product_type': product_type,
        'stock_status': stock_status,
        'total_count': total_count,
        'total_products': total_products,
        'low_stock_count': low_stock_count,
        'out_stock_count': out_stock_count,
        'expired_batches': expired_batches,
    }
    return render(request, 'invoicing/product_list.html', context)


@login_required
def product_create(request):
    """Création d'un produit (2 étapes pour physique, 1 étape pour service/digital)"""
    if request.method == 'POST':
        from django import forms as dj_forms
        product_type = request.POST.get('product_type', 'physical')

        # Construct product from POST
        try:
            name = request.POST.get('name', '').strip()
            description = request.POST.get('description', '').strip()
            reference = request.POST.get('reference', '').strip() or None
            price = request.POST.get('price', '0')
            cost_price = request.POST.get('cost_price', '0')
            price_editable = request.POST.get('price_editable') == 'on'
            low_stock_threshold = int(request.POST.get('low_stock_threshold', 5)) if product_type == 'physical' else 0
            category_id = request.POST.get('category') or None
            is_active = request.POST.get('is_active') == 'on'

            if not name:
                messages.error(request, 'Le nom du produit est requis.')
                return _render_product_form(request)

            # Create product
            product = Product(
                name=name,
                description=description,
                reference=reference,
                product_type=product_type,
                price=price,
                cost_price=cost_price,
                price_editable=price_editable,
                is_active=is_active,
            )
            if product_type == 'physical':
                product.stock_quantity = 0  # stock via lots uniquement
                product.low_stock_threshold = low_stock_threshold
            if category_id:
                try:
                    product.category = ProductCategory.objects.get(id=category_id)
                except ProductCategory.DoesNotExist:
                    pass

            product.save()

            # Étape 2: créer un lot initial si produit physique
            if product_type == 'physical':
                batch_number = request.POST.get('batch_number', '').strip()
                initial_qty = request.POST.get('initial_quantity', '0')
                expiration_date = request.POST.get('expiration_date', '').strip() or None
                batch_notes = request.POST.get('batch_notes', '').strip()

                if batch_number and int(initial_qty) > 0:
                    batch = ProductBatch.objects.create(
                        product=product,
                        batch_number=batch_number,
                        initial_quantity=int(initial_qty),
                        current_quantity=int(initial_qty),
                        expiration_date=expiration_date,
                        notes=batch_notes,
                    )
                    # Ajuster le stock via mouvement
                    product.adjust_stock(
                        quantity=int(initial_qty),
                        movement_type='initial',
                        reference_type='manual',
                        notes=f"Stock initial - Lot {batch_number}",
                        user=request.user,
                        batch=batch,
                    )
                    messages.success(request, f'Produit "{product.name}" créé avec le lot {batch_number} ({initial_qty} unités).')
                else:
                    messages.success(request, f'Produit "{product.name}" créé. Vous pouvez ajouter des lots depuis la fiche produit.')
            else:
                messages.success(request, f'Produit "{product.name}" créé avec succès.')

            return redirect('invoicing:product_detail', pk=product.pk)

        except Exception as e:
            messages.error(request, f'Erreur lors de la création: {str(e)}')

    return _render_product_form(request)


def _render_product_form(request, product=None):
    categories = ProductCategory.objects.filter(is_active=True).order_by('name')
    context = {
        'product': product,
        'categories': categories,
        'is_edit': product is not None,
    }
    return render(request, 'invoicing/product_form.html', context)


@login_required
def product_detail(request, pk):
    """Détail d'un produit avec ses lots et mouvements"""
    product = get_object_or_404(Product, pk=pk)
    batches = product.batches.filter(is_active=True).order_by('expiration_date', 'created_at')
    movements = product.stock_movements.select_related('batch', 'created_by').order_by('-created_at')[:20]

    from django.utils import timezone as tz
    today = tz.now().date()
    from datetime import timedelta
    expired = batches.filter(expiration_date__lt=today, current_quantity__gt=0)
    expiring_soon = batches.filter(
        expiration_date__gte=today,
        expiration_date__lte=today + timedelta(days=30),
        current_quantity__gt=0
    )

    context = {
        'product': product,
        'batches': batches,
        'movements': movements,
        'expired_batches': expired,
        'expiring_soon_batches': expiring_soon,
    }
    return render(request, 'invoicing/product_detail.html', context)


@login_required
def product_edit(request, pk):
    """Modifier un produit"""
    product = get_object_or_404(Product, pk=pk)

    if request.method == 'POST':
        try:
            product.name = request.POST.get('name', product.name).strip()
            product.description = request.POST.get('description', product.description).strip()
            ref = request.POST.get('reference', '').strip()
            product.reference = ref if ref else None
            product.price = request.POST.get('price', product.price)
            product.cost_price = request.POST.get('cost_price', product.cost_price)
            product.price_editable = request.POST.get('price_editable') == 'on'
            product.is_active = request.POST.get('is_active') == 'on'
            if product.product_type == 'physical':
                product.low_stock_threshold = int(request.POST.get('low_stock_threshold', product.low_stock_threshold))
            category_id = request.POST.get('category') or None
            if category_id:
                try:
                    product.category = ProductCategory.objects.get(id=category_id)
                except ProductCategory.DoesNotExist:
                    product.category = None
            else:
                product.category = None
            product.save()
            messages.success(request, f'Produit "{product.name}" modifié avec succès.')
            return redirect('invoicing:product_detail', pk=product.pk)
        except Exception as e:
            messages.error(request, f'Erreur: {str(e)}')

    return _render_product_form(request, product=product)


@login_required
def product_delete(request, pk):
    """Supprimer un produit"""
    product = get_object_or_404(Product, pk=pk)
    if request.method == 'POST':
        name = product.name
        product.delete()
        messages.success(request, f'Produit "{name}" supprimé.')
        return redirect('invoicing:product_list')
    context = {'product': product}
    return render(request, 'invoicing/product_confirm_delete.html', context)


@login_required
def product_batch_add(request, pk):
    """Ajouter un lot à un produit physique"""
    product = get_object_or_404(Product, pk=pk, product_type='physical')

    if request.method == 'POST':
        batch_number = request.POST.get('batch_number', '').strip()
        quantity = request.POST.get('quantity', '0')
        expiration_date = request.POST.get('expiration_date', '').strip() or None
        notes = request.POST.get('notes', '').strip()

        if not batch_number:
            messages.error(request, 'Le numéro de lot est requis.')
        elif ProductBatch.objects.filter(product=product, batch_number=batch_number).exists():
            messages.error(request, f'Le lot "{batch_number}" existe déjà pour ce produit.')
        else:
            try:
                qty = int(quantity)
                if qty <= 0:
                    messages.error(request, 'La quantité doit être supérieure à 0.')
                else:
                    batch = ProductBatch.objects.create(
                        product=product,
                        batch_number=batch_number,
                        initial_quantity=qty,
                        current_quantity=qty,
                        expiration_date=expiration_date,
                        notes=notes,
                    )
                    product.adjust_stock(
                        quantity=qty,
                        movement_type='reception',
                        reference_type='manual',
                        notes=f"Réception lot {batch_number}",
                        user=request.user,
                        batch=batch,
                    )
                    messages.success(request, f'Lot {batch_number} ajouté avec {qty} unités.')
                    return redirect('invoicing:product_detail', pk=product.pk)
            except ValueError:
                messages.error(request, 'Quantité invalide.')

    context = {'product': product}
    return render(request, 'invoicing/product_batch_form.html', context)


@login_required
def product_batch_write_off(request, batch_pk):
    """Retirer un lot (périmé ou autre raison)"""
    batch = get_object_or_404(ProductBatch, pk=batch_pk)
    product = batch.product

    if request.method == 'POST':
        reason = request.POST.get('reason', 'expired')
        qty = batch.current_quantity

        if qty > 0:
            # Mouvements de perte
            product.adjust_stock(
                quantity=-qty,
                movement_type='loss',
                reference_type='manual',
                notes=f"Retrait lot {batch.batch_number} - {dict(StockMovement.LOSS_REASONS).get(reason, reason)}",
                user=request.user,
                batch=batch,
            )

        # Désactiver le lot
        batch.is_active = False
        batch.current_quantity = 0
        batch.save()

        messages.success(request, f'Lot {batch.batch_number} retiré ({qty} unités déduites).')
        return redirect('invoicing:product_detail', pk=product.pk)

    context = {'batch': batch, 'product': product, 'loss_reasons': StockMovement.LOSS_REASONS}
    return render(request, 'invoicing/product_batch_write_off.html', context)


@login_required
def api_product_batches(request, pk):
    """API: retourne les lots disponibles pour un produit"""
    product = get_object_or_404(Product, pk=pk)
    from django.utils import timezone as tz

    if product.product_type != 'physical':
        return JsonResponse({'batches': [], 'product_type': product.product_type})

    today = tz.now().date()
    batches = ProductBatch.objects.filter(
        product=product,
        is_active=True,
        current_quantity__gt=0
    ).order_by('expiration_date')

    data = []
    for b in batches:
        data.append({
            'id': str(b.id),
            'batch_number': b.batch_number,
            'current_quantity': b.current_quantity,
            'expiration_date': b.expiration_date.isoformat() if b.expiration_date else None,
            'is_expired': b.is_expired,
            'is_expiring_soon': b.is_expiring_soon,
        })

    return JsonResponse({'batches': data, 'product_type': product.product_type})