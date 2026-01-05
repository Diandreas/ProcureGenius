from rest_framework import serializers
from .models import Conversation, Message, DocumentScan


class MessageSerializer(serializers.ModelSerializer):
    """Serializer pour les messages"""
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at', 'metadata']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer pour les conversations"""
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'created_at', 'last_message_at',
            'message_count', 'last_message', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'last_message_at']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'content': last_msg.content[:100] + '...' if len(last_msg.content) > 100 else last_msg.content,
                'role': last_msg.role,
                'created_at': last_msg.created_at
            }
        return None


class DocumentScanSerializer(serializers.ModelSerializer):
    """Serializer pour les documents scannés"""
    class Meta:
        model = DocumentScan
        fields = [
            'id', 'document_type', 'original_filename', 'ocr_text',
            'extracted_data', 'ai_analysis', 'is_processed', 'is_auto_created',
            'created_entity_type', 'created_entity_id', 'created_at', 'processed_at'
        ]
        read_only_fields = ['id', 'created_at', 'processed_at']


class ChatRequestSerializer(serializers.Serializer):
    """Serializer pour les requêtes de chat"""
    message = serializers.CharField(required=True, max_length=2000)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)


class DocumentAnalysisSerializer(serializers.Serializer):
    """Serializer pour l'analyse de documents"""
    text = serializers.CharField(required=True)
    document_type = serializers.ChoiceField(
        choices=['invoice', 'purchase_order', 'supplier_list'],
        default='invoice'
    )
    auto_create = serializers.BooleanField(default=False)