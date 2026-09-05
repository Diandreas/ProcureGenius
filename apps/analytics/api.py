"""
API views for analytics module
"""
from rest_framework.views import APIView
from rest_framework import generics, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.utils import timezone
from datetime import timedelta
from .models import ActivityLog

# ActivityLogSerializer est défini ici plutôt qu'importé de .serializers :
# ce fichier importe (en top-level) trois modèles qui n'existent plus dans
# apps/analytics/models.py (DashboardLayout/DashboardConfig/SavedDashboardView
# - supprimés sans que le fichier soit nettoyé). Il n'a jamais planté car rien
# ne l'importait jusqu'ici (apps/analytics/urls.py, seul point d'entrée, est
# commenté dans saas_procurement/urls.py). Rester à l'écart plutôt que de
# remettre en état tout un fichier mort et hors-scope ici.
from rest_framework import serializers as drf_serializers


class ActivityLogSerializer(drf_serializers.ModelSerializer):
    """Journal d'activité généraliste (voir apps/analytics/activity_logger.py) —
    mirror de LabAuditLogSerializer côté Labo, mais pour les entity_type
    hors module Labo (bons de commande, fournisseurs, factures, ...)."""
    user_name = drf_serializers.SerializerMethodField()
    action_label = drf_serializers.CharField(source='get_action_type_display', read_only=True)
    entity_type_label = drf_serializers.CharField(source='get_entity_type_display', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'created_at', 'action_type', 'action_label',
            'entity_type', 'entity_type_label', 'entity_id',
            'description', 'metadata', 'user_name',
        ]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'Système'


class DetailedStockStatsView(APIView):
    """Get detailed stock statistics"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Import local : apps.analytics.dashboard_service n'existe plus dans le
        # repo (supprimé sans que cet import soit nettoyé) — en top-level ça
        # cassait le chargement de TOUT apps/analytics/api.py au démarrage dès
        # qu'un autre module l'importe (ce qui n'arrivait jamais avant : cette
        # vue n'est câblée que sous apps/analytics/urls.py, commenté dans
        # saas_procurement/urls.py). Import local = l'appli démarre quand même ;
        # cette vue précise continuera de 404 si jamais rappelée telle quelle.
        from .dashboard_service import DashboardService

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
