"""Qualité des fiches patients : ce qui est bien renseigné, ce qui manque, et par qui.

Lecture seule. Six informations comptent dans la note d'une fiche :
nom et prénom, téléphone valide, date de naissance plausible, sexe, quartier ou adresse,
provenance. La provenance ne compte que pour les fiches créées après sa mise en service
(DEBUT_PROVENANCE) : on ne reproche pas à l'équipe une question qui n'existait pas.

« Créée par » : l'auteur exact quand il a été enregistré (depuis la mise en service, voir
signals.py) ; sinon, pour les fiches plus anciennes, la personne qui a fait la première
facture du patient — c'est presque toujours celle qui l'a enregistré, mais c'est déduit
et affiché comme tel.
"""
from collections import Counter, defaultdict
from datetime import date, timedelta

from django.utils import timezone

from apps.invoicing.models import Invoice

from . import services
from .models import PatientCRMProfile

DEBUT_PROVENANCE = date(2026, 10, 2)

CRITERES = [
    ('name', 'Nom et prénom'),
    ('phone', 'Téléphone'),
    ('birth', 'Date de naissance'),
    ('gender', 'Sexe'),
    ('quartier', 'Quartier / adresse'),
    ('origin', 'Provenance'),
]
LIBELLES = dict(CRITERES)

# Mots qui ne sont ni un nom ni un prénom.
TITRES = {'mr', 'mme', 'mlle', 'm', 'dr', 'enft', 'enfant', 'bb', 'bebe', 'mrs', 'ms', 'madame', 'monsieur'}


def _mots_du_nom(nom):
    return [m for m in services.normaliser(nom).replace('.', ' ').split() if m not in TITRES]


def evaluer(patient, profil, aujourdhui=None):
    """{critère: 'ok' | 'missing' | 'invalid' | 'na'} pour une fiche."""
    aujourdhui = aujourdhui or timezone.localdate()
    cree_le = timezone.localtime(patient.created_at).date()
    r = {}

    mots = _mots_du_nom(patient.name)
    r['name'] = 'ok' if len(mots) >= 2 else ('missing' if not mots else 'invalid')

    tel = (patient.phone or '').strip()
    r['phone'] = 'missing' if not tel else ('ok' if services.normaliser_telephones(tel) else 'invalid')

    naissance = patient.date_of_birth
    if not naissance:
        r['birth'] = 'missing'
    elif naissance > aujourdhui or (aujourdhui.year - naissance.year) > 110:
        r['birth'] = 'invalid'
    else:
        r['birth'] = 'ok'

    r['gender'] = 'ok' if patient.gender in ('M', 'F') else 'missing'

    quartier = services.quartier_de(patient, profil)
    r['quartier'] = 'ok' if (quartier or len((patient.address or '').strip()) >= 3) else 'missing'

    if cree_le < DEBUT_PROVENANCE:
        r['origin'] = 'na'
    else:
        r['origin'] = 'ok' if (profil and (profil.origin_id or profil.unknown)) else 'missing'
    return r


def note(etats):
    applicables = [v for v in etats.values() if v != 'na']
    return sum(1 for v in applicables if v == 'ok'), len(applicables)


def manques(etats):
    return [{'code': c, 'label': LIBELLES[c], 'state': etats[c]} for c, _ in CRITERES
            if etats[c] in ('missing', 'invalid')]


def _nom_agent(u):
    return (u.get_full_name() or u.username) if u else ''


def auteurs_des_fiches(organization, patients):
    """{patient_id: (user_id, nom, 'exact' | 'deduced')} — voir le docstring du module."""
    from apps.accounts.models import CustomUser

    ids = [p.id for p in patients]
    exacts = {pr.patient_id: pr.created_by for pr in PatientCRMProfile.objects
              .filter(patient_id__in=ids, created_by__isnull=False).select_related('created_by')}
    premieres = {}
    for cid, uid in (Invoice.objects.filter(client_id__in=ids).exclude(created_by__isnull=True)
                     .order_by('created_at').values_list('client_id', 'created_by_id')):
        premieres.setdefault(cid, uid)
    noms = {u.id: _nom_agent(u) for u in CustomUser.objects.filter(id__in=set(premieres.values()))}
    resultat = {}
    for pid in ids:
        if pid in exacts:
            u = exacts[pid]
            resultat[pid] = (u.id, _nom_agent(u), 'exact')
        elif pid in premieres:
            resultat[pid] = (premieres[pid], noms.get(premieres[pid], '?'), 'deduced')
        else:
            resultat[pid] = (None, 'Inconnu', 'unknown')
    return resultat


def _cle_doublon(nom):
    mots = _mots_du_nom(nom)
    return ' '.join(sorted(mots)) if len(mots) >= 2 else ''


def analyser(organization, jours=90, agent=None, critere=None, page=1, taille=30, avec_auteurs=True):
    """Tableau de bord de la qualité des fiches créées sur les `jours` derniers jours (0 = toutes)."""
    aujourdhui = timezone.localdate()
    base = services.patients_du_centre(organization)
    fiches = base
    if jours:
        fiches = fiches.filter(created_at__gte=timezone.now() - timedelta(days=jours))
    fiches = list(fiches.order_by('-created_at'))
    profils = {p.patient_id: p for p in PatientCRMProfile.objects.filter(patient_id__in=[f.id for f in fiches])}
    auteurs = auteurs_des_fiches(organization, fiches) if avec_auteurs else {}

    lignes = []
    par_critere = {c: Counter() for c, _ in CRITERES}
    par_agent = {}
    approximatives = 0
    for f in fiches:
        etats = evaluer(f, profils.get(f.id), aujourdhui)
        ok, sur = note(etats)
        for c, v in etats.items():
            par_critere[c][v] += 1
        if f.date_of_birth and f.date_of_birth.month == 1 and f.date_of_birth.day == 1:
            approximatives += 1
        uid, unom, source = auteurs.get(f.id, (None, '', 'unknown'))
        cle_agent = str(uid) if uid else 'unknown'
        if avec_auteurs:
            g = par_agent.setdefault(cle_agent, {'id': cle_agent, 'label': unom or 'Inconnu', 'sources': set(),
                                                 'fiches': 0, 'complete': 0, 'points': 0, 'max': 0,
                                                 'missing': Counter()})
            g['sources'].add(source)
            g['fiches'] += 1
            g['points'] += ok
            g['max'] += sur
            if ok == sur:
                g['complete'] += 1
            for c, v in etats.items():
                if v in ('missing', 'invalid'):
                    g['missing'][c] += 1
        lignes.append((f, etats, ok, sur, cle_agent, unom, source))

    total = len(fiches)
    completes = sum(1 for l in lignes if l[2] == l[3])
    points = sum(l[2] for l in lignes)
    maximum = sum(l[3] for l in lignes)

    # Liste des fiches à compléter (filtrable par personne et par information manquante)
    a_completer = [l for l in lignes if l[2] < l[3]]
    if agent:
        a_completer = [l for l in a_completer if l[4] == agent]
    if critere:
        a_completer = [l for l in a_completer if l[1].get(critere) in ('missing', 'invalid')]
    nb = len(a_completer)
    debut = (page - 1) * taille
    resultats = [{
        'id': str(f.id), 'name': f.name, 'patient_number': f.patient_number, 'phone': f.phone,
        'created_at': f.created_at, 'score': ok, 'max': sur,
        'created_by': unom if avec_auteurs else None,
        'created_by_source': source if avec_auteurs else None,
        'missing': manques(etats),
    } for f, etats, ok, sur, _, unom, source in a_completer[debut:debut + taille]]

    # Doublons possibles : mêmes nom et prénom (dans le désordre), sur toute la base
    groupes = defaultdict(list)
    for p in base.only('id', 'name', 'phone', 'patient_number', 'created_at'):
        cle = _cle_doublon(p.name)
        if cle:
            groupes[cle].append(p)
    doublons = [{
        'key': k,
        'patients': [{'id': str(p.id), 'name': p.name, 'phone': p.phone, 'patient_number': p.patient_number,
                      'created_at': p.created_at} for p in sorted(v, key=lambda x: x.created_at)],
    } for k, v in groupes.items() if len(v) >= 2]
    doublons.sort(key=lambda d: d['patients'][-1]['created_at'], reverse=True)

    criteres = []
    for c, libelle in CRITERES:
        compte = par_critere[c]
        applicables = total - compte['na']
        criteres.append({
            'code': c, 'label': libelle, 'ok': compte['ok'], 'missing': compte['missing'],
            'invalid': compte['invalid'], 'applicable': applicables,
            'rate': round(100 * compte['ok'] / applicables, 1) if applicables else None,
        })

    agents = None
    if avec_auteurs:
        agents = sorted([{
            'id': g['id'], 'label': g['label'],
            'source': ('unknown' if g['sources'] == {'unknown'} else 'exact' if g['sources'] == {'exact'}
                       else 'deduced' if 'exact' not in g['sources'] else 'mixed'),
            'fiches': g['fiches'], 'complete': g['complete'],
            'complete_rate': round(100 * g['complete'] / g['fiches'], 1) if g['fiches'] else None,
            'score_rate': round(100 * g['points'] / g['max'], 1) if g['max'] else None,
            'missing': {c: g['missing'].get(c, 0) for c, _ in CRITERES},
        } for g in par_agent.values()], key=lambda x: -x['fiches'])

    return {
        'days': jours, 'total': total, 'complete': completes,
        'complete_rate': round(100 * completes / total, 1) if total else None,
        'score_rate': round(100 * points / maximum, 1) if maximum else None,
        'approximate_birthdates': approximatives,
        'criteria': criteres,
        'by_agent': agents,
        'to_fix': {'count': nb, 'page': page, 'page_size': taille, 'results': resultats},
        'duplicates': doublons[:40],
        'duplicates_count': len(doublons),
        'provenance_since': DEBUT_PROVENANCE.isoformat(),
    }


def qualite_patient(patient, profil):
    """Note et manques d'une fiche, pour la fiche patient."""
    etats = evaluer(patient, profil)
    ok, sur = note(etats)
    return {'score': ok, 'max': sur, 'missing': manques(etats)}
