from rest_framework import serializers
from .models import SourcingEvent, SupplierInvitation, SupplierBid, BidItem
from apps.suppliers.models import Supplier
from django.contrib.auth import get_user_model

User = get_user_model()


class BidItemSerializer(serializers.ModelSerializer):
    """Serializer pour les articles de soumission"""

    class Meta:
        model = BidItem
        fields = [
            'id', 'bid', 'product_reference', 'description', 'specifications',
            'quantity', 'unit_price', 'total_price', 'unit_of_measure',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_price', 'created_at', 'updated_at']


class BidItemCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des articles de soumission"""

    class Meta:
        model = BidItem
        fields = [
            'product_reference', 'description', 'specifications',
            'quantity', 'unit_price', 'unit_of_measure', 'notes'
        ]


class SupplierBidListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des soumissions (vue simplifiée)"""

    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    event_title = serializers.CharField(source='sourcing_event.title', read_only=True)
    event_number = serializers.CharField(source='sourcing_event.event_number', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = SupplierBid
        fields = [
            'id', 'sourcing_event', 'event_number', 'event_title',
            'supplier', 'supplier_name', 'status', 'subtotal', 'tax_amount',
            'total_amount', 'delivery_time_days', 'evaluation_score',
            'created_at', 'submitted_at', 'items_count'
        ]
        read_only_fields = ['id', 'created_at', 'submitted_at']

    def get_items_count(self, obj):
        return obj.items.count()


class SupplierBidDetailSerializer(serializers.ModelSerializer):
    """Serializer pour le détail d'une soumission"""

    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_email = serializers.EmailField(source='supplier.email', read_only=True)
    event_title = serializers.CharField(source='sourcing_event.title', read_only=True)
    event_number = serializers.CharField(source='sourcing_event.event_number', read_only=True)
    items = BidItemSerializer(many=True, read_only=True)
    evaluated_by_name = serializers.CharField(source='evaluated_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = SupplierBid
        fields = [
            'id', 'sourcing_event', 'event_number', 'event_title',
            'supplier', 'supplier_name', 'supplier_email', 'invitation',
            'status', 'cover_letter', 'technical_response', 'terms_accepted',
            'subtotal', 'tax_amount', 'total_amount', 'delivery_time_days',
            'evaluation_score', 'evaluation_notes', 'evaluated_by',
            'evaluated_by_name', 'evaluated_at', 'created_at', 'updated_at',
            'submitted_at', 'items'
        ]
        read_only_fields = [
            'id', 'subtotal', 'total_amount', 'created_at',
            'updated_at', 'submitted_at', 'evaluated_at'
        ]


class SupplierBidCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer/modifier une soumission"""

    items = BidItemCreateSerializer(many=True, required=False)

    class Meta:
        model = SupplierBid
        fields = [
            'sourcing_event', 'supplier', 'cover_letter', 'technical_response',
            'terms_accepted', 'tax_amount', 'delivery_time_days', 'items'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        bid = SupplierBid.objects.create(**validated_data)

        for item_data in items_data:
            BidItem.objects.create(bid=bid, **item_data)

        return bid

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Mise à jour des champs de base
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Mise à jour des items si fournis
        if items_data is not None:
            # Supprime les anciens items
            instance.items.all().delete()
            # Crée les nouveaux items
            for item_data in items_data:
                BidItem.objects.create(bid=instance, **item_data)

        return instance


class SupplierInvitationSerializer(serializers.ModelSerializer):
    """Serializer pour les invitations fournisseurs"""

    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_email = serializers.EmailField(source='supplier.email', read_only=True)
    event_title = serializers.CharField(source='sourcing_event.title', read_only=True)
    has_bid = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = SupplierInvitation
        fields = [
            'id', 'sourcing_event', 'event_title', 'supplier', 'supplier_name',
            'supplier_email', 'status', 'invitation_message', 'decline_reason',
            'created_at', 'sent_at', 'viewed_at', 'responded_at', 'has_bid',
            'access_token', 'public_url'
        ]
        read_only_fields = ['id', 'created_at', 'sent_at', 'viewed_at', 'responded_at', 'access_token']

    def get_has_bid(self, obj):
        return hasattr(obj, 'bid') and obj.bid is not None

    def get_public_url(self, obj):
        return obj.get_public_url()


class SourcingEventListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des événements (vue simplifiée)"""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    invitations_count = serializers.IntegerField(source='total_invitations', read_only=True)
    bids_count = serializers.IntegerField(source='total_bids', read_only=True)

    class Meta:
        model = SourcingEvent
        fields = [
            'id', 'event_number', 'event_type', 'status', 'title',
            'created_by', 'created_by_name', 'created_at', 'published_at',
            'submission_deadline', 'estimated_budget', 'invitations_count',
            'bids_count'
        ]
        read_only_fields = ['id', 'event_number', 'created_at', 'published_at']


class SourcingEventDetailSerializer(serializers.ModelSerializer):
    """Serializer pour le détail d'un événement"""

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    invitations = SupplierInvitationSerializer(many=True, read_only=True)
    bids = SupplierBidListSerializer(many=True, read_only=True)
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = SourcingEvent
        fields = [
            'id', 'event_number', 'event_type', 'status', 'title', 'description',
            'requirements', 'terms_and_conditions', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'published_at', 'submission_deadline',
            'evaluation_deadline', 'estimated_budget', 'evaluation_criteria',
            'invitations', 'bids', 'public_token', 'public_url'
        ]
        read_only_fields = ['id', 'event_number', 'created_at', 'updated_at', 'published_at', 'public_token']

    def get_public_url(self, obj):
        return obj.get_public_url()


class SourcingEventCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer/modifier un événement"""

    suppliers = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="Liste des IDs de fournisseurs à inviter"
    )

    class Meta:
        model = SourcingEvent
        fields = [
            'event_type', 'title', 'description', 'requirements',
            'terms_and_conditions', 'submission_deadline', 'evaluation_deadline',
            'estimated_budget', 'evaluation_criteria', 'suppliers'
        ]

    def create(self, validated_data):
        suppliers_ids = validated_data.pop('suppliers', [])
        user = self.context['request'].user

        event = SourcingEvent.objects.create(created_by=user, **validated_data)

        # Créer les invitations pour les fournisseurs sélectionnés
        for supplier_id in suppliers_ids:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
                SupplierInvitation.objects.create(
                    sourcing_event=event,
                    supplier=supplier
                )
            except Supplier.DoesNotExist:
                pass

        return event

    def update(self, instance, validated_data):
        suppliers_ids = validated_data.pop('suppliers', None)

        # Mise à jour des champs de base
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Mise à jour des invitations si fournis
        if suppliers_ids is not None:
            # Garde les invitations existantes qui ont déjà des soumissions
            existing_invitations = instance.invitations.filter(
                bid__isnull=False
            ).values_list('supplier_id', flat=True)

            # Supprime les invitations sans soumission
            instance.invitations.filter(bid__isnull=True).delete()

            # Ajoute de nouvelles invitations
            for supplier_id in suppliers_ids:
                if supplier_id not in existing_invitations:
                    try:
                        supplier = Supplier.objects.get(id=supplier_id)
                        SupplierInvitation.objects.get_or_create(
                            sourcing_event=instance,
                            supplier=supplier
                        )
                    except Supplier.DoesNotExist:
                        pass

        return instance


class BidEvaluationSerializer(serializers.Serializer):
    """Serializer pour évaluer une soumission"""

    evaluation_score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    evaluation_notes = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=['under_review', 'shortlisted', 'awarded', 'rejected'],
        required=False
    )


class BidComparisonSerializer(serializers.Serializer):
    """Serializer pour comparer les soumissions d'un événement"""

    bid_id = serializers.UUIDField()
    supplier_name = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    delivery_time_days = serializers.IntegerField(allow_null=True)
    evaluation_score = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    status = serializers.CharField()
    submitted_at = serializers.DateTimeField()
    items = BidItemSerializer(many=True)


# Serializers pour l'accès public via token
class PublicSourcingEventSerializer(serializers.ModelSerializer):
    """Serializer pour afficher l'événement aux fournisseurs (sans info sensible)"""

    class Meta:
        model = SourcingEvent
        fields = [
            'event_number', 'title', 'description', 'requirements',
            'terms_and_conditions', 'submission_deadline', 'event_type'
        ]


class PublicBidSubmitSerializer(serializers.Serializer):
    """Serializer pour soumettre une offre via lien public"""

    # Informations fournisseur
    supplier_name = serializers.CharField(max_length=200, required=True)
    supplier_email = serializers.EmailField(required=True)
    supplier_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    supplier_address = serializers.CharField(required=False, allow_blank=True)

    # Informations de soumission
    cover_letter = serializers.CharField(required=False, allow_blank=True)
    technical_response = serializers.CharField(required=False, allow_blank=True)
    terms_accepted = serializers.BooleanField(required=True)
    tax_amount = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)
    delivery_time_days = serializers.IntegerField(required=False, allow_null=True)

    items = BidItemCreateSerializer(many=True, required=True)

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError("Vous devez accepter les termes et conditions")
        return value

    def validate_items(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("Au moins un article est requis")
        return value
