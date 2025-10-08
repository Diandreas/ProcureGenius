from rest_framework import serializers
from .models import Contract, ContractClause, ContractMilestone, ContractDocument
from django.contrib.auth import get_user_model

User = get_user_model()


class ContractClauseSerializer(serializers.ModelSerializer):
    """Serializer pour les clauses de contrat"""

    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = ContractClause
        fields = [
            'id', 'contract', 'clause_type', 'title', 'content', 'section_reference',
            'risk_level', 'ai_confidence_score', 'ai_analysis', 'ai_recommendations',
            'extracted_by_ai', 'verified', 'verified_by', 'verified_by_name',
            'verified_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'verified_at']


class ContractMilestoneSerializer(serializers.ModelSerializer):
    """Serializer pour les jalons de contrat"""

    completed_by_name = serializers.CharField(source='completed_by.get_full_name', read_only=True, allow_null=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = ContractMilestone
        fields = [
            'id', 'contract', 'title', 'description', 'due_date', 'status',
            'payment_amount', 'completed_at', 'completed_by', 'completed_by_name',
            'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']


class ContractDocumentSerializer(serializers.ModelSerializer):
    """Serializer pour les documents de contrat"""

    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True, allow_null=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ContractDocument
        fields = [
            'id', 'contract', 'document_type', 'title', 'description', 'file',
            'file_url', 'file_size', 'mime_type', 'uploaded_by', 'uploaded_by_name',
            'uploaded_at'
        ]
        read_only_fields = ['id', 'file_size', 'mime_type', 'uploaded_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ContractListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des contrats (vue simplifiée)"""

    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    clauses_count = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            'id', 'contract_number', 'title', 'contract_type', 'status',
            'supplier', 'supplier_name', 'start_date', 'end_date',
            'total_value', 'currency', 'created_by', 'created_by_name',
            'created_at', 'days_until_expiry', 'is_expiring_soon',
            'is_expired', 'clauses_count'
        ]
        read_only_fields = ['id', 'contract_number', 'created_at']

    def get_clauses_count(self, obj):
        return obj.clauses.count()


class ContractDetailSerializer(serializers.ModelSerializer):
    """Serializer pour le détail d'un contrat"""

    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_email = serializers.EmailField(source='supplier.email', read_only=True)
    internal_contact_name = serializers.CharField(source='internal_contact.get_full_name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)

    clauses = ContractClauseSerializer(many=True, read_only=True)
    milestones = ContractMilestoneSerializer(many=True, read_only=True)
    documents = ContractDocumentSerializer(many=True, read_only=True)

    days_until_expiry = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'contract_number', 'title', 'contract_type', 'status',
            'supplier', 'supplier_name', 'supplier_email',
            'internal_contact', 'internal_contact_name',
            'description', 'terms_and_conditions', 'payment_terms',
            'start_date', 'end_date', 'total_value', 'currency',
            'auto_renewal', 'renewal_notice_days', 'renewal_count',
            'alert_days_before_expiry', 'last_alert_sent',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at', 'approved_at', 'terminated_at',
            'internal_notes', 'clauses', 'milestones', 'documents',
            'days_until_expiry', 'is_expiring_soon', 'is_expired'
        ]
        read_only_fields = [
            'id', 'contract_number', 'created_at', 'updated_at',
            'approved_at', 'terminated_at', 'last_alert_sent'
        ]


class ContractCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer/modifier un contrat"""

    class Meta:
        model = Contract
        fields = [
            'title', 'contract_type', 'supplier', 'internal_contact',
            'description', 'terms_and_conditions', 'payment_terms',
            'start_date', 'end_date', 'total_value', 'currency',
            'auto_renewal', 'renewal_notice_days', 'alert_days_before_expiry',
            'internal_notes'
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        contract = Contract.objects.create(created_by=user, **validated_data)
        return contract


class ClauseExtractionRequestSerializer(serializers.Serializer):
    """Serializer pour la requête d'extraction de clauses par IA"""

    contract_text = serializers.CharField(required=True, help_text="Texte complet du contrat à analyser")
    extract_risk_analysis = serializers.BooleanField(default=True, help_text="Inclure l'analyse de risque")
    language = serializers.ChoiceField(choices=[('fr', 'Français'), ('en', 'English')], default='fr')


class ClauseExtractionResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse d'extraction de clauses par IA"""

    clauses = ContractClauseSerializer(many=True)
    summary = serializers.CharField()
    overall_risk_assessment = serializers.CharField()
    key_dates = serializers.ListField(child=serializers.DictField())
    recommendations = serializers.ListField(child=serializers.CharField())


class ContractApprovalSerializer(serializers.Serializer):
    """Serializer pour approuver un contrat"""

    notes = serializers.CharField(required=False, allow_blank=True)


class ContractRenewalSerializer(serializers.Serializer):
    """Serializer pour renouveler un contrat"""

    new_end_date = serializers.DateField(required=True)
    new_total_value = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
