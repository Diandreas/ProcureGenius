from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
import uuid

User = get_user_model()


class Conversation(models.Model):
    """Conversation avec l'assistant IA"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Utilisateur"))
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, verbose_name=_("Active"))

    class Meta:
        verbose_name = _("Conversation")
        verbose_name_plural = _("Conversations")
        ordering = ['-last_message_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class Message(models.Model):
    """Message dans une conversation"""
    ROLE_CHOICES = [
        ('user', _('Utilisateur')),
        ('assistant', _('Assistant')),
        ('system', _('Système')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name=_("Conversation")
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name=_("Rôle"))
    content = models.TextField(verbose_name=_("Contenu"))
    created_at = models.DateTimeField(auto_now_add=True)

    # Métadonnées optionnelles
    tool_calls = models.JSONField(blank=True, null=True, verbose_name=_("Function Calls"))
    metadata = models.JSONField(blank=True, null=True, verbose_name=_("Métadonnées"))

    class Meta:
        verbose_name = _("Message")
        verbose_name_plural = _("Messages")
        ordering = ['created_at']

    def __str__(self):
        return f"{self.get_role_display()}: {self.content[:50]}..."


class DocumentScan(models.Model):
    """Document scanné et analysé par l'IA"""
    DOCUMENT_TYPES = [
        ('invoice', _('Facture')),
        ('purchase_order', _('Bon de commande')),
        ('supplier_list', _('Liste fournisseurs')),
        ('other', _('Autre')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_("Utilisateur"))
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES, verbose_name=_("Type de document"))
    original_filename = models.CharField(max_length=255, blank=True, verbose_name=_("Nom original"))
    file_path = models.CharField(max_length=500, blank=True, verbose_name=_("Chemin fichier"))

    # Résultats OCR et IA
    ocr_text = models.TextField(blank=True, verbose_name=_("Texte OCR"))
    extracted_data = models.JSONField(blank=True, null=True, verbose_name=_("Données extraites"))
    ai_analysis = models.JSONField(blank=True, null=True, verbose_name=_("Analyse IA"))

    # Statut du traitement
    is_processed = models.BooleanField(default=False, verbose_name=_("Traité"))
    is_auto_created = models.BooleanField(default=False, verbose_name=_("Création automatique"))
    created_entity_type = models.CharField(max_length=50, blank=True, verbose_name=_("Type entité créée"))
    created_entity_id = models.CharField(max_length=100, blank=True, verbose_name=_("ID entité créée"))

    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Document scanné")
        verbose_name_plural = _("Documents scannés")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.created_at.strftime('%d/%m/%Y %H:%M')}"


class AIAssistant(models.Model):
    """Modèle d'assistant IA simplifié (gardé pour compatibilité)"""
    pass


