from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
import uuid

User = get_user_model()


class AIConversation(models.Model):
    """Conversation avec l'IA Mistral"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Utilisateur"))
    
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    is_active = models.BooleanField(default=True, verbose_name=_("Active"))
    
    # Métadonnées de la conversation
    context_data = models.JSONField(default=dict, verbose_name=_("Données de contexte"))
    conversation_type = models.CharField(max_length=50, choices=[
        ('general', _('Général')),
        ('purchase_order', _('Bon de commande')),
        ('invoice', _('Facturation')),
        ('supplier', _('Fournisseur')),
        ('analytics', _('Analytics')),
    ], default='general', verbose_name=_("Type de conversation"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['-updated_at']
        verbose_name = _("Conversation IA")
        verbose_name_plural = _("Conversations IA")

    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"

    def get_message_count(self):
        """Retourne le nombre de messages dans cette conversation"""
        return self.messages.count()

    def get_last_message(self):
        """Retourne le dernier message de la conversation"""
        return self.messages.order_by('-timestamp').first()


class AIMessage(models.Model):
    """Message dans une conversation IA"""
    
    MESSAGE_ROLES = [
        ('user', _('Utilisateur')),
        ('assistant', _('Assistant IA')),
        ('system', _('Système')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        AIConversation, 
        on_delete=models.CASCADE, 
        related_name='messages',
        verbose_name=_("Conversation")
    )
    
    role = models.CharField(max_length=10, choices=MESSAGE_ROLES, verbose_name=_("Rôle"))
    content = models.TextField(verbose_name=_("Contenu"))
    
    # Métadonnées IA Mistral
    model_used = models.CharField(max_length=50, default='mistral-medium', verbose_name=_("Modèle utilisé"))
    tokens_used = models.IntegerField(default=0, verbose_name=_("Tokens utilisés"))
    response_time_ms = models.IntegerField(default=0, verbose_name=_("Temps de réponse (ms)"))
    temperature = models.FloatField(default=0.7, verbose_name=_("Température"))
    
    # Action exécutée suite au message
    action_triggered = models.CharField(max_length=100, blank=True, verbose_name=_("Action déclenchée"))
    action_result = models.JSONField(null=True, blank=True, verbose_name=_("Résultat de l'action"))
    
    # Évaluation du message
    user_rating = models.IntegerField(
        null=True, blank=True, 
        choices=[(i, i) for i in range(1, 6)],
        verbose_name=_("Note utilisateur")
    )
    feedback = models.TextField(blank=True, verbose_name=_("Commentaire"))
    
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name=_("Horodatage"))

    class Meta:
        ordering = ['timestamp']
        verbose_name = _("Message IA")
        verbose_name_plural = _("Messages IA")

    def __str__(self):
        return f"{self.get_role_display()} - {self.content[:50]}..."

    def is_from_user(self):
        return self.role == 'user'

    def is_from_assistant(self):
        return self.role == 'assistant'


class AIAction(models.Model):
    """Actions IA exécutées dans le système"""
    
    ACTION_TYPES = [
        ('create_po', _('Création bon de commande')),
        ('create_invoice', _('Création facture')),
        ('send_reminder', _('Envoi relance')),
        ('update_status', _('Mise à jour statut')),
        ('analyze_spend', _('Analyse dépenses')),
        ('suggest_supplier', _('Suggestion fournisseur')),
        ('extract_data', _('Extraction données')),
        ('generate_report', _('Génération rapport')),
        ('search_products', _('Recherche produits')),
        ('price_analysis', _('Analyse prix')),
        ('forecast_demand', _('Prévision demande')),
    ]
    
    ACTION_STATUS = [
        ('pending', _('En attente')),
        ('approved', _('Approuvé')),
        ('rejected', _('Rejeté')),
        ('executed', _('Exécuté')),
        ('failed', _('Échoué')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Utilisateur"))
    conversation = models.ForeignKey(
        AIConversation, 
        on_delete=models.CASCADE, 
        null=True, blank=True,
        verbose_name=_("Conversation")
    )
    
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES, verbose_name=_("Type d'action"))
    status = models.CharField(max_length=20, choices=ACTION_STATUS, default='pending', verbose_name=_("Statut"))
    
    # Paramètres et résultat
    parameters = models.JSONField(default=dict, verbose_name=_("Paramètres"))
    result = models.JSONField(default=dict, verbose_name=_("Résultat"))
    success = models.BooleanField(default=True, verbose_name=_("Succès"))
    error_message = models.TextField(blank=True, verbose_name=_("Message d'erreur"))
    
    # Approbation
    requires_approval = models.BooleanField(default=False, verbose_name=_("Nécessite approbation"))
    approved = models.BooleanField(null=True, blank=True, verbose_name=_("Approuvé"))
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='approved_ai_actions',
        verbose_name=_("Approuvé par")
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Approuvé le"))
    
    # IA metadata
    confidence_score = models.FloatField(default=0.0, verbose_name=_("Score de confiance"))
    reasoning = models.TextField(blank=True, verbose_name=_("Raisonnement IA"))
    
    executed_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Exécuté le"))

    class Meta:
        ordering = ['-executed_at']
        verbose_name = _("Action IA")
        verbose_name_plural = _("Actions IA")

    def __str__(self):
        return f"{self.get_action_type_display()} - {self.user.get_full_name()}"

    def can_be_approved(self, user):
        """Vérifie si l'action peut être approuvée par cet utilisateur"""
        if not self.requires_approval:
            return False
        if self.approved is not None:
            return False
        return user.role in ['admin', 'manager']


