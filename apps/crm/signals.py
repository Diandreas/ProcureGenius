"""Retient qui a créé chaque fiche patient.

`Client` n'a pas de colonne « créé par » et le journal d'activité existant ne reçoit
jamais l'utilisateur. On le note donc dans la table annexe du suivi patients, à partir
de l'utilisateur de la requête en cours (posé à l'authentification, remis à zéro avant
chaque requête par ClearThreadLocalUserMiddleware).

Ne doit jamais empêcher la création d'un patient : toute erreur est ignorée.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import Client

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Client)
def noter_createur_de_la_fiche(sender, instance, created, **kwargs):
    if not created or instance.client_type not in ('patient', 'both'):
        return
    try:
        from apps.laboratory.signals import get_current_user
        from .models import PatientCRMProfile

        user = get_current_user()
        organisation = instance.organization
        if not user or not getattr(user, 'is_authenticated', False) or organisation is None:
            return
        if 'crm' not in (organisation.enabled_modules or []):
            return
        if getattr(user, 'organization_id', None) != organisation.id:
            return
        profil, cree = PatientCRMProfile.objects.get_or_create(
            patient=instance, defaults={'organization': organisation, 'created_by': user})
        if not cree and profil.created_by_id is None:
            profil.created_by = user
            profil.save(update_fields=['created_by', 'updated_at'])
    except Exception:  # noqa: BLE001 — la création du patient passe avant tout
        logger.exception("Suivi patients : impossible de noter l'auteur de la fiche %s", instance.pk)
