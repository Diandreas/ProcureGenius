from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from datetime import datetime

from .models import Report, ReportTemplate
from .serializers import ReportSerializer, ReportTemplateSerializer
from .services import SupplierReportService


class ReportTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet pour les templates de rapports"""
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['report_type', 'is_active', 'is_default']
    search_fields = ['name', 'description']
    ordering = ['-is_default', 'name']


class ReportViewSet(viewsets.ModelViewSet):
    """ViewSet pour les rapports générés"""
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['report_type', 'format', 'status']
    ordering = ['-generated_at']

    def get_queryset(self):
        """Filtrer par utilisateur"""
        return self.queryset.filter(generated_by=self.request.user)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Télécharger un rapport"""
        report = self.get_object()

        if not report.file_path:
            return Response(
                {'error': 'Fichier non disponible'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Incrémenter le compteur
        report.increment_download_count()

        # Retourner le fichier
        return FileResponse(
            report.file_path.open('rb'),
            as_attachment=True,
            filename=report.file_path.name.split('/')[-1]
        )

    @action(detail=False, methods=['post'])
    def generate_supplier(self, request):
        """Générer un rapport fournisseur"""
        supplier_id = request.data.get('supplier_id')
        format = request.data.get('format', 'pdf')
        date_start = request.data.get('date_start')
        date_end = request.data.get('date_end')

        if not supplier_id:
            return Response(
                {'error': 'supplier_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parser les dates si fournies
        if date_start:
            date_start = datetime.fromisoformat(date_start.replace('Z', '+00:00'))
        if date_end:
            date_end = datetime.fromisoformat(date_end.replace('Z', '+00:00'))

        try:
            service = SupplierReportService(user=request.user)
            report = service.generate(
                supplier_id=supplier_id,
                format=format,
                date_start=date_start,
                date_end=date_end
            )

            serializer = self.get_serializer(report)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def my_reports(self, request):
        """Mes rapports récents"""
        reports = self.get_queryset().order_by('-generated_at')[:10]
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)
