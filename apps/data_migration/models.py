from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid
import json

User = get_user_model()


class MigrationJob(models.Model):
    """Job de migration de données depuis Excel/CSV ou QuickBooks"""

    SOURCE_TYPE_CHOICES = [
        ('excel', _('Excel/CSV')),
        ('quickbooks', _('QuickBooks Online')),
    ]

    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('mapping', _('Configuration du mapping')),
        ('validating', _('Validation')),
        ('processing', _('En cours')),
        ('completed', _('Complété')),
        ('failed', _('Échoué')),
        ('cancelled', _('Annulé')),
    ]

    ENTITY_TYPE_CHOICES = [
        ('suppliers', _('Fournisseurs')),
        ('products', _('Produits')),
        ('clients', _('Clients')),
        ('purchase_orders', _('Bons de commande')),
        ('invoices', _('Factures')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Informations de base
    name = models.CharField(max_length=200, verbose_name=_("Nom du job"))
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, verbose_name=_("Source"))
    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPE_CHOICES, verbose_name=_("Type d'entité"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name=_("Statut"))

    # Fichier (pour Excel/CSV)
    source_file = models.FileField(upload_to='migrations/%Y/%m/', null=True, blank=True, verbose_name=_("Fichier source"))
    file_encoding = models.CharField(max_length=20, default='utf-8', verbose_name=_("Encodage du fichier"))
    delimiter = models.CharField(max_length=5, default=',', verbose_name=_("Délimiteur CSV"))
    has_header = models.BooleanField(default=True, verbose_name=_("Première ligne contient les en-têtes"))

    # QuickBooks OAuth (pour QuickBooks)
    quickbooks_realm_id = models.CharField(max_length=100, blank=True, verbose_name=_("QuickBooks Realm ID"))
    quickbooks_access_token = models.TextField(blank=True, verbose_name=_("QuickBooks Access Token"))
    quickbooks_refresh_token = models.TextField(blank=True, verbose_name=_("QuickBooks Refresh Token"))
    quickbooks_token_expires_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Token expire le"))

    # Configuration du mapping (JSON)
    field_mapping = models.JSONField(default=dict, blank=True, verbose_name=_("Mapping des champs"))
    # Format: {"nom_champ_source": "nom_champ_destination"}
    # Exemple: {"Company Name": "name", "Email": "email"}

    default_values = models.JSONField(default=dict, blank=True, verbose_name=_("Valeurs par défaut"))
    # Format: {"champ": "valeur"}

    transformation_rules = models.JSONField(default=dict, blank=True, verbose_name=_("Règles de transformation"))
    # Format: {"champ": {"type": "uppercase|lowercase|capitalize|..."}}

    # Options d'importation
    import_suppliers = models.BooleanField(default=True, verbose_name=_("Importer les fournisseurs"))
    import_products = models.BooleanField(default=True, verbose_name=_("Importer les produits"))
    import_clients = models.BooleanField(default=True, verbose_name=_("Importer les clients"))
    import_purchase_orders = models.BooleanField(default=False, verbose_name=_("Importer les bons de commande"))
    import_invoices = models.BooleanField(default=False, verbose_name=_("Importer les factures"))

    skip_duplicates = models.BooleanField(default=True, verbose_name=_("Ignorer les doublons"))
    update_existing = models.BooleanField(default=False, verbose_name=_("Mettre à jour les existants"))

    # Statistiques
    total_rows = models.PositiveIntegerField(default=0, verbose_name=_("Total de lignes"))
    processed_rows = models.PositiveIntegerField(default=0, verbose_name=_("Lignes traitées"))
    success_count = models.PositiveIntegerField(default=0, verbose_name=_("Succès"))
    error_count = models.PositiveIntegerField(default=0, verbose_name=_("Erreurs"))
    skipped_count = models.PositiveIntegerField(default=0, verbose_name=_("Ignorées"))

    # Résultats
    preview_data = models.JSONField(default=list, blank=True, verbose_name=_("Aperçu des données"))
    error_summary = models.JSONField(default=list, blank=True, verbose_name=_("Résumé des erreurs"))

    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='migration_jobs', verbose_name=_("Créé par"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de modification"))
    started_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Démarré le"))
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Complété le"))

    class Meta:
        verbose_name = _("Job de migration")
        verbose_name_plural = _("Jobs de migration")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_source_type_display()})"

    @property
    def progress_percentage(self):
        """Retourne le pourcentage de progression"""
        if self.total_rows > 0:
            return (self.processed_rows / self.total_rows) * 100
        return 0

    @property
    def duration_seconds(self):
        """Retourne la durée en secondes"""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return delta.total_seconds()
        elif self.started_at:
            delta = timezone.now() - self.started_at
            return delta.total_seconds()
        return 0

    def start(self):
        """Démarre le job"""
        if self.status == 'pending' or self.status == 'mapping':
            self.status = 'processing'
            self.started_at = timezone.now()
            self.save(update_fields=['status', 'started_at'])

    def complete(self):
        """Marque le job comme complété"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])

    def fail(self, error_message: str = None):
        """Marque le job comme échoué"""
        self.status = 'failed'
        self.completed_at = timezone.now()
        if error_message:
            self.error_summary.append({
                'timestamp': timezone.now().isoformat(),
                'message': error_message
            })
        self.save(update_fields=['status', 'completed_at', 'error_summary'])

    def cancel(self):
        """Annule le job"""
        if self.status in ['pending', 'mapping', 'processing']:
            self.status = 'cancelled'
            self.completed_at = timezone.now()
            self.save(update_fields=['status', 'completed_at'])
            return True
        return False


class MigrationLog(models.Model):
    """Log d'une opération de migration individuelle"""

    LOG_LEVEL_CHOICES = [
        ('info', _('Info')),
        ('warning', _('Avertissement')),
        ('error', _('Erreur')),
        ('success', _('Succès')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(MigrationJob, on_delete=models.CASCADE, related_name='logs', verbose_name=_("Job"))

    # Informations du log
    level = models.CharField(max_length=10, choices=LOG_LEVEL_CHOICES, verbose_name=_("Niveau"))
    message = models.TextField(verbose_name=_("Message"))
    row_number = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Numéro de ligne"))

    # Données
    source_data = models.JSONField(default=dict, blank=True, verbose_name=_("Données source"))
    transformed_data = models.JSONField(default=dict, blank=True, verbose_name=_("Données transformées"))

    # Résultat
    created_object_id = models.CharField(max_length=100, blank=True, verbose_name=_("ID de l'objet créé"))
    created_object_type = models.CharField(max_length=50, blank=True, verbose_name=_("Type d'objet créé"))

    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))

    class Meta:
        verbose_name = _("Log de migration")
        verbose_name_plural = _("Logs de migration")
        ordering = ['job', 'row_number', 'created_at']

    def __str__(self):
        return f"{self.get_level_display()} - Ligne {self.row_number}: {self.message[:50]}"


class QuickBooksConnection(models.Model):
    """Connexion QuickBooks OAuth pour un utilisateur"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='quickbooks_connection', verbose_name=_("Utilisateur"))

    # OAuth tokens
    realm_id = models.CharField(max_length=100, verbose_name=_("Realm ID"))
    access_token = models.TextField(verbose_name=_("Access Token"))
    refresh_token = models.TextField(verbose_name=_("Refresh Token"))
    token_expires_at = models.DateTimeField(verbose_name=_("Token expire le"))

    # Informations de la connexion
    company_name = models.CharField(max_length=200, blank=True, verbose_name=_("Nom de l'entreprise"))
    connected_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Connecté le"))
    last_sync_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière sync"))

    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))

    class Meta:
        verbose_name = _("Connexion QuickBooks")
        verbose_name_plural = _("Connexions QuickBooks")

    def __str__(self):
        return f"QuickBooks - {self.company_name or self.realm_id}"

    @property
    def is_token_expired(self):
        """Vérifie si le token est expiré"""
        return timezone.now() >= self.token_expires_at

    def refresh_access_token(self):
        """Rafraîchit le token d'accès"""
        # Cette méthode sera implémentée dans le service QuickBooks
        pass
