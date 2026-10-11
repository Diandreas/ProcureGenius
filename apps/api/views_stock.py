"""
API des outils de stock : scan d'un code, inventaires physiques, réception de marchandise.
Réservée aux organisations dont le module Produits est actif ; toutes les requêtes sont limitées
à l'organisation de l'utilisateur.
"""
from datetime import date

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.invoicing.models import InventoryLine, InventorySession, Product, Warehouse
from apps.invoicing import stock_tools


def _org(request):
    return getattr(request.user, 'organization', None)


def _product_json(p):
    return {
        'id': str(p.id), 'name': p.name, 'reference': p.reference, 'barcode': p.barcode,
        'stock': p.stock_quantity, 'low_stock_threshold': p.low_stock_threshold,
        'is_low_stock': p.stock_quantity <= p.low_stock_threshold, 'price': str(p.price),
        'cost_price': str(p.cost_price), 'category': p.category.name if p.category_id else None,
        'warehouse': p.warehouse.name if p.warehouse_id else None,
    }


def _line_json(line):
    return {
        'id': str(line.id), 'product_id': str(line.product_id), 'product': line.product.name,
        'reference': line.product.reference, 'barcode': line.product.barcode,
        'batch_id': str(line.batch_id) if line.batch_id else None,
        'batch_number': line.batch.batch_number if line.batch_id else None,
        'expiration_date': line.batch.expiration_date.isoformat() if line.batch_id and line.batch.expiration_date else None,
        'expected': line.expected, 'counted': line.counted, 'applied_delta': line.applied_delta,
        'cost_price': str(line.product.cost_price),
    }


