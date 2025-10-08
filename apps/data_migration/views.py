from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db import models
from .models import MigrationJob, MigrationLog
from .serializers import (
    MigrationJobListSerializer, MigrationJobDetailSerializer,
    MigrationJobCreateSerializer, MigrationJobConfigureSerializer,
    MigrationLogSerializer, PreviewDataSerializer
)
from .importers import ExcelCSVImporter
import logging

logger = logging.getLogger(__name__)


class MigrationJobViewSet(viewsets.ModelViewSet):
    """ViewSet pour les jobs de migration"""

    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['created_at', 'started_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = MigrationJob.objects.all()

        # Filtrer par statut
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filtrer par type de source
        source_type = self.request.query_params.get('source_type')
        if source_type:
            queryset = queryset.filter(source_type=source_type)

        # Filtrer par type d'entité
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)

        return queryset.select_related('created_by').prefetch_related('logs')

    def get_serializer_class(self):
        if self.action == 'list':
            return MigrationJobListSerializer
        elif self.action in ['create']:
            return MigrationJobCreateSerializer
        return MigrationJobDetailSerializer

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Génère un aperçu des données et retourne les champs disponibles"""
        job = self.get_object()

        try:
            importer = ExcelCSVImporter(job)

            # Génère l'aperçu
            preview_rows = importer.preview_data(max_rows=10)

            # Récupère les champs disponibles
            df = importer.read_file()
            source_fields = df.columns.tolist()
            available_fields = importer.get_available_fields()

            job.status = 'mapping'
            job.save(update_fields=['status'])

            response_data = {
                'available_fields': available_fields,
                'source_fields': source_fields,
                'preview_rows': preview_rows,
                'total_rows': job.total_rows
            }

            serializer = PreviewDataSerializer(response_data)
            return Response({
                'status': 'success',
                'message': 'Aperçu généré avec succès',
                'data': serializer.data
            })

        except Exception as e:
            logger.error(f"Erreur lors de la génération de l'aperçu: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erreur: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def configure(self, request, pk=None):
        """Configure le mapping des champs"""
        job = self.get_object()
        serializer = MigrationJobConfigureSerializer(data=request.data)

        if serializer.is_valid():
            job.field_mapping = serializer.validated_data['field_mapping']
            job.default_values = serializer.validated_data.get('default_values', {})
            job.transformation_rules = serializer.validated_data.get('transformation_rules', {})
            job.status = 'validating'
            job.save(update_fields=['field_mapping', 'default_values', 'transformation_rules', 'status'])

            return Response({
                'status': 'success',
                'message': 'Configuration enregistrée avec succès',
                'data': MigrationJobDetailSerializer(job).data
            })
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Démarre l'import"""
        job = self.get_object()

        if job.status not in ['mapping', 'validating', 'pending']:
            return Response({
                'status': 'error',
                'message': 'Le job ne peut pas être démarré dans son état actuel'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not job.field_mapping:
            return Response({
                'status': 'error',
                'message': 'Le mapping des champs doit être configuré avant de démarrer'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Lance l'import
            importer = ExcelCSVImporter(job)
            importer.run_import()

            return Response({
                'status': 'success',
                'message': 'Import terminé avec succès',
                'data': MigrationJobDetailSerializer(job).data
            })

        except Exception as e:
            logger.error(f"Erreur lors de l'import: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erreur lors de l\'import: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annule le job"""
        job = self.get_object()

        if job.cancel():
            return Response({
                'status': 'success',
                'message': 'Job annulé avec succès',
                'data': MigrationJobDetailSerializer(job).data
            })
        else:
            return Response({
                'status': 'error',
                'message': 'Le job ne peut pas être annulé'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Retourne les logs du job"""
        job = self.get_object()

        # Filtrer par niveau
        level = request.query_params.get('level')
        logs = job.logs.all()

        if level:
            logs = logs.filter(level=level)

        # Pagination
        page_size = int(request.query_params.get('page_size', 50))
        page = int(request.query_params.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size

        total = logs.count()
        logs = logs[start:end]

        serializer = MigrationLogSerializer(logs, many=True)

        return Response({
            'count': total,
            'results': serializer.data,
            'page': page,
            'page_size': page_size
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Retourne les statistiques des migrations"""
        queryset = self.get_queryset()

        stats = {
            'total_jobs': queryset.count(),
            'completed': queryset.filter(status='completed').count(),
            'in_progress': queryset.filter(status='processing').count(),
            'failed': queryset.filter(status='failed').count(),
            'by_source_type': {},
            'by_entity_type': {},
            'total_imported': {
                'suppliers': 0,
                'products': 0,
                'clients': 0,
            }
        }

        # Statistiques par type de source
        for choice in MigrationJob.SOURCE_TYPE_CHOICES:
            source_key = choice[0]
            stats['by_source_type'][source_key] = queryset.filter(source_type=source_key).count()

        # Statistiques par type d'entité
        for choice in MigrationJob.ENTITY_TYPE_CHOICES:
            entity_key = choice[0]
            stats['by_entity_type'][entity_key] = queryset.filter(entity_type=entity_key).count()

        # Total importé
        for entity_type in ['suppliers', 'products', 'clients']:
            total = queryset.filter(
                entity_type=entity_type,
                status='completed'
            ).aggregate(total=models.Sum('success_count'))['total'] or 0
            stats['total_imported'][entity_type] = total

        return Response(stats)


class MigrationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les logs de migration (lecture seule)"""

    permission_classes = [IsAuthenticated]
    serializer_class = MigrationLogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['message']
    ordering_fields = ['created_at', 'row_number', 'level']
    ordering = ['row_number', 'created_at']

    def get_queryset(self):
        queryset = MigrationLog.objects.all()

        # Filtrer par job
        job_id = self.request.query_params.get('job')
        if job_id:
            queryset = queryset.filter(job_id=job_id)

        # Filtrer par niveau
        level = self.request.query_params.get('level')
        if level:
            queryset = queryset.filter(level=level)

        return queryset.select_related('job')
