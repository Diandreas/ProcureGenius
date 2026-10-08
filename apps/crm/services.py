"""
Services du Suivi patients : numeros de telephone et segments.

Aucun acces en ecriture : ce module ne fait que lire les patients, les
factures et les vaccinations deja presents.
"""
import re
from datetime import date, datetime, time, timedelta

from django.db.models import Count, Exists, Max, OuterRef, Q, Sum
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from apps.accounts.models import Client
from apps.invoicing.models import Invoice

# Memes roles que ceux qui voient les montants a l'ecran (useCurrentUser.isAdmin).
CRM_ADMIN_ROLES = ('admin', 'manager', 'owner')

INDICATIF_PAYS = '237'  # Cameroun


# ── Telephone ───────────────────────────────────────────────────────────────

def normaliser_telephones(brut):
    """Extrait les numeros d'une saisie libre, sous forme de chaines de 9 chiffres.

    Les fiches contiennent surtout « 695544869 » (97 %), parfois deux numeros
    separes par « / » (« 683420303/694807528 »), parfois un indicatif (« +237 6… »).
    Un numero qui n'a pas 9 chiffres apres nettoyage est ecarte : il ne servirait
    ni a joindre la personne ni a la reconnaitre.
    """
    if not brut:
        return []
    numeros = []
    for morceau in re.split(r'[/;,]|\bou\b', str(brut), flags=re.IGNORECASE):
        chiffres = re.sub(r'\D', '', morceau)
        if chiffres.startswith('00' + INDICATIF_PAYS):
            chiffres = chiffres[2 + len(INDICATIF_PAYS):]
        elif chiffres.startswith(INDICATIF_PAYS) and len(chiffres) == 9 + len(INDICATIF_PAYS):
            chiffres = chiffres[len(INDICATIF_PAYS):]
        if len(chiffres) == 9 and chiffres not in numeros:
            numeros.append(chiffres)
    return numeros


def lien_whatsapp(brut):
    """Lien wa.me vers le premier numero exploitable, ou None."""
    numeros = normaliser_telephones(brut)
    return 'https://wa.me/%s%s' % (INDICATIF_PAYS, numeros[0]) if numeros else None


# ── Droits ──────────────────────────────────────────────────────────────────

def peut_voir_montants(user):
    return bool(user.is_superuser or getattr(user, 'role', '') in CRM_ADMIN_ROLES)


# ── Segments ────────────────────────────────────────────────────────────────

SEGMENTS = [
    ('all', 'Tous'),
    ('not_back_60', 'Pas revenus depuis 60 jours'),
    ('new_month', 'Nouveaux ce mois'),
    ('loyal', 'Fidèles (4 visites et plus)'),
    ('vaccine_due', 'Vaccin à rappeler'),
    ('birthday_week', 'Anniversaire cette semaine'),
    ('never_billed', 'Jamais facturés'),
    ('no_origin', 'Sans provenance'),
    ('golden', 'À relancer maintenant (3 à 6 semaines)'),
    ('to_call_back', 'À rappeler'),
    ('revisit_due', 'Contrôle prévu, pas revenus'),
    ('awaited', "Attendus (d'accord pour venir)"),
    ('promised_missing', 'Promis, pas venus'),
]

JOURS_SANS_VISITE = 60
VISITES_FIDELES = 4
JOURS_VACCIN = 14
FENETRE_OR_DEBUT = 21   # « fenêtre d'or » : dernière prise en charge il y a 21 à 42 jours
FENETRE_OR_FIN = 42


def patients_du_centre(organization, inclure_externes=False):
    """Base du suivi : les vrais patients du centre.

    Les patients de laboratoires partenaires (`registration_source='external'`)
    sont exclus par defaut, comme le fait deja la liste des patients : ils ne
    sont jamais venus au centre et fausseraient tous les taux de retour.
    """
    qs = Client.objects.filter(organization=organization, client_type__in=['patient', 'both'])
    if not inclure_externes:
        qs = qs.exclude(registration_source='external')
    return qs


