"""
Endpoint admin des statistiques produit.
Réservé aux superusers — expose get_admin_stats() en JSON.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

from .admin_stats_service import get_admin_stats


class AdminProductStatsView(APIView):
    """
    GET /api/v1/analytics/admin-stats/?days=30
    Statistiques produit complètes (acquisition, activation, usage, revenu, churn).
    Superuser uniquement.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({'detail': 'Réservé aux administrateurs.'}, status=403)
        try:
            days = int(request.query_params.get('days', 30))
        except (TypeError, ValueError):
            days = 30
        days = max(1, min(days, 365))
        return Response(get_admin_stats(days=days))
