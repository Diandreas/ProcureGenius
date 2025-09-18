from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from djmoney import models as money_models
import uuid

User = get_user_model()


class CustomReport(models.Model):
    """Rapports personnalisés créés par les utilisateurs"""
    
    REPORT_TYPES = [
        ('spend_analysis', _('Analyse des dépenses')),
        ('supplier_performance', _('Performance fournisseurs')),
        ('invoice_aging', _('Vieillissement créances')),
        ('purchase_trends', _('Tendances d\'achat')),
        ('budget_variance', _('Écarts budgétaires')),
        ('cash_flow', _('Flux de trésorerie')),
        ('roi_analysis', _('Analyse ROI')),
    ]
    
    FREQUENCY_CHOICES = [
        ('once', _('Une fois')),
        ('daily', _('Quotidien')),
        ('weekly', _('Hebdomadaire')),
        ('monthly', _('Mensuel')),
        ('quarterly', _('Trimestriel')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES, verbose_name=_("Type de rapport"))
    
    # Configuration du rapport
    parameters = models.JSONField(default=dict, verbose_name=_("Paramètres"))
    filters = models.JSONField(default=dict, verbose_name=_("Filtres"))
    
    # Planification
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='once', verbose_name=_("Fréquence"))
    next_run = models.DateTimeField(null=True, blank=True, verbose_name=_("Prochaine exécution"))
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Créé par"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    is_public = models.BooleanField(default=False, verbose_name=_("Public"))
    
    # Statistiques
    run_count = models.IntegerField(default=0, verbose_name=_("Nombre d'exécutions"))
    last_run = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière exécution"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Rapport personnalisé")
        verbose_name_plural = _("Rapports personnalisés")

    def __str__(self):
        return f"{self.name} ({self.get_report_type_display()})"


class ReportExecution(models.Model):
    """Historique d'exécution des rapports"""
    
    EXECUTION_STATUS = [
        ('running', _('En cours')),
        ('completed', _('Terminé')),
        ('failed', _('Échoué')),
        ('cancelled', _('Annulé')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    report = models.ForeignKey(
        CustomReport, 
        on_delete=models.CASCADE, 
        related_name='executions',
        verbose_name=_("Rapport")
    )
    
    status = models.CharField(max_length=20, choices=EXECUTION_STATUS, verbose_name=_("Statut"))
    
    # Données générées
    data = models.JSONField(null=True, blank=True, verbose_name=_("Données"))
    file_path = models.CharField(max_length=500, blank=True, verbose_name=_("Chemin fichier"))
    
    # Métadonnées d'exécution
    started_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Démarré le"))
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Terminé le"))
    duration_seconds = models.IntegerField(null=True, blank=True, verbose_name=_("Durée (secondes)"))
    
    # Erreurs
    error_message = models.TextField(blank=True, verbose_name=_("Message d'erreur"))
    
    # Exécution
    executed_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Exécuté par"))

    class Meta:
        ordering = ['-started_at']
        verbose_name = _("Exécution de rapport")
        verbose_name_plural = _("Exécutions de rapports")

    def __str__(self):
        return f"{self.report.name} - {self.started_at}"


class AnalyticsDashboard(models.Model):
    """Tableaux de bord analytics personnalisés"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Configuration du dashboard
    layout = models.JSONField(default=dict, verbose_name=_("Mise en page"))
    widgets = models.JSONField(default=list, verbose_name=_("Widgets"))
    
    # Permissions
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Créé par"))
    is_default = models.BooleanField(default=False, verbose_name=_("Dashboard par défaut"))
    is_public = models.BooleanField(default=False, verbose_name=_("Public"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['name']
        verbose_name = _("Tableau de bord analytics")
        verbose_name_plural = _("Tableaux de bord analytics")

    def __str__(self):
        return self.name


class KPIMetric(models.Model):
    """Métriques KPI personnalisées"""
    
    METRIC_TYPES = [
        ('count', _('Nombre')),
        ('sum', _('Somme')),
        ('average', _('Moyenne')),
        ('percentage', _('Pourcentage')),
        ('ratio', _('Ratio')),
    ]
    
    AGGREGATION_PERIODS = [
        ('daily', _('Quotidien')),
        ('weekly', _('Hebdomadaire')),
        ('monthly', _('Mensuel')),
        ('quarterly', _('Trimestriel')),
        ('yearly', _('Annuel')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES, verbose_name=_("Type de métrique"))
    
    # Configuration de calcul
    source_model = models.CharField(max_length=50, verbose_name=_("Modèle source"))
    calculation_formula = models.TextField(verbose_name=_("Formule de calcul"))
    filters = models.JSONField(default=dict, verbose_name=_("Filtres"))
    
    # Agrégation
    aggregation_period = models.CharField(max_length=20, choices=AGGREGATION_PERIODS, verbose_name=_("Période d'agrégation"))
    
    # Seuils et alertes
    target_value = models.FloatField(null=True, blank=True, verbose_name=_("Valeur cible"))
    warning_threshold = models.FloatField(null=True, blank=True, verbose_name=_("Seuil d'alerte"))
    critical_threshold = models.FloatField(null=True, blank=True, verbose_name=_("Seuil critique"))
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Créé par"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['name']
        verbose_name = _("Métrique KPI")
        verbose_name_plural = _("Métriques KPI")

    def __str__(self):
        return self.name


class KPIValue(models.Model):
    """Valeurs calculées des métriques KPI"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    metric = models.ForeignKey(
        KPIMetric, 
        on_delete=models.CASCADE, 
        related_name='values',
        verbose_name=_("Métrique")
    )
    
    value = models.FloatField(verbose_name=_("Valeur"))
    period_start = models.DateField(verbose_name=_("Début période"))
    period_end = models.DateField(verbose_name=_("Fin période"))
    
    # Métadonnées de calcul
    calculation_metadata = models.JSONField(default=dict, verbose_name=_("Métadonnées calcul"))
    calculated_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Calculé le"))

    class Meta:
        ordering = ['-period_end']
        verbose_name = _("Valeur KPI")
        verbose_name_plural = _("Valeurs KPI")
        unique_together = ['metric', 'period_start', 'period_end']

    def __str__(self):
        return f"{self.metric.name}: {self.value} ({self.period_start} - {self.period_end})"

    def get_status(self):
        """Retourne le statut par rapport aux seuils"""
        metric = self.metric
        
        if metric.critical_threshold and self.value <= metric.critical_threshold:
            return 'critical'
        elif metric.warning_threshold and self.value <= metric.warning_threshold:
            return 'warning'
        elif metric.target_value and self.value >= metric.target_value:
            return 'success'
        else:
            return 'neutral'


class BudgetPlan(models.Model):
    """Plans budgétaires"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Période budgétaire
    fiscal_year = models.IntegerField(verbose_name=_("Année fiscale"))
    start_date = models.DateField(verbose_name=_("Date de début"))
    end_date = models.DateField(verbose_name=_("Date de fin"))
    
    # Budget total
    total_budget = money_models.MoneyField(
        max_digits=16, decimal_places=2,
        default_currency='CAD',
        verbose_name=_("Budget total")
    )
    
    # Statut
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    is_approved = models.BooleanField(default=False, verbose_name=_("Approuvé"))
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Créé par"))
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='approved_budgets',
        verbose_name=_("Approuvé par")
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Approuvé le"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['-fiscal_year']
        verbose_name = _("Plan budgétaire")
        verbose_name_plural = _("Plans budgétaires")

    def __str__(self):
        return f"{self.name} - {self.fiscal_year}"

    def get_spent_amount(self):
        """Calcule le montant dépensé"""
        from apps.purchase_orders.models import PurchaseOrder
        
        spent = PurchaseOrder.objects.filter(
            order_date__gte=self.start_date,
            order_date__lte=self.end_date,
            status__in=['approved', 'sent', 'received', 'completed']
        ).aggregate(total=models.Sum('total_amount'))['total'] or 0
        
        return spent

    def get_budget_utilization(self):
        """Calcule le pourcentage d'utilisation du budget"""
        spent = self.get_spent_amount()
        if self.total_budget.amount > 0:
            return (spent.amount / self.total_budget.amount) * 100
        return 0


class BudgetCategory(models.Model):
    """Catégories budgétaires"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    budget_plan = models.ForeignKey(
        BudgetPlan, 
        on_delete=models.CASCADE, 
        related_name='categories',
        verbose_name=_("Plan budgétaire")
    )
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Montant alloué
    allocated_amount = money_models.MoneyField(
        max_digits=14, decimal_places=2,
        default_currency='CAD',
        verbose_name=_("Montant alloué")
    )
    
    # Mapping avec les catégories de produits
    product_categories = models.ManyToManyField(
        'suppliers.ProductCategory',
        blank=True,
        verbose_name=_("Catégories de produits")
    )

    class Meta:
        ordering = ['name']
        verbose_name = _("Catégorie budgétaire")
        verbose_name_plural = _("Catégories budgétaires")

    def __str__(self):
        return f"{self.name} - {self.allocated_amount}"

    def get_spent_amount(self):
        """Calcule le montant dépensé dans cette catégorie"""
        from apps.purchase_orders.models import PurchaseOrderItem
        
        spent = PurchaseOrderItem.objects.filter(
            category__in=self.product_categories.all(),
            purchase_order__order_date__gte=self.budget_plan.start_date,
            purchase_order__order_date__lte=self.budget_plan.end_date,
            purchase_order__status__in=['approved', 'sent', 'received', 'completed']
        ).aggregate(total=models.Sum('total_price'))['total'] or 0
        
        return spent

    def get_utilization_percentage(self):
        """Calcule le pourcentage d'utilisation"""
        spent = self.get_spent_amount()
        if self.allocated_amount.amount > 0:
            return (spent.amount / self.allocated_amount.amount) * 100
        return 0


class AnalyticsSnapshot(models.Model):
    """Snapshots de données analytics pour performance"""
    
    SNAPSHOT_TYPES = [
        ('daily_summary', _('Résumé quotidien')),
        ('weekly_summary', _('Résumé hebdomadaire')),
        ('monthly_summary', _('Résumé mensuel')),
        ('quarterly_summary', _('Résumé trimestriel')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    snapshot_type = models.CharField(max_length=50, choices=SNAPSHOT_TYPES, verbose_name=_("Type"))
    snapshot_date = models.DateField(verbose_name=_("Date du snapshot"))
    
    # Données agrégées
    data = models.JSONField(verbose_name=_("Données"))
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['-snapshot_date']
        verbose_name = _("Snapshot analytics")
        verbose_name_plural = _("Snapshots analytics")
        unique_together = ['snapshot_type', 'snapshot_date']

    def __str__(self):
        return f"{self.get_snapshot_type_display()} - {self.snapshot_date}"