"""
Batch/Lot management API views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta, date

from .models import ProductBatch, Product, StockMovement
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

            # Créer un mouvement de stock "réception" lié au lot
            if product.product_type == 'physical' and batch.quantity > 0:
                try:
                    old_stock = product.stock_quantity or 0
                    new_stock = old_stock + batch.quantity
                    product.stock_quantity = new_stock
                    product.save(update_fields=['stock_quantity'])
                    StockMovement.objects.create(
                        product=product,
                        batch=batch,
                        movement_type='reception',
                        quantity=batch.quantity,
                        quantity_before=old_stock,
                        quantity_after=new_stock,
                        reference_type='manual',
                        notes=f"Réception lot {batch.batch_number} — péremption {batch.expiry_date}",
                        created_by=request.user,
                    )
                except Exception as e:
                    # Ne pas bloquer la création du lot si le mouvement échoue
                    import traceback
                    traceback.print_exc()

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


class OpenedReagentsView(APIView):
    """Get all opened batches (reagents) with their effective expiry tracking"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        show_all = request.query_params.get('all', 'false') == 'true'

        filters = {
            'organization': organization,
            'quantity_remaining__gt': 0,
        }

        if show_all:
            filters['status__in'] = ['available', 'opened']
        else:
            filters['status'] = 'opened'

        batches = ProductBatch.objects.filter(
            **filters
        ).select_related('product').order_by('expiry_date')

        results = []
        for batch in batches:
            eff_expiry = batch.effective_expiry
            days_left = (eff_expiry - date.today()).days if eff_expiry else batch.days_until_expiry

            results.append({
                'id': str(batch.id),
                'product_id': str(batch.product_id),
                'product_name': batch.product.name,
                'product_reference': batch.product.reference,
                'batch_number': batch.batch_number,
                'lot_number': batch.lot_number or '',
                'quantity': batch.quantity,
                'quantity_remaining': batch.quantity_remaining,
                'expiry_date': batch.expiry_date.isoformat() if batch.expiry_date else None,
                'opened_at': batch.opened_at.isoformat() if batch.opened_at else None,
                'shelf_life_after_opening_days': batch.shelf_life_after_opening_days,
                'effective_expiry': eff_expiry.isoformat() if eff_expiry else None,
                'days_until_expiry': days_left,
                'status': batch.status,
                'is_expired': batch.is_expired,
                'default_shelf_life': getattr(batch.product, 'default_shelf_life_after_opening', None),
            })

        return Response({
            'batches': results,
            'total': len(results),
            'opened_count': sum(1 for b in results if b['status'] == 'opened'),
            'expired_count': sum(1 for b in results if b['is_expired']),
            'expiring_soon_count': sum(1 for b in results if b['days_until_expiry'] is not None and 0 < b['days_until_expiry'] <= 3),
        })

class BatchDeleteView(APIView):
    """
    DELETE /api/batches/<uuid>/delete/
    Supprime un lot uniquement dans les 30 minutes suivant sa creation.
    Inverse le mouvement de reception et met a jour le stock.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, batch_id):
        organization = request.user.organization
        batch = get_object_or_404(ProductBatch, id=batch_id, organization=organization)

        # Verifier la fenetre de 30 minutes
        elapsed_seconds = (timezone.now() - batch.received_at).total_seconds()
        if elapsed_seconds > 1800:
            minutes_elapsed = int(elapsed_seconds / 60)
            return Response(
                {'error': f'Suppression impossible : le lot a ete cree il y a {minutes_elapsed} min (limite : 30 min).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Interdire si des mouvements autres que reception existent (lot deja utilise)
        non_reception_count = batch.movements.exclude(movement_type='reception').count()
        if non_reception_count > 0:
            return Response(
                {'error': 'Ce lot a des mouvements de sortie. Suppression impossible.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        product = batch.product

        # Calculer la quantite recue via les mouvements de reception
        reception_qty = batch.movements.filter(
            movement_type='reception'
        ).aggregate(total=Sum('quantity'))['total'] or batch.quantity

        # Inverser le stock
        product.stock_quantity = max(0, (product.stock_quantity or 0) - reception_qty)
        product.save(update_fields=['stock_quantity'])

        # Supprimer les mouvements puis le lot
        batch.movements.all().delete()
        batch_number = batch.batch_number
        batch.delete()

        return Response({
            'message': f'Lot {batch_number} supprime. Stock remis a {product.stock_quantity}.',
            'product_stock': product.stock_quantity,
        })
