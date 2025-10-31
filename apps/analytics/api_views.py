"""
Vues API améliorées pour le dashboard avec personnalisation et export
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta
from .dashboard_service import DashboardStatsService
from .export_service import DashboardExportService
from .models import DashboardConfig, SavedDashboardView
import logging

logger = logging.getLogger(__name__)


class EnhancedDashboardStatsView(APIView):
    """Vue API améliorée pour les statistiques du dashboard"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Récupère les statistiques avec filtres personnalisés

        Query parameters:
            - period: today, yesterday, last_7_days, last_30_days, last_90_days, this_month, last_month, this_year, custom
            - start_date: Date de début (format: YYYY-MM-DD) si period=custom
            - end_date: Date de fin (format: YYYY-MM-DD) si period=custom
            - compare: true/false - Comparer avec période précédente
            - modules: Liste des modules à inclure (comma-separated)
        """
        try:
            # Récupérer les paramètres
            period = request.query_params.get('period', 'last_30_days')
            compare = request.query_params.get('compare', 'true').lower() == 'true'
            modules_param = request.query_params.get('modules', '')

            # Calculer les dates selon la période
            end_date = timezone.now()
            start_date = self._calculate_start_date(period, request.query_params)

            # Créer le service de statistiques
            stats_service = DashboardStatsService(
                user=request.user,
                start_date=start_date,
                end_date=end_date,
                compare_previous=compare
            )

            # Récupérer les statistiques complètes
            stats = stats_service.get_comprehensive_stats()

            # Filtrer par modules si spécifié
            if modules_param:
                requested_modules = [m.strip() for m in modules_param.split(',')]
                stats = self._filter_stats_by_modules(stats, requested_modules)

            return Response({
                'success': True,
                'data': stats
            })

        except Exception as e:
            logger.error(f"Error fetching dashboard stats: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _calculate_start_date(self, period: str, params):
        """Calcule la date de début selon la période"""
        now = timezone.now()

        if period == 'today':
            return now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'yesterday':
            yesterday = now - timedelta(days=1)
            return yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'last_7_days':
            return now - timedelta(days=7)
        elif period == 'last_30_days':
            return now - timedelta(days=30)
        elif period == 'last_90_days':
            return now - timedelta(days=90)
        elif period == 'this_month':
            return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'last_month':
            first_this_month = now.replace(day=1)
            last_month = first_this_month - timedelta(days=1)
            return last_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'this_year':
            return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'custom':
            start_str = params.get('start_date')
            if start_str:
                return datetime.strptime(start_str, '%Y-%m-%d').replace(tzinfo=timezone.get_current_timezone())
            return now - timedelta(days=30)
        else:
            return now - timedelta(days=30)

    def _filter_stats_by_modules(self, stats: dict, requested_modules: list) -> dict:
        """Filtre les statistiques par modules demandés"""
        filtered = {
            'metadata': stats.get('metadata'),
            'enabled_modules': stats.get('enabled_modules')
        }

        for module in requested_modules:
            if module in stats:
                filtered[module] = stats[module]

        return filtered


class DashboardExportView(APIView):
    """Vue pour exporter le dashboard en PDF ou Excel"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Exporte les statistiques du dashboard

        Body parameters:
            - format: pdf ou xlsx
            - period: same as EnhancedDashboardStatsView
            - start_date: optional
            - end_date: optional
            - compare: optional (default: true)
        """
        try:
            # Récupérer les paramètres
            export_format = request.data.get('format', 'pdf')
            period = request.data.get('period', 'last_30_days')
            compare = request.data.get('compare', True)

            # Calculer les dates
            end_date = timezone.now()
            start_date = self._calculate_start_date(period, request.data)

            # Générer les statistiques
            stats_service = DashboardStatsService(
                user=request.user,
                start_date=start_date,
                end_date=end_date,
                compare_previous=compare
            )
            stats = stats_service.get_comprehensive_stats()

            # Créer le service d'export
            export_service = DashboardExportService(stats, request.user)

            # Générer le fichier selon le format
            if export_format == 'pdf':
                buffer = export_service.export_to_pdf()
                content_type = 'application/pdf'
                filename = f"dashboard_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            elif export_format == 'xlsx':
                buffer = export_service.export_to_excel()
                content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                filename = f"dashboard_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            else:
                return Response({
                    'success': False,
                    'error': 'Format non supporté. Utilisez "pdf" ou "xlsx"'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Retourner le fichier
            response = HttpResponse(buffer.getvalue(), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        except Exception as e:
            logger.error(f"Error exporting dashboard: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _calculate_start_date(self, period: str, data: dict):
        """Calcule la date de début selon la période"""
        now = timezone.now()

        if period == 'custom':
            start_str = data.get('start_date')
            if start_str:
                return datetime.strptime(start_str, '%Y-%m-%d').replace(tzinfo=timezone.get_current_timezone())

        # Utiliser la même logique que EnhancedDashboardStatsView
        view = EnhancedDashboardStatsView()
        return view._calculate_start_date(period, data)


class DashboardConfigView(APIView):
    """Vue pour gérer la configuration du dashboard utilisateur"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupère la configuration du dashboard de l'utilisateur"""
        try:
            config, created = DashboardConfig.objects.get_or_create(user=request.user)

            return Response({
                'success': True,
                'data': {
                    'default_period': config.default_period,
                    'enabled_widgets': config.get_default_widgets(),
                    'favorite_metrics': config.get_favorite_metrics(),
                    'compare_previous_period': config.compare_previous_period,
                    'export_format': config.export_format,
                    'email_report_enabled': config.email_report_enabled,
                    'email_report_frequency': config.email_report_frequency,
                }
            })

        except Exception as e:
            logger.error(f"Error fetching dashboard config: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        """Met à jour la configuration du dashboard"""
        try:
            config, created = DashboardConfig.objects.get_or_create(user=request.user)

            # Mettre à jour les champs
            if 'default_period' in request.data:
                config.default_period = request.data['default_period']
            if 'enabled_widgets' in request.data:
                config.enabled_widgets = request.data['enabled_widgets']
            if 'favorite_metrics' in request.data:
                config.favorite_metrics = request.data['favorite_metrics']
            if 'compare_previous_period' in request.data:
                config.compare_previous_period = request.data['compare_previous_period']
            if 'export_format' in request.data:
                config.export_format = request.data['export_format']
            if 'email_report_enabled' in request.data:
                config.email_report_enabled = request.data['email_report_enabled']
            if 'email_report_frequency' in request.data:
                config.email_report_frequency = request.data['email_report_frequency']

            config.save()

            return Response({
                'success': True,
                'message': 'Configuration mise à jour avec succès',
                'data': {
                    'default_period': config.default_period,
                    'enabled_widgets': config.get_default_widgets(),
                    'favorite_metrics': config.get_favorite_metrics(),
                    'compare_previous_period': config.compare_previous_period,
                }
            })

        except Exception as e:
            logger.error(f"Error updating dashboard config: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SavedDashboardViewsView(APIView):
    """Vue pour gérer les vues sauvegardées du dashboard"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Liste toutes les vues sauvegardées de l'utilisateur"""
        try:
            saved_views = SavedDashboardView.objects.filter(user=request.user)

            views_data = [{
                'id': str(view.id),
                'name': view.name,
                'description': view.description,
                'configuration': view.configuration,
                'is_default': view.is_default,
                'created_at': view.created_at.isoformat(),
                'updated_at': view.updated_at.isoformat(),
            } for view in saved_views]

            return Response({
                'success': True,
                'data': views_data
            })

        except Exception as e:
            logger.error(f"Error fetching saved views: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Crée une nouvelle vue sauvegardée"""
        try:
            name = request.data.get('name')
            if not name:
                return Response({
                    'success': False,
                    'error': 'Le nom est requis'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Créer la vue
            saved_view = SavedDashboardView.objects.create(
                user=request.user,
                name=name,
                description=request.data.get('description', ''),
                configuration=request.data.get('configuration', {}),
                is_default=request.data.get('is_default', False)
            )

            # Si c'est la vue par défaut, retirer le flag des autres
            if saved_view.is_default:
                SavedDashboardView.objects.filter(
                    user=request.user
                ).exclude(id=saved_view.id).update(is_default=False)

            return Response({
                'success': True,
                'message': 'Vue sauvegardée avec succès',
                'data': {
                    'id': str(saved_view.id),
                    'name': saved_view.name,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error creating saved view: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, view_id):
        """Supprime une vue sauvegardée"""
        try:
            saved_view = SavedDashboardView.objects.get(id=view_id, user=request.user)
            saved_view.delete()

            return Response({
                'success': True,
                'message': 'Vue supprimée avec succès'
            })

        except SavedDashboardView.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Vue non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting saved view: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