def avec_activite(qs):
    """Ajoute nombre de visites, derniere visite et total paye.

    Une « visite » = une facture non annulee (hors avoir). C'est la meme regle
    que le reste du logiciel : la date retenue est created_at, pas invoice_date
    (souvent vide).

    Le total paye ne somme que les factures au statut « payee » : la table
    Payment est quasi vide cote patients et get_balance_due() renvoie le total
    meme pour une facture soldee, donc ni l'une ni l'autre n'est fiable ici.
    """
    valides = ~Q(invoices__status='cancelled') & ~Q(invoices__invoice_type='credit_note')
    return qs.annotate(
        crm_visits=Count('invoices', filter=valides, distinct=True),
        crm_last_visit=Max('invoices__created_at', filter=valides),
        crm_paid_total=Sum('invoices__total_amount', filter=valides & Q(invoices__status='paid')),
    )


def _ids_anniversaire(qs, aujourdhui, jours=7):
    """Patients dont l'anniversaire tombe dans les `jours` prochains jours."""
    fin = aujourdhui + timedelta(days=jours)
    ids = []
    for pk, naissance in qs.filter(date_of_birth__isnull=False).values_list('id', 'date_of_birth'):
        try:
            prochain = naissance.replace(year=aujourdhui.year)
        except ValueError:  # 29 fevrier : on le fete le 28 les annees non bissextiles
            prochain = naissance.replace(year=aujourdhui.year, day=28)
        if prochain < aujourdhui:
            try:
                prochain = naissance.replace(year=aujourdhui.year + 1)
            except ValueError:
                prochain = naissance.replace(year=aujourdhui.year + 1, day=28)
        if aujourdhui <= prochain <= fin:
            ids.append(pk)
    return ids


def _ids_vaccin_a_rappeler(organization, aujourdhui):
    """Patients dont la derniere dose d'un vaccin appelle une prochaine dose proche.

    On ne regarde que la derniere dose de chaque vaccin : si une dose plus
    recente existe, le rappel de l'ancienne est deja honore.
    """
    from apps.vaccination.models import VaccinationRecord
    limite = aujourdhui + timedelta(days=JOURS_VACCIN)
    derniere = {}
    for r in (VaccinationRecord.objects.filter(organization=organization)
              .order_by('-administered_date')
              .values('patient_id', 'vaccine_type_id', 'next_dose_due_date')):
        derniere.setdefault((r['patient_id'], r['vaccine_type_id']), r['next_dose_due_date'])
    return list({pid for (pid, _), echeance in derniere.items()
                 if echeance and echeance <= limite})


def appliquer_segment(qs, segment, organization, aujourdhui=None):
    """Restreint `qs` (deja annote par avec_activite) au segment demande."""
    aujourdhui = aujourdhui or date.today()
    maintenant = timezone.now()

    if segment == 'not_back_60':
        return qs.filter(crm_visits__gte=1,
                         crm_last_visit__lt=maintenant - timedelta(days=JOURS_SANS_VISITE)
                         ).exclude(crm_profile__do_not_contact=True)
    if segment == 'golden':
        # Leur dernière prise en charge date de 3 à 6 semaines : c'est là qu'ils reviennent
        # (délai médian de retour : 34 jours). Pas déjà relancés ce mois-ci, pas « ne plus relancer ».
        from .models import ContactLog
        recent = ContactLog.objects.filter(patient=OuterRef('pk'), contacted_at__gte=maintenant - timedelta(days=30))
        return (qs.filter(crm_visits__gte=1,
                          crm_last_visit__gte=maintenant - timedelta(days=FENETRE_OR_FIN),
                          crm_last_visit__lte=maintenant - timedelta(days=FENETRE_OR_DEBUT))
                .filter(~Exists(recent)).exclude(crm_profile__do_not_contact=True))
    if segment == 'to_call_back':
        return qs.filter(id__in=ids_a_rappeler(organization))
    if segment == 'revisit_due':
        return qs.filter(id__in=ids_controle_en_retard(organization))
    if segment == 'new_month':
        return qs.filter(created_at__date__gte=aujourdhui.replace(day=1))
    if segment == 'loyal':
        return qs.filter(crm_visits__gte=VISITES_FIDELES)
    if segment == 'vaccine_due':
        return qs.filter(id__in=_ids_vaccin_a_rappeler(organization, aujourdhui))
    if segment == 'birthday_week':
        return qs.filter(id__in=_ids_anniversaire(qs, aujourdhui))
    if segment == 'never_billed':
        return qs.filter(crm_visits=0)
    if segment == 'awaited':
        return qs.filter(id__in=ids_relances_en_attente(organization, ('waiting',)))
    if segment == 'promised_missing':
        return qs.filter(id__in=ids_relances_en_attente(organization, ('missed',)))
    if segment == 'no_origin':
        return qs.exclude(crm_profile__origin__isnull=False).exclude(crm_profile__unknown=True)
    return qs


