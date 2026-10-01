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


class PatientOrigin(models.Model):
    """Une provenance possible (« Bouche-a-oreille », « Facebook »...).

    Liste propre a chaque organisation, creee a la premiere utilisation a partir
    des valeurs par defaut ci-dessous, puis modifiable par l'administrateur.
    `code` sert aux regles automatiques (laboratoire partenaire, medecin).
    """
    # (code, libelle) — l'ordre est l'ordre d'affichage initial.
    DEFAULTS = [
        ('word_of_mouth', 'Bouche-à-oreille'),
        ('already_came', 'Déjà venu'),
        ('passing_by', 'Passé devant le centre'),
        ('social', 'Facebook / WhatsApp'),
        ('doctor', 'Envoyé par un médecin'),
        ('company', 'Entreprise'),
        ('campaign', 'Porte-à-porte / campagne'),
        ('partner_lab', 'Laboratoire partenaire'),
        ('other', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='crm_origins', verbose_name='Organisation',
    )
    code = models.CharField(max_length=30, blank=True)
    label = models.CharField(max_length=80, verbose_name='Libellé')
    position = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Provenance'
        verbose_name_plural = 'Provenances'
        ordering = ['position', 'label']

    def __str__(self):
        return self.label


class PatientCRMProfile(models.Model):
    """Ce que le centre sait de la relation avec un patient (provenance...).

    Cree a la demande, une ligne par patient. `origin` vide + `unknown` faux =
    « pas encore renseigne » ; `unknown` vrai = « on ne sait pas », reponse
    definitive qui arrete la question.
    """
    SOURCE_MANUAL = 'manual'
    SOURCE_AUTO = 'auto'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='crm_profiles', verbose_name='Organisation',
    )
    patient = models.OneToOneField(
        'accounts.Client', on_delete=models.CASCADE,
        related_name='crm_profile', verbose_name='Patient',
    )
    origin = models.ForeignKey(
        PatientOrigin, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='profiles', verbose_name='Provenance',
    )
    detail = models.CharField(max_length=200, blank=True, verbose_name='Précision')
    unknown = models.BooleanField(default=False, verbose_name='Provenance inconnue')
    do_not_contact = models.BooleanField(default=False, verbose_name='Ne plus relancer')
    filled_by = models.CharField(max_length=10, default=SOURCE_MANUAL)
    recorded_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_profiles', verbose_name='Enregistré par',
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Profil CRM patient'
        verbose_name_plural = 'Profils CRM patients'

    def __str__(self):
        return '%s — %s' % (self.patient_id, self.origin or ('inconnue' if self.unknown else '?'))


class MonthlyReportSchedule(models.Model):
    """Envoi automatique, chaque mois, du fichier « patients financiers » du mois ecoule.

    Une ligne par organisation. Desactive tant que l'administrateur ne l'a pas
    active et n'a pas saisi au moins un destinataire.
    """
    organization = models.OneToOneField(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='crm_report_schedule', verbose_name='Organisation',
    )
    enabled = models.BooleanField(default=False)
    recipients = models.TextField(blank=True, help_text='Adresses séparées par une virgule')
    day_of_month = models.PositiveSmallIntegerField(default=1, help_text='Jour d\'envoi (1 à 28)')
    last_sent_for = models.DateField(null=True, blank=True, help_text='Premier jour du dernier mois envoyé')
    last_sent_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=300, blank=True)

    class Meta:
        verbose_name = 'Envoi mensuel du rapport patients financiers'

    def liste_destinataires(self):
        return [a.strip() for a in self.recipients.replace(';', ',').split(',') if a.strip()]
