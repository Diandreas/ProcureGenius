from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.accounts.models import Organization
import uuid


class Core(models.Model):
    """Modèle core simplifié"""
    pass


class OrganizationSettings(models.Model):
    """Paramètres et configuration de l'organisation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='settings',
        verbose_name=_("Organisation")
    )

    # Informations entreprise
    company_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Nom de l'entreprise")
    )
    company_address = models.TextField(
        blank=True,
        verbose_name=_("Adresse")
    )
    company_phone = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Téléphone")
    )
    company_email = models.EmailField(
        blank=True,
        verbose_name=_("Email")
    )
    company_website = models.URLField(
        blank=True,
        verbose_name=_("Site web")
    )
    company_logo = models.ImageField(
        upload_to='organization/logos/',
        blank=True,
        null=True,
        verbose_name=_("Logo")
    )

    # Identifiants légaux et fiscaux (Conformité Cameroun & OHADA)
    company_niu = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("NIU (Numéro Identifiant Unique)"),
        help_text=_("Obligatoire au Cameroun - Identifiant fiscal unique")
    )
    company_tax_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Numéro de contribuable"),
        help_text=_("Numéro d'identification fiscale")
    )
    company_rc_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Numéro de Registre de Commerce (RC)"),
        help_text=_("Numéro d'immatriculation au registre de commerce")
    )
    company_rccm_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Numéro RCCM"),
        help_text=_("Registre du Commerce et du Crédit Mobilier (OHADA)")
    )
    company_vat_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Numéro de TVA"),
        help_text=_("Numéro de TVA intracommunautaire (si applicable)")
    )

    # Informations bancaires (OHADA & UE 2030)
    company_bank_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("Nom de la banque"),
        help_text=_("Nom de la banque de domiciliation")
    )
    company_bank_account = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Numéro de compte bancaire"),
        help_text=_("Numéro de compte ou IBAN")
    )
    company_bank_swift = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("Code SWIFT/BIC"),
        help_text=_("Code d'identification de la banque (transactions internationales)")
    )

    # Couleur de marque pour les impressions
    brand_color = models.CharField(
        max_length=7,
        default='#2563eb',
        verbose_name=_("Couleur principale de la marque"),
        help_text=_("Couleur utilisée dans les factures et documents (format: #RRGGBB)")
    )

    # Taxation
    default_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        default=15.000,
        verbose_name=_("Taux de taxe par défaut (%)")
    )
    gst_hst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        default=5.000,
        verbose_name=_("Taux TPS/TVH (%)")
    )
    qst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        default=9.975,
        verbose_name=_("Taux TVQ (%)")
    )
    enable_tax_calculation = models.BooleanField(
        default=True,
        verbose_name=_("Activer le calcul automatique des taxes")
    )

    # Facturation
    invoice_prefix = models.CharField(
        max_length=20,
        default='FAC-',
        verbose_name=_("Préfixe des factures")
    )
    po_prefix = models.CharField(
        max_length=20,
        default='BC-',
        verbose_name=_("Préfixe des bons de commande")
    )
    invoice_terms = models.CharField(
        max_length=100,
        default='Net 30',
        blank=True,
        verbose_name=_("Conditions de paiement par défaut")
    )
    default_currency = models.CharField(
        max_length=3,
        default='CAD',
        choices=[
            ('CAD', 'CAD - Dollar canadien'),
            ('USD', 'USD - Dollar américain'),
            ('EUR', 'EUR - Euro'),
            ('GBP', 'GBP - Livre sterling'),
            ('CHF', 'CHF - Franc suisse'),
            ('JPY', 'JPY - Yen japonais'),
            ('CNY', 'CNY - Yuan chinois'),
            ('AUD', 'AUD - Dollar australien'),
            ('NZD', 'NZD - Dollar néo-zélandais'),
            ('INR', 'INR - Roupie indienne'),
            ('BRL', 'BRL - Real brésilien'),
            ('MXN', 'MXN - Peso mexicain'),
            ('ZAR', 'ZAR - Rand sud-africain'),
            ('XOF', 'XOF - Franc CFA (Afrique de l\'Ouest)'),
            ('XAF', 'XAF - Franc CFA (Afrique centrale)'),
            ('MAD', 'MAD - Dirham marocain'),
            ('TND', 'TND - Dinar tunisien'),
            ('DZD', 'DZD - Dinar algérien'),
            ('NGN', 'NGN - Naira nigérian'),
            ('KES', 'KES - Shilling kényan'),
            ('GHS', 'GHS - Cedi ghanéen'),
            ('EGP', 'EGP - Livre égyptienne'),
            ('AED', 'AED - Dirham des Émirats'),
            ('SAR', 'SAR - Riyal saoudien'),
            ('QAR', 'QAR - Riyal qatari'),
            ('SEK', 'SEK - Couronne suédoise'),
            ('NOK', 'NOK - Couronne norvégienne'),
            ('DKK', 'DKK - Couronne danoise'),
            ('PLN', 'PLN - Zloty polonais'),
            ('CZK', 'CZK - Couronne tchèque'),
            ('HUF', 'HUF - Forint hongrois'),
            ('RON', 'RON - Leu roumain'),
            ('TRY', 'TRY - Livre turque'),
            ('RUB', 'RUB - Rouble russe'),
            ('SGD', 'SGD - Dollar de Singapour'),
            ('HKD', 'HKD - Dollar de Hong Kong'),
            ('KRW', 'KRW - Won sud-coréen'),
            ('THB', 'THB - Baht thaïlandais'),
            ('MYR', 'MYR - Ringgit malaisien'),
            ('IDR', 'IDR - Roupie indonésienne'),
            ('PHP', 'PHP - Peso philippin'),
            ('VND', 'VND - Dong vietnamien'),
            ('ILS', 'ILS - Shekel israélien'),
            ('CLP', 'CLP - Peso chilien'),
            ('ARS', 'ARS - Peso argentin'),
            ('COP', 'COP - Peso colombien'),
            ('PEN', 'PEN - Sol péruvien'),
        ],
        verbose_name=_("Devise par défaut")
    )

    # Notifications
    email_notifications = models.BooleanField(
        default=True,
        verbose_name=_("Notifications email")
    )
    invoice_reminders = models.BooleanField(
        default=True,
        verbose_name=_("Rappels de factures")
    )
    low_stock_alerts = models.BooleanField(
        default=True,
        verbose_name=_("Alertes stock bas")
    )
    order_status_updates = models.BooleanField(
        default=True,
        verbose_name=_("Mises à jour statut commandes")
    )

    # Apparence
    theme = models.CharField(
        max_length=20,
        default='light',
        choices=[
            ('light', _('Clair')),
            ('dark', _('Sombre')),
            ('auto', _('Automatique')),
        ],
        verbose_name=_("Thème")
    )
    language = models.CharField(
        max_length=10,
        default='fr',
        choices=[
            ('fr', 'Français'),
            ('en', 'English'),
        ],
        verbose_name=_("Langue")
    )
    date_format = models.CharField(
        max_length=20,
        default='DD/MM/YYYY',
        choices=[
            ('DD/MM/YYYY', 'DD/MM/YYYY'),
            ('MM/DD/YYYY', 'MM/DD/YYYY'),
            ('YYYY-MM-DD', 'YYYY-MM-DD'),
        ],
        verbose_name=_("Format de date")
    )
    time_format = models.CharField(
        max_length=10,
        default='24h',
        choices=[
            ('24h', '24 heures'),
            ('12h', '12 heures (AM/PM)'),
        ],
        verbose_name=_("Format d'heure")
    )

    # Sécurité
    session_timeout = models.IntegerField(
        default=30,
        verbose_name=_("Délai d'expiration session (minutes)")
    )
    require_strong_passwords = models.BooleanField(
        default=True,
        verbose_name=_("Exiger mots de passe forts")
    )
    enable_two_factor = models.BooleanField(
        default=False,
        verbose_name=_("Authentification à deux facteurs")
    )
    login_attempts = models.IntegerField(
        default=5,
        verbose_name=_("Tentatives de connexion max")
    )

    # Impression
    paper_size = models.CharField(
        max_length=20,
        default='A4',
        choices=[
            ('A4', 'A4 (210 × 297 mm)'),
            ('Letter', 'Letter (8.5 × 11 in)'),
            ('Legal', 'Legal (8.5 × 14 in)'),
            ('A5', 'A5 (148 × 210 mm)'),
            ('thermal_80', 'Thermique 80mm (Ticket de caisse)'),
            ('thermal_58', 'Thermique 58mm (Ticket de caisse)'),
        ],
        verbose_name=_("Taille du papier")
    )
    paper_orientation = models.CharField(
        max_length=20,
        default='portrait',
        choices=[
            ('portrait', _('Portrait')),
            ('landscape', _('Paysage')),
        ],
        verbose_name=_("Orientation du papier")
    )
    print_margins = models.CharField(
        max_length=20,
        default='normal',
        choices=[
            ('narrow', _('Étroites')),
            ('normal', _('Normales')),
            ('wide', _('Larges')),
        ],
        verbose_name=_("Marges")
    )
    include_qr_code = models.BooleanField(
        default=True,
        verbose_name=_("Inclure code QR")
    )
    print_colors = models.BooleanField(
        default=True,
        verbose_name=_("Impression couleur")
    )

    # Sauvegarde
    auto_backup = models.BooleanField(
        default=True,
        verbose_name=_("Sauvegarde automatique")
    )
    backup_frequency = models.CharField(
        max_length=20,
        default='daily',
        choices=[
            ('hourly', _('Toutes les heures')),
            ('daily', _('Quotidienne')),
            ('weekly', _('Hebdomadaire')),
            ('monthly', _('Mensuelle')),
        ],
        verbose_name=_("Fréquence de sauvegarde")
    )
    backup_retention = models.IntegerField(
        default=30,
        verbose_name=_("Rétention sauvegardes (jours)")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Paramètres d'organisation")
        verbose_name_plural = _("Paramètres d'organisations")

    def __str__(self):
        return f"Paramètres de {self.organization.name}"
