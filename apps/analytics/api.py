"""
API views for analytics module
"""
from rest_framework.views import APIView
from rest_framework import generics, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.utils import timezone
from datetime import timedelta
from .dashboard_service import DashboardService
from .models import ActivityLog
from .serializers import ActivityLogSerializer


class DetailedStockStatsView(APIView):
    """Get detailed stock statistics"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get date range from query params or default to last 30 days
        days = int(request.GET.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Initialize dashboard service
        dashboard = DashboardService(
            organization=request.user.organization,
            start_date=start_date,
            end_date=end_date
        )

        # Get detailed stock stats
        stats = dashboard.get_detailed_stock_stats()

        return Response(stats)


class IsAdminOrManager(BasePermission):
    """Journal d'audit généraliste : réservé admin/manager (pas la personne
    dont on audite les actions elle-même — comportement voulu, cf LabAuditLog)."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.is_superuser or request.user.role in ('admin', 'manager'))
        )


class ActivityLogListView(generics.ListAPIView):
    """
    GET /api/analytics/activity-logs/
    Journal d'audit généraliste (ActivityLog) — pour l'instant alimenté par les
    actions Achats (bons de commande) et l'annulation de facture ; le modèle
    supporte aussi d'autres entity_type au besoin (voir models.py ENTITY_TYPES).
    Filtres : ?entity_type=purchase_order|supplier|invoice|...
              ?action_type=create|update|delete|approve|send|...
              ?user_id=<uuid>  ?date_from=YYYY-MM-DD  ?date_to=YYYY-MM-DD
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdminOrManager]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']

    def get_queryset(self):
        qs = ActivityLog.objects.filter(
            organization=self.request.user.organization
        ).select_related('user')

        entity_type = self.request.GET.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        action_type = self.request.GET.get('action_type')
        if action_type:
            qs = qs.filter(action_type=action_type)

        user_id = self.request.GET.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        date_from = self.request.GET.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = self.request.GET.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs
