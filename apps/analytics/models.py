from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import uuid

User = get_user_model()


class Analytics(models.Model):
    """Modèle d'analytics simplifié"""
    pass


class ActivityLog(models.Model):
    """
    Journalisation de toutes les activités importantes dans l'application
    """
    ACTION_TYPES = [
        ('create', _('Création')),
        ('update', _('Modification')),
        ('delete', _('Suppression')),
        ('view', _('Consultation')),
        ('export', _('Export')),
        ('import', _('Import')),
        ('approve', _('Approbation')),
        ('reject', _('Rejet')),
        ('send', _('Envoi')),
        ('pay', _('Paiement')),
        ('cancel', _('Annulation')),
        ('restore', _('Restauration')),
    ]

    ENTITY_TYPES = [
        ('invoice', _('Facture')),
        ('client', _('Client')),
        ('product', _('Produit')),
        ('purchase_order', _('Bon de commande')),
        ('supplier', _('Fournisseur')),
        ('stock_movement', _('Mouvement de stock')),
        ('payment', _('Paiement')),
        ('contract', _('Contrat')),
        ('user', _('Utilisateur')),
        ('organization', _('Organisation')),
        ('report', _('Rapport')),
        ('dashboard', _('Dashboard')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Utilisateur qui a effectué l'action
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs',
        verbose_name=_("Utilisateur")
    )
    
    # Organisation (pour filtrage)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_logs',
        verbose_name=_("Organisation")
    )
    
    # Type d'action
    action_type = models.CharField(
        max_length=20,
        choices=ACTION_TYPES,
        verbose_name=_("Type d'action")
    )
    
    # Type d'entité
    entity_type = models.CharField(
        max_length=50,
        choices=ENTITY_TYPES,
        verbose_name=_("Type d'entité")
    )
    
    # Référence à l'entité (GenericForeignKey)
    entity_id = models.CharField(
        max_length=100,
        verbose_name=_("ID de l'entité")
    )
    
    # Description de l'action
    description = models.TextField(
        verbose_name=_("Description")
    )
    
    # Données supplémentaires (JSON)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Métadonnées"),
        help_text=_("Informations supplémentaires sur l'action")
    )
    
    # IP et user agent pour traçabilité
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("Adresse IP")
    )
    user_agent = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("User Agent")
    )
    
    # Timestamp
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Date de création")
    )

    class Meta:
        verbose_name = _("Journal d'activité")
        verbose_name_plural = _("Journaux d'activité")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['action_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.get_action_type_display()} {self.get_entity_type_display()} - {self.user.username if self.user else 'System'} - {self.created_at}"


class Budget(models.Model):
    """
    Budget pour le suivi des dépenses
    """
    PERIOD_TYPES = [
        ('monthly', _('Mensuel')),
        ('quarterly', _('Trimestriel')),
        ('yearly', _('Annuel')),
        ('custom', _('Personnalisé')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='budgets',
        verbose_name=_("Organisation")
    )
    
    name = models.CharField(
        max_length=200,
        verbose_name=_("Nom du budget")
    )
    
    description = models.TextField(
        blank=True,
        verbose_name=_("Description")
    )
    
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name=_("Montant du budget")
    )
    
    period_type = models.CharField(
        max_length=20,
        choices=PERIOD_TYPES,
        default='monthly',
        verbose_name=_("Type de période")
    )
    
    start_date = models.DateField(
        verbose_name=_("Date de début")
    )
    
    end_date = models.DateField(
        verbose_name=_("Date de fin")
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Actif")
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_budgets',
        verbose_name=_("Créé par")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Budget")
        verbose_name_plural = _("Budgets")
        ordering = ['-start_date', '-created_at']

    def __str__(self):
        return f"{self.name} - {self.organization.name} - {self.amount}"


class WeeklyReportConfig(models.Model):
    """Configuration des rapports periodiques par utilisateur"""
    FREQUENCY_CHOICES = [
        ('weekly', _('Hebdomadaire')),
        ('biweekly', _('Bi-hebdomadaire')),
        ('monthly', _('Mensuel')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='weekly_report_configs',
        verbose_name=_("Organisation")
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='weekly_report_configs',
        verbose_name=_("Utilisateur")
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    frequency = models.CharField(
        max_length=20, choices=FREQUENCY_CHOICES, default='weekly',
        verbose_name=_("Frequence")
    )
    include_healthcare = models.BooleanField(default=True, verbose_name=_("Inclure sante/labo"))
    include_inventory = models.BooleanField(default=True, verbose_name=_("Inclure inventaire"))
    include_finance = models.BooleanField(default=True, verbose_name=_("Inclure finances"))
    include_stock_alerts = models.BooleanField(default=True, verbose_name=_("Inclure alertes stock"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Configuration rapport periodique")
        verbose_name_plural = _("Configurations rapports periodiques")
        unique_together = [['organization', 'user']]

    def __str__(self):
        return f"Rapport {self.get_frequency_display()} - {self.user.username}"
