"""
API Views for widgets and dashboard management
"""
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
import logging

from .models import DashboardLayout
from .serializers import (
    DashboardLayoutSerializer,
    DashboardLayoutCreateSerializer
)
from .widget_data_service import WidgetDataService
from .widgets_registry import get_all_widgets, get_widget, get_widgets_by_module, get_modules

logger = logging.getLogger(__name__)


class WidgetListView(APIView):
    """
    List all available widgets from registry
    Filtered by user's accessible modules
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all widgets, optionally filtered by module, respecting user's module access"""
        from apps.core.modules import get_user_accessible_modules
        
        # Get user's accessible modules
        user_modules = get_user_accessible_modules(request.user)
        
        # Convert module codes to match widget module names (e.g., 'purchase-orders' -> 'purchase_orders')
        module_mapping = {
            'invoices': 'invoices',
            'purchase-orders': 'purchase_orders',
            'purchase_orders': 'purchase_orders',
            'clients': 'clients',
            'products': 'products',
            'suppliers': 'suppliers',
        }
        
        # Normalize module names
        normalized_user_modules = set()
        for mod in user_modules:
            normalized = module_mapping.get(mod, mod)
            normalized_user_modules.add(normalized)
        
        # Always include 'global' module (accessible to all)
        normalized_user_modules.add('global')
        
        module = request.query_params.get('module', None)

        if module:
            # Filter by requested module if user has access
            if module not in normalized_user_modules and module != 'global':
                return Response({
                    'success': True,
                    'data': []
                })
            widgets = get_widgets_by_module(module)
        else:
            # Filter all widgets by user's accessible modules
            all_widgets = get_all_widgets()
            widgets = {
                code: widget 
                for code, widget in all_widgets.items()
                if widget['module'] in normalized_user_modules
            }

        # Group by module if no filter
        if not module:
            grouped = {}
            for code, widget in widgets.items():
                mod = widget['module']
                if mod not in grouped:
                    grouped[mod] = []
                grouped[mod].append(widget)

            return Response({
                'success': True,
                'data': grouped,
                'modules': list(normalized_user_modules)
            })

        return Response({
            'success': True,
            'data': list(widgets.values())
        })


class DashboardLayoutViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dashboard layouts
    """
    serializer_class = DashboardLayoutSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return layouts for the current user
        queryset = DashboardLayout.objects.filter(user=self.request.user)
        logger.info(f"🔍 User {self.request.user.id} ({self.request.user.username}) has {queryset.count()} layouts")
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DashboardLayoutCreateSerializer
        return DashboardLayoutSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get the default layout for the current user"""
        try:
            layout = DashboardLayout.objects.get(
                user=request.user,
                is_default=True
            )
            serializer = self.get_serializer(layout)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except DashboardLayout.DoesNotExist:
            return Response({
                'success': False,
                'error': 'No default layout found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a layout as default"""
        layout = self.get_object()

        # Remove default from other layouts
        DashboardLayout.objects.filter(
            user=request.user
        ).update(is_default=False)

        # Set this as default
        layout.is_default = True
        layout.save()

        return Response({
            'success': True,
            'message': 'Layout set as default'
        })

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a layout"""
        original = self.get_object()

        # Create new layout with copied data
        new_layout = DashboardLayout.objects.create(
            user=request.user,
            name=f"{original.name} (Copy)",
            description=original.description,
            is_default=False,
            layout=original.layout.copy() if original.layout else [],
            global_config=original.global_config.copy() if original.global_config else {}
        )

        serializer = self.get_serializer(new_layout)
        return Response({
            'success': True,
            'data': serializer.data
        })


class WidgetDataView(APIView):
    """
    Get data for a specific widget
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, widget_code):
        """
        Get data for a widget by its code

        Query parameters:
            - period: Period for data (default: last_30_days)
            - start_date: Custom start date (YYYY-MM-DD)
            - end_date: Custom end date (YYYY-MM-DD)
            - limit: Limit for lists/tables
            - compare: Compare with previous period (true/false)
        """
        try:
            # Get the widget from registry
            widget = get_widget(widget_code)
            if not widget:
                return Response({
                    'success': False,
                    'error': f'Widget {widget_code} not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Parse parameters
            period = request.query_params.get('period', 'last_30_days')
            limit = int(request.query_params.get('limit', 10))
            compare = request.query_params.get('compare', 'false').lower() == 'true'

            # Calculate dates
            end_date = timezone.now()
            start_date = self._calculate_start_date(period, request.query_params)

            # Get widget data
            data_service = WidgetDataService(
                user=request.user,
                start_date=start_date,
                end_date=end_date
            )

            # Route to appropriate data method
            widget_data = data_service.get_widget_data(
                widget_code=widget_code,
                limit=limit,
                compare=compare
            )

            return Response({
                'success': True,
                'widget': {
                    'code': widget['code'],
                    'name': widget['name'],
                    'type': widget['type']
                },
                'data': widget_data,
                'metadata': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'generated_at': timezone.now().isoformat()
                }
            })

        except Exception as e:
            logger.error(f"Error fetching widget data for {widget_code}: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _calculate_start_date(self, period: str, params):
        """Calculate start date based on period"""
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
            from datetime import datetime
            start_str = params.get('start_date')
            if start_str:
                return datetime.strptime(start_str, '%Y-%m-%d').replace(tzinfo=timezone.get_current_timezone())
            return now - timedelta(days=30)
        else:
            return now - timedelta(days=30)
