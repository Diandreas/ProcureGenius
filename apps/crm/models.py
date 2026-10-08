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

    # Reparti sans rien acheter : pourquoi ? (facultatif) — mesure ce que le centre perd.
    LOST_CHOICES = [
        ('price', 'Trop cher'),
        ('stock', 'Produit ou examen indisponible'),
        ('wait', 'Attente trop longue'),
        ('doctor', 'Médecin absent'),
        ('other', 'Autre raison'),
    ]
    lost_reason = models.CharField(max_length=10, choices=LOST_CHOICES, blank=True,
                                   verbose_name='Reparti sans acheter')

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
    # Campagne qui a amené ce patient (facultatif).
    campaign = models.ForeignKey(
        'crm.CRMCampaign', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='profiles', verbose_name='Campagne',
    )
    unknown = models.BooleanField(default=False, verbose_name='Provenance inconnue')
    # Bouche-à-oreille : le patient qui l'a envoyé (facultatif).
    referred_by = models.ForeignKey(
        'accounts.Client', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_referrals', verbose_name='Envoyé par',
    )
    # Quartier choisi en pastille (l'adresse libre de la fiche reste inchangée).
    quartier = models.CharField(max_length=80, blank=True, verbose_name='Quartier')
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


class ContactReason(models.Model):
    """Motif d'une relance (« Dépistage hépatite B », « Rappel de suivi »...).

    Liste propre à chaque organisation, créée à la première utilisation puis
    modifiable. Les `keywords` servent à savoir si le patient est vraiment venu :
    une facture dont une ligne contient l'un de ces mots, après la relance, vaut
    « venu pour ce motif ». Sans mot-clé, n'importe quelle facture vaut « revenu ».
    """
    # (libellé, mots-clés séparés par des virgules)
    DEFAULTS = [
        ('Rappel de suivi', ''),
        ('Bilan de santé', 'bilan'),
        ('Vaccination', 'vaccin'),
        ('Dépistage hépatite B', 'hépatite b, hepatite b, aghbs, hbs'),
        ('Résultats disponibles', ''),
        ('Rendez-vous', ''),
        ('Vœux / anniversaire', ''),
        ('Autre', ''),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='crm_reasons', verbose_name='Organisation',
    )
    label = models.CharField(max_length=80, verbose_name='Libellé')
    keywords = models.CharField(max_length=300, blank=True, verbose_name='Mots-clés (facture)')
    # Message WhatsApp proposé pour ce motif ({nom} et {centre} sont remplacés). Vide : modèle par défaut.
    message_template = models.TextField(blank=True, verbose_name='Message proposé')
    position = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Motif de contact'
        verbose_name_plural = 'Motifs de contact'
        ordering = ['position', 'label']

    def __str__(self):
        return self.label


class CRMCampaign(models.Model):
    """Une action de terrain ou de communication dont on veut mesurer le résultat."""
    KIND_CHOICES = [
        ('door_to_door', 'Porte-à-porte'),
        ('social', 'Facebook / réseaux sociaux'),
        ('onsite', 'Dépistage / soins sur place'),
        ('flyers', 'Affiches / flyers'),
        ('partner', 'Partenariat'),
        ('other', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='crm_campaigns', verbose_name='Organisation',
    )
    name = models.CharField(max_length=120, verbose_name='Nom')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='other')
    reason = models.ForeignKey(
        ContactReason, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='campaigns', verbose_name='Motif',
    )
    zone = models.CharField(max_length=120, blank=True, verbose_name='Quartier / zone')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_campaigns',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Campagne'
        verbose_name_plural = 'Campagnes'
        ordering = ['-is_active', '-start_date', 'name']

    def __str__(self):
        return self.name


class ContactLog(models.Model):
    """Une relance : on a contacté un patient (WhatsApp, appel...) pour un motif.

    La suite — est-il vraiment venu ? — n'est pas saisie : elle se déduit des
    factures qui suivent (voir services.calculer_venues), ou se confirme d'un
    clic à la facturation (`came_invoice`).
    """
    CHANNEL_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('call', 'Appel'),
        ('visit', 'Visite'),
        ('other', 'Autre'),
    ]
    OUTCOME_CHOICES = [
        ('sent', 'Contacté, sans réponse précise'),
        ('agreed', "D'accord pour venir"),
        ('callback', 'À rappeler'),
        ('no_answer', 'Pas de réponse'),
        ('declined', 'Pas intéressé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='crm_contact_logs', verbose_name='Organisation',
    )
    patient = models.ForeignKey(
        'accounts.Client', on_delete=models.CASCADE,
        related_name='crm_contacts', verbose_name='Patient',
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='whatsapp')
    reason = models.ForeignKey(
        ContactReason, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contacts', verbose_name='Motif',
    )
    campaign = models.ForeignKey(
        CRMCampaign, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contacts', verbose_name='Campagne',
    )
    outcome = models.CharField(max_length=10, choices=OUTCOME_CHOICES, default='sent')
    note = models.CharField(max_length=300, blank=True)
    # « À rappeler le … » (réponse « à rappeler ») ou « il compte venir le … » (réponse « d'accord »).
    follow_up_date = models.DateField(null=True, blank=True, verbose_name='Date prévue')
    contacted_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_contact_logs',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    # Confirmation manuelle (à la facturation) : cette facture est la suite de cette relance.
    came_invoice = models.ForeignKey(
        'invoicing.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )

    class Meta:
        verbose_name = 'Relance'
        verbose_name_plural = 'Relances'
        ordering = ['-contacted_at']
        indexes = [
            models.Index(fields=['organization', '-contacted_at']),
            models.Index(fields=['patient', '-contacted_at']),
        ]

    def __str__(self):
        return '%s — %s (%s)' % (self.patient_id, self.get_outcome_display(), self.contacted_at.strftime('%d/%m/%Y'))


class InvoiceCRMInfo(models.Model):
    """Ce qu'il faut retenir d'une facture pour le suivi : montée en gamme, etc.

    « Venu pour un bilan à 5 000 F, convaincu d'en prendre un à 15 000 F » :
    `came_for` + `planned_amount` permettent de mesurer le gain.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'accounts.Organization', on_delete=models.CASCADE,
        related_name='crm_invoice_infos', verbose_name='Organisation',
    )
    invoice = models.OneToOneField(
        'invoicing.Invoice', on_delete=models.CASCADE,
        related_name='crm_info', verbose_name='Facture',
    )
    upsold = models.BooleanField(default=False, verbose_name='Montée en gamme')
    came_for = models.CharField(max_length=200, blank=True, verbose_name='Venu pour')
    planned_amount = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    # « À revoir dans … » : contrôle prévu par le soignant. Passé cette date sans nouvelle
    # facture, le patient apparaît dans la liste « Contrôle prévu, pas revenu ».
    revisit_date = models.DateField(null=True, blank=True, verbose_name='À revoir le')
    note = models.CharField(max_length=300, blank=True)
    recorded_by = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_invoice_infos',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Info CRM de facture'
        verbose_name_plural = 'Infos CRM de factures'
