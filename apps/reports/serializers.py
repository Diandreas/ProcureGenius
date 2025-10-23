from rest_framework import serializers
from .models import Report, ReportTemplate


class ReportTemplateSerializer(serializers.ModelSerializer):
    """Serializer pour les templates de rapports"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'name', 'report_type', 'description', 'configuration',
            'is_active', 'is_default', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']


class ReportSerializer(serializers.ModelSerializer):
    """Serializer pour les rapports"""
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'template', 'report_type', 'report_type_display',
            'format', 'format_display', 'parameters', 'status', 'status_display',
            'error_message', 'file_path', 'file_url', 'file_name', 'file_size',
            'generated_by', 'generated_by_name', 'generated_at', 'completed_at',
            'download_count', 'last_downloaded_at'
        ]
        read_only_fields = [
            'id', 'file_path', 'file_url', 'file_name', 'file_size', 'status',
            'error_message', 'generated_by', 'generated_by_name', 'generated_at',
            'completed_at', 'download_count', 'last_downloaded_at',
            'report_type_display', 'format_display', 'status_display'
        ]

    def get_file_url(self, obj):
        if obj.file_path:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/api/reports/{obj.id}/download/')
        return None

    def get_file_name(self, obj):
        if obj.file_path:
            return obj.file_path.name.split('/')[-1]
        return None
