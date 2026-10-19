"""Parcours patients : l'ordre des factures (tous modules) raconte le cycle de vie d'un patient.

Chaque facture (ni brouillon, ni annulée, ni avoir) est une ÉTAPE, datée de `created_at` comme
le reste du logiciel. Deux niveaux de lecture :
- « service » : le type de facture (Consultation, Laboratoire, Pharmacie, Imagerie...) ;
- « acte »    : ce qui a été fait — le bilan (« Bilan tropical »), l'examen, le type de
                consultation, le vaccin, l'acte de maternité. Pharmacie et ventes restent groupées
                (les produits un à un rendraient la lecture illisible).

On compte des PATIENTS, pas des factures : un patient qui enchaîne dix fois consultation -> bilan
ne pèse qu'une fois. Une transition A -> B est retenue si l'étape B tombe dans la période (l'étape A
peut être plus ancienne : c'est l'historique qui donne le parcours). Lecture seule.
"""
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta
from statistics import median

from django.utils import timezone

from apps.invoicing.models import Invoice, InvoiceItem

from . import services

import unicodedata

# Service d'une facture « typée » (créée par son module).
SERVICE_PAR_TYPE = {
    'healthcare_consultation': 'Consultation',
    'healthcare_laboratory': 'Laboratoire',
    'healthcare_imaging': 'Imagerie',
    'healthcare_maternity': 'Maternité',
    'healthcare_vaccination': 'Vaccination',
    'healthcare_pharmacy': 'Pharmacie',
    'healthcare_services': 'Soins / hospitalisation',
}
# Factures « Vente de produits » (page Facture) : elles mélangent consultation, soins, hospitalisation
# et médicaments. Le service de chaque ligne vient de la catégorie de son produit (mots-clés, sans accents).
MOTS_SERVICE = [
    ('consult', 'Consultation'), ('hospital', 'Hospitalisation'), ('chirurg', 'Petite chirurgie'),
    ('acte', 'Actes médicaux'), ('soin', 'Soins infirmiers'), ('surveill', 'Soins infirmiers'),
    ('matern', 'Maternité'), ('vaccin', 'Vaccination'), ('imag', 'Imagerie'), ('echo', 'Imagerie'),
    ('radio', 'Imagerie'),
]
MAX_ACTES = 6   # au-delà, l'étape est résumée par ses services


def _sans_accents(t):
    return ''.join(c for c in unicodedata.normalize('NFD', t or '') if unicodedata.category(c) != 'Mn').lower()


def _service_ligne(categorie, type_produit):
    """Service d'une ligne de facture générique, d'après la catégorie de son produit."""
    if type_produit != 'service':
        return 'Pharmacie'   # tout produit physique (médicament, gants, matériel) est un produit délivré
    cat = _sans_accents(categorie)
    for mot, service in MOTS_SERVICE:
        if mot in cat:
            return service
    return 'Laboratoire' if 'labo' in cat else 'Autres services'


def _propre(texte):
    t = ' '.join(str(texte or '').split()).strip(' -:')
    if t.lower().startswith('bilan :'):
        reste = t[7:].strip()
        t = reste if reste.lower().startswith('bilan') else 'Bilan ' + reste
    if not t:
        return ''
    t = t[0].upper() + t[1:]
    return t[:60]


def _etapes_par_patient(organization, fin, patient_id=None, sans_pharmacie=False):
    """{patient_id: [(datetime, frozenset(services), frozenset(actes)), ...]} trié dans le temps."""
    base = [patient_id] if patient_id else services.patients_du_centre(organization).values_list('id', flat=True)
    fin_dt = timezone.make_aware(datetime.combine(fin, time.max))
    factures = list(Invoice.objects.filter(organization=organization, client_id__in=base, created_at__lte=fin_dt)
                    .exclude(status__in=['draft', 'cancelled']).exclude(invoice_type='credit_note')
                    .order_by().values('id', 'client_id', 'created_at', 'invoice_type'))
    lignes = defaultdict(list)
    for it in (InvoiceItem.objects.filter(invoice_id__in=[f['id'] for f in factures]).order_by()
               .values('invoice_id', 'description', 'product__category__name', 'product__product_type')):
        lignes[it['invoice_id']].append(it)
    par_patient = defaultdict(list)
    for f in factures:
        lg = lignes.get(f['id'], [])
        typ = f['invoice_type']
        if typ in SERVICE_PAR_TYPE:
            svc = {SERVICE_PAR_TYPE[typ]}
            if typ == 'healthcare_pharmacy':
                actes = {'Pharmacie'}
            else:
                descs = {_propre(x['description']) for x in lg} - {''}
                bilans = {d for d in descs if d.startswith('Bilan ')}
                actes = bilans or descs
        else:
            svc, actes = set(), set()
            for x in lg:
                s_ligne = _service_ligne(x['product__category__name'], x['product__product_type'])
                svc.add(s_ligne)
                actes.add('Pharmacie' if s_ligne == 'Pharmacie' else (_propre(x['description']) or s_ligne))
            if not svc:
                svc = {'Autres services'}
        if not actes or len(actes) > MAX_ACTES:
            actes = set(svc)
        if sans_pharmacie:
            # Parcours médical seul : les produits délivrés sont retirés ; une facture qui n'était
            # que de la pharmacie n'est plus une étape.
            svc, actes = set(svc) - {'Pharmacie'}, set(actes) - {'Pharmacie'}
            if not svc:
                continue
            actes = actes or set(svc)
        par_patient[f['client_id']].append((f['created_at'], frozenset(svc), frozenset(actes)))
    for liste in par_patient.values():
        liste.sort(key=lambda e: e[0])
    return par_patient