def compter_segments(qs, organization):
    """Nombre de patients par segment, pour les pastilles de la page."""
    aujourdhui = date.today()
    return {code: appliquer_segment(qs, code, organization, aujourdhui).count()
            for code, _ in SEGMENTS}


# ── Filtres avances ─────────────────────────────────────────────────────────

def appliquer_filtres(qs, params):
    """Filtres avances (recherche, sexe, age, visites, quartier, service...).

    Le filtre « service » passe par Exists() et non par un filtre direct sur
    `invoices` : filtrer la meme relation que celle que les agregats parcourent
    restreindrait aussi le nombre de visites et le total paye.
    """
    q = (params.get('q') or '').strip()
    if q:
        condition = Q(name__icontains=q) | Q(patient_number__icontains=q) | Q(phone__icontains=q)
        chiffres = re.sub(r'\D', '', q)
        if len(chiffres) >= 6:
            condition |= Q(phone__icontains=chiffres[-9:])
        qs = qs.filter(condition)

    if params.get('gender') in ('M', 'F'):
        qs = qs.filter(gender=params['gender'])

    aujourdhui = date.today()
    age_min, age_max = params.get('age_min'), params.get('age_max')
    if age_min not in (None, ''):
        qs = qs.filter(date_of_birth__lte=aujourdhui - relativedelta(years=int(age_min)))
    if age_max not in (None, ''):
        qs = qs.filter(date_of_birth__gt=aujourdhui - relativedelta(years=int(age_max) + 1))

    if params.get('min_visits') not in (None, ''):
        qs = qs.filter(crm_visits__gte=int(params['min_visits']))
    if params.get('max_visits') not in (None, ''):
        qs = qs.filter(crm_visits__lte=int(params['max_visits']))

    if params.get('inactive_days') not in (None, ''):
        limite = timezone.now() - timedelta(days=int(params['inactive_days']))
        qs = qs.filter(crm_visits__gte=1, crm_last_visit__lt=limite)

    quartier = (params.get('quartier') or '').strip()
    if quartier:
        qs = qs.filter(address__icontains=quartier)

    if str(params.get('privilege_card', '')).lower() in ('1', 'true', 'oui'):
        qs = qs.filter(has_privilege_card=True)

    service = params.get('service')
    if service:
        qs = qs.filter(Exists(
            Invoice.objects.filter(client=OuterRef('pk'), invoice_type=service)
            .exclude(status='cancelled')
        ))
    return qs


ORDRES = {
    'name': ('name',),
    '-last_visit': ('-crm_last_visit',),
    'last_visit': ('crm_last_visit',),
    '-visits': ('-crm_visits', 'name'),
    '-created_at': ('-created_at',),
    '-paid_total': ('-crm_paid_total', 'name'),
}


def appliquer_ordre(qs, ordre, montants_autorises):
    """Tri demande ; le tri par montant n'est accepte que pour les administrateurs."""
    if ordre == '-paid_total' and not montants_autorises:
        ordre = '-last_visit'
    champs = ORDRES.get(ordre, ORDRES['-last_visit'])
    # Les patients jamais factures (date NULL) passent toujours apres les autres.
    expressions = []
    for champ in champs:
        if champ.lstrip('-') in ('crm_last_visit', 'crm_paid_total'):
            from django.db.models import F
            base = F(champ.lstrip('-'))
            expressions.append(base.desc(nulls_last=True) if champ.startswith('-')
                               else base.asc(nulls_last=True))
        else:
            expressions.append(champ)
    return qs.order_by(*expressions)


def services_par_patient(ids):
    """{patient_id: [type de facture, ...]} pour un lot de patients."""
    libelles = dict(Invoice.INVOICE_TYPES)
    resultat = {}
    for r in (Invoice.objects.filter(client_id__in=ids)
              .exclude(status='cancelled').exclude(invoice_type='credit_note')
              .values('client_id', 'invoice_type').distinct()):
        resultat.setdefault(r['client_id'], []).append(
            {'value': r['invoice_type'], 'label': str(libelles.get(r['invoice_type'], r['invoice_type']))})
    return resultat


def age_en_annees(naissance, aujourdhui=None):
    if not naissance:
        return None
    aujourdhui = aujourdhui or date.today()
    return aujourdhui.year - naissance.year - (
        (aujourdhui.month, aujourdhui.day) < (naissance.month, naissance.day))


# ── Provenance ──────────────────────────────────────────────────────────────

def origines_de(organization):
    """Provenances actives de l'organisation, creees a la premiere demande.

    Triees par usage reel (les plus utilisees en premier) ; « Autre » reste en
    dernier et « Laboratoire partenaire » n'est jamais propose a la main
    (il est pose automatiquement).
    """
    from django.db.models import Count
    from .models import PatientOrigin

    if not PatientOrigin.objects.filter(organization=organization).exists():
        PatientOrigin.objects.bulk_create([
            PatientOrigin(organization=organization, code=code, label=label, position=i)
            for i, (code, label) in enumerate(PatientOrigin.DEFAULTS)
        ])
    liste = list(PatientOrigin.objects.filter(organization=organization, is_active=True)
                 .annotate(n=Count('profiles')))
    liste.sort(key=lambda o: (o.code == 'other', -o.n, o.position))
    return liste


def origine_automatique(patient):
    """Code de provenance qu'on peut deduire sans demander, ou None."""
    if getattr(patient, 'registration_source', '') == 'external':
        return 'partner_lab'
    from apps.laboratory.models import LabOrder
    if LabOrder.objects.filter(patient=patient, prescriber__isnull=False).exists():
        return 'doctor'
    return None


# ── Relances : motifs et « est-il vraiment venu ? » ─────────────────────────

FENETRE_RELANCE_JOURS = 30   # une relance attend le patient pendant ce délai
RELANCES_ATTENDUES = ('sent', 'agreed', 'callback')  # sinon : rien n'est attendu


def normaliser(texte):
    """Minuscules sans accents, pour comparer « Hépatite B » et « hepatite b »."""
    import unicodedata
    decompose = unicodedata.normalize('NFKD', texte or '')
    return ''.join(c for c in decompose if not unicodedata.combining(c)).lower().strip()


def motifs_de(organization):
    """Motifs de relance actifs, créés à la première demande, les plus utilisés d'abord."""
    from .models import ContactReason

    if not ContactReason.objects.filter(organization=organization).exists():
        ContactReason.objects.bulk_create([
            ContactReason(organization=organization, label=label, keywords=mots, position=i)
            for i, (label, mots) in enumerate(ContactReason.DEFAULTS)
        ])
    liste = list(ContactReason.objects.filter(organization=organization, is_active=True)
                 .annotate(n=Count('contacts')))
    liste.sort(key=lambda m: (m.label == 'Autre', -m.n, m.position))
    return liste


def mots_cles(motif):
    if not motif or not motif.keywords:
        return []
    return [normaliser(m) for m in motif.keywords.replace(';', ',').split(',') if normaliser(m)]


