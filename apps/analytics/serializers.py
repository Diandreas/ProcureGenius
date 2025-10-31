"""
Serializers for analytics and widgets
"""
from rest_framework import serializers
from .models import DashboardLayout, DashboardConfig, SavedDashboardView


class DashboardLayoutSerializer(serializers.ModelSerializer):
    """Serializer for DashboardLayout model"""
    widgets_count = serializers.SerializerMethodField()

    class Meta:
        model = DashboardLayout
        fields = [
            'id', 'user', 'name', 'description', 'is_default',
            'layout', 'global_config', 'widgets_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_widgets_count(self, obj):
        return len(obj.layout) if obj.layout else 0


class DashboardLayoutCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating dashboard layouts"""

    class Meta:
        model = DashboardLayout
        fields = ['name', 'description', 'is_default', 'layout', 'global_config']


class DashboardConfigSerializer(serializers.ModelSerializer):
    """Serializer for DashboardConfig model"""

    class Meta:
        model = DashboardConfig
        fields = [
            'id', 'user', 'default_period', 'enabled_widgets',
            'favorite_metrics', 'compare_previous_period',
            'export_format', 'email_report_enabled',
            'email_report_frequency', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class SavedDashboardViewSerializer(serializers.ModelSerializer):
    """Serializer for SavedDashboardView model"""

    class Meta:
        model = SavedDashboardView
        fields = [
            'id', 'user', 'name', 'description', 'configuration',
            'is_default', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
