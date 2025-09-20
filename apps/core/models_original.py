from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class DashboardWidget(models.Model):
    """Widget personnalisable du tableau de bord"""
    
    WIDGET_TYPES = [
        ('stats', 'Statistiques'),
        ('chart', 'Graphique'),
        ('list', 'Liste'),
        ('ai_suggestions', 'Suggestions IA'),
        ('quick_actions', 'Actions rapides'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dashboard_widgets')
    
    widget_type = models.CharField(max_length=20, choices=WIDGET_TYPES)
    title = models.CharField(max_length=100)
    configuration = models.JSONField(default=dict)
    
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=4)  # Sur 12 colonnes Bootstrap
    height = models.IntegerField(default=300)  # En pixels
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position_y', 'position_x']
        verbose_name = "Widget du tableau de bord"
        verbose_name_plural = "Widgets du tableau de bord"

    def __str__(self):
        return f"{self.title} ({self.user.get_full_name()})"


class SystemNotification(models.Model):
    """Notifications système"""
    
    NOTIFICATION_TYPES = [
        ('info', 'Information'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur'),
        ('success', 'Succès'),
        ('maintenance', 'Maintenance'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info')
    
    # Ciblage
    target_all_users = models.BooleanField(default=False)
    target_roles = models.JSONField(default=list, blank=True)  # Liste des rôles ciblés
    target_users = models.ManyToManyField(User, blank=True, related_name='targeted_notifications')
    
    # Planification
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_notifications')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Notification système"
        verbose_name_plural = "Notifications système"

    def __str__(self):
        return self.title


class UserNotificationRead(models.Model):
    """Suivi des notifications lues par utilisateur"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification = models.ForeignKey(SystemNotification, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'notification']
        verbose_name = "Notification lue"
        verbose_name_plural = "Notifications lues"


class QuickAction(models.Model):
    """Actions rapides personnalisables"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quick_actions')
    
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=200, blank=True)
    icon = models.CharField(max_length=50, default='bi-plus-circle')  # Bootstrap Icons
    url = models.CharField(max_length=200)
    
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'title']
        verbose_name = "Action rapide"
        verbose_name_plural = "Actions rapides"

    def __str__(self):
        return f"{self.title} ({self.user.get_full_name()})"


class SystemSetting(models.Model):
    """Paramètres système globaux"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.CharField(max_length=200, blank=True)
    
    is_public = models.BooleanField(default=False)  # Accessible via API publique
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paramètre système"
        verbose_name_plural = "Paramètres système"

    def __str__(self):
        return f"{self.key}: {self.value[:50]}..."