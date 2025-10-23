from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class ReportTemplate(models.Model):
    """Template de rapport configurab le"""
    REPORT_TYPES = [
        ('supplier', _('Rapport Fournisseur')),
        ('supplier_all', _('Rapport Tous Fournisseurs')),
        ('product', _('Rapport Produit')),
        ('product_all', _('Rapport Tous Produits')),
        ('invoice', _('Rapport Factures')),
        ('purchase_order', _('Rapport Bons de Commande')),
        ('client', _('Rapport Client')),
        ('client_all', _('Rapport Tous Clients')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name=_("Nom du template"))
    report_type = models.CharField(
        max_length=50,
        choices=REPORT_TYPES,
        verbose_name=_("Type de rapport")
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))

    # Configuration JSON pour les paramètres du rapport
    configuration = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuration"),
        help_text=_("Configuration JSON du template (colonnes, filtres, etc.)")
    )

    # Metadata
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    is_default = models.BooleanField(default=False, verbose_name=_("Template par défaut"))
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_report_templates',
        verbose_name=_("Créé par")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Template de rapport")
        verbose_name_plural = _("Templates de rapports")
        ordering = ['-is_default', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_report_type_display()})"


class Report(models.Model):
    """Rapport généré"""
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('xlsx', 'Excel (XLSX)'),
        ('csv', 'CSV'),
    ]

    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('processing', _('En cours')),
        ('completed', _('Terminé')),
        ('failed', _('Échoué')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relation au template
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports',
        verbose_name=_("Template utilisé")
    )

    # Type et format
    report_type = models.CharField(
        max_length=50,
        choices=ReportTemplate.REPORT_TYPES,
        verbose_name=_("Type de rapport")
    )
    format = models.CharField(
        max_length=10,
        choices=FORMAT_CHOICES,
        default='pdf',
        verbose_name=_("Format")
    )

    # Paramètres de génération
    parameters = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Paramètres"),
        help_text=_("Paramètres de génération (date_debut, date_fin, filtres, etc.)")
    )

    # Fichier généré
    file_path = models.FileField(
        upload_to='reports/%Y/%m/',
        null=True,
        blank=True,
        verbose_name=_("Fichier")
    )
    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Taille du fichier (bytes)")
    )

    # Statut et résultat
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_("Statut")
    )
    error_message = models.TextField(
        blank=True,
        verbose_name=_("Message d'erreur")
    )

    # Metadata
    generated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='generated_reports',
        verbose_name=_("Généré par")
    )
    generated_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Généré le"))
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Terminé le")
    )

    # Compteur de téléchargements
    download_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Nombre de téléchargements")
    )
    last_downloaded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Dernier téléchargement")
    )

    class Meta:
        verbose_name = _("Rapport")
        verbose_name_plural = _("Rapports")
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['report_type', 'status']),
            models.Index(fields=['generated_by', '-generated_at']),
        ]

    def __str__(self):
        return f"{self.get_report_type_display()} - {self.format} ({self.status})"

    def increment_download_count(self):
        """Incrémenter le compteur de téléchargements"""
        from django.utils import timezone
        self.download_count += 1
        self.last_downloaded_at = timezone.now()
        self.save(update_fields=['download_count', 'last_downloaded_at'])
