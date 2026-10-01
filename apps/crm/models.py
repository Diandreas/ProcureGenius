"""
Suivi patients (CRM).

Tables annexes uniquement : on n'ajoute volontairement aucune colonne a
`accounts.Client`, dont le save() lance une validation complete.

`PatientInteraction` est la memoire des contacts avec un patient qui ne passent
pas par la facturation : un passage (« il est venu pour un renseignement »), puis
plus tard les notes et les relances. Une seule table pour les trois, afin que la
fiche d'un patient raconte tout ce qui s'est passe dans l'ordre.
"""
import uuid

from django.db import models
from django.utils import timezone


class PatientInteraction(models.Model):
    KIND_PASSAGE = 'passage'
    KIND_NOTE = 'note'
    KIND_CHOICES = [
        (KIND_PASSAGE, 'Passage'),
        (KIND_NOTE, 'Note'),
    ]

    # Ce que la personne est venue faire. Ordre = ordre d'affichage des pastilles.
    REASON_CHOICES = [
        ('information', 'Renseignement'),
        ('appointment', 'Rendez-vous'),
        ('results', 'Résultats ou documents'),
        ('payment', 'Règlement'),
        ('medication', 'Médicaments'),
        ('complaint', 'Réclamation'),
        ('other', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='crm_interactions', verbose_name='Organisation',
    )
    # Le patient, quand il est enregistre. Une personne qui n'a pas encore de fiche
    # (renseignement pris au comptoir) est notee par son nom et son telephone.
    patient = models.ForeignKey(
        'accounts.Client', on_delete=models.CASCADE, null=True, blank=True,
        related_name='crm_interactions', verbose_name='Patient',
    )
    person_name = models.CharField(max_length=150, blank=True, verbose_name='Nom (sans fiche)')
    person_phone = models.CharField(max_length=30, blank=True, verbose_name='Téléphone (sans fiche)')

    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default=KIND_PASSAGE)
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, blank=True)
    text = models.TextField(blank=True, verbose_name='Détail')

    occurred_at = models.DateTimeField(default=timezone.now, verbose_name='Date du passage')
    created_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_interactions', verbose_name='Enregistré par',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Interaction patient'
        verbose_name_plural = 'Interactions patients'
        ordering = ['-occurred_at']
        indexes = [
            models.Index(fields=['organization', '-occurred_at']),
            models.Index(fields=['patient', '-occurred_at']),
        ]

    def __str__(self):
        qui = self.patient.name if self.patient_id else (self.person_name or 'Inconnu')
        return '%s — %s (%s)' % (qui, self.get_reason_display() or self.get_kind_display(),
                                  self.occurred_at.strftime('%d/%m/%Y'))
