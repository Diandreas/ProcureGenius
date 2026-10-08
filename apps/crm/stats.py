"""Statistiques du Suivi patients : relances, campagnes, provenance, montée en gamme.

Lecture seule. Les montants ne sont calculés que si `avec_montants` est vrai (rôles
administrateur) ; sinon les champs correspondants valent None et l'écran les masque.

Règle financière (voir apps/crm/rapport.py) : « encaissé » = factures au statut
`paid`, datées de `created_at`.
"""
from collections import Counter, OrderedDict, defaultdict
from datetime import date, datetime, time, timedelta
from statistics import median

from django.utils import timezone

from apps.invoicing.models import Invoice

from . import services
from .models import (CRMCampaign, ContactLog, InvoiceCRMInfo, PatientCRMProfile)

LIBELLES_ISSUE = dict(ContactLog.OUTCOME_CHOICES)
LIBELLES_CANAL = dict(ContactLog.CHANNEL_CHOICES)


def _pct(a, b):
    return round(100 * a / b, 1) if b else None


def _bornes(debut, fin):
    return (timezone.make_aware(datetime.combine(debut, time.min)),
            timezone.make_aware(datetime.combine(fin, time.max)))


def _groupe():
    return {'contacts': 0, 'agreed': 0, 'came': 0, 'waiting': 0, 'missed': 0, 'revenue': 0.0}


def _compter(g, log, etat):
    g['contacts'] += 1
    if log.outcome == 'agreed':
        g['agreed'] += 1
    statut = etat['status']
    if statut in ('came', 'waiting', 'missed'):
        g[statut] += 1
    if statut == 'came' and etat['invoice'] is not None and etat['invoice'].status == 'paid':
        g['revenue'] += float(etat['invoice'].total_amount or 0)


def _finir(g, libelle, avec_montants, **extra):
    resolus = g['came'] + g['missed']
    sortie = {'label': libelle, **g, 'came_rate': _pct(g['came'], resolus)}
    sortie['revenue'] = round(g['revenue']) if avec_montants else None
    sortie.update(extra)
    return sortie


