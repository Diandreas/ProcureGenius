from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils.translation import gettext as _
from django.core.paginator import Paginator
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from django.urls import reverse
from datetime import datetime, timedelta, date
import json

from .models import (
    Invoice, InvoiceItem, Payment, InvoiceReminder, 
    RecurringInvoice, InvoiceTemplate, InvoiceAttachment,
    PayPalTransaction
)
from .forms import (
    InvoiceForm, InvoiceItemFormSet, PaymentForm, InvoiceSearchForm,
    RecurringInvoiceForm, InvoiceTemplateForm
)
from .services import PayPalService
from apps.suppliers.models import Client


# ===== VUES PRINCIPALES =====

@login_required
def invoice_list(request):
    """Liste des factures avec recherche et filtres"""
    
    form = InvoiceSearchForm(request.GET)
    queryset = Invoice.objects.select_related('client', 'created_by')
    
    if form.is_valid():
        search = form.cleaned_data.get('search')
        status = form.cleaned_data.get('status')
        client = form.cleaned_data.get('client')
        overdue_only = form.cleaned_data.get('overdue_only')
        date_from = form.cleaned_data.get('date_from')
        date_to = form.cleaned_data.get('date_to')
        
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search) |
                Q(client__name__icontains=search) |
                Q(notes__icontains=search)
            )
        
        if status:
            queryset = queryset.filter(status=status)
        
        if client:
            queryset = queryset.filter(client=client)
        
        if overdue_only:
            queryset = queryset.filter(
                status__in=['sent', 'viewed', 'partial'],
                due_date__lt=timezone.now().date()
            )
        
        if date_from:
            queryset = queryset.filter(invoice_date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(invoice_date__lte=date_to)
    
    # Statistiques
    stats = {
        'total_invoices': queryset.count(),
        'total_amount': queryset.aggregate(total=Sum('total_amount'))['total'] or 0,
        'outstanding': queryset.filter(
            status__in=['sent', 'viewed', 'partial']
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
        'overdue': queryset.filter(
            status__in=['sent', 'viewed', 'partial'], 
            due_date__lt=timezone.now().date()
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
        'paid_this_month': queryset.filter(
            status='paid',
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year
        ).aggregate(total=Sum('total_amount'))['total'] or 0,
    }
    
    # Pagination
    paginator = Paginator(queryset.order_by('-created_at'), 25)
    page_number = request.GET.get('page')
    invoices = paginator.get_page(page_number)
    
    context = {
        'invoices': invoices,
        'form': form,
        'stats': stats,
        'can_create': request.user.role in ['admin', 'manager', 'accountant'],
    }
    
    return render(request, 'invoicing/list.html', context)


@login_required
def invoice_detail(request, pk):
    """Détail d'une facture"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    
    # Vérifier les permissions
    can_edit = (
        invoice.can_be_edited() and 
        request.user.role in ['admin', 'manager', 'accountant']
    )
    
    # Données complémentaires
    items = invoice.items.all()
    payments = invoice.payments.select_related('created_by').order_by('-payment_date')
    reminders = invoice.reminders.order_by('-sent_at')
    attachments = invoice.attachments.select_related('uploaded_by').order_by('-uploaded_at')
    
    # Calculs
    balance_due = invoice.get_balance_due()
    payment_percentage = invoice.get_payment_percentage()
    
    # PayPal
    paypal_transactions = invoice.paypal_transactions.order_by('-transaction_date')
    
    context = {
        'invoice': invoice,
        'items': items,
        'payments': payments,
        'reminders': reminders,
        'attachments': attachments,
        'paypal_transactions': paypal_transactions,
        'balance_due': balance_due,
        'payment_percentage': payment_percentage,
        'can_edit': can_edit,
        'can_send': invoice.can_be_sent() and request.user.role in ['admin', 'manager', 'accountant'],
        'can_cancel': invoice.can_be_cancelled() and request.user.role in ['admin', 'manager'],
        'paypal_enabled': True,  # Configuration PayPal
    }
    
    return render(request, 'invoicing/detail.html', context)


@login_required
def invoice_create(request):
    """Création d'une nouvelle facture"""
    
    if request.user.role not in ['admin', 'manager', 'accountant']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('invoicing:list')
    
    if request.method == 'POST':
        form = InvoiceForm(request.POST)
        formset = InvoiceItemFormSet(request.POST)
        
        if form.is_valid() and formset.is_valid():
            # Création de la facture
            invoice = form.save(commit=False)
            invoice.created_by = request.user
            invoice.save()
            
            # Création des lignes
            items = formset.save(commit=False)
            for item in items:
                item.invoice = invoice
                item.save()
            
            # Recalcul des totaux
            invoice.calculate_totals()
            invoice.save()
            
            messages.success(request, _('Facture %(number)s créée avec succès.') % {
                'number': invoice.number
            })
            
            return redirect('invoicing:detail', pk=invoice.pk)
    else:
        # Pré-remplir avec un template si spécifié
        template_id = request.GET.get('template')
        purchase_order_id = request.GET.get('purchase_order')
        initial_data = {}
        
        if template_id:
            try:
                template = InvoiceTemplate.objects.get(id=template_id)
                initial_data = template.template_data
                template.usage_count += 1
                template.save()
            except InvoiceTemplate.DoesNotExist:
                pass
        
        if purchase_order_id:
            try:
                from apps.purchase_orders.models import PurchaseOrder
                po = PurchaseOrder.objects.get(id=purchase_order_id)
                initial_data.update({
                    'purchase_order': po.id,
                    'billing_address': po.billing_address,
                    'payment_terms': po.payment_terms,
                })
            except:
                pass
        
        form = InvoiceForm(initial=initial_data)
        formset = InvoiceItemFormSet()
    
    # Données pour les formulaires
    clients = Client.objects.filter(is_active=True).order_by('name')
    templates = InvoiceTemplate.objects.filter(
        is_active=True
    ).order_by('-usage_count')[:10]
    
    context = {
        'form': form,
        'formset': formset,
        'clients': clients,
        'templates': templates,
        'title': _('Nouvelle facture'),
    }
    
    return render(request, 'invoicing/create.html', context)


@login_required
def invoice_edit(request, pk):
    """Modification d'une facture"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    
    if not invoice.can_be_edited():
        messages.error(request, _('Cette facture ne peut plus être modifiée.'))
        return redirect('invoicing:detail', pk=pk)
    
    if request.user.role not in ['admin', 'manager', 'accountant']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('invoicing:detail', pk=pk)
    
    if request.method == 'POST':
        form = InvoiceForm(request.POST, instance=invoice)
        formset = InvoiceItemFormSet(request.POST, instance=invoice)
        
        if form.is_valid() and formset.is_valid():
            form.save()
            formset.save()
            
            # Recalculer les totaux
            invoice.calculate_totals()
            invoice.save()
            
            messages.success(request, _('Facture modifiée avec succès.'))
            return redirect('invoicing:detail', pk=pk)
    else:
        form = InvoiceForm(instance=invoice)
        formset = InvoiceItemFormSet(instance=invoice)
    
    context = {
        'form': form,
        'formset': formset,
        'invoice': invoice,
        'title': _('Modifier la facture'),
    }
    
    return render(request, 'invoicing/edit.html', context)


@login_required
@require_http_methods(["POST"])
def invoice_send(request, pk):
    """Envoi d'une facture par email"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    
    if not invoice.can_be_sent():
        messages.error(request, _('Cette facture ne peut pas être envoyée.'))
        return redirect('invoicing:detail', pk=pk)
    
    if request.user.role not in ['admin', 'manager', 'accountant']:
        messages.error(request, _('Accès non autorisé.'))
        return redirect('invoicing:detail', pk=pk)
    
    try:
        # Générer et envoyer le PDF
        pdf_content = _generate_invoice_pdf(invoice)
        
        # Envoi email
        from django.core.mail import EmailMessage
        
        email = EmailMessage(
            subject=_('Facture %(number)s') % {'number': invoice.number},
            body=_get_invoice_email_template(invoice),
            from_email='facturation@votreentreprise.com',
            to=[invoice.client.email],
            cc=[invoice.created_by.email],
        )
        
        email.attach(f'Facture_{invoice.number}.pdf', pdf_content, 'application/pdf')
        email.send()
        
        # Mise à jour statut
        invoice.status = 'sent'
        invoice.sent_at = timezone.now()
        invoice.save()
        
        messages.success(request, _('Facture %(number)s envoyée avec succès.') % {
            'number': invoice.number
        })
        
    except Exception as e:
        messages.error(request, _('Erreur lors de l\'envoi: %(error)s') % {'error': str(e)})
    
    return redirect('invoicing:detail', pk=pk)


# ===== VUES DE PAIEMENT =====

@login_required
def invoice_record_payment(request, pk):
    """Enregistrer un paiement"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    
    if request.method == 'POST':
        form = PaymentForm(request.POST)
        if form.is_valid():
            payment = form.save(commit=False)
            payment.invoice = invoice
            payment.created_by = request.user
            payment.save()
            
            messages.success(request, _('Paiement de %(amount)s enregistré.') % {
                'amount': payment.amount
            })
            return redirect('invoicing:detail', pk=pk)
    else:
        # Pré-remplir avec solde restant
        balance = invoice.get_balance_due()
        form = PaymentForm(initial={
            'amount': balance.amount,
            'payment_date': timezone.now().date()
        })
    
    context = {
        'form': form,
        'invoice': invoice,
        'balance_due': invoice.get_balance_due(),
    }
    
    return render(request, 'invoicing/record_payment.html', context)


@login_required
def invoice_pay_paypal(request, pk):
    """Paiement via PayPal"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    balance_due = invoice.get_balance_due()
    
    if balance_due.amount <= 0:
        messages.info(request, _('Cette facture est déjà payée.'))
        return redirect('invoicing:detail', pk=pk)
    
    # Initialiser le service PayPal
    paypal_service = PayPalService()
    
    try:
        # Créer le paiement PayPal
        payment_data = {
            'amount': float(balance_due.amount),
            'currency': str(balance_due.currency),
            'description': f'Facture {invoice.number}',
            'invoice_id': str(invoice.id),
            'return_url': request.build_absolute_uri(
                reverse('invoicing:paypal_success', args=[invoice.id])
            ),
            'cancel_url': request.build_absolute_uri(
                reverse('invoicing:paypal_cancel', args=[invoice.id])
            ),
        }
        
        payment = paypal_service.create_payment(payment_data)
        
        if payment:
            # Enregistrer l'ID de paiement PayPal
            invoice.paypal_payment_id = payment.id
            invoice.paypal_status = payment.state
            invoice.save()
            
            # Rediriger vers PayPal
            for link in payment.links:
                if link.rel == "approval_url":
                    return redirect(link.href)
        
        messages.error(request, _('Erreur lors de la création du paiement PayPal.'))
        
    except Exception as e:
        messages.error(request, _('Erreur PayPal: %(error)s') % {'error': str(e)})
    
    return redirect('invoicing:detail', pk=pk)


@login_required
def paypal_success(request, pk):
    """Callback de succès PayPal"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    payment_id = request.GET.get('paymentId')
    payer_id = request.GET.get('PayerID')
    
    if not payment_id or not payer_id:
        messages.error(request, _('Paramètres PayPal manquants.'))
        return redirect('invoicing:detail', pk=pk)
    
    paypal_service = PayPalService()
    
    try:
        # Exécuter le paiement
        result = paypal_service.execute_payment(payment_id, payer_id)
        
        if result and result.state == 'approved':
            # Créer l'enregistrement de paiement
            transaction = result.transactions[0]
            amount = float(transaction.amount.total)
            
            payment = Payment.objects.create(
                invoice=invoice,
                amount=amount,
                payment_date=timezone.now().date(),
                payment_method='paypal',
                reference=payment_id,
                paypal_transaction_id=result.id,
                paypal_payer_email=result.payer.payer_info.email,
                created_by=request.user,
                notes=f'Paiement PayPal - ID: {result.id}'
            )
            
            # Créer l'enregistrement de transaction PayPal détaillé
            PayPalTransaction.objects.create(
                invoice=invoice,
                payment=payment,
                paypal_transaction_id=result.id,
                paypal_payment_id=payment_id,
                transaction_type='payment',
                status='completed',
                gross_amount=amount,
                fee_amount=0,  # Les frais seront mis à jour via webhook
                net_amount=amount,
                payer_email=result.payer.payer_info.email,
                payer_name=f"{result.payer.payer_info.first_name} {result.payer.payer_info.last_name}",
                payer_id=payer_id,
                raw_data=result.to_dict(),
                transaction_date=timezone.now()
            )
            
            # Mettre à jour le statut de la facture
            invoice.paypal_status = 'completed'
            invoice.save()
            
            messages.success(request, _('Paiement PayPal de %(amount)s$ effectué avec succès.') % {
                'amount': amount
            })
        else:
            messages.error(request, _('Le paiement PayPal n\'a pas pu être traité.'))
            
    except Exception as e:
        messages.error(request, _('Erreur lors du traitement du paiement: %(error)s') % {'error': str(e)})
    
    return redirect('invoicing:detail', pk=pk)


@login_required
def paypal_cancel(request, pk):
    """Callback d'annulation PayPal"""
    
    invoice = get_object_or_404(Invoice, pk=pk)
    
    # Nettoyer les données PayPal
    invoice.paypal_payment_id = ''
    invoice.paypal_status = 'cancelled'
    invoice.save()
    
    messages.warning(request, _('Paiement PayPal annulé.'))
    return redirect('invoicing:detail', pk=pk)


@csrf_exempt
def paypal_webhook(request):
    """Webhook PayPal pour les notifications"""
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        payload = json.loads(request.body)
        event_type = payload.get('event_type')
        
        # Traiter différents types d'événements PayPal
        if event_type == 'PAYMENT.SALE.COMPLETED':
            _handle_paypal_payment_completed(payload)
        elif event_type == 'PAYMENT.SALE.REFUNDED':
            _handle_paypal_payment_refunded(payload)
        
        return JsonResponse({'status': 'success'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ===== VUES DE RELANCES =====

@login_required
def automated_reminders_view(request):
    """Interface gestion relances automatiques"""
    
    # Factures en retard
    overdue_invoices = Invoice.objects.filter(
        status__in=['sent', 'viewed', 'partial'],
        due_date__lt=timezone.now().date()
    ).select_related('client').order_by('due_date')
    
    # Factures approchant échéance (7 jours)
    upcoming_due = Invoice.objects.filter(
        status__in=['sent', 'viewed'],
        due_date__lte=timezone.now().date() + timedelta(days=7),
        due_date__gt=timezone.now().date()
    ).select_related('client').order_by('due_date')
    
    context = {
        'overdue_invoices': overdue_invoices,
        'upcoming_due': upcoming_due,
        'can_send_reminders': request.user.role in ['admin', 'manager', 'accountant'],
    }
    
    return render(request, 'invoicing/automated_reminders.html', context)


@login_required
@require_http_methods(["POST"])
def send_bulk_reminders(request):
    """Envoi relances en lot"""
    
    invoice_ids = request.POST.getlist('invoice_ids')
    reminder_type = request.POST.get('reminder_type', 'first')
    
    if not invoice_ids:
        messages.error(request, _('Aucune facture sélectionnée.'))
        return redirect('invoicing:reminders')
    
    # Tâche asynchrone (à implémenter avec Celery)
    # from apps.invoicing.tasks import send_invoice_reminders
    # task = send_invoice_reminders.delay(invoice_ids, reminder_type, request.user.id)
    
    messages.info(request, _('Envoi de %(count)s relances en cours...') % {
        'count': len(invoice_ids)
    })
    return redirect('invoicing:reminders')


# ===== VUES DE RAPPORTS =====

@login_required
def invoice_reports(request):
    """Page des rapports de facturation"""
    
    # Période par défaut : 12 derniers mois
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=365)
    
    # Statistiques générales
    total_invoices = Invoice.objects.count()
    total_revenue = Invoice.objects.filter(
        status='paid'
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    outstanding_amount = Invoice.objects.filter(
        status__in=['sent', 'viewed', 'partial']
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    # Par statut
    status_breakdown = Invoice.objects.values('status').annotate(
        count=Count('id'),
        total_amount=Sum('total_amount')
    ).order_by('-count')
    
    # Par client (top 10)
    client_breakdown = Invoice.objects.values(
        'client__name'
    ).annotate(
        count=Count('id'),
        total_amount=Sum('total_amount')
    ).order_by('-total_amount')[:10]
    
    # Tendances mensuelles
    from django.db.models import TruncMonth
    monthly_trends = Invoice.objects.filter(
        created_at__gte=start_date
    ).annotate(
        month=TruncMonth('created_at')
    ).values('month').annotate(
        count=Count('id'),
        total_amount=Sum('total_amount'),
        paid_amount=Sum('total_amount', filter=Q(status='paid'))
    ).order_by('month')
    
    # Délais de paiement moyens
    avg_payment_days = Invoice.objects.filter(
        status='paid',
        created_at__gte=start_date
    ).extra(
        select={'payment_days': 'EXTRACT(days FROM (SELECT MAX(payment_date) FROM invoicing_payment WHERE invoice_id = invoicing_invoice.id) - invoice_date)'}
    ).aggregate(avg_days=Avg('payment_days'))['avg_days'] or 0
    
    context = {
        'total_invoices': total_invoices,
        'total_revenue': total_revenue,
        'outstanding_amount': outstanding_amount,
        'status_breakdown': status_breakdown,
        'client_breakdown': client_breakdown,
        'monthly_trends': list(monthly_trends),
        'avg_payment_days': round(avg_payment_days, 1),
    }
    
    return render(request, 'invoicing/reports.html', context)


@login_required
def aging_report(request):
    """Rapport de vieillissement des créances"""
    
    today = timezone.now().date()
    
    # Catégories de vieillissement
    aging_buckets = {
        'current': Q(due_date__gte=today),
        '1_30': Q(due_date__lt=today, due_date__gte=today - timedelta(days=30)),
        '31_60': Q(due_date__lt=today - timedelta(days=30), due_date__gte=today - timedelta(days=60)),
        '61_90': Q(due_date__lt=today - timedelta(days=60), due_date__gte=today - timedelta(days=90)),
        'over_90': Q(due_date__lt=today - timedelta(days=90)),
    }
    
    # Factures impayées par client
    clients_aging = []
    
    for client in Client.objects.filter(is_active=True):
        unpaid_invoices = Invoice.objects.filter(
            client=client,
            status__in=['sent', 'viewed', 'partial']
        )
        
        if unpaid_invoices.exists():
            aging_data = {'client': client}
            total = 0
            
            for bucket, condition in aging_buckets.items():
                amount = unpaid_invoices.filter(condition).aggregate(
                    total=Sum('total_amount')
                )['total'] or 0
                aging_data[bucket] = amount
                total += amount.amount if hasattr(amount, 'amount') else amount
            
            aging_data['total'] = total
            if total > 0:
                clients_aging.append(aging_data)
    
    # Trier par montant total décroissant
    clients_aging.sort(key=lambda x: x['total'], reverse=True)
    
    context = {
        'clients_aging': clients_aging,
        'today': today,
    }
    
    return render(request, 'invoicing/aging_report.html', context)


# ===== FONCTIONS UTILITAIRES =====

def _generate_invoice_pdf(invoice):
    """Génère le PDF de la facture avec WeasyPrint"""
    from weasyprint import HTML, CSS
    from django.template.loader import render_to_string
    from django.conf import settings
    from io import BytesIO

    # Préparer le contexte pour le template
    context = {
        'invoice': invoice,
    }

    # Utiliser un template existant pour les factures
    html_string = render_to_string('invoicing/pdf_templates/invoice_modern.html', context)

    # Générer le PDF avec WeasyPrint
    html = HTML(string=html_string, base_url=settings.BASE_DIR)
    pdf_bytes = html.write_pdf()

    # Convertir en BytesIO pour compatibilité
    buffer = BytesIO(pdf_bytes)
    buffer.seek(0)

    return buffer.getvalue()


def _get_invoice_email_template(invoice):
    """Template email facture"""
    balance = invoice.get_balance_due()
    
    template = f"""
Bonjour {invoice.client.contact_person},

Veuillez trouver ci-joint la facture {invoice.number} d'un montant de {invoice.total_amount}.

Échéance de paiement: {invoice.due_date}
"""
    
    if balance.amount > 0:
        template += f"""
Montant restant à payer: {balance}

Vous pouvez payer en ligne via PayPal en cliquant sur ce lien:
{invoice.get_paypal_payment_url()}
"""
    
    template += """
Merci de votre collaboration.

Cordialement,
L'équipe comptabilité
"""
    
    return template


def _handle_paypal_payment_completed(payload):
    """Traite les notifications de paiement PayPal complété"""
    # Logique de traitement des webhooks PayPal
    pass


def _handle_paypal_payment_refunded(payload):
    """Traite les notifications de remboursement PayPal"""
    # Logique de traitement des remboursements PayPal
    pass