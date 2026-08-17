import uuid
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


MODULE_CHOICES = [
    ('dashboard', _('Tableau de bord')),
    ('suppliers', _('Fournisseurs')),
    ('purchase-orders', _('Commandes d\'achat')),
    ('invoices', _('Factures')),
    ('products', _('Produits')),
    ('clients', _('Clients')),
    ('e-sourcing', _('E-sourcing')),
    ('contracts', _('Contrats')),
    ('analytics', _('Analytique')),
    ('patients', _('Patients')),
    ('consultations', _('Consultations')),
    ('laboratory', _('Laboratoire')),
    ('imaging', _('Imagerie')),
    ('pharmacy', _('Pharmacie')),
    ('ai-assistant', _('Assistant IA')),
    ('integrations', _('Intégrations')),
    ('data-migration', _('Migration de données')),
    ('other', _('Autre')),
]

CATEGORY_CHOICES = [
    ('bug', _('Bug / erreur')),
    ('facturation', _('Erreur de facturation')),
    ('lenteur', _('Lenteur')),
    ('affichage', _('Problème d\'affichage')),
    ('donnee_manquante', _('Donnée manquante ou incorrecte')),
    ('autre', _('Autre')),
]

STATUS_CHOICES = [
    ('open', _('Ouvert')),
    ('in_progress', _('En cours')),
    ('resolved', _('Résolu')),
    ('closed', _('Fermé')),
]

PRIORITY_CHOICES = [
    ('low', _('Basse')),
    ('normal', _('Normale')),
    ('high', _('Haute')),
]


class SupportTicket(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='support_tickets',
        verbose_name=_("Organisation")
    )
    reported_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_support_tickets',
        verbose_name=_("Signalé par")
    )
    title = models.CharField(max_length=200, verbose_name=_("Titre"))
    module = models.CharField(max_length=30, choices=MODULE_CHOICES, default='other', verbose_name=_("Module"))
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='autre', verbose_name=_("Catégorie"))
    description = models.TextField(verbose_name=_("Description"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', verbose_name=_("Statut"))
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal', verbose_name=_("Priorité"))
    admin_response = models.TextField(blank=True, verbose_name=_("Réponse"))
    page_url = models.CharField(max_length=500, blank=True, verbose_name=_("Page concernée"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Résolu le"))

    class Meta:
        verbose_name = _("Ticket support")
        verbose_name_plural = _("Tickets support")
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_module_display()}] {self.title}"

    def save(self, *args, **kwargs):
        if self.status in ('resolved', 'closed') and not self.resolved_at:
            self.resolved_at = timezone.now()
        elif self.status not in ('resolved', 'closed'):
            self.resolved_at = None
        super().save(*args, **kwargs)


def support_ticket_attachment_upload_path(instance, filename):
    return f"support/{timezone.now():%Y/%m}/{instance.ticket_id}/{filename}"


class SupportTicketAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name=_("Ticket")
    )
    file = models.FileField(upload_to=support_ticket_attachment_upload_path, verbose_name=_("Capture d'écran"))
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Pièce jointe ticket")
        verbose_name_plural = _("Pièces jointes ticket")
        ordering = ['uploaded_at']

    def __str__(self):
        return f"{self.ticket_id} - {self.file.name}"
