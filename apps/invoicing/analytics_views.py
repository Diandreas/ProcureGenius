"""
Invoice Statistics Views
Provides detailed analytics for invoices with drill-down capability
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, Q
from .models import Invoice, InvoiceItem


class InvoiceStatisticsView(APIView):
    """
    Invoice statistics with drill-down capability
    Query params: start_date, end_date, status, invoice_type, client
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization

        # Apply filters
        invoices = Invoice.objects.filter(created_by__organization=organization)

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        status = request.GET.get('status')
        invoice_type = request.GET.get('invoice_type')
        client_id = request.GET.get('client')

        if start_date:
            invoices = invoices.filter(created_at__gte=start_date)
        if end_date:
            invoices = invoices.filter(created_at__lte=end_date)
        if status:
            invoices = invoices.filter(status=status)
        if invoice_type:
            invoices = invoices.filter(invoice_type=invoice_type)
        if client_id:
            invoices = invoices.filter(client_id=client_id)

        # Main statistics
        main_stats = invoices.aggregate(
            total_invoices=Count('id'),
            total_revenue=Sum('total_amount'),
            avg_invoice_amount=Avg('total_amount')
        )

        # Breakdown by status
        by_status = invoices.values('status').annotate(
            count=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('-revenue')

        # Breakdown by invoice type (service category)
        by_type = invoices.values('invoice_type').annotate(
            count=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('-revenue')

        # Drill-down: by individual service (service_code in invoice items)
        invoice_ids = invoices.values_list('id', flat=True)
        items = InvoiceItem.objects.filter(invoice_id__in=invoice_ids)

        by_service = items.values('service_code', 'description').annotate(
            count=Count('id'),
            quantity_total=Sum('quantity'),
            revenue=Sum('total_price')
        ).order_by('-revenue')[:20]  # Top 20 services

        # Drill-down: by individual product
        by_product = items.filter(product__isnull=False).values(
            'product__id',
            'product__name',
            'product__category__name'
        ).annotate(
            count=Count('id'),
            quantity_total=Sum('quantity'),
            revenue=Sum('total_price')
        ).order_by('-revenue')[:20]  # Top 20 products

        # Get status and type choices
        status_dict = dict(Invoice.STATUS_CHOICES) if hasattr(Invoice, 'STATUS_CHOICES') else {}
        type_dict = dict(Invoice.INVOICE_TYPES) if hasattr(Invoice, 'INVOICE_TYPES') else {}

        return Response({
            'filters_applied': {
                'start_date': start_date,
                'end_date': end_date,
                'status': status,
                'invoice_type': invoice_type,
                'client': client_id
            },
            'main_statistics': {
                'total_invoices': main_stats['total_invoices'],
                'total_revenue': float(main_stats['total_revenue'] or 0),
                'avg_invoice_amount': float(main_stats['avg_invoice_amount'] or 0)
            },
            'breakdown_by_status': [{
                'status': item['status'],
                'status_label': status_dict.get(item['status'], item['status']) if status_dict else item['status'],
                'count': item['count'],
                'revenue': float(item['revenue'] or 0)
            } for item in by_status],
            'breakdown_by_type': [{
                'type': item['invoice_type'],
                'type_label': type_dict.get(item['invoice_type'], item['invoice_type']) if type_dict else item['invoice_type'],
                'count': item['count'],
                'revenue': float(item['revenue'] or 0)
            } for item in by_type],
            'top_services': [{
                'service_code': item['service_code'],
                'description': item['description'],
                'count': item['count'],
                'quantity_total': item['quantity_total'],
                'revenue': float(item['revenue'] or 0)
            } for item in by_service],
            'top_products': [{
                'product_id': str(item['product__id']),
                'product_name': item['product__name'],
                'category': item['product__category__name'],
                'count': item['count'],
                'quantity_total': item['quantity_total'],
                'revenue': float(item['revenue'] or 0)
            } for item in by_product]
        })
