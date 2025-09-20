from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Invoice(models.Model):
    """Facture"""
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('sent', _('Envoyée')),
        ('paid', _('Payée')),
        ('overdue', _('En retard')),
        ('cancelled', _('Annulée')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro de facture"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name=_("Statut"))
    
    # Informations générales
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de modification"))
    due_date = models.DateField(verbose_name=_("Date d'échéance"))
    
    # Montants (simplifiés)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Sous-total"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("Montant des taxes"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("Montant total"))
    
    # Relations
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_invoices', verbose_name=_("Créé par"))

    class Meta:
        verbose_name = _("Facture")
        verbose_name_plural = _("Factures")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.title}"
