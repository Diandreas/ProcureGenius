from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Invoice


@login_required
def invoice_list(request):
    """Liste des factures"""
    invoices = Invoice.objects.all().order_by('-created_at')
    
    context = {
        'invoices': invoices,
        'title': 'Factures'
    }
    return render(request, 'invoicing/list.html', context)


@login_required
def invoice_detail(request, invoice_id):
    """Détail d'une facture"""
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    context = {
        'invoice': invoice,
        'title': f'Facture {invoice.invoice_number}'
    }
    return render(request, 'invoicing/detail.html', context)


# API Views
@login_required
def api_invoices(request):
    """API pour les factures"""
    invoices = Invoice.objects.all()[:10]
    data = []
    
    for invoice in invoices:
        data.append({
            'id': str(invoice.id),
            'invoice_number': invoice.invoice_number,
            'title': invoice.title,
            'status': invoice.status,
            'total_amount': float(invoice.total_amount),
            'created_at': invoice.created_at.isoformat(),
        })
    
    return JsonResponse({'invoices': data})
