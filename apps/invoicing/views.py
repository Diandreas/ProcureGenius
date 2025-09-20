from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db.models import Q, Sum
from django.utils import timezone
from .models import Product, Invoice, InvoiceItem
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
        })
    
    clients_data = []
    for client in clients:
        clients_data.append({
            'id': client.id,
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