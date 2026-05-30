"""
Marges & bénéfice brut par produit — vue « consultation seule » pensée pour un
utilisateur non comptable.

Principe (cf. vision produit) : tout se calcule automatiquement à partir des
données déjà saisies — prix d'achat (`Product.cost_price`) et lignes de factures
finalisées (prix de vente × quantité). Aucune écriture comptable n'est requise :
l'utilisateur consulte sa marge brute, puis ajoute ses charges dans le module
comptabilité pour obtenir son bénéfice net.

Bénéfice brut (gross profit) = Chiffre d'affaires − Coût des marchandises vendues
  CA produit      = Σ (prix_vente_ligne × quantité)
  COGS produit    = Σ (cost_price × quantité)
  Marge brute     = CA − COGS
  Taux de marge % = Marge brute / CA × 100
"""
from decimal import Decimal
from datetime import date, timedelta

from django.db.models import Sum, F, DecimalField, ExpressionWrapper
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

# Statuts de facture considérés comme « vendus » (chiffre d'affaires réalisé).
SOLD_STATUSES = ['sent', 'paid', 'overdue']


def _parse_period(request):
    """Retourne (start, end) à partir de ?period=month|quarter|year|all ou dates explicites."""
    today = date.today()
    period = request.query_params.get('period', 'year')
    start_str = request.query_params.get('start_date')
    end_str = request.query_params.get('end_date')

    if start_str or end_str:
        try:
            start = date.fromisoformat(start_str) if start_str else date(2000, 1, 1)
        except ValueError:
            start = today - timedelta(days=365)
        try:
            end = date.fromisoformat(end_str) if end_str else today
        except ValueError:
            end = today
        return start, end

    if period == 'month':
        return today.replace(day=1), today
    if period == 'quarter':
        return today - timedelta(days=90), today
    if period == 'all':
        return date(2000, 1, 1), today
    # year (défaut)
    return today.replace(month=1, day=1), today


class ProductMarginsView(APIView):
    """
    GET /api/v1/analytics/product-margins/?period=year

    Retourne, par produit et en agrégat, le bénéfice brut sur la période.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.invoicing.models import InvoiceItem

        org = getattr(request.user, 'organization', None)
        if not org:
            return Response({'error': 'Aucune organisation associée'}, status=400)

        start, end = _parse_period(request)

        # Devise de l'organisation (cohérence avec le reste de l'app).
        currency = 'CAD'
        settings_obj = getattr(org, 'settings', None)
        if settings_obj is not None:
            currency = getattr(settings_obj, 'default_currency', None) or currency

        # Lignes de factures finalisées sur la période, rattachées à un produit connu.
        items = (
            InvoiceItem.objects
            .filter(
                invoice__organization=org,
                invoice__status__in=SOLD_STATUSES,
                invoice__created_at__date__gte=start,
                invoice__created_at__date__lte=end,
                product__isnull=False,
            )
            .values('product__id', 'product__name', 'product__reference', 'product__cost_price')
            .annotate(
                units_sold=Sum('quantity'),
                revenue=Sum('total_price'),
                cogs=Sum(
                    ExpressionWrapper(
                        F('quantity') * F('product__cost_price'),
                        output_field=DecimalField(max_digits=16, decimal_places=2),
                    )
                ),
            )
            .order_by('-revenue')
        )

        products = []
        total_revenue = Decimal('0')
        total_cogs = Decimal('0')
        no_cost_count = 0

        for row in items:
            revenue = row['revenue'] or Decimal('0')
            cogs = row['cogs'] or Decimal('0')
            cost_price = row['product__cost_price'] or Decimal('0')
            gross = revenue - cogs
            margin_pct = float(gross / revenue * 100) if revenue > 0 else 0.0

            if cost_price <= 0:
                no_cost_count += 1

            products.append({
                'product_id': str(row['product__id']),
                'name': row['product__name'],
                'reference': row['product__reference'],
                'cost_price': float(cost_price),
                'units_sold': row['units_sold'] or 0,
                'revenue': float(revenue),
                'cogs': float(cogs),
                'gross_profit': float(gross),
                'margin_percent': round(margin_pct, 1),
                'cost_missing': cost_price <= 0,
            })
            total_revenue += revenue
            total_cogs += cogs

        total_gross = total_revenue - total_cogs
        total_margin_pct = float(total_gross / total_revenue * 100) if total_revenue > 0 else 0.0

        return Response({
            'period': {'start': str(start), 'end': str(end)},
            'currency': currency,
            'summary': {
                'total_revenue': float(total_revenue),
                'total_cogs': float(total_cogs),
                'total_gross_profit': float(total_gross),
                'total_margin_percent': round(total_margin_pct, 1),
                'products_count': len(products),
                'products_without_cost': no_cost_count,
            },
            'products': products,
            # Aide pédagogique pour l'utilisateur non comptable.
            'hint': (
                "Le bénéfice brut est calculé automatiquement (ventes − prix d'achat). "
                "Renseignez le prix d'achat de vos produits pour fiabiliser ce calcul, "
                "puis ajoutez vos charges dans Comptabilité pour obtenir votre bénéfice net."
            ),
        })
