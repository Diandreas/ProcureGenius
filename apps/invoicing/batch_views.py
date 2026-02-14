"""
Batch/Lot management API views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta, date

from .models import ProductBatch, Product
from .batch_serializers import ProductBatchSerializer, ProductBatchCreateSerializer


class ProductBatchListCreateView(APIView):
    """List and create batches for a product"""
    permission_classes = [IsAuthenticated]

    def get(self, request, product_id):
        organization = request.user.organization
        batches = ProductBatch.objects.filter(
            organization=organization,
            product_id=product_id
        ).select_related('product')
        serializer = ProductBatchSerializer(batches, many=True)
        return Response(serializer.data)

    def post(self, request, product_id):
        organization = request.user.organization
        product = get_object_or_404(Product, id=product_id, organization=organization)

        serializer = ProductBatchCreateSerializer(data=request.data)
        if serializer.is_valid():
            batch = serializer.save(
                organization=organization,
                product=product,
                created_by=request.user
            )
            return Response(
                ProductBatchSerializer(batch).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductBatchDetailView(APIView):
    """Update a batch"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, batch_id):
        organization = request.user.organization
        batch = get_object_or_404(ProductBatch, id=batch_id, organization=organization)

        allowed_fields = ['quantity_remaining', 'notes', 'shelf_life_after_opening_days', 'lot_number']
        for field in allowed_fields:
            if field in request.data:
                setattr(batch, field, request.data[field])

        batch.save()
        batch.update_status()
        return Response(ProductBatchSerializer(batch).data)


class BatchOpenView(APIView):
    """Mark a batch as opened"""
    permission_classes = [IsAuthenticated]

    def post(self, request, batch_id):
        organization = request.user.organization
        batch = get_object_or_404(ProductBatch, id=batch_id, organization=organization)

        if batch.status not in ('available',):
            return Response(
                {'error': 'Ce lot ne peut pas être ouvert (statut actuel: {})'.format(batch.get_status_display())},
                status=status.HTTP_400_BAD_REQUEST
            )

        batch.open_batch()
        return Response(ProductBatchSerializer(batch).data)


class ExpiringBatchesView(APIView):
    """Get batches expiring within N days"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        days = int(request.query_params.get('days', 30))

        cutoff_date = date.today() + timedelta(days=days)

        batches = ProductBatch.objects.filter(
            organization=organization,
            status__in=['available', 'opened'],
            expiry_date__lte=cutoff_date,
            quantity_remaining__gt=0
        ).select_related('product').order_by('expiry_date')

        results = []
        for batch in batches:
            results.append({
                'id': str(batch.id),
                'product_id': str(batch.product_id),
                'product_name': batch.product.name,
                'batch_number': batch.batch_number,
                'quantity_remaining': batch.quantity_remaining,
                'expiry_date': batch.expiry_date.isoformat(),
                'effective_expiry': batch.effective_expiry.isoformat(),
                'days_until_expiry': batch.days_until_expiry,
                'status': batch.status,
                'is_expired': batch.is_expired,
            })

        return Response({
            'batches': results,
            'total': len(results),
            'expired_count': sum(1 for b in results if b['is_expired']),
            'expiring_soon_count': sum(1 for b in results if 0 < b['days_until_expiry'] <= 7),
        })
