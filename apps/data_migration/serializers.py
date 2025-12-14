from rest_framework import serializers
from .models import MigrationJob, MigrationLog
from django.contrib.auth import get_user_model

User = get_user_model()


class MigrationLogSerializer(serializers.ModelSerializer):
    """Serializer pour les logs de migration"""

    class Meta:
        model = MigrationLog
        fields = [
            'id', 'job', 'level', 'message', 'row_number',
            'source_data', 'transformed_data', 'created_object_id',
            'created_object_type', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MigrationJobListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des jobs (vue simplifiée)"""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    progress_percentage = serializers.FloatField(read_only=True)
    duration_seconds = serializers.FloatField(read_only=True)

    class Meta:
        model = MigrationJob
        fields = [
            'id', 'name', 'source_type', 'entity_type', 'status',
            'total_rows', 'processed_rows', 'success_count', 'error_count',
            'skipped_count', 'progress_percentage', 'duration_seconds',
            'created_by', 'created_by_name', 'created_at', 'started_at',
            'completed_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'started_at', 'completed_at',
            'processed_rows', 'success_count', 'error_count', 'skipped_count'
        ]


class MigrationJobDetailSerializer(serializers.ModelSerializer):
    """Serializer pour le détail d'un job"""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    logs = MigrationLogSerializer(many=True, read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    duration_seconds = serializers.FloatField(read_only=True)

    class Meta:
        model = MigrationJob
        fields = [
            'id', 'name', 'source_type', 'entity_type', 'status',
            'source_file', 'file_encoding', 'delimiter', 'has_header',
            'field_mapping', 'default_values', 'transformation_rules',
            'import_suppliers', 'import_products', 'import_clients',
            'skip_duplicates', 'update_existing',
            'total_rows', 'processed_rows', 'success_count', 'error_count',
            'skipped_count', 'preview_data', 'error_summary',
            'progress_percentage', 'duration_seconds',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'started_at', 'completed_at', 'logs'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'started_at', 'completed_at',
            'processed_rows', 'success_count', 'error_count', 'skipped_count',
            'preview_data', 'error_summary'
        ]


class MigrationJobCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un job"""

    class Meta:
        model = MigrationJob
        fields = [
            'id',  # Ajouter l'ID pour que le frontend puisse l'utiliser
            'name', 'source_type', 'entity_type', 'source_file',
            'file_encoding', 'delimiter', 'has_header',
            'skip_duplicates', 'update_existing', 'status',
            'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        user = self.context['request'].user
        job = MigrationJob.objects.create(created_by=user, **validated_data)
        return job


class MigrationJobConfigureSerializer(serializers.Serializer):
    """Serializer pour configurer le mapping d'un job"""

    field_mapping = serializers.JSONField(required=True)
    default_values = serializers.JSONField(required=False, default=dict)
    transformation_rules = serializers.JSONField(required=False, default=dict)


class PreviewDataSerializer(serializers.Serializer):
    """Serializer pour l'aperçu des données"""

    available_fields = serializers.ListField(child=serializers.CharField())
    source_fields = serializers.ListField(child=serializers.CharField())
    preview_rows = serializers.ListField(child=serializers.DictField())
    total_rows = serializers.IntegerField()