def _fin_de_fenetre(log):
    fin = log.contacted_at + timedelta(days=FENETRE_RELANCE_JOURS)
    if log.outcome == 'agreed' and log.follow_up_date:
        # Il a dit quand il comptait venir : on lui laisse deux semaines de plus.
        fin = max(fin, timezone.make_aware(datetime.combine(log.follow_up_date, time.max)) + timedelta(days=14))
    campagne = log.campaign
    if campagne and campagne.end_date:
        fin_campagne = timezone.make_aware(datetime.combine(campagne.end_date, time.max))
        fin = max(fin, fin_campagne)
    return fin


def calculer_venues(logs, maintenant=None):
    """Pour chaque relance : le patient est-il venu depuis ?

    Retourne {id_relance: {'status', 'invoice', 'source', 'window_end'}} avec
    status = came (venu) | waiting (attendu, délai non écoulé) | missed (promis ou
    attendu, délai écoulé, pas venu) | none (pas de réponse / refus : rien d'attendu).

    Règle : une facture (ni brouillon, ni annulée, ni avoir) créée APRÈS la relance
    et dans la fenêtre vaut « venu » si une de ses lignes contient un mot-clé du
    motif — ou, sans mot-clé, si c'est simplement une facture. Une facture ne sert
    qu'à une seule relance. Une confirmation manuelle (`came_invoice`) l'emporte.
    """
    from collections import defaultdict

    logs = list(logs)
    if not logs:
        return {}
    maintenant = maintenant or timezone.now()

    manuelles = {l.came_invoice_id for l in logs if l.came_invoice_id}
    debut = min(l.contacted_at for l in logs)
    patients = {l.patient_id for l in logs}
    factures = (Invoice.objects.filter(client_id__in=patients, created_at__gte=debut)
                .exclude(status__in=['draft', 'cancelled']).exclude(invoice_type='credit_note')
                .prefetch_related('items').order_by('created_at'))
    par_patient = defaultdict(list)
    for f in factures:
        par_patient[f.client_id].append(f)
    deja_liees = {}
    if manuelles:
        for f in Invoice.objects.filter(id__in=manuelles):
            deja_liees[f.id] = f

    pris = set(manuelles)
    resultat = {}
    for log in sorted(logs, key=lambda l: l.contacted_at):
        fin = _fin_de_fenetre(log)
        trouvee, source = None, None
        if log.came_invoice_id and log.came_invoice_id in deja_liees:
            trouvee, source = deja_liees[log.came_invoice_id], 'manual'
        else:
            mots = mots_cles(log.reason)
            for f in par_patient.get(log.patient_id, []):
                if f.id in pris or f.created_at < log.contacted_at or f.created_at > fin:
                    continue
                if mots and not any(m in normaliser(i.description) for i in f.items.all() for m in mots):
                    continue
                trouvee, source = f, 'auto'
                pris.add(f.id)
                break
        if trouvee:
            statut = 'came'
        elif log.outcome not in RELANCES_ATTENDUES:
            statut = 'none'
        else:
            statut = 'waiting' if maintenant <= fin else 'missed'
        resultat[log.id] = {'status': statut, 'invoice': trouvee, 'source': source, 'window_end': fin}
    return resultat


def ids_relances_en_attente(organization, statuts=('waiting',), seulement_accord=True):
    """Patients ayant une relance « d'accord pour venir » dans l'état demandé."""
    from .models import ContactLog

    depuis = timezone.now() - timedelta(days=FENETRE_RELANCE_JOURS + 120)
    logs = ContactLog.objects.filter(organization=organization, contacted_at__gte=depuis)
    if seulement_accord:
        logs = logs.filter(outcome='agreed')
    logs = logs.select_related('reason', 'campaign')
    etats = calculer_venues(logs)
    return {l.patient_id for l in logs if etats[l.id]['status'] in statuts}


