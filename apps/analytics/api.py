"""
API views for analytics module
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from .dashboard_service import DashboardService


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