def calculer_fidelite(organization, avec_montants):
    """Qui revient vraiment après une prise en charge terminée.

    Une « prise en charge » regroupe les visites espacées de 14 jours au plus (les injections
    de plusieurs jours de suite ne sont pas des retours). Un « retour » = une nouvelle prise en
    charge après une pause. Seuls comptent les patients dont la première prise en charge est
    finie depuis au moins 45 jours (les autres n'ont pas encore eu le temps de revenir).
    """
    base = services.patients_du_centre(organization)
    clients = {c.id: c for c in base}
    factures = list(Invoice.objects.filter(organization=organization, client_id__in=clients.keys())
                    .exclude(status__in=['draft', 'cancelled']).exclude(invoice_type='credit_note')
                    .values('client_id', 'created_at', 'invoice_type', 'total_amount', 'status').order_by('created_at'))
    aujourdhui = timezone.localdate()
    jours = defaultdict(set)
    entree = {}
    for f in factures:
        jours[f['client_id']].add(timezone.localtime(f['created_at']).date())
        entree.setdefault(f['client_id'], f['invoice_type'])
    episodes = {}
    for cid, js in jours.items():
        js = sorted(js)
        eps = [[js[0], js[0]]]
        for j in js[1:]:
            if (j - eps[-1][1]).days <= 14:
                eps[-1][1] = j
            else:
                eps.append([j, j])
        episodes[cid] = eps
    mures = {cid: e for cid, e in episodes.items() if (aujourdhui - e[0][1]).days >= 45}
    revenus = {cid for cid, e in mures.items() if len(e) >= 2}
    ecarts = [(b[0] - a[1]).days for e in episodes.values() for a, b in zip(e, e[1:])]
    libelles_type = dict(Invoice.INVOICE_TYPES)

    def tableau(cle, minimum=8, ordre=None):
        g = defaultdict(lambda: [0, 0])
        for cid, e in mures.items():
            k = cle(cid)
            g[k][0] += 1
            g[k][1] += 1 if cid in revenus else 0
        lignes = [{'label': k, 'patients': n, 'returned': r, 'rate': _pct(r, n)}
                  for k, (n, r) in g.items() if n >= minimum]
        if ordre:
            return sorted(lignes, key=lambda x: ordre.index(x['label']) if x['label'] in ordre else 99)
        return sorted(lignes, key=lambda x: -x['patients'])

    def tranche(cid):
        a = services.age_en_annees(clients[cid].date_of_birth)
        return ('Âge inconnu' if a is None else '0-14 ans' if a < 15 else '15-24 ans' if a < 25
                else '25-34 ans' if a < 35 else '35-44 ans' if a < 45 else '45 ans et plus')

    cohortes = defaultdict(lambda: [0, 0])
    for cid, e in mures.items():
        m = e[0][0].strftime('%Y-%m')
        cohortes[m][0] += 1
        cohortes[m][1] += 1 if cid in revenus else 0

    valeur_premiere, valeur_suivante = [], []
    if avec_montants:
        payees = defaultdict(list)
        for f in factures:
            if f['status'] == 'paid':
                payees[f['client_id']].append((timezone.localtime(f['created_at']).date(), float(f['total_amount'] or 0)))
        for cid, e in episodes.items():
            totaux = [0.0] * len(e)
            for jour, montant in payees.get(cid, []):
                for i, (d0, d1) in enumerate(e):
                    if d0 <= jour <= d1:
                        totaux[i] += montant
            valeur_premiere.append(totaux[0])
            valeur_suivante.extend(totaux[1:])

    ages = ['0-14 ans', '15-24 ans', '25-34 ans', '35-44 ans', '45 ans et plus']
    return {
        'patients': len(episodes), 'mature': len(mures), 'returned': len(revenus),
        'rate': _pct(len(revenus), len(mures)),
        'single_day_share': _pct(sum(1 for e in episodes.values() if e[0][0] == e[0][1]), len(episodes)),
        'median_gap_days': round(median(ecarts), 1) if ecarts else None,
        'gap_buckets': [
            {'label': '15 à 30 jours', 'count': sum(1 for x in ecarts if x <= 30)},
            {'label': '31 à 60 jours', 'count': sum(1 for x in ecarts if 30 < x <= 60)},
            {'label': '61 à 90 jours', 'count': sum(1 for x in ecarts if 60 < x <= 90)},
            {'label': 'Plus de 90 jours', 'count': sum(1 for x in ecarts if x > 90)},
        ],
        'cohorts': [{'month': m, 'patients': n, 'returned': r, 'rate': _pct(r, n)}
                    for m, (n, r) in sorted(cohortes.items())][-12:],
        'by_entry': tableau(lambda cid: str(libelles_type.get(entree.get(cid), entree.get(cid) or '?'))),
        'by_age': tableau(tranche, ordre=ages),
        'by_gender': tableau(lambda cid: {'M': 'Hommes', 'F': 'Femmes'}.get(clients[cid].gender, 'Sexe inconnu')),
        'avg_first_episode': round(sum(valeur_premiere) / len(valeur_premiere)) if valeur_premiere else None,
        'avg_next_episode': round(sum(valeur_suivante) / len(valeur_suivante)) if valeur_suivante else None,
    }