def _principal(etape, niveau):
    """Un seul libellé par étape (parcours types) : l'élément s'il est seul, sinon « A + B »."""
    ensemble = etape[1] if niveau == 'service' else etape[2]
    if len(ensemble) == 1:
        return next(iter(ensemble))
    if niveau == 'acte' and len(etape[1]) == 1:
        return next(iter(etape[1]))
    return ' + '.join(sorted(etape[1]))


def calculer_parcours(organization, debut, fin, niveau='service', sans_pharmacie=True):
    niveau = 'acte' if niveau == 'acte' else 'service'
    debut_dt = timezone.make_aware(datetime.combine(debut, time.min))
    fin_dt = timezone.make_aware(datetime.combine(fin, time.max))
    aujourdhui = date.today()
    par_patient = _etapes_par_patient(organization, fin, sans_pharmacie=sans_pharmacie)

    def libelles(etape):
        return set(etape[1]) if niveau == 'service' else set(etape[2])

    paires = defaultdict(list)          # (a, b) -> [(patient, délai jours, même jour)]
    depart = defaultdict(set)           # a -> patients ayant une suite dans la période
    patients_actifs = set()
    chemins = Counter()
    entrees = Counter()
    apres = defaultdict(lambda: [0, 0])  # acte -> [patients mûrs, revenus ensuite]
    vus_apres = set()

    for pid, etapes in par_patient.items():
        # étapes consécutives identiques fusionnées (même chose deux fois de suite n'est pas un passage)
        seq = []
        for e in etapes:
            if seq and libelles(seq[-1]) == libelles(e):
                continue
            seq.append(e)
        dans_periode = [debut_dt <= e[0] <= fin_dt for e in seq]
        if any(dans_periode):
            patients_actifs.add(pid)
        if seq and dans_periode[0] and etapes[0][0] >= debut_dt:
            entrees[_principal(seq[0], niveau)] += 1
        vues = set()
        for i in range(1, len(seq)):
            if not dans_periode[i]:
                continue
            a, b = seq[i - 1], seq[i]
            delai = (b[0] - a[0]).days
            meme_jour = timezone.localtime(a[0]).date() == timezone.localtime(b[0]).date()
            for x in libelles(a):
                depart[x].add(pid)
                for y in libelles(b):
                    if x != y and (x, y) not in vues:
                        vues.add((x, y))
                        paires[(x, y)].append((pid, delai, meme_jour))
        # parcours types : 3 étapes consécutives dont la dernière tombe dans la période
        trios = set()
        for i in range(2, len(seq)):
            if dans_periode[i]:
                trio = tuple(_principal(e, niveau) for e in seq[i - 2:i + 1])
                if len(set(trio)) > 1:
                    trios.add(trio)
        chemins.update(trios)
        # « revient ensuite ? » : après une étape de la période vieille d'au moins 30 jours
        for i, e in enumerate(seq):
            if not dans_periode[i] or (aujourdhui - timezone.localtime(e[0]).date()).days < 30:
                continue
            p = _principal(e, niveau)
            if (pid, p) in vus_apres:
                continue
            vus_apres.add((pid, p))
            apres[p][0] += 1
            jour = timezone.localtime(e[0]).date()
            if any(timezone.localtime(x[0]).date() > jour for x in etapes):   # revenu un autre jour
                apres[p][1] += 1

    transitions = []
    for (a, b), lignes in paires.items():
        n = len(lignes)
        if n < 2:
            continue
        transitions.append({
            'from': a, 'to': b, 'patients': n,
            'share': round(100 * n / len(depart[a]), 1) if depart[a] else None,
            'median_days': round(median([d for _, d, _ in lignes]), 1),
            'same_day_pct': round(100 * sum(1 for _, _, m in lignes if m) / n),
        })
    transitions.sort(key=lambda t: (-t['patients'], t['from'], t['to']))

    etapes_connues = Counter()
    for t in transitions:
        etapes_connues[t['from']] += t['patients']
    return {
        'period': {'start': debut.isoformat(), 'end': fin.isoformat()},
        'level': niveau,
        'without_pharmacy': sans_pharmacie,
        'active_patients': len(patients_actifs),
        'patients_with_next_step': len({p for v in paires.values() for p, _, _ in v}),
        'transitions': transitions[:400],
        'steps': [s for s, _ in etapes_connues.most_common(80)],
        'paths': [{'steps': list(k), 'patients': n} for k, n in chemins.most_common(20) if n >= 2],
        'entries': [{'step': k, 'patients': n} for k, n in entrees.most_common(12)],
        'comes_back': sorted(
            [{'step': k, 'patients': v[0], 'came_back': v[1], 'rate': round(100 * v[1] / v[0], 1)}
             for k, v in apres.items() if v[0] >= 5],
            key=lambda x: (-x['patients']))[:25],
    }


def parcours_patient(patient, limite=15):
    """Étapes d'un patient, de la plus ancienne à la plus récente (les `limite` dernières)."""
    etapes = _etapes_par_patient(patient.organization, date.today(), patient.id).get(patient.id, [])
    return [{
        'date': timezone.localtime(e[0]).date().isoformat(),
        'services': sorted(e[1]),
        'acts': sorted(e[2]),
    } for e in etapes[-limite:]]