def _session_json(s, with_lines=False):
    data = {
        'id': str(s.id), 'reference': s.reference, 'status': s.status, 'status_display': s.get_status_display(),
        'warehouse': s.warehouse.name if s.warehouse_id else None, 'warehouse_id': str(s.warehouse_id) if s.warehouse_id else None,
        'notes': s.notes, 'created_at': s.created_at, 'applied_at': s.applied_at,
        'created_by': s.created_by.get_full_name() or s.created_by.username if s.created_by_id else None,
        'lines_total': getattr(s, 'n_lines', None), 'lines_counted': getattr(s, 'n_counted', None),
    }
    if with_lines:
        lines = list(s.lines.select_related('product', 'batch'))
        data['lines'] = [_line_json(l) for l in lines]
        data['lines_total'] = len(lines)
        data['lines_counted'] = sum(1 for l in lines if l.counted is not None)
    return data


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scan(request):
    """GET /stock/scan/?code=… : produit (et lot) correspondant au code lu par la caméra ou la douchette."""
    code = (request.query_params.get('code') or '').strip()
    if not code:
        return Response({'error': 'Aucun code fourni'}, status=status.HTTP_400_BAD_REQUEST)
    produit, lot, gs1 = stock_tools.resolve_code(_org(request), code)
    if produit is None:
        return Response({'error': 'Aucun produit ne correspond à ce code', 'code': code, 'gs1': gs1},
                        status=status.HTTP_404_NOT_FOUND)
    data = {'code': code, 'product': _product_json(produit), 'batch': None, 'gs1': gs1}
    if lot:
        data['batch'] = {'id': str(lot.id), 'batch_number': lot.batch_number, 'quantity': lot.current_quantity,
                         'expiration_date': lot.expiration_date.isoformat() if lot.expiration_date else None,
                         'is_expired': bool(lot.expiration_date and lot.expiration_date < date.today())}
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_barcode(request):
    """POST /stock/assign-barcode/ {product_id, barcode} : associe un code-barres scanné à un produit."""
    org = _org(request)
    code = (request.data.get('barcode') or '').strip()
    produit = Product.objects.filter(pk=request.data.get('product_id'), organization=org).first()
    if not produit or not code:
        return Response({'error': 'Produit ou code manquant'}, status=status.HTTP_400_BAD_REQUEST)
    autre = Product.objects.filter(organization=org, barcode=code).exclude(pk=produit.pk).first()
    if autre:
        return Response({'error': f"Ce code est déjà utilisé par « {autre.name} »."}, status=status.HTTP_409_CONFLICT)
    produit.barcode = code
    produit.save(update_fields=['barcode'])
    return Response({'product': _product_json(produit)})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def inventories(request):
    """GET : historique des inventaires. POST {warehouse_id?, notes?} : ouvre un inventaire."""
    org = _org(request)
    if request.method == 'GET':
        qs = (InventorySession.objects.filter(organization=org).select_related('warehouse', 'created_by')
              .annotate(n_lines=Count('lines'), n_counted=Count('lines', filter=Q(lines__counted__isnull=False))))
        return Response([_session_json(s) for s in qs[:100]])
    if InventorySession.objects.filter(organization=org, status='draft').exists():
        return Response({'error': "Un inventaire est déjà en cours : terminez-le ou annulez-le d'abord."},
                        status=status.HTTP_409_CONFLICT)
    wh = None
    if request.data.get('warehouse_id'):
        wh = Warehouse.objects.filter(pk=request.data['warehouse_id'], organization=org).first()
        if wh is None:
            return Response({'error': 'Entrepôt inconnu'}, status=status.HTTP_400_BAD_REQUEST)
    s = stock_tools.start_inventory(org, request.user, wh, request.data.get('notes', ''))
    return Response(_session_json(s, with_lines=True), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_detail(request, pk):
    s = InventorySession.objects.filter(pk=pk, organization=_org(request)).select_related('warehouse', 'created_by').first()
    if s is None:
        return Response({'error': 'Inventaire introuvable'}, status=status.HTTP_404_NOT_FOUND)
    return Response(_session_json(s, with_lines=True))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def inventory_count(request, pk):
    """POST {counts: [{line_id, counted}]} : enregistre des comptages (brouillon, plusieurs fois possible)."""
    s = InventorySession.objects.filter(pk=pk, organization=_org(request)).first()
    if s is None:
        return Response({'error': 'Inventaire introuvable'}, status=status.HTTP_404_NOT_FOUND)
    if s.status != 'draft':
        return Response({'error': "Cet inventaire n'est plus modifiable."}, status=status.HTTP_400_BAD_REQUEST)
    saved, errors = 0, []
    now = timezone.now()
    lines = {str(l.id): l for l in s.lines.all()}
    for c in request.data.get('counts') or []:
        line = lines.get(str(c.get('line_id')))
        if line is None:
            errors.append({'line_id': c.get('line_id'), 'error': 'Ligne inconnue'})
            continue
        val = c.get('counted')
        if val in (None, ''):
            line.counted = None
        else:
            try:
                val = int(val)
            except (TypeError, ValueError):
                errors.append({'line_id': c.get('line_id'), 'error': 'Quantité invalide'})
                continue
            if val < 0:
                errors.append({'line_id': c.get('line_id'), 'error': 'Quantité négative'})
                continue
            line.counted = val
        line.counted_by = request.user
        line.counted_at = now
        line.save(update_fields=['counted', 'counted_by', 'counted_at'])
        saved += 1
    return Response({'saved': saved, 'errors': errors})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def inventory_apply(request, pk):
    s = InventorySession.objects.filter(pk=pk, organization=_org(request)).first()
    if s is None:
        return Response({'error': 'Inventaire introuvable'}, status=status.HTTP_404_NOT_FOUND)
    try:
        rapport = stock_tools.apply_inventory(s, request.user)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'report': rapport, 'inventory': _session_json(InventorySession.objects.get(pk=s.pk), with_lines=True)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def inventory_cancel(request, pk):
    s = InventorySession.objects.filter(pk=pk, organization=_org(request), status='draft').first()
    if s is None:
        return Response({'error': 'Inventaire introuvable ou déjà terminé'}, status=status.HTTP_404_NOT_FOUND)
    s.status = 'cancelled'
    s.save(update_fields=['status'])
    return Response({'status': 'cancelled'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def receive(request):
    """POST {product_id, quantity, batch_number?, expiration_date?, warehouse_id?, unit_cost?, reference?}"""
    org = _org(request)
    produit = Product.objects.filter(pk=request.data.get('product_id'), organization=org).first()
    if produit is None:
        return Response({'error': 'Produit introuvable'}, status=status.HTTP_404_NOT_FOUND)
    try:
        qte = int(request.data.get('quantity'))
    except (TypeError, ValueError):
        return Response({'error': 'Quantité invalide'}, status=status.HTTP_400_BAD_REQUEST)
    exp = None
    if request.data.get('expiration_date'):
        try:
            exp = date.fromisoformat(str(request.data['expiration_date'])[:10])
        except ValueError:
            return Response({'error': 'Date de péremption invalide'}, status=status.HTTP_400_BAD_REQUEST)
    wh = Warehouse.objects.filter(pk=request.data.get('warehouse_id'), organization=org).first() \
        if request.data.get('warehouse_id') else None
    cout = None
    if request.data.get('unit_cost') not in (None, ''):
        from decimal import Decimal, InvalidOperation
        try:
            cout = Decimal(str(request.data['unit_cost']))
        except InvalidOperation:
            return Response({'error': "Prix d'achat invalide"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        produit, lot, _m = stock_tools.receive_goods(
            org, request.user, produit, qte, batch_number=request.data.get('batch_number') or '',
            expiration_date=exp, warehouse=wh, unit_cost=cout, reference=request.data.get('reference') or '')
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'product': _product_json(produit), 'batch': lot.batch_number if lot else None})
