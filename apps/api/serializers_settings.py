"""
Serializers pour les paramètres d'organisation, templates et configurations d'impression
"""
from rest_framework import serializers
from apps.core.models import OrganizationSettings
from apps.invoicing.models import PrintTemplate, PrintConfiguration
from .serializers_base import CamelCaseSerializer


class OrganizationSettingsSerializer(CamelCaseSerializer):
    """Serializer pour les paramètres d'organisation avec conversion automatique camelCase"""

    companyLogo = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationSettings
        fields = [
            'id',
            'organization',
            # Informations entreprise
            'company_name',
            'company_address',
            'company_phone',
            'company_email',
            'company_website',
            'companyLogo',
            # Région fiscale
            'tax_region',
            # Identifiants fiscaux (Cameroun/OHADA)
            'company_niu',
            'company_rc_number',
            'company_rccm_number',
            'company_tax_number',
            # Identifiants fiscaux (Canada/Québec)
            'company_neq',
            'company_gst_number',
            'company_qst_number',
            # Identifiants fiscaux (UE/USA)
            'company_vat_number',
            # Informations bancaires
            'company_bank_name',
            'company_bank_account',
            'company_bank_swift',
            # Taxation
            'default_tax_rate',
            'gst_hst_rate',
            'qst_rate',
            'enable_tax_calculation',
            # Facturation
            'invoice_prefix',
            'po_prefix',
            'invoice_terms',
            'default_currency',
            # Notifications
            'email_notifications',
            'invoice_reminders',
            'low_stock_alerts',
            'order_status_updates',
            # Apparence
            'theme',
            'language',
            'date_format',
            'time_format',
            'brand_color',
            # Impression
            'paper_size',
            'paper_orientation',
            'print_margins',
            'include_qr_code',
            'print_colors',
            # Sécurité
            'session_timeout',
            'require_strong_passwords',
            'enable_two_factor',
            'login_attempts',
            # Sauvegarde
            'auto_backup',
            'backup_frequency',
            'backup_retention',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at', 'companyLogo']

    def get_companyLogo(self, obj):
        """Retourne l'URL du logo"""
        if obj.company_logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.company_logo.url)
        return None


class PrintTemplateSerializer(CamelCaseSerializer):
    """Serializer pour les modèles d'impression avec conversion automatique camelCase"""

    logoUrl = serializers.SerializerMethodField()
    headerImageUrl = serializers.SerializerMethodField()
    footerImageUrl = serializers.SerializerMethodField()

    class Meta:
        model = PrintTemplate
        fields = [
            'id',
            'organization',
            'name',
            'template_type',
            'is_default',
            # Logo
            'header_logo',
            'logoUrl',
            'headerImageUrl',
            'footerImageUrl',
            # Informations en-tête
            'header_company_name',
            'header_address',
            'header_phone',
            'header_email',
            'header_website',
            # Footer
            'footer_text',
            'footer_conditions',
            # Couleurs
            'primary_color',
            'secondary_color',
            'text_color',
            # QR Code
            'show_qr_code',
            'qr_code_position',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'logoUrl', 'headerImageUrl', 'footerImageUrl']

    def get_logoUrl(self, obj):
        """Retourne l'URL du logo"""
        if obj.header_logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.header_logo.url)
        return None

    def get_headerImageUrl(self, obj):
        """Retourne l'URL de l'image d'en-tête (pour compatibilité)"""
        return self.get_logoUrl(obj)

    def get_footerImageUrl(self, obj):
        """Retourne l'URL de l'image de pied de page (placeholder pour l'instant)"""
        return None


class PrintConfigurationSerializer(CamelCaseSerializer):
    """Serializer pour la configuration d'impression avec conversion automatique camelCase"""

    class Meta:
        model = PrintConfiguration
        fields = [
            'id',
            'organization',
            'name',
            'is_default',
            # Papier
            'paper_size',
            'orientation',
            # Marges
            'margin_top',
            'margin_bottom',
            'margin_left',
            'margin_right',
            # Police
            'font_family',
            'font_size_normal',
            'font_size_small',
            'font_size_large',
            # Numéros
            'invoice_number_prefix',
            'po_number_prefix',
            # Options
            'include_duplicate_watermark',
            'include_page_numbers',
            'include_total_pages',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
