"""
Restockage prédictif — recommande quoi recommander et en quelle quantité,
à partir de la vitesse de vente récente et du stock courant.

Fonctionnalité PREMIUM (plan Pro et plus). Pour le plan gratuit, l'endpoint
renvoie `locked: true` afin que le front affiche un aperçu grisé incitant à
passer Pro.

Méthode (simple et lisible, pas de boîte noire) :
  vitesse_jour = quantités vendues sur la période / nb de jours
  jours_restants = stock_actuel / vitesse_jour
  qty_recommandée = max(0, vitesse_jour × horizon_cible − stock_actuel)
"""
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class RestockForecastView(APIView):
    """
    GET /api/v1/analytics/restock-forecast/?days=30&horizon=30

    - days    : fenêtre d'historique pour estimer la vitesse de vente (défaut 30)
    - horizon : nombre de jours de stock que l'on veut couvrir (défaut 30)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.invoicing.models import Product, StockMovement
        from apps.subscriptions.quota_service import QuotaService

        org = getattr(request.user, 'organization', None)
        if not org:
            return Response({'error': 'Aucune organisation associée'}, status=400)

        # ── Verrou Business ───────────────────────────────────────────────
        # La prévision de réapprovisionnement est réservée au plan Business.
        from apps.core.modules import organization_has_feature, Features
        if not organization_has_feature(org, Features.ANALYTICS_RESTOCK):
            return Response({
                'locked': True,
                'feature': 'analytics_restock',
                'message': "La prévision de réapprovisionnement est incluse dans le plan Business.",
            }, status=403)

        window = int(request.query_params.get('days', 30))
        horizon = int(request.query_params.get('horizon', 30))
        since = date.today() - timedelta(days=window)

        products = Product.objects.filter(organization=org, product_type='physical', is_active=True)

        rows = []
        for p in products:
            sold = (
                StockMovement.objects
                .filter(product=p, movement_type='sale', created_at__date__gte=since)
                .aggregate(q=Sum('quantity'))['q'] or 0
            )
            units_sold = abs(sold)  # les ventes sont stockées en négatif
            velocity = units_sold / window if window else 0  # unités / jour
            stock = p.stock_quantity or 0

            days_left = round(stock / velocity, 1) if velocity > 0 else None
            recommended = max(0, round(velocity * horizon) - stock) if velocity > 0 else 0

            # Urgence : rupture imminente vs marge confortable
            if velocity <= 0:
                urgency = 'idle'        # pas de vente sur la période
            elif days_left is not None and days_left <= 7:
                urgency = 'critical'
            elif days_left is not None and days_left <= horizon:
                urgency = 'soon'
            else:
                urgency = 'ok'

            rows.append({
                'product_id': str(p.id),
                'name': p.name,
                'reference': p.reference,
                'stock': stock,
                'units_sold': units_sold,
                'daily_velocity': round(velocity, 2),
                'days_left': days_left,
                'recommended_qty': recommended,
                'cost_price': float(p.cost_price or 0),
                'estimated_cost': round(recommended * float(p.cost_price or 0), 2),
                'urgency': urgency,
            })

        # Trier : d'abord ce qui va manquer (critical, soon), puis le reste.
        order = {'critical': 0, 'soon': 1, 'ok': 2, 'idle': 3}
        rows.sort(key=lambda r: (order.get(r['urgency'], 9), -(r['recommended_qty'])))

        to_order = [r for r in rows if r['recommended_qty'] > 0]
        total_cost = round(sum(r['estimated_cost'] for r in to_order), 2)

        return Response({
            'locked': False,
            'period': {'window_days': window, 'horizon_days': horizon},
            'summary': {
                'products_analyzed': len(rows),
                'products_to_reorder': len(to_order),
                'critical_count': sum(1 for r in rows if r['urgency'] == 'critical'),
                'estimated_total_cost': total_cost,
            },
            'products': rows,
            'hint': (
                "Quantités recommandées pour couvrir "
                f"{horizon} jours de ventes, calculées sur les {window} derniers jours."
            ),
        })
