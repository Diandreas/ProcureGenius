from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.utils.translation import gettext as _
from django.core.paginator import Paginator
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from django.urls import reverse
from decimal import Decimal
import json
from datetime import datetime, timedelta

from .models import (
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderApproval, 
    PurchaseOrderHistory, PurchaseOrderTemplate, PurchaseOrderAttachment,
    PurchaseOrderReceipt, PurchaseOrderReceiptItem
)
from .forms import (
    PurchaseOrderForm, PurchaseOrderItemFormSet, PurchaseOrderSearchForm,
    PurchaseOrderApprovalForm, PurchaseOrderReceiptForm
)
from apps.suppliers.models import Supplier, Product


# ===== VUES PRINCIPALES =====

@login_required
def purchase_order_list(request):
    """Liste des bons de commande avec recherche et filtres"""
    
    form = PurchaseOrderSearchForm(request.GET)
    queryset = PurchaseOrder.objects.select_related('supplier', 'created_by', 'approved_by')
    
    if form.is_valid():
        search = form.cleaned_data.get('search')
        status = form.cleaned_data.get('status')
        supplier = form.cleaned_data.get('supplier')
        priority = form.cleaned_data.get('priority')
        date_from = form.cleaned_data.get('date_from')
        date_to = form.cleaned_data.get('date_to')
        created_by_me = form.cleaned_data.get('created_by_me')
        
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search) |
                Q(supplier__name__icontains=search) |
                Q(notes__icontains=search)
            )
        
        if status:
            queryset = queryset.filter(status=status)
        
        if supplier:
            queryset = queryset.filter(supplier=supplier)
        
        if priority:
            queryset = queryset.filter(priority=priority)
        
        if date_from:
            queryset = queryset.filter(order_date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(order_date__lte=date_to)
        
        if created_by_me:
            queryset = queryset.filter(created_by=request.user)
    
    # Statistiques pour dashboard
    stats = {
        'total_pos': queryset.count(),
        'pending_approval': queryset.filter(status='pending').count(),
        'total_amount': queryset.aggregate(total=Sum('total_amount'))['total'] or 0,
        'urgent_pos': queryset.filter(
            priority='urgent', 
            status__in=['draft', 'pending', 'approved']
        ).count(),
        'overdue_deliveries': queryset.filter(
            expected_delivery__lt=timezone.now().date(),
            status__in=['sent', 'confirmed', 'partial']
        ).count(),
    }
    
    # Pagination
    paginator = Paginator(queryset.order_by('-created_at'), 25)
    page_number = request.GET.get('page')
    purchase_orders = paginator.get_page(page_number)
    
    context = {
        'purchase_orders': purchase_orders,
        'form': form,
        'stats': stats,
        'can_create': request.user.role in ['admin', 'manager', 'buyer'],
    }
    
    return render(request, 'purchase_orders/list.html', context)


@login_required
def purchase_order_detail(request, pk):
    """Détail d'un bon de commande"""
    
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    # Vérifier les permissions
    can_edit = (
        purchase_order.can_be_edited() and 
        request.user.role in ['admin', 'manager', 'buyer']
    )
    can_approve = (
        purchase_order.can_be_approved() and
        _can_user_approve(request.user, purchase_order)
    )
    
    # Données complémentaires
    items = purchase_order.items.select_related('product', 'category').all()
    approvals = purchase_order.approvals.select_related('approver').order_by('approval_level')
    history = purchase_order.history.select_related('user').order_by('-timestamp')[:10]
    attachments = purchase_order.attachments.select_related('uploaded_by').order_by('-uploaded_at')
    receipts = purchase_order.receipts.select_related('received_by').order_by('-receipt_date')
    
    # Calculs
    completion_percentage = purchase_order.get_completion_percentage()
    
    context = {
        'purchase_order': purchase_order,
        'items': items,
        'approvals': approvals,
        'history': history,
        'attachments': attachments,
        'receipts': receipts,
        'completion_percentage': completion_percentage,
        'can_edit': can_edit,
        'can_approve': can_approve,
        'can_cancel': purchase_order.can_be_cancelled() and request.user.role in ['admin', 'manager'],
    }
    
    return render(request, 'purchase_orders/detail.html', context)


@login_required
def purchase_order_create(request):
    """Création d'un nouveau bon de commande"""
    
    if request.user.role not in ['admin', 'manager', 'buyer']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('purchase_orders:list')
    
    if request.method == 'POST':
        form = PurchaseOrderForm(request.POST)
        formset = PurchaseOrderItemFormSet(request.POST)
        
        if form.is_valid() and formset.is_valid():
            # Création du BC
            purchase_order = form.save(commit=False)
            purchase_order.created_by = request.user
            purchase_order.save()
            
            # Création des lignes
            items = formset.save(commit=False)
            for item in items:
                item.purchase_order = purchase_order
                item.save()
            
            # Recalcul des totaux
            purchase_order.calculate_totals()
            purchase_order.save()
            
            messages.success(request, _('Bon de commande %(number)s créé avec succès.') % {
                'number': purchase_order.number
            })
            
            return redirect('purchase_orders:detail', pk=purchase_order.pk)
    else:
        # Pré-remplir avec un template si spécifié
        template_id = request.GET.get('template')
        initial_data = {}
        
        if template_id:
            try:
                template = PurchaseOrderTemplate.objects.get(id=template_id)
                initial_data = template.template_data
                template.usage_count += 1
                template.save()
            except PurchaseOrderTemplate.DoesNotExist:
                pass
        
        form = PurchaseOrderForm(initial=initial_data)
        formset = PurchaseOrderItemFormSet()
    
    # Données pour les formulaires
    suppliers = Supplier.objects.filter(status='active').order_by('name')
    templates = PurchaseOrderTemplate.objects.filter(
        is_active=True
    ).select_related('supplier').order_by('-usage_count')[:10]
    
    context = {
        'form': form,
        'formset': formset,
        'suppliers': suppliers,
        'templates': templates,
        'title': _('Nouveau bon de commande'),
    }
    
    return render(request, 'purchase_orders/create.html', context)


@login_required
def purchase_order_edit(request, pk):
    """Modification d'un bon de commande"""
    
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    if not purchase_order.can_be_edited():
        messages.error(request, _('Ce bon de commande ne peut plus être modifié.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    if request.user.role not in ['admin', 'manager', 'buyer']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    if request.method == 'POST':
        form = PurchaseOrderForm(request.POST, instance=purchase_order)
        formset = PurchaseOrderItemFormSet(request.POST, instance=purchase_order)
        
        if form.is_valid() and formset.is_valid():
            # Enregistrer les modifications
            form.save()
            formset.save()
            
            # Recalculer les totaux
            purchase_order.calculate_totals()
            purchase_order.save()
            
            # Créer une entrée d'historique
            PurchaseOrderHistory.objects.create(
                purchase_order=purchase_order,
                user=request.user,
                action='modified',
                notes='Bon de commande modifié'
            )
            
            messages.success(request, _('Bon de commande modifié avec succès.'))
            return redirect('purchase_orders:detail', pk=pk)
    else:
        form = PurchaseOrderForm(instance=purchase_order)
        formset = PurchaseOrderItemFormSet(instance=purchase_order)
    
    context = {
        'form': form,
        'formset': formset,
        'purchase_order': purchase_order,
        'title': _('Modifier le bon de commande'),
    }
    
    return render(request, 'purchase_orders/edit.html', context)


@login_required
@require_http_methods(["POST"])
def purchase_order_approve(request, pk):
    """Approbation d'un bon de commande"""
    
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    if not _can_user_approve(request.user, purchase_order):
        messages.error(request, _('Vous n\'avez pas les permissions pour approuver ce bon de commande.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    if not purchase_order.can_be_approved():
        messages.error(request, _('Ce bon de commande ne peut pas être approuvé dans son état actuel.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    # Logique d'approbation
    approval_level = _get_user_approval_level(request.user)
    required_level = _get_required_approval_level(purchase_order.total_amount)
    
    # Créer l'enregistrement d'approbation
    approval = PurchaseOrderApproval.objects.create(
        purchase_order=purchase_order,
        approver=request.user,
        status='approved',
        approval_level=approval_level,
        comments=request.POST.get('comments', ''),
        approved_at=timezone.now()
    )
    
    # Mettre à jour le statut si toutes approbations obtenues
    if approval_level >= required_level:
        purchase_order.status = 'approved'
        purchase_order.approved_by = request.user
        purchase_order.save()
        
        # Créer une entrée d'historique
        PurchaseOrderHistory.objects.create(
            purchase_order=purchase_order,
            user=request.user,
            action='approved',
            notes=f'Bon de commande approuvé par {request.user.get_full_name()}'
        )
        
        messages.success(request, _('Bon de commande %(number)s approuvé.') % {
            'number': purchase_order.number
        })
        
        # Notification au créateur si différent
        if purchase_order.created_by != request.user:
            # TODO: Implémenter notification
            pass
    else:
        messages.info(request, _('Approbation enregistrée. Approbations supplémentaires requises.'))
    
    return redirect('purchase_orders:detail', pk=pk)


@login_required
@require_http_methods(["POST"])
def purchase_order_send(request, pk):
    """Envoi du bon de commande au fournisseur"""
    
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    if purchase_order.status not in ['approved']:
        messages.error(request, _('Le bon de commande doit être approuvé avant envoi.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    if request.user.role not in ['admin', 'manager', 'buyer']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    try:
        # Générer et envoyer le PDF
        pdf_content = _generate_purchase_order_pdf(purchase_order)
        
        # Envoi email
        from django.core.mail import EmailMessage
        
        email = EmailMessage(
            subject=_('Bon de commande %(number)s') % {'number': purchase_order.number},
            body=_get_purchase_order_email_template(purchase_order),
            from_email='commandes@votreentreprise.com',
            to=[purchase_order.supplier.email],
            cc=[purchase_order.created_by.email],
        )
        
        email.attach(f'BC_{purchase_order.number}.pdf', pdf_content, 'application/pdf')
        email.send()
        
        # Mise à jour statut
        purchase_order.status = 'sent'
        purchase_order.save()
        
        # Historique
        PurchaseOrderHistory.objects.create(
            purchase_order=purchase_order,
            user=request.user,
            action='sent',
            notes=f'Bon de commande envoyé à {purchase_order.supplier.name}'
        )
        
        messages.success(request, _('Bon de commande %(number)s envoyé avec succès.') % {
            'number': purchase_order.number
        })
        
    except Exception as e:
        messages.error(request, _('Erreur lors de l\'envoi: %(error)s') % {'error': str(e)})
    
    return redirect('purchase_orders:detail', pk=pk)


@login_required
@require_http_methods(["POST"])
def purchase_order_cancel(request, pk):
    """Annulation d'un bon de commande"""
    
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    if not purchase_order.can_be_cancelled():
        messages.error(request, _('Ce bon de commande ne peut pas être annulé.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    if request.user.role not in ['admin', 'manager']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    # Demander confirmation et raison
    cancellation_reason = request.POST.get('reason', '')
    
    if not cancellation_reason:
        messages.error(request, _('Une raison d\'annulation est requise.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    # Annuler le BC
    purchase_order.status = 'cancelled'
    purchase_order.save()
    
    # Historique
    PurchaseOrderHistory.objects.create(
        purchase_order=purchase_order,
        user=request.user,
        action='cancelled',
        notes=f'Bon de commande annulé. Raison: {cancellation_reason}'
    )
    
    messages.success(request, _('Bon de commande %(number)s annulé.') % {
        'number': purchase_order.number
    })
    
    return redirect('purchase_orders:detail', pk=pk)


# ===== VUES DE RÉCEPTION =====

@login_required
def purchase_order_receive(request, pk):
    """Réception de marchandises"""
    
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)
    
    if purchase_order.status not in ['sent', 'confirmed', 'partial']:
        messages.error(request, _('Ce bon de commande n\'est pas en attente de réception.'))
        return redirect('purchase_orders:detail', pk=pk)
    
    if request.method == 'POST':
        form = PurchaseOrderReceiptForm(request.POST)
        
        if form.is_valid():
            receipt = form.save(commit=False)
            receipt.purchase_order = purchase_order
            receipt.received_by = request.user
            receipt.save()
            
            # Traiter les quantités reçues pour chaque ligne
            for item in purchase_order.items.all():
                qty_received = request.POST.get(f'qty_received_{item.id}')
                quality_ok = request.POST.get(f'quality_ok_{item.id}') == 'on'
                quality_notes = request.POST.get(f'quality_notes_{item.id}', '')
                
                if qty_received and float(qty_received) > 0:
                    PurchaseOrderReceiptItem.objects.create(
                        receipt=receipt,
                        purchase_order_item=item,
                        quantity_received=qty_received,
                        quality_ok=quality_ok,
                        quality_notes=quality_notes
                    )
            
            messages.success(request, _('Réception enregistrée avec succès.'))
            return redirect('purchase_orders:detail', pk=pk)
    else:
        form = PurchaseOrderReceiptForm()
    
    context = {
        'purchase_order': purchase_order,
        'form': form,
        'items': purchase_order.items.all(),
    }
    
    return render(request, 'purchase_orders/receive.html', context)


# ===== VUES AJAX =====

@login_required
def ajax_po_quick_actions(request):
    """Actions rapides AJAX"""
    
    if request.method != 'POST':
        return JsonResponse({'error': _('Méthode non autorisée')}, status=405)
    
    action = request.POST.get('action')
    po_id = request.POST.get('po_id')
    
    if not action or not po_id:
        return JsonResponse({'error': _('Paramètres manquants')}, status=400)
    
    try:
        purchase_order = PurchaseOrder.objects.get(pk=po_id)
    except PurchaseOrder.DoesNotExist:
        return JsonResponse({'error': _('Bon de commande introuvable')}, status=404)
    
    if action == 'change_status':
        new_status = request.POST.get('new_status')
        if new_status in dict(PurchaseOrder.status.field.choices):
            old_status = purchase_order.status
            purchase_order.status = new_status
            purchase_order.save()
            
            # Log de l'action
            PurchaseOrderHistory.objects.create(
                purchase_order=purchase_order,
                user=request.user,
                action=f'status_changed',
                old_values={'status': old_status},
                new_values={'status': new_status},
                performed_by_ai=request.POST.get('by_ai', False) == 'true'
            )
            
            return JsonResponse({
                'status': 'success',
                'message': _('Statut changé vers %(status)s') % {
                    'status': purchase_order.get_status_display()
                }
            })
    
    return JsonResponse({'error': _('Action inconnue')}, status=400)


@login_required
def ajax_supplier_info(request, supplier_id):
    """Obtenir les informations d'un fournisseur via AJAX"""
    
    try:
        supplier = Supplier.objects.get(id=supplier_id)
        
        data = {
            'name': supplier.name,
            'contact_person': supplier.contact_person,
            'email': supplier.email,
            'phone': supplier.phone,
            'payment_terms': supplier.payment_terms,
            'currency': supplier.currency,
            'address': supplier.get_full_address(),
        }
        
        return JsonResponse({'success': True, 'supplier': data})
        
    except Supplier.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': _('Fournisseur introuvable')
        })


@login_required
def ajax_product_search(request):
    """Recherche de produits pour autocomplete"""
    
    query = request.GET.get('q', '')
    supplier_id = request.GET.get('supplier_id')
    
    if len(query) < 2:
        return JsonResponse({'results': []})
    
    products = Product.objects.filter(
        Q(name__icontains=query) |
        Q(sku__icontains=query),
        is_available=True
    )
    
    if supplier_id:
        products = products.filter(supplier_id=supplier_id)
    
    products = products.select_related('supplier')[:10]
    
    results = []
    for product in products:
        results.append({
            'id': str(product.id),
            'text': f"{product.name} ({product.sku})",
            'sku': product.sku,
            'name': product.name,
            'unit_price': float(product.unit_price.amount),
            'supplier': product.supplier.name,
            'lead_time': product.lead_time_days,
        })
    
    return JsonResponse({'results': results})


# ===== VUES DE RAPPORTS =====

@login_required
def purchase_order_reports(request):
    """Page des rapports de bons de commande"""
    
    # Statistiques générales
    total_pos = PurchaseOrder.objects.count()
    total_amount = PurchaseOrder.objects.aggregate(
        total=Sum('total_amount')
    )['total'] or 0
    
    # Par statut
    status_breakdown = PurchaseOrder.objects.values('status').annotate(
        count=Count('id'),
        total_amount=Sum('total_amount')
    ).order_by('-count')
    
    # Par fournisseur (top 10)
    supplier_breakdown = PurchaseOrder.objects.values(
        'supplier__name'
    ).annotate(
        count=Count('id'),
        total_amount=Sum('total_amount')
    ).order_by('-total_amount')[:10]
    
    # Tendances mensuelles (12 derniers mois)
    from django.db.models import TruncMonth
    monthly_trends = PurchaseOrder.objects.filter(
        created_at__gte=timezone.now() - timedelta(days=365)
    ).annotate(
        month=TruncMonth('created_at')
    ).values('month').annotate(
        count=Count('id'),
        total_amount=Sum('total_amount')
    ).order_by('month')
    
    context = {
        'total_pos': total_pos,
        'total_amount': total_amount,
        'status_breakdown': status_breakdown,
        'supplier_breakdown': supplier_breakdown,
        'monthly_trends': list(monthly_trends),
    }
    
    return render(request, 'purchase_orders/reports.html', context)


@login_required
def export_purchase_orders(request):
    """Export des bons de commande vers CSV"""
    
    import csv
    from django.http import HttpResponse
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="bons_commande.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Numéro', 'Fournisseur', 'Statut', 'Priorité', 'Date commande',
        'Montant total', 'Créé par', 'Date création'
    ])
    
    # Filtrer selon les paramètres GET
    queryset = PurchaseOrder.objects.select_related('supplier', 'created_by').all()
    
    status_filter = request.GET.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    for po in queryset.order_by('-created_at'):
        writer.writerow([
            po.number,
            po.supplier.name,
            po.get_status_display(),
            po.get_priority_display(),
            po.order_date.strftime('%Y-%m-%d'),
            float(po.total_amount.amount),
            po.created_by.get_full_name(),
            po.created_at.strftime('%Y-%m-%d %H:%M')
        ])
    
    return response


# ===== FONCTIONS UTILITAIRES =====

def _can_user_approve(user, purchase_order):
    """Vérifie si l'utilisateur peut approuver ce BC"""
    user_level = _get_user_approval_level(user)
    required_level = _get_required_approval_level(purchase_order.total_amount)
    return user_level >= required_level and user != purchase_order.created_by


def _get_user_approval_level(user):
    """Obtient le niveau d'approbation de l'utilisateur"""
    if user.role == 'admin':
        return 3
    elif user.role == 'manager':
        return 2
    elif user.role == 'buyer':
        return 1
    return 0


def _get_required_approval_level(amount):
    """Obtient le niveau d'approbation requis selon montant"""
    amount_value = float(amount.amount) if hasattr(amount, 'amount') else float(amount)
    
    if amount_value > 10000:
        return 3
    elif amount_value > 5000:
        return 2
    elif amount_value > 1000:
        return 1
    return 0


def _generate_purchase_order_pdf(purchase_order):
    """Génère le PDF du bon de commande avec WeasyPrint"""
    from weasyprint import HTML, CSS
    from django.template.loader import render_to_string
    from django.conf import settings
    from io import BytesIO

    # Préparer le contexte pour le template
    context = {
        'purchase_order': purchase_order,
    }

    # Utiliser un template existant pour les bons de commande
    html_string = render_to_string('purchase_orders/pdf_templates/po_modern.html', context)

    # Générer le PDF avec WeasyPrint
    html = HTML(string=html_string, base_url=settings.BASE_DIR)
    pdf_bytes = html.write_pdf()

    # Convertir en BytesIO pour compatibilité
    buffer = BytesIO(pdf_bytes)
    buffer.seek(0)

    return buffer.getvalue()


def _get_purchase_order_email_template(purchase_order):
    """Template email pour bon de commande"""
    return f"""
Bonjour {purchase_order.supplier.contact_person},

Veuillez trouver ci-joint le bon de commande {purchase_order.number}.

Détails de la commande:
- Montant total: {purchase_order.total_amount}
- Date de livraison souhaitée: {purchase_order.expected_delivery or 'À convenir'}
- Conditions de paiement: {purchase_order.payment_terms}

Merci de confirmer la réception de cette commande et les délais de livraison.

Cordialement,
{purchase_order.created_by.get_full_name()}
"""