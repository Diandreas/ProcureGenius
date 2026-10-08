"""
Services du Suivi patients : numeros de telephone et segments.

Aucun acces en ecriture : ce module ne fait que lire les patients, les
factures et les vaccinations deja presents.
"""
import re
from datetime import date, timedelta

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
    ('awaited', "Attendus (d'accord pour venir)"),
    ('promised_missing', 'Promis, pas venus'),
]

JOURS_SANS_VISITE = 60
VISITES_FIDELES = 4
JOURS_VACCIN = 14


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
                         crm_last_visit__lt=maintenant - timedelta(days=JOURS_SANS_VISITE))
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
    from datetime import datetime, time
    fin = log.contacted_at + timedelta(days=FENETRE_RELANCE_JOURS)
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
