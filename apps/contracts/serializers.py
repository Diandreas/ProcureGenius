from rest_framework import serializers
from .models import Contract, ContractClause, ContractMilestone, ContractDocument, ContractTemplate, ContractSection, CONTRACT_SECTION_DEFINITIONS
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


class ContractSectionSerializer(serializers.ModelSerializer):
    """Serializer pour les sections de contrat"""

    class Meta:
        model = ContractSection
        fields = [
            'id', 'contract', 'section_type', 'title', 'content', 'order',
            'is_ai_generated', 'ai_tokens_used', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


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

    supplier_name = serializers.CharField(source='supplier.name', read_only=True, allow_null=True)
    supplier_email = serializers.EmailField(source='supplier.email', read_only=True, allow_null=True)
    internal_contact_name = serializers.CharField(source='internal_contact.get_full_name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)

    clauses = ContractClauseSerializer(many=True, read_only=True)
    milestones = ContractMilestoneSerializer(many=True, read_only=True)
    documents = ContractDocumentSerializer(many=True, read_only=True)
    sections = ContractSectionSerializer(many=True, read_only=True)

    days_until_expiry = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    counterpart_display = serializers.CharField(read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'contract_number', 'title', 'contract_type', 'status',
            'supplier', 'supplier_name', 'supplier_email',
            'client', 'counterpart_name', 'counterpart_display',
            'internal_contact', 'internal_contact_name',
            'signed_by_us', 'signed_by_us_at', 'signed_by_us_name',
            'signed_by_counterpart', 'signed_by_counterpart_at', 'signed_by_counterpart_name',
            'contract_body',
            'description', 'terms_and_conditions', 'payment_terms',
            'start_date', 'end_date', 'total_value', 'currency',
            'auto_renewal', 'renewal_notice_days', 'renewal_count',
            'alert_days_before_expiry', 'last_alert_sent',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at', 'approved_at', 'terminated_at',
            'internal_notes', 'clauses', 'milestones', 'documents', 'sections',
            'days_until_expiry', 'is_expiring_soon', 'is_expired'
        ]
        read_only_fields = [
            'id', 'contract_number', 'created_at', 'updated_at',
            'approved_at', 'terminated_at', 'last_alert_sent'
        ]


class ContractCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer/modifier un contrat"""

    sections_data = serializers.ListField(child=serializers.DictField(), required=False, write_only=True)

    class Meta:
        model = Contract
        fields = [
            'title', 'contract_type', 'supplier', 'client', 'counterpart_name',
            'internal_contact',
            'description', 'terms_and_conditions', 'payment_terms', 'contract_body',
            'start_date', 'end_date', 'total_value', 'currency',
            'auto_renewal', 'renewal_notice_days', 'alert_days_before_expiry',
            'internal_notes',
            'signed_by_us', 'signed_by_us_name', 'signed_by_us_at',
            'signed_by_counterpart', 'signed_by_counterpart_name', 'signed_by_counterpart_at',
            'sections_data',
        ]

    def create(self, validated_data):
        sections_data = validated_data.pop('sections_data', [])
        contract = super().create(validated_data)

        # Créer les sections
        for section in sections_data:
            ContractSection.objects.create(
                contract=contract,
                section_type=section.get('section_type', 'custom'),
                title=section.get('title', ''),
                content=section.get('content', ''),
                order=section.get('order', 0),
                is_ai_generated=section.get('is_ai_generated', False),
                ai_tokens_used=section.get('ai_tokens_used', 0),
            )

        # Assembler le contract_body depuis les sections
        if sections_data and not contract.contract_body:
            contract.contract_body = self._assemble_body(sections_data)
            contract.save(update_fields=['contract_body'])

        return contract

    def update(self, instance, validated_data):
        sections_data = validated_data.pop('sections_data', None)
        instance = super().update(instance, validated_data)

        if sections_data is not None:
            # Remplacer les sections existantes
            instance.sections.all().delete()
            for section in sections_data:
                ContractSection.objects.create(
                    contract=instance,
                    section_type=section.get('section_type', 'custom'),
                    title=section.get('title', ''),
                    content=section.get('content', ''),
                    order=section.get('order', 0),
                    is_ai_generated=section.get('is_ai_generated', False),
                    ai_tokens_used=section.get('ai_tokens_used', 0),
                )
            # Réassembler le body
            instance.contract_body = self._assemble_body(sections_data)
            instance.save(update_fields=['contract_body'])

        return instance

    @staticmethod
    def _assemble_body(sections_data):
        """Assemble le HTML final à partir des sections"""
        parts = []
        for s in sorted(sections_data, key=lambda x: x.get('order', 0)):
            title = s.get('title', '')
            content = s.get('content', '')
            if title:
                parts.append(f'<h2>{title}</h2>')
            if content:
                parts.append(content)
        return '\n'.join(parts)


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


class ContractTemplateSerializer(serializers.ModelSerializer):
    """Serializer pour les modèles de contrat"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = ContractTemplate
        fields = [
            'id', 'name', 'template_type', 'description', 'content', 'ai_prompt_instructions', 
            'is_active', 'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        user = self.context['request'].user
        template = ContractTemplate.objects.create(created_by=user, **validated_data)
        return template
