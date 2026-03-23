from decimal import Decimal
from rest_framework import serializers
from .models import Account, AccountingJournal, JournalEntry, JournalEntryLine


class AccountSerializer(serializers.ModelSerializer):
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    children_count = serializers.SerializerMethodField()
    has_transactions = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'id', 'code', 'name', 'account_type', 'account_type_display',
            'parent', 'is_active', 'is_system', 'notes',
            'children_count', 'has_transactions', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'is_system']

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()

    def get_has_transactions(self, obj):
        return obj.lines.exists()


class AccountingJournalSerializer(serializers.ModelSerializer):
    journal_type_display = serializers.CharField(source='get_journal_type_display', read_only=True)

    class Meta:
        model = AccountingJournal
        fields = ['id', 'code', 'name', 'journal_type', 'journal_type_display', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = JournalEntryLine
        fields = ['id', 'account', 'account_code', 'account_name', 'description', 'debit', 'credit']
        read_only_fields = ['id']

    def validate(self, data):
        d = data.get('debit', Decimal('0')) or Decimal('0')
        c = data.get('credit', Decimal('0')) or Decimal('0')
        if d == 0 and c == 0:
            raise serializers.ValidationError("Une ligne doit avoir un montant débit ou crédit.")
        if d > 0 and c > 0:
            raise serializers.ValidationError("Une ligne ne peut pas avoir à la fois un débit et un crédit.")
        return data


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True)
    journal_code = serializers.CharField(source='journal.code', read_only=True)
    journal_name = serializers.CharField(source='journal.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    total_debit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_credit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    is_balanced = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'entry_number', 'date', 'description', 'reference',
            'journal', 'journal_code', 'journal_name',
            'status', 'status_display', 'source', 'source_display',
            'source_invoice', 'source_payment',
            'lines', 'total_debit', 'total_credit', 'is_balanced',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'entry_number', 'created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        organization = validated_data['organization']
        journal = validated_data['journal']
        validated_data['entry_number'] = JournalEntry.generate_entry_number(organization, journal)
        entry = JournalEntry.objects.create(**validated_data)
        for line in lines_data:
            JournalEntryLine.objects.create(entry=entry, **line)
        return entry

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data is not None and instance.status == 'draft':
            instance.lines.all().delete()
            for line in lines_data:
                JournalEntryLine.objects.create(entry=instance, **line)
        return instance


class JournalEntryListSerializer(serializers.ModelSerializer):
    """Serializer léger pour la liste (sans lignes détaillées)"""
    journal_code = serializers.CharField(source='journal.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_debit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'entry_number', 'date', 'description', 'reference',
            'journal', 'journal_code', 'status', 'status_display',
            'source', 'total_debit', 'created_at',
        ]
