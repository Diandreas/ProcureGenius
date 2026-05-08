from rest_framework import serializers
from .models import OrganizationDocument, HealthPackage, DiscountCoupon


class OrganizationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationDocument
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class HealthPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthPackage
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class DiscountCouponSerializer(serializers.ModelSerializer):
    discount_display = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = DiscountCoupon
        fields = [
            'id', 'code', 'label', 'discount_type', 'discount_value',
            'min_amount', 'max_discount_amount',
            'max_uses', 'uses_count', 'expires_at', 'status',
            'created_by', 'created_by_name', 'created_at',
            'discount_display', 'is_valid',
        ]
        read_only_fields = ['id', 'code', 'uses_count', 'status', 'created_by', 'created_at']

    def get_discount_display(self, obj):
        return obj.get_discount_display()

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username
