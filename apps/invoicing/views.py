from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db.models import Q, Sum
from django.utils import timezone
from .models import Invoice, InvoiceItem
from .forms_simple import InvoiceForm, InvoiceItemForm, InvoiceSearchForm
import json

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
    """Création d'une nouvelle facture"""
    if request.method == 'POST':
        form = InvoiceForm(request.POST)
        if form.is_valid():
            invoice = form.save(commit=False)
            invoice.created_by = request.user
            invoice.save()
            messages.success(request, f'Facture {invoice.invoice_number} créée avec succès.')
            return redirect('invoicing:invoice_detail', pk=invoice.pk)
    else:
        form = InvoiceForm()
    
    context = {
        'form': form,
        'title': 'Nouvelle Facture',
    }
    return render(request, 'invoicing/invoice_form.html', context)

@login_required
def invoice_edit(request, pk):
    """Modification d'une facture"""
    invoice = get_object_or_404(Invoice, pk=pk)
    
    if request.method == 'POST':
        form = InvoiceForm(request.POST, instance=invoice)
        if form.is_valid():
            form.save()
            messages.success(request, f'Facture {invoice.invoice_number} modifiée avec succès.')
            return redirect('invoicing:invoice_detail', pk=invoice.pk)
    else:
        form = InvoiceForm(instance=invoice)
    
    context = {
        'form': form,
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
    
    if request.method == 'POST':
        form = InvoiceItemForm(request.POST)
        if form.is_valid():
            item = form.save(commit=False)
            item.invoice = invoice
            item.save()
            
            # Recalculer le total de la facture
            invoice.recalculate_totals()
            
            messages.success(request, 'Service ajouté avec succès.')
            return redirect('invoicing:invoice_detail', pk=invoice.pk)
    else:
        form = InvoiceItemForm()
    
    context = {
        'form': form,
        'invoice': invoice,
    }
    return render(request, 'invoicing/invoice_item_form.html', context)

@login_required
def invoice_item_edit(request, pk):
    """Modifier un item de facture"""
    item = get_object_or_404(InvoiceItem, pk=pk)
    
    if request.method == 'POST':
        form = InvoiceItemForm(request.POST, instance=item)
        if form.is_valid():
            form.save()
            
            # Recalculer le total de la facture
            item.invoice.recalculate_totals()
            
            messages.success(request, 'Service modifié avec succès.')
            return redirect('invoicing:invoice_detail', pk=item.invoice.pk)
    else:
        form = InvoiceItemForm(instance=item)
    
    context = {
        'form': form,
        'item': item,
        'invoice': item.invoice,
    }
    return render(request, 'invoicing/invoice_item_form.html', context)

@login_required
def invoice_item_delete(request, pk):
    """Supprimer un item de facture"""
    item = get_object_or_404(InvoiceItem, pk=pk)
    invoice = item.invoice
    
    if request.method == 'POST':
        item.delete()
        
        # Recalculer le total de la facture
        invoice.recalculate_totals()
        
        messages.success(request, 'Service supprimé avec succès.')
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