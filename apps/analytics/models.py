from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
import uuid

User = get_user_model()


class Analytics(models.Model):
    """Modèle d'analytics simplifié"""
    pass


class DashboardConfig(models.Model):
    """Configuration personnalisée du dashboard par utilisateur"""

    PERIOD_CHOICES = [
        ('today', _('Aujourd\'hui')),
        ('yesterday', _('Hier')),
        ('last_7_days', _('7 derniers jours')),
        ('last_30_days', _('30 derniers jours')),
        ('last_90_days', _('90 derniers jours')),
        ('this_month', _('Ce mois')),
        ('last_month', _('Mois dernier')),
        ('this_year', _('Cette année')),
        ('custom', _('Personnalisé')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='dashboard_config',
        verbose_name=_("Utilisateur")
    )

    # Période par défaut
    default_period = models.CharField(
        max_length=20,
        choices=PERIOD_CHOICES,
        default='last_30_days',
        verbose_name=_("Période par défaut")
    )

    # Widgets activés et leur ordre
    enabled_widgets = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_("Widgets activés"),
        help_text=_("Liste ordonnée des widgets à afficher")
    )

    # Indicateurs favoris
    favorite_metrics = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_("Indicateurs favoris"),
        help_text=_("Liste des métriques à mettre en avant")
    )

    # Comparaison avec période précédente activée par défaut
    compare_previous_period = models.BooleanField(
        default=True,
        verbose_name=_("Comparer avec période précédente")
    )

    # Format d'export préféré
    export_format = models.CharField(
        max_length=10,
        choices=[('pdf', 'PDF'), ('xlsx', 'Excel'), ('csv', 'CSV')],
        default='pdf',
        verbose_name=_("Format d'export préféré")
    )

    # Recevoir rapport par email
    email_report_enabled = models.BooleanField(
        default=False,
        verbose_name=_("Recevoir rapport par email")
    )

    email_report_frequency = models.CharField(
        max_length=20,
        choices=[
            ('daily', _('Quotidien')),
            ('weekly', _('Hebdomadaire')),
            ('monthly', _('Mensuel'))
        ],
        default='weekly',
        blank=True,
        verbose_name=_("Fréquence email rapport")
    )

    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Configuration Dashboard")
        verbose_name_plural = _("Configurations Dashboard")
        ordering = ['-updated_at']

    def __str__(self):
        return f"Dashboard Config - {self.user.username}"

    def get_default_widgets(self):
        """Retourne la liste des widgets par défaut"""
        if not self.enabled_widgets:
            return [
                'financial_summary',
                'revenue_chart',
                'expenses_chart',
                'invoices_stats',
                'purchase_orders_stats',
                'top_clients',
                'top_suppliers',
                'stock_alerts',
                'recent_activity'
            ]
        return self.enabled_widgets

    def get_favorite_metrics(self):
        """Retourne les métriques favorites ou une liste par défaut"""
        if not self.favorite_metrics:
            return [
                'revenue',
                'net_profit',
                'profit_margin',
                'pending_revenue',
                'new_invoices',
                'new_clients'
            ]
        return self.favorite_metrics


class SavedDashboardView(models.Model):
    """Vue sauvegardée du dashboard avec filtres personnalisés"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='saved_dashboard_views',
        verbose_name=_("Utilisateur")
    )

    name = models.CharField(
        max_length=200,
        verbose_name=_("Nom de la vue")
    )

    description = models.TextField(
        blank=True,
        verbose_name=_("Description")
    )

    # Configuration de la vue (filtres, période, etc.)
    configuration = models.JSONField(
        default=dict,
        verbose_name=_("Configuration"),
        help_text=_("Paramètres de filtrage et affichage")
    )

    is_default = models.BooleanField(
        default=False,
        verbose_name=_("Vue par défaut")
    )

    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Vue Dashboard Sauvegardée")
        verbose_name_plural = _("Vues Dashboard Sauvegardées")
        ordering = ['-is_default', '-updated_at']
        unique_together = [['user', 'name']]

    def __str__(self):
        return f"{self.name} - {self.user.username}"


class DashboardLayout(models.Model):
    """
    Layout de dashboard personnalisé par utilisateur
    Stocke uniquement la position/taille des widgets (codes des widgets depuis widgets_registry.py)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='dashboard_layouts',
        verbose_name=_("Utilisateur")
    )
    name = models.CharField(
        max_length=200,
        verbose_name=_("Nom du layout")
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description")
    )
    is_default = models.BooleanField(
        default=False,
        verbose_name=_("Layout par défaut")
    )

    # Layout configuration: liste de widgets avec leur position
    # Format: [{'i': 'widget_code', 'x': 0, 'y': 0, 'w': 2, 'h': 1}, ...]
    layout = models.JSONField(
        default=list,
        verbose_name=_("Configuration layout"),
        help_text=_("Position et taille des widgets dans la grille")
    )

    # Configuration globale (période, filtres, etc.)
    global_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuration globale"),
        help_text=_("Période par défaut, filtres globaux, etc.")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Layout Dashboard")
        verbose_name_plural = _("Layouts Dashboard")
        ordering = ['-is_default', '-updated_at']
        unique_together = [['user', 'name']]

    def __str__(self):
        return f"{self.name} - {self.user.username}"

    def save(self, *args, **kwargs):
        # Si ce layout est défini comme défaut, retirer le flag des autres
        if self.is_default:
            DashboardLayout.objects.filter(
                user=self.user
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)
