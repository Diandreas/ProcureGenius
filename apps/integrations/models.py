from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
import uuid

User = get_user_model()


class Integration(models.Model):
    """Intégrations externes configurées"""
    
    INTEGRATION_TYPES = [
        ('accounting', _('Comptabilité')),
        ('erp', _('ERP')),
        ('payment', _('Paiement')),
        ('shipping', _('Transport')),
        ('inventory', _('Inventaire')),
        ('crm', _('CRM')),
        ('api', _('API personnalisée')),
    ]
    
    STATUS_CHOICES = [
        ('active', _('Actif')),
        ('inactive', _('Inactif')),
        ('error', _('Erreur')),
        ('testing', _('Test')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    integration_type = models.CharField(max_length=50, choices=INTEGRATION_TYPES, verbose_name=_("Type"))
    
    # Configuration
    endpoint_url = models.URLField(blank=True, verbose_name=_("URL d'endpoint"))
    api_key = models.CharField(max_length=500, blank=True, verbose_name=_("Clé API"))
    credentials = models.JSONField(default=dict, verbose_name=_("Identifiants"))
    configuration = models.JSONField(default=dict, verbose_name=_("Configuration"))
    
    # Mapping des champs
    field_mapping = models.JSONField(default=dict, verbose_name=_("Mapping des champs"))
    
    # Statut et monitoring
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive', verbose_name=_("Statut"))
    last_sync = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière synchronisation"))
    last_error = models.TextField(blank=True, verbose_name=_("Dernière erreur"))
    
    # Statistiques
    sync_count = models.IntegerField(default=0, verbose_name=_("Nombre de synchronisations"))
    error_count = models.IntegerField(default=0, verbose_name=_("Nombre d'erreurs"))
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Créé par"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['name']
        verbose_name = _("Intégration")
        verbose_name_plural = _("Intégrations")

    def __str__(self):
        return f"{self.name} ({self.get_integration_type_display()})"


class SyncLog(models.Model):
    """Logs de synchronisation"""
    
    SYNC_TYPES = [
        ('manual', _('Manuel')),
        ('scheduled', _('Planifié')),
        ('webhook', _('Webhook')),
        ('real_time', _('Temps réel')),
    ]
    
    SYNC_STATUS = [
        ('success', _('Succès')),
        ('partial', _('Partiel')),
        ('failed', _('Échec')),
        ('cancelled', _('Annulé')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    integration = models.ForeignKey(
        Integration, 
        on_delete=models.CASCADE, 
        related_name='sync_logs',
        verbose_name=_("Intégration")
    )
    
    sync_type = models.CharField(max_length=20, choices=SYNC_TYPES, verbose_name=_("Type de sync"))
    status = models.CharField(max_length=20, choices=SYNC_STATUS, verbose_name=_("Statut"))
    
    # Détails de la synchronisation
    records_processed = models.IntegerField(default=0, verbose_name=_("Enregistrements traités"))
    records_success = models.IntegerField(default=0, verbose_name=_("Succès"))
    records_failed = models.IntegerField(default=0, verbose_name=_("Échecs"))
    
    # Données et erreurs
    sync_data = models.JSONField(default=dict, verbose_name=_("Données de sync"))
    error_details = models.JSONField(default=list, verbose_name=_("Détails des erreurs"))
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Démarré le"))
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Terminé le"))
    duration_seconds = models.IntegerField(null=True, blank=True, verbose_name=_("Durée (secondes)"))
    
    # Métadonnées
    triggered_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        verbose_name=_("Déclenché par")
    )

    class Meta:
        ordering = ['-started_at']
        verbose_name = _("Log de synchronisation")
        verbose_name_plural = _("Logs de synchronisation")

    def __str__(self):
        return f"{self.integration.name} - {self.started_at} - {self.get_status_display()}"


class WebhookEndpoint(models.Model):
    """Endpoints webhook pour recevoir des données externes"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Configuration webhook
    endpoint_path = models.CharField(max_length=200, unique=True, verbose_name=_("Chemin d'endpoint"))
    secret_key = models.CharField(max_length=100, verbose_name=_("Clé secrète"))
    
    # Traitement
    processor_class = models.CharField(max_length=200, verbose_name=_("Classe de traitement"))
    configuration = models.JSONField(default=dict, verbose_name=_("Configuration"))
    
    # Sécurité
    allowed_ips = models.JSONField(default=list, verbose_name=_("IPs autorisées"))
    verify_signature = models.BooleanField(default=True, verbose_name=_("Vérifier signature"))
    
    # Statut
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    
    # Statistiques
    request_count = models.IntegerField(default=0, verbose_name=_("Nombre de requêtes"))
    last_request = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernière requête"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['name']
        verbose_name = _("Endpoint webhook")
        verbose_name_plural = _("Endpoints webhook")

    def __str__(self):
        return f"{self.name} - /{self.endpoint_path}"


class APIConnection(models.Model):
    """Connexions API externes"""
    
    CONNECTION_TYPES = [
        ('rest', 'REST API'),
        ('soap', 'SOAP'),
        ('graphql', 'GraphQL'),
        ('rpc', 'RPC'),
        ('ftp', 'FTP'),
        ('sftp', 'SFTP'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    connection_type = models.CharField(max_length=20, choices=CONNECTION_TYPES, verbose_name=_("Type"))
    
    # Configuration de connexion
    base_url = models.URLField(verbose_name=_("URL de base"))
    authentication = models.JSONField(default=dict, verbose_name=_("Authentification"))
    headers = models.JSONField(default=dict, verbose_name=_("En-têtes"))
    timeout_seconds = models.IntegerField(default=30, verbose_name=_("Timeout (secondes)"))
    
    # Test de connexion
    last_test = models.DateTimeField(null=True, blank=True, verbose_name=_("Dernier test"))
    test_status = models.CharField(max_length=20, choices=[
        ('success', _('Succès')),
        ('failed', _('Échec')),
        ('timeout', _('Timeout')),
    ], blank=True, verbose_name=_("Statut du test"))
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Créé par"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['name']
        verbose_name = _("Connexion API")
        verbose_name_plural = _("Connexions API")

    def __str__(self):
        return f"{self.name} ({self.get_connection_type_display()})"