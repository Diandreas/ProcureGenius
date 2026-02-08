"""
Report configuration API views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, serializers

from .models import WeeklyReportConfig


class WeeklyReportConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyReportConfig
        fields = [
            'id', 'is_active', 'frequency', 'include_healthcare',
            'include_inventory', 'include_finance', 'include_stock_alerts',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReportConfigView(APIView):
    """Get or update the current user's report configuration"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config, created = WeeklyReportConfig.objects.get_or_create(
            organization=request.user.organization,
            user=request.user,
            defaults={'is_active': False}
        )
        return Response(WeeklyReportConfigSerializer(config).data)

    def put(self, request):
        config, created = WeeklyReportConfig.objects.get_or_create(
            organization=request.user.organization,
            user=request.user,
            defaults={'is_active': False}
        )

        serializer = WeeklyReportConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReportTestView(APIView):
    """Send a test report email to the current user"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .tasks import _send_report_for_config
        from datetime import date

        config, _ = WeeklyReportConfig.objects.get_or_create(
            organization=request.user.organization,
            user=request.user,
            defaults={
                'is_active': True,
                'include_healthcare': True,
                'include_inventory': True,
                'include_finance': True,
                'include_stock_alerts': True,
            }
        )

        try:
            _send_report_for_config(config, date.today())
            return Response({'message': f'Email test envoye a {request.user.email}'})
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'envoi: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