def ids_a_rappeler(organization):
    """Patients dont la dernière relance est « à rappeler » et dont la date de rappel est venue.

    Sans date précisée, on les remet dans la liste après deux jours.
    """
    from .models import ContactLog

    maintenant = timezone.now()
    aujourdhui = timezone.localdate()
    dernieres = {}
    for log in (ContactLog.objects.filter(organization=organization,
                                          contacted_at__gte=maintenant - timedelta(days=150))
                .order_by('-contacted_at')):
        dernieres.setdefault(log.patient_id, log)
    ids = set()
    for pid, log in dernieres.items():
        if log.outcome != 'callback':
            continue
        if log.follow_up_date:
            if log.follow_up_date <= aujourdhui:
                ids.add(pid)
        elif maintenant - log.contacted_at >= timedelta(days=2):
            ids.add(pid)
    return ids


# ── Modèles de message par motif ────────────────────────────────────────────

MODELES_MESSAGE = {
    'Rappel de suivi': "Bonjour {nom}, ici {centre}. Cela fait un moment que nous ne vous avons pas vu. Comment allez-vous ? N'hésitez pas à passer nous voir.",
    'Bilan de santé': "Bonjour {nom}, ici {centre}. Un bilan de santé régulier permet de repérer tôt les problèmes. Passez nous voir pour faire le point.",
    'Vaccination': "Bonjour {nom}, ici {centre}. Nous vous rappelons que votre prochain vaccin approche. Passez nous voir pour le faire.",
    'Dépistage hépatite B': "Bonjour {nom}, ici {centre}. Nous proposons le dépistage de l'hépatite B : c'est rapide et simple. Quel jour pouvez-vous passer ?",
    'Résultats disponibles': "Bonjour {nom}, ici {centre}. Vos résultats sont disponibles. Vous pouvez passer les récupérer au centre.",
    'Rendez-vous': "Bonjour {nom}, ici {centre}. Nous vous rappelons votre rendez-vous. Merci de nous confirmer votre venue.",
    'Vœux / anniversaire': "Bonjour {nom}, toute l'équipe de {centre} vous souhaite un joyeux anniversaire !",
}


def modele_message(motif):
    """Message proposé pour ce motif : celui de l'administrateur, sinon le modèle par défaut."""
    if not motif:
        return ''
    return (motif.message_template or '').strip() or MODELES_MESSAGE.get(motif.label, '')


# ── Étiquettes automatiques et résumé d'un patient ──────────────────────────

def etiquettes(visites, jours_derniere_visite, jours_depuis_creation, numero_partage,
               nb_relances, derniere_relance, carte_privilege, gros_depensier=False,
               nb_filleuls=0, controle_le=None):
    """Étiquettes déduites des données, sans aucune saisie : de quoi comprendre un patient d'un coup d'œil.

    `derniere_relance` : {'outcome', 'status'} ou None.
    """
    tags = []

    def ajouter(code, label, couleur):
        tags.append({'code': code, 'label': label, 'color': couleur})

    if jours_depuis_creation is not None and jours_depuis_creation <= 30:
        ajouter('new', 'Nouveau', 'info')
    if visites >= VISITES_FIDELES:
        ajouter('loyal', 'Fidèle', 'success')
    dormant = visites >= 1 and jours_derniere_visite is not None and jours_derniere_visite >= JOURS_SANS_VISITE
    if dormant:
        ajouter('dormant', 'Dormant', 'warning')
    if gros_depensier:
        ajouter('big', 'Gros dépensier', 'secondary')
    if numero_partage and numero_partage > 1:
        ajouter('family', 'Famille', 'default')
    if carte_privilege:
        ajouter('card', 'Carte privilège', 'default')
    if nb_filleuls:
        ajouter('referrer', 'A envoyé %s patient%s' % (nb_filleuls, 's' if nb_filleuls > 1 else ''), 'success')
    if controle_le:
        if controle_le <= timezone.localdate():
            ajouter('revisit_due', 'Contrôle prévu le %s' % controle_le.strftime('%d/%m'), 'warning')
        else:
            ajouter('revisit', 'À revoir le %s' % controle_le.strftime('%d/%m'), 'info')
    if derniere_relance and derniere_relance.get('outcome') == 'agreed' and derniere_relance.get('status') == 'missed':
        ajouter('promised_missing', 'Promis, pas venu', 'warning')
    elif derniere_relance and derniere_relance.get('outcome') == 'agreed' and derniere_relance.get('status') == 'waiting':
        ajouter('awaited', 'Attendu', 'info')
    elif dormant and nb_relances == 0:
        ajouter('never_contacted', 'Jamais relancé', 'default')
    return tags


