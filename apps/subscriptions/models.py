"""
Modèles pour le système d'abonnement ProcureGenius
3 plans: Free (gratuit avec pub), Standard (12€/mois), Premium (199€/mois)
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta
import uuid


class SubscriptionPlan(models.Model):
    """
    Plan d'abonnement disponible
    3 plans: free, standard, premium
    """

    PLAN_CHOICES = [
        ('free', _('Free')),
        ('standard', _('Standard')),
        ('premium', _('Premium')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Identification
    code = models.CharField(
        max_length=50,
        unique=True,
        choices=PLAN_CHOICES,
        verbose_name=_("Code du plan")
    )

    name = models.CharField(
        max_length=100,
        verbose_name=_("Nom du plan")
    )

    description = models.TextField(
        verbose_name=_("Description")
    )

    # Tarification
    price_monthly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name=_("Prix mensuel (€)")
    )

    price_yearly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name=_("Prix annuel (€)")
    )

    currency = models.CharField(
        max_length=3,
        default='EUR',
        verbose_name=_("Devise")
    )

    # Quotas
    max_invoices_per_month = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Factures max/mois")
    )

    max_clients = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Clients maximum")
    )

    max_products = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Produits maximum")
    )

    max_purchase_orders_per_month = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Bons de commande max/mois")
    )

    max_suppliers = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Fournisseurs maximum")
    )

    max_storage_mb = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Stockage max (MB)")
    )

    max_ai_requests_per_month = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Requêtes IA max/mois")
    )

    # Fonctionnalités
    has_ads = models.BooleanField(
        default=False,
        verbose_name=_("Afficher publicités")
    )

    has_ai_assistant = models.BooleanField(
        default=False,
        verbose_name=_("Assistant IA")
    )

    has_purchase_orders = models.BooleanField(
        default=False,
        verbose_name=_("Bons de commande")
    )

    has_suppliers = models.BooleanField(
        default=False,
        verbose_name=_("Fournisseurs")
    )

    has_e_sourcing = models.BooleanField(
        default=False,
        verbose_name=_("E-Sourcing")
    )

    has_contracts = models.BooleanField(
        default=False,
        verbose_name=_("Contrats")
    )

    has_analytics = models.BooleanField(
        default=False,
        verbose_name=_("Analytics avancés")
    )

    # Configuration
    trial_days = models.IntegerField(
        default=0,
        verbose_name=_("Jours d'essai gratuit")
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Actif")
    )

    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Ordre d'affichage")
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Plan d'abonnement")
        verbose_name_plural = _("Plans d'abonnement")
        ordering = ['sort_order', 'price_monthly']

    def __str__(self):
        return f"{self.name} - {self.price_monthly}€/mois"


class Subscription(models.Model):
    """
    Abonnement actif d'une organisation
    """

    STATUS_CHOICES = [
        ('trial', _('Période d\'essai')),
        ('active', _('Actif')),
        ('past_due', _('Paiement en retard')),
        ('cancelled', _('Annulé')),
        ('expired', _('Expiré')),
    ]

    BILLING_PERIOD_CHOICES = [
        ('monthly', _('Mensuel')),
        ('yearly', _('Annuel')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relations
    organization = models.OneToOneField(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='subscription',
        verbose_name=_("Organisation")
    )

    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        verbose_name=_("Plan")
    )

    # Statut
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='trial',
        verbose_name=_("Statut")
    )

    # Période de facturation
    billing_period = models.CharField(
        max_length=10,
        choices=BILLING_PERIOD_CHOICES,
        default='monthly',
        verbose_name=_("Période de facturation")
    )

    # Dates importantes
    started_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Date de début")
    )

    trial_ends_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fin de la période d'essai")
    )

    current_period_start = models.DateTimeField(
        verbose_name=_("Début période actuelle")
    )

    current_period_end = models.DateTimeField(
        verbose_name=_("Fin période actuelle")
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date d'annulation")
    )

    # Paiement
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('paypal', 'PayPal'),
            ('credit_card', _('Carte de crédit')),
            ('bank_transfer', _('Virement bancaire')),
            ('manual', _('Manuel (admin)')),
        ],
        default='paypal',
        verbose_name=_("Méthode de paiement")
    )

    paypal_subscription_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("ID abonnement PayPal")
    )

    # Compteurs d'utilisation mensuelle (réinitialisés le 1er du mois)
    invoices_this_month = models.IntegerField(
        default=0,
        verbose_name=_("Factures ce mois")
    )

    purchase_orders_this_month = models.IntegerField(
        default=0,
        verbose_name=_("BC ce mois")
    )

    ai_requests_this_month = models.IntegerField(
        default=0,
        verbose_name=_("Requêtes IA ce mois")
    )

    # Métadonnées
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Abonnement")
        verbose_name_plural = _("Abonnements")

    def __str__(self):
        return f"{self.organization.name} - {self.plan.name} ({self.status})"

    def save(self, *args, **kwargs):
        """Auto-calculer trial_ends_at et current_period lors de la création"""
        if not self.pk:
            # Nouvel abonnement
            if self.plan.trial_days > 0:
                self.trial_ends_at = timezone.now() + timedelta(days=self.plan.trial_days)
                self.current_period_start = timezone.now()
                self.current_period_end = self.trial_ends_at
                self.status = 'trial'
            else:
                self.current_period_start = timezone.now()
                if self.billing_period == 'monthly':
                    self.current_period_end = timezone.now() + timedelta(days=30)
                else:
                    self.current_period_end = timezone.now() + timedelta(days=365)
                self.status = 'active'

        super().save(*args, **kwargs)

        # Synchroniser subscription_type dans Organization
        self.organization.subscription_type = self.plan.code
        self.organization.save(update_fields=['subscription_type'])

    @property
    def is_trial(self):
        """Vérifie si en période d'essai"""
        return self.status == 'trial' and self.trial_ends_at and self.trial_ends_at > timezone.now()

    @property
    def trial_days_remaining(self):
        """Jours restants d'essai"""
        if self.trial_ends_at:
            delta = self.trial_ends_at - timezone.now()
            return max(0, delta.days)
        return 0

    @property
    def is_active_or_trial(self):
        """Vérifie si actif ou en essai"""
        return self.status in ['trial', 'active']

    def check_quota(self, quota_type):
        """
        Vérifie si un quota spécifique est atteint
        Returns: (bool: can_proceed, int: used, int: limit)
        """
        if quota_type == 'invoices':
            used = self.invoices_this_month
            limit = self.plan.max_invoices_per_month
        elif quota_type == 'purchase_orders':
            used = self.purchase_orders_this_month
            limit = self.plan.max_purchase_orders_per_month
        elif quota_type == 'ai_requests':
            used = self.ai_requests_this_month
            limit = self.plan.max_ai_requests_per_month
        elif quota_type == 'clients':
            from apps.accounts.models import Client
            used = Client.objects.filter(organization=self.organization).count()
            limit = self.plan.max_clients
        elif quota_type == 'suppliers':
            from apps.suppliers.models import Supplier
            used = Supplier.objects.filter(organization=self.organization).count()
            limit = self.plan.max_suppliers
        elif quota_type == 'products':
            from apps.invoicing.models import Product
            used = Product.objects.filter(organization=self.organization).count()
            limit = self.plan.max_products
        else:
            return True, 0, 0

        if limit is None or limit == -1:
            # Illimité
            return True, used, -1

        can_proceed = used < limit
        return can_proceed, used, limit

    def increment_usage(self, quota_type):
        """Incrémente le compteur d'utilisation"""
        if quota_type == 'invoices':
            self.invoices_this_month += 1
        elif quota_type == 'purchase_orders':
            self.purchase_orders_this_month += 1
        elif quota_type == 'ai_requests':
            self.ai_requests_this_month += 1

        self.save(update_fields=[f'{quota_type}_this_month', 'updated_at'])

    def reset_monthly_quotas(self):
        """Réinitialise les quotas mensuels (appelé par tâche cron)"""
        self.invoices_this_month = 0
        self.purchase_orders_this_month = 0
        self.ai_requests_this_month = 0
        self.save(update_fields=['invoices_this_month', 'purchase_orders_this_month', 'ai_requests_this_month'])

    def renew_period(self):
        """Renouvelle la période d'abonnement"""
        if self.billing_period == 'monthly':
            self.current_period_start = self.current_period_end
            self.current_period_end = self.current_period_end + timedelta(days=30)
        else:  # yearly
            self.current_period_start = self.current_period_end
            self.current_period_end = self.current_period_end + timedelta(days=365)

        self.status = 'active'
        self.save()

    def cancel(self, immediately=False):
        """Annule l'abonnement"""
        self.cancelled_at = timezone.now()

        if immediately:
            self.status = 'cancelled'
            self.current_period_end = timezone.now()
        # Sinon, reste actif jusqu'à la fin de la période

        self.save()


class SubscriptionPayment(models.Model):
    """
    Historique des paiements d'abonnement
    """

    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('success', _('Réussi')),
        ('failed', _('Échoué')),
        ('refunded', _('Remboursé')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_("Abonnement")
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Montant")
    )

    currency = models.CharField(
        max_length=3,
        default='EUR',
        verbose_name=_("Devise")
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_("Statut")
    )

    payment_method = models.CharField(
        max_length=50,
        verbose_name=_("Méthode de paiement")
    )

    transaction_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("ID de transaction")
    )

    paypal_order_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("ID commande PayPal")
    )

    period_start = models.DateTimeField(
        verbose_name=_("Début de période couverte")
    )

    period_end = models.DateTimeField(
        verbose_name=_("Fin de période couverte")
    )

    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Paiement d'abonnement")
        verbose_name_plural = _("Paiements d'abonnement")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subscription.organization.name} - {self.amount}€ - {self.status}"