def calculer_statistiques(organization, debut, fin, avec_montants):
    d0, d1 = _bornes(debut, fin)
    maintenant = timezone.now()
    base = services.patients_du_centre(organization)
    ids_base = set(base.values_list('id', flat=True))

    # ── Relances de la période ──────────────────────────────────────────────
    logs = list(ContactLog.objects.filter(organization=organization, contacted_at__gte=d0, contacted_at__lte=d1)
                .select_related('reason', 'campaign', 'created_by'))
    etats = services.calculer_venues(logs, maintenant)

    total = _groupe()
    par_motif, par_canal, par_agent = defaultdict(_groupe), defaultdict(_groupe), defaultdict(_groupe)
    issues = Counter()
    delais = []
    semaines = defaultdict(lambda: {'contacts': 0, 'came': 0})
    for log in logs:
        etat = etats[log.id]
        _compter(total, log, etat)
        _compter(par_motif[log.reason.label if log.reason_id else 'Sans motif'], log, etat)
        _compter(par_canal[LIBELLES_CANAL.get(log.channel, log.channel)], log, etat)
        agent = (log.created_by.get_full_name() or log.created_by.username) if log.created_by_id else 'Inconnu'
        _compter(par_agent[agent], log, etat)
        issues[log.outcome] += 1
        jour = timezone.localtime(log.contacted_at).date()
        lundi = jour - timedelta(days=jour.weekday())
        semaines[lundi]['contacts'] += 1
        if etat['status'] == 'came':
            semaines[lundi]['came'] += 1
            delais.append((etat['invoice'].created_at - log.contacted_at).total_seconds() / 86400)

    # ── Dormants : a-t-on essayé de les rappeler ? ─────────────────────────
    qs = services.avec_activite(base)
    dormants = set(services.appliquer_segment(qs, 'not_back_60', organization).values_list('id', flat=True))
    relances_30j = set(ContactLog.objects.filter(
        organization=organization, contacted_at__gte=maintenant - timedelta(days=30)).values_list('patient_id', flat=True))
    deja = len(dormants & relances_30j)

    # ── Promis et attendus (état actuel, pas limité à la période) ──────────
    recents = list(ContactLog.objects.filter(
        organization=organization, outcome='agreed',
        contacted_at__gte=maintenant - timedelta(days=services.FENETRE_RELANCE_JOURS + 90),
    ).select_related('reason', 'campaign', 'patient').order_by('-contacted_at'))
    etats_recents = services.calculer_venues(recents, maintenant)
    a_suivre = []
    for log in recents:
        statut = etats_recents[log.id]['status']
        if statut in ('waiting', 'missed'):
            a_suivre.append({
                'patient_id': str(log.patient_id), 'name': log.patient.name, 'phone': log.patient.phone,
                'reason': log.reason.label if log.reason_id else '', 'status': statut,
                'days': (maintenant - log.contacted_at).days,
                'campaign': log.campaign.name if log.campaign_id else '',
            })

    # ── Factures de la période (base commune aux blocs suivants) ───────────
    valides = (Invoice.objects.filter(organization=organization, client_id__in=ids_base)
               .exclude(status__in=['draft', 'cancelled']).exclude(invoice_type='credit_note')
               .values('id', 'client_id', 'created_at', 'total_amount', 'status'))
    visites = defaultdict(set)            # patient -> jours de visite (toute la période d'historique)
    paye_periode = defaultdict(float)     # patient -> encaissé sur la période
    factures_periode = 0
    actifs_periode = set()
    factures_par_id = {}
    for f in valides:
        local = timezone.localtime(f['created_at'])
        visites[f['client_id']].add(local.date())
        factures_par_id[f['id']] = f
        if d0 <= f['created_at'] <= d1:
            factures_periode += 1
            actifs_periode.add(f['client_id'])
            if f['status'] == 'paid':
                paye_periode[f['client_id']] += float(f['total_amount'] or 0)

    # ── Provenance ──────────────────────────────────────────────────────────
    profils = list(PatientCRMProfile.objects.filter(organization=organization, patient_id__in=ids_base)
                   .select_related('origin', 'campaign'))
    nouveaux_ids = set(base.filter(created_at__gte=d0, created_at__lte=d1).values_list('id', flat=True))
    par_origine = OrderedDict()
    renseignes = set()
    for p in profils:
        if p.origin_id:
            cle = p.origin.label
        elif p.unknown:
            cle = 'Inconnue'
        else:
            continue
        renseignes.add(p.patient_id)
        g = par_origine.setdefault(cle, {'patients': 0, 'new': 0, 'actifs': 0, 'paye': 0.0, 'reviennent': 0, 'avec_visite': 0})
        g['patients'] += 1
        if p.patient_id in nouveaux_ids:
            g['new'] += 1
        if p.patient_id in actifs_periode:
            g['actifs'] += 1
            g['paye'] += paye_periode.get(p.patient_id, 0.0)
        if visites.get(p.patient_id):
            g['avec_visite'] += 1
            if len(visites[p.patient_id]) >= 2:
                g['reviennent'] += 1
    provenance = sorted([{
        'label': k, 'patients': g['patients'], 'new_patients': g['new'], 'active_patients': g['actifs'],
        'revenue': round(g['paye']) if avec_montants else None,
        'avg_per_active': (round(g['paye'] / g['actifs']) if (avec_montants and g['actifs']) else None),
        'repeat_rate': _pct(g['reviennent'], g['avec_visite']),
    } for k, g in par_origine.items()], key=lambda x: -x['patients'])
    couverture = {
        'active_patients': len(actifs_periode),
        'with_origin': len(actifs_periode & renseignes),
        'rate': _pct(len(actifs_periode & renseignes), len(actifs_periode)),
        'new_patients': len(nouveaux_ids),
        'new_with_origin': len(nouveaux_ids & renseignes),
    }

    # ── Campagnes ───────────────────────────────────────────────────────────
    campagnes = list(CRMCampaign.objects.filter(organization=organization))
    logs_camp = list(ContactLog.objects.filter(organization=organization, campaign__isnull=False)
                     .select_related('reason', 'campaign'))
    etats_camp = services.calculer_venues(logs_camp, maintenant)
    contacts_par_camp = defaultdict(_groupe)
    for log in logs_camp:
        _compter(contacts_par_camp[log.campaign_id], log, etats_camp[log.id])
    patients_par_camp = defaultdict(list)
    for p in profils:
        if p.campaign_id:
            patients_par_camp[p.campaign_id].append(p.patient_id)
    sortie_camp = []
    for c in campagnes:
        pats = patients_par_camp.get(c.id, [])
        g = contacts_par_camp.get(c.id) or _groupe()
        # CA des patients rattachés, depuis le début de la campagne
        ca = 0.0
        if avec_montants and pats:
            depuis = (timezone.make_aware(datetime.combine(c.start_date, time.min)) if c.start_date else None)
            ensemble = set(pats)
            for f in factures_par_id.values():
                if f['client_id'] in ensemble and f['status'] == 'paid' and (depuis is None or f['created_at'] >= depuis):
                    ca += float(f['total_amount'] or 0)
        budget = float(c.budget) if (avec_montants and c.budget) else None
        sortie_camp.append(_finir(g, c.name, avec_montants, id=str(c.id), kind=c.get_kind_display(),
                                  is_active=c.is_active, patients=len(pats),
                                  revenue_patients=round(ca) if avec_montants else None,
                                  budget=budget,
                                  cost_per_patient=round(budget / len(pats)) if (budget and pats) else None,
                                  roi=round(ca / budget, 2) if (budget and ca) else None))
    sortie_camp.sort(key=lambda x: (-int(x['is_active']), -x['patients'], -x['contacts']))

    # ── Montée en gamme ─────────────────────────────────────────────────────
    infos = list(InvoiceCRMInfo.objects.filter(organization=organization, invoice__created_at__gte=d0,
                                               invoice__created_at__lte=d1)
                 .select_related('invoice', 'recorded_by'))
    montes = [i for i in infos if i.upsold]
    gain, avec_prevu = 0.0, 0
    pour = Counter()
    par_agent_up = defaultdict(lambda: {'count': 0, 'gain': 0.0})
    for i in montes:
        a = (i.recorded_by.get_full_name() or i.recorded_by.username) if i.recorded_by_id else 'Inconnu'
        par_agent_up[a]['count'] += 1
        if i.planned_amount is not None:
            avec_prevu += 1
            g_i = max(float(i.invoice.total_amount or 0) - float(i.planned_amount), 0.0)
            gain += g_i
            par_agent_up[a]['gain'] += g_i
        if i.came_for.strip():
            pour[i.came_for.strip().capitalize()] += 1
    montee = {
        'invoices_with_info': len(infos), 'upsold': len(montes), 'invoices_period': factures_periode,
        'upsold_rate': _pct(len(montes), factures_periode),
        'with_planned_amount': avec_prevu,
        'extra_total': round(gain) if avec_montants else None,
        'extra_avg': round(gain / avec_prevu) if (avec_montants and avec_prevu) else None,
        'came_for': [{'label': k, 'count': v} for k, v in pour.most_common(8)],
        'by_agent': [{'label': k, 'count': v['count'], 'extra': round(v['gain']) if avec_montants else None}
                     for k, v in sorted(par_agent_up.items(), key=lambda x: -x[1]['count'])],
    }

    resolus = total['came'] + total['missed']
    return {
        'period': {'start': debut.isoformat(), 'end': fin.isoformat()},
        'amounts_visible': bool(avec_montants),
        'overview': {
            'contacts': total['contacts'],
            'patients_contacted': len({l.patient_id for l in logs}),
            'agreed': total['agreed'], 'came': total['came'], 'waiting': total['waiting'], 'missed': total['missed'],
            'came_rate': _pct(total['came'], resolus),
            'median_days_to_come': round(median(delais), 1) if delais else None,
            'revenue_after_contact': round(total['revenue']) if avec_montants else None,
            'dormant_patients': len(dormants), 'dormant_contacted_30d': deja,
            'dormant_contacted_rate': _pct(deja, len(dormants)),
        },
        'by_reason': sorted([_finir(g, k, avec_montants) for k, g in par_motif.items()], key=lambda x: -x['contacts']),
        'by_channel': sorted([_finir(g, k, avec_montants) for k, g in par_canal.items()], key=lambda x: -x['contacts']),
        'by_agent': sorted([_finir(g, k, avec_montants) for k, g in par_agent.items()], key=lambda x: -x['contacts']),
        'by_outcome': [{'code': c, 'label': LIBELLES_ISSUE[c], 'count': issues.get(c, 0)} for c, _ in ContactLog.OUTCOME_CHOICES],
        'timeline': [{'week': k.isoformat(), **v} for k, v in sorted(semaines.items())],
        'to_follow': a_suivre[:30],
        'campaigns': sortie_camp,
        'provenance': provenance,
        'provenance_coverage': couverture,
        'upsell': montee,
        'retention': calculer_fidelite(organization, avec_montants),
    }