def seuil_gros_depensier(qs_annote):
    """Dépense totale au-dessus de laquelle un patient est dans les 10 % qui dépensent le plus."""
    valeurs = sorted(float(v) for v in qs_annote.values_list('crm_paid_total', flat=True) if v and v > 0)
    if len(valeurs) < 10:
        return None
    return valeurs[int(len(valeurs) * 0.9)]


def resume_patient(patient, organization, avec_montants):
    """Chiffres clés d'un patient pour sa fiche : visites, panier moyen, ce qu'il achète d'habitude."""
    from collections import Counter
    from .models import ContactLog, PatientCRMProfile

    maintenant = timezone.now()
    factures = list(Invoice.objects.filter(client=patient).exclude(status__in=['draft', 'cancelled'])
                    .exclude(invoice_type='credit_note').prefetch_related('items').order_by('created_at'))
    payees = [f for f in factures if f.status == 'paid']
    total_paye = float(sum(f.total_amount or 0 for f in payees))
    habitudes = Counter()
    for f in factures:
        for ligne in f.items.all():
            nom = (ligne.description or '').strip()
            if nom:
                habitudes[nom[:50]] += 1

    numero_partage = 0
    numeros = normaliser_telephones(patient.phone)
    if numeros:
        numero_partage = patients_du_centre(organization, True).filter(phone__icontains=numeros[0]).count()
    relances = list(ContactLog.objects.filter(patient=patient).select_related('reason', 'campaign').order_by('-contacted_at')[:1])
    etat = calculer_venues(relances).get(relances[0].id) if relances else None
    derniere = {'outcome': relances[0].outcome, 'status': etat['status']} if relances else None
    nb_relances = ContactLog.objects.filter(patient=patient).count()
    jours_derniere = (maintenant - factures[-1].created_at).days if factures else None
    profil = PatientCRMProfile.objects.filter(patient=patient).select_related('referred_by').first()
    nb_filleuls = PatientCRMProfile.objects.filter(referred_by=patient).count()
    controles = controles_en_attente([patient.id])

    return {
        'visits': len(factures),
        'first_visit': factures[0].created_at if factures else None,
        'last_visit_days': jours_derniere,
        'paid_total': round(total_paye) if avec_montants else None,
        'average_basket': round(total_paye / len(payees)) if (avec_montants and payees) else None,
        'usual': [{'label': k, 'count': v} for k, v in habitudes.most_common(4)],
        'contacts_count': nb_relances,
        'do_not_contact': bool(profil and profil.do_not_contact),
        'tags': etiquettes(len(factures), jours_derniere, (maintenant - patient.created_at).days,
                           numero_partage, nb_relances, derniere, patient.has_privilege_card,
                           nb_filleuls=nb_filleuls, controle_le=controles.get(patient.id)),
        'quartier': quartier_de(patient, profil),
        'referred_by': ({'id': str(profil.referred_by_id), 'name': profil.referred_by.name}
                        if profil and profil.referred_by_id else None),
        'referrals': nb_filleuls,
    }


# ── Contrôles prévus (« À revoir dans … » sur la facture) ───────────────────

def controles_en_attente(patient_ids=None, organization=None):
    """{patient_id: date du contrôle} pour les contrôles prévus pas encore honorés.

    Un contrôle est honoré dès qu'une nouvelle facture (ni brouillon, ni annulée, ni avoir)
    suit la facture où il a été prévu. On ne garde que le plus récent par patient.
    """
    from .models import InvoiceCRMInfo

    infos = InvoiceCRMInfo.objects.filter(revisit_date__isnull=False).select_related('invoice')
    if patient_ids is not None:
        infos = infos.filter(invoice__client_id__in=list(patient_ids))
    if organization is not None:
        infos = infos.filter(organization=organization)
    infos = list(infos.order_by('-invoice__created_at'))
    if not infos:
        return {}
    clients = {i.invoice.client_id for i in infos}
    dernieres = {}
    for cid, quand in (Invoice.objects.filter(client_id__in=clients)
                       .exclude(status__in=['draft', 'cancelled']).exclude(invoice_type='credit_note')
                       .values_list('client_id', 'created_at')):
        if cid not in dernieres or quand > dernieres[cid]:
            dernieres[cid] = quand
    resultat = {}
    for info in infos:
        cid = info.invoice.client_id
        if cid in resultat:
            continue
        revenu = dernieres.get(cid) and dernieres[cid] > info.invoice.created_at
        if not revenu:
            resultat[cid] = info.revisit_date
    return resultat


def ids_controle_en_retard(organization, jours_max=90):
    """Patients dont le contrôle prévu est passé (depuis 90 jours au plus) sans nouvelle facture."""
    aujourdhui = timezone.localdate()
    return {cid for cid, d in controles_en_attente(organization=organization).items()
            if d <= aujourdhui and (aujourdhui - d).days <= jours_max}


# ── Quartiers ──────────────────────────────────────────────────────────────

# (nom affiché, morceaux reconnus dans une adresse libre, sans accents ni majuscules)
QUARTIERS_CONNUS = [
    ('Makepè', ['makep']),
    ('Bepanda', ['bepanda']),
    ('Bonamoussadi', ['bonamoussadi', 'bonamousadi']),
    ('Logpom', ['logpom']),
    ('Nyalla', ['nyalla']),
    ('Logbessou', ['logbessou']),
    ('Bonabéri', ['bonaberi', 'bonaberie']),
    ('Ange Raphaël', ['ange raphael', 'ange-raphael', 'angeraphael']),
    ('Beedi', ['beedi']),
    ('Ndogbong', ['ndogbong']),
    ('Deïdo', ['deido']),
    ('Ndokoti', ['ndokoti']),
    ('Kotto', ['kotto']),
    ('Akwa', ['akwa']),
    ('Bonapriso', ['bonapriso']),
    ('Village', ['village']),
]


def deviner_quartier(adresse):
    """Quartier reconnu dans une adresse libre (« face pharmacie MAKEPE » -> Makepè), ou ''."""
    texte = normaliser(adresse)
    if not texte:
        return ''
    for nom, morceaux in QUARTIERS_CONNUS:
        if any(m in texte for m in morceaux):
            return nom
    return ''


def quartier_de(patient, profil=None):
    """Quartier choisi en pastille, sinon reconnu dans l'adresse."""
    if profil is not None and profil.quartier:
        return profil.quartier
    return deviner_quartier(getattr(patient, 'address', ''))


def quartiers_suggeres(organization, limite=14):
    """Quartiers proposés en pastilles, les plus fréquents chez les patients d'abord."""
    from collections import Counter
    from .models import PatientCRMProfile

    choisis = dict(PatientCRMProfile.objects.filter(organization=organization)
                   .exclude(quartier='').values_list('patient_id', 'quartier'))
    compte = Counter()
    for pid, adresse in patients_du_centre(organization).values_list('id', 'address'):
        q = choisis.get(pid) or deviner_quartier(adresse)
        if q:
            compte[q] += 1
    noms = [q for q, _ in compte.most_common()]
    for nom, _ in QUARTIERS_CONNUS:
        if nom not in noms:
            noms.append(nom)
    return noms[:limite]


def normaliser_quartier(saisie, organization):
    """Réutilise l'orthographe déjà connue (« makepe » -> « Makepè ») pour éviter les doublons."""
    saisie = (saisie or '').strip()[:80]
    if not saisie:
        return ''
    cle = normaliser(saisie)
    for nom in quartiers_suggeres(organization, limite=200):
        if normaliser(nom) == cle:
            return nom
    devine = deviner_quartier(saisie)
    if devine and normaliser(devine) == cle:
        return devine
    return saisie[:1].upper() + saisie[1:]