class AILearningData(models.Model):
    """Données d'apprentissage IA spécifiques au tenant"""
    
    DATA_TYPES = [
        ('user_preferences', _('Préférences utilisateur')),
        ('approval_patterns', _('Patterns d\'approbation')),
        ('supplier_preferences', _('Préférences fournisseurs')),
        ('pricing_history', _('Historique prix')),
        ('seasonal_patterns', _('Patterns saisonniers')),
        ('error_corrections', _('Corrections d\'erreurs')),
        ('successful_actions', _('Actions réussies')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    data_type = models.CharField(max_length=50, choices=DATA_TYPES, verbose_name=_("Type de données"))
    data = models.JSONField(verbose_name=_("Données"))
    confidence_level = models.FloatField(default=0.0, verbose_name=_("Niveau de confiance"))
    
    # Métadonnées
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name=_("Utilisateur"))
    source_action = models.ForeignKey(AIAction, on_delete=models.CASCADE, null=True, blank=True, verbose_name=_("Action source"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['-updated_at']
        verbose_name = _("Données d'apprentissage IA")
        verbose_name_plural = _("Données d'apprentissage IA")

    def __str__(self):
        return f"{self.get_data_type_display()} - {self.confidence_level:.2f}"


class AINotification(models.Model):
    """Notifications IA pour les utilisateurs"""
    
    NOTIFICATION_TYPES = [
        ('suggestion', _('Suggestion')),
        ('alert', _('Alerte')),
        ('action_completed', _('Action terminée')),
        ('approval_needed', _('Approbation requise')),
        ('anomaly_detected', _('Anomalie détectée')),
        ('insight', _('Insight')),
        ('recommendation', _('Recommandation')),
    ]
    
    PRIORITY_LEVELS = [
        ('low', _('Faible')),
        ('medium', _('Moyenne')),
        ('high', _('Élevée')),
        ('critical', _('Critique')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Utilisateur"))
    
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, verbose_name=_("Type"))
    
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    message = models.TextField(verbose_name=_("Message"))
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium', verbose_name=_("Priorité"))
    
    # Action associée
    related_object_type = models.CharField(max_length=50, blank=True, verbose_name=_("Type d'objet lié"))
    related_object_id = models.UUIDField(null=True, blank=True, verbose_name=_("ID objet lié"))
    action_url = models.CharField(max_length=200, blank=True, verbose_name=_("URL d'action"))
    
    # Données supplémentaires
    data = models.JSONField(default=dict, verbose_name=_("Données"))
    
    # Statut
    is_read = models.BooleanField(default=False, verbose_name=_("Lu"))
    is_dismissed = models.BooleanField(default=False, verbose_name=_("Ignoré"))
    action_taken = models.CharField(max_length=50, blank=True, verbose_name=_("Action prise"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Lu le"))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Notification IA")
        verbose_name_plural = _("Notifications IA")

    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"

    def mark_as_read(self):
        """Marque la notification comme lue"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()

    def get_priority_class(self):
        """Retourne la classe CSS pour la priorité"""
        priority_classes = {
            'low': 'secondary',
            'medium': 'primary',
            'high': 'warning',
            'critical': 'danger',
        }
        return priority_classes.get(self.priority, 'primary')


class AIAnalytics(models.Model):
    """Analytics sur l'utilisation de l'IA"""
    
    METRIC_TYPES = [
        ('conversation_count', _('Nombre de conversations')),
        ('message_count', _('Nombre de messages')),
        ('action_success_rate', _('Taux de succès des actions')),
        ('response_time', _('Temps de réponse')),
        ('user_satisfaction', _('Satisfaction utilisateur')),
        ('token_usage', _('Utilisation de tokens')),
        ('cost_per_interaction', _('Coût par interaction')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    metric_type = models.CharField(max_length=50, choices=METRIC_TYPES, verbose_name=_("Type de métrique"))
    value = models.FloatField(verbose_name=_("Valeur"))
    
    # Dimensions
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name=_("Utilisateur"))
    date = models.DateField(verbose_name=_("Date"))
    period = models.CharField(max_length=20, choices=[
        ('daily', _('Quotidien')),
        ('weekly', _('Hebdomadaire')),
        ('monthly', _('Mensuel')),
    ], verbose_name=_("Période"))
    
    # Métadonnées
    metadata = models.JSONField(default=dict, verbose_name=_("Métadonnées"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = _("Analytics IA")
        verbose_name_plural = _("Analytics IA")
        unique_together = ['metric_type', 'user', 'date', 'period']

    def __str__(self):
        return f"{self.get_metric_type_display()} - {self.value} ({self.date})"


class AIPromptTemplate(models.Model):
    """Templates de prompts pour l'IA"""
    
    TEMPLATE_CATEGORIES = [
        ('purchase_order', _('Bon de commande')),
        ('invoice', _('Facturation')),
        ('supplier', _('Fournisseur')),
        ('analytics', _('Analytics')),
        ('general', _('Général')),
        ('system', _('Système')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100, verbose_name=_("Nom"))
    category = models.CharField(max_length=50, choices=TEMPLATE_CATEGORIES, verbose_name=_("Catégorie"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Template
    prompt_template = models.TextField(verbose_name=_("Template de prompt"))
    system_message = models.TextField(blank=True, verbose_name=_("Message système"))
    
    # Paramètres IA
    temperature = models.FloatField(default=0.7, verbose_name=_("Température"))
    max_tokens = models.IntegerField(default=1000, verbose_name=_("Tokens max"))
    
    # Variables disponibles
    variables = models.JSONField(default=list, verbose_name=_("Variables"))
    
    # Métadonnées
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))
    usage_count = models.IntegerField(default=0, verbose_name=_("Nombre d'utilisations"))
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Créé par"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Créé le"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Modifié le"))

    class Meta:
        ordering = ['category', 'name']
        verbose_name = _("Template de prompt IA")
        verbose_name_plural = _("Templates de prompts IA")

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

    def render_prompt(self, context=None):
        """Rend le template avec le contexte fourni"""
        if not context:
            context = {}
        
        try:
            from django.template import Template, Context
            template = Template(self.prompt_template)
            return template.render(Context(context))
        except Exception as e:
            return self.prompt_template  # Fallback au template brut