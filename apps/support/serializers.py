from rest_framework import serializers
from .models import SupportTicket, SupportTicketAttachment


class SupportTicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicketAttachment
        fields = ['id', 'file', 'uploaded_at']


class SupportTicketSerializer(serializers.ModelSerializer):
    attachments = SupportTicketAttachmentSerializer(many=True, read_only=True)
    reported_by_name = serializers.SerializerMethodField()
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'title', 'module', 'module_display', 'category', 'category_display',
            'description', 'status', 'status_display', 'priority', 'admin_response',
            'page_url', 'reported_by_name', 'attachments',
            'created_at', 'updated_at', 'resolved_at',
        ]
        read_only_fields = fields

    def get_reported_by_name(self, obj):
        if not obj.reported_by:
            return None
        return obj.reported_by.get_full_name() or obj.reported_by.username


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['title', 'module', 'category', 'description', 'priority', 'page_url']


class SupportTicketUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['status', 'priority', 'admin_response']
