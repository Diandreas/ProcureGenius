from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid


class Supplier(models.Model):
    """Fournisseur"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name=_("Nom du fournisseur"))
    contact_person = models.CharField(max_length=100, blank=True, verbose_name=_("Personne contact"))
    email = models.EmailField(verbose_name=_("Email"))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_("Téléphone"))
    address = models.TextField(blank=True, verbose_name=_("Adresse"))
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))

    class Meta:
        verbose_name = _("Fournisseur")
        verbose_name_plural = _("Fournisseurs")
        ordering = ['name']

    def __str__(self):
        return self.name