class ActionHistory(models.Model):
    """Historique des actions IA pour système undo"""
    ACTION_TYPES = [
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
    ]

    ENTITY_TYPES = [
        ('supplier', 'Fournisseur'),
        ('invoice', 'Facture'),
        ('purchase_order', 'Bon de commande'),
        ('client', 'Client'),
        ('product', 'Produit'),
        ('stock', 'Stock'),
        ('report', 'Rapport'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_actions')
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    entity_type = models.CharField(max_length=50, choices=ENTITY_TYPES)
    entity_id = models.CharField(max_length=100)  # UUID as string

    # États pour undo
    previous_state = models.JSONField(null=True, blank=True)  # État avant modification
    new_state = models.JSONField(null=True, blank=True)       # État après modification

    # Contrôle undo
    can_undo = models.BooleanField(default=True)
    is_undone = models.BooleanField(default=False)
    undone_at = models.DateTimeField(null=True, blank=True)

    # Métadonnées
    conversation_id = models.UUIDField(null=True, blank=True)
    message_id = models.UUIDField(null=True, blank=True)
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f"{self.action_type} {self.entity_type} by {self.user.username}"

    def mark_as_undone(self):
        """Marque l'action comme annulée"""
        from django.utils import timezone
        self.is_undone = True
        self.undone_at = timezone.now()
        self.can_undo = False
        self.save()


class AIUsageLog(models.Model):
    """Log persistant de chaque requête AI pour monitoring et analytics"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_usage_logs')
    organization = models.ForeignKey('accounts.Organization', on_delete=models.CASCADE, related_name='ai_usage_logs')
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True)

    # Métriques de tokens
    prompt_tokens = models.IntegerField(default=0, verbose_name=_("Tokens du prompt"))
    completion_tokens = models.IntegerField(default=0, verbose_name=_("Tokens de complétion"))
    total_tokens = models.IntegerField(default=0, verbose_name=_("Total tokens"))

    # Coût estimé (basé sur pricing Mistral)
    estimated_cost = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=0,
        verbose_name=_("Coût estimé")
    )

    # Métadonnées
    action_type = models.CharField(max_length=50, default='chat', verbose_name=_("Type d'action"))
    model_used = models.CharField(max_length=50, default='mistral-large-latest', verbose_name=_("Modèle utilisé"))
    response_time_ms = models.IntegerField(default=0, verbose_name=_("Temps de réponse (ms)"))

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Log d'utilisation AI")
        verbose_name_plural = _("Logs d'utilisation AI")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action_type} - {self.total_tokens} tokens"


class ProactiveSuggestion(models.Model):
    """Modèle de suggestion proactive pour guider les utilisateurs"""
    SUGGESTION_TYPES = [
        ('learning', _('Conseil d\'apprentissage')),
        ('feature', _('Découverte de fonctionnalité')),
        ('best_practice', _('Meilleure pratique')),
        ('optimization', _('Optimisation')),
    ]

    suggestion_type = models.CharField(max_length=50, choices=SUGGESTION_TYPES)

    # Contenu de la suggestion
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    message = models.TextField(verbose_name=_("Message"))
    action_label = models.CharField(max_length=100, blank=True, verbose_name=_("Label du bouton d'action"))
    action_url = models.CharField(max_length=500, blank=True, verbose_name=_("URL d'action"))

    # Conditions de déclenchement (JSON)
    trigger_conditions = models.JSONField(default=dict, verbose_name=_("Conditions de déclenchement"))
    # Ex: {"min_invoices": 5, "never_used_feature": "email_invoice"}

    # Contrôle d'affichage
    priority = models.IntegerField(default=5, verbose_name=_("Priorité"))  # 1-10
    is_active = models.BooleanField(default=True, verbose_name=_("Active"))
    max_displays = models.IntegerField(default=3, verbose_name=_("Maximum d'affichages"))

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Suggestion proactive")
        verbose_name_plural = _("Suggestions proactives")
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_suggestion_type_display()})"


class UserSuggestionHistory(models.Model):
    """Historique des suggestions affichées aux utilisateurs"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suggestion_history')
    suggestion = models.ForeignKey(ProactiveSuggestion, on_delete=models.CASCADE)

    displayed_at = models.DateTimeField(auto_now_add=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    action_taken = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Historique de suggestion")
        verbose_name_plural = _("Historiques de suggestions")
        unique_together = ['user', 'suggestion']
        ordering = ['-displayed_at']

    def __str__(self):
        return f"{self.user.username} - {self.suggestion.title}"


class AINotification(models.Model):
    """Notifications push pour les suggestions et alertes IA"""
    NOTIFICATION_TYPES = [
        ('suggestion', _('Suggestion proactive')),
        ('alert', _('Alerte')),
        ('insight', _('Analyse intelligente')),
        ('achievement', _('Succès débloqué')),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)

    # Contenu
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    message = models.TextField(verbose_name=_("Message"))
    action_label = models.CharField(max_length=100, blank=True, verbose_name=_("Label du bouton"))
    action_url = models.CharField(max_length=500, blank=True, verbose_name=_("URL d'action"))

    # Lien vers suggestion si applicable
    suggestion = models.ForeignKey(ProactiveSuggestion, on_delete=models.CASCADE, null=True, blank=True)

    # Métadonnées
    data = models.JSONField(default=dict, verbose_name=_("Données additionnelles"))

    # Statut
    is_read = models.BooleanField(default=False, verbose_name=_("Lu"))
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Notification IA")
        verbose_name_plural = _("Notifications IA")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"

    def mark_as_read(self):
        """Marque la notification comme lue"""
        from django.utils import timezone
        self.is_read = True
        self.read_at = timezone.now()
        self.save()
