"""Vue d'ensemble comparative : les chiffres clés de plusieurs périodes côte à côte
(semaine en cours / semaine dernière / mois en cours...), demandée pour évaluer l'activité.

Règles (les mêmes que le tableau de bord, pour que les chiffres concordent) :
- CA encaissé = factures au statut « payée », hors avoirs, datées de `created_at` (toute
  l'organisation, patients de laboratoires partenaires compris) ;
- CA facturé = toutes les factures ni brouillon, ni annulée, ni avoir ;
- un « passage » = un patient venu un jour donné (plusieurs factures le même jour = un passage) ;
- panier moyen = CA encaissé / passages payés.
Les montants ne sont renvoyés qu'aux administrateurs (`avec_montants`). Lecture seule.
"""
from collections import defaultdict
from datetime import date, datetime, time

from django.db.models import Sum
from django.utils import timezone

from apps.invoicing.models import Invoice, InvoiceItem

from . import services
from .models import ContactLog, PatientInteraction
from .parcours import SERVICE_PAR_TYPE, _service_ligne


def _bornes(debut, fin):
    return (timezone.make_aware(datetime.combine(debut, time.min)),
            timezone.make_aware(datetime.combine(fin, time.max)))


def indicateurs(organization, debut, fin, avec_montants):
    d0, d1 = _bornes(debut, fin)
    aujourdhui = timezone.localdate()
    jours = (fin - debut).days + 1
    ecoules = max(1, (min(fin, aujourdhui) - debut).days + 1) if debut <= aujourdhui else 0

    factures = (Invoice.objects.filter(organization=organization, created_at__gte=d0, created_at__lte=d1)
                .exclude(status__in=['draft', 'cancelled']).exclude(invoice_type='credit_note'))
    lignes = list(factures.order_by().values('id', 'client_id', 'created_at', 'status', 'total_amount', 'invoice_type'))
    base = set(services.patients_du_centre(organization).values_list('id', flat=True))

    passages, passages_payes, jours_patients = set(), set(), defaultdict(set)
    ca_encaisse = ca_facture = 0.0
    nb_payees = 0
    for f in lignes:
        jour = timezone.localtime(f['created_at']).date()
        montant = float(f['total_amount'] or 0)
        ca_facture += montant
        if f['status'] == 'paid':
            ca_encaisse += montant
            nb_payees += 1
        if f['client_id'] in base:
            passages.add((f['client_id'], jour))
            jours_patients[jour].add(f['client_id'])
            if f['status'] == 'paid':
                passages_payes.add((f['client_id'], jour))
    patients = {p for p, _ in passages}

    # Patients par service (visible de tous) : une facture typée donne son service, une facture
    # « vente » chacun des services de ses lignes (catégorie du produit).
    types = {f['id']: f['invoice_type'] for f in lignes}
    clients = {f['id']: f['client_id'] for f in lignes}
    patients_service = defaultdict(set)
    for it in (InvoiceItem.objects.filter(invoice_id__in=list(types)).order_by()
               .values('invoice_id', 'product__category__name', 'product__product_type')):
        cid = clients.get(it['invoice_id'])
        if cid not in base:
            continue
        service = SERVICE_PAR_TYPE.get(types[it['invoice_id']]) or _service_ligne(
            it['product__category__name'], it['product__product_type'])
        patients_service[service].add(cid)
    nouveaux = services.patients_du_centre(organization).filter(created_at__gte=d0, created_at__lte=d1).count()
    externes = len({f['client_id'] for f in lignes if f['client_id'] and f['client_id'] not in base})

    resultat = {
        'start': debut.isoformat(), 'end': fin.isoformat(), 'days': jours, 'days_elapsed': ecoules,
        'patients': len(patients),
        'new_patients': nouveaux,
        'returning_patients': len(patients) - len(
            services.patients_du_centre(organization).filter(id__in=patients, created_at__gte=d0).values_list('id', flat=True)),
        'visits': len(passages),
        'patients_per_day': round(len(passages) / ecoules, 1) if ecoules else None,
        'external_patients': externes,
        'invoices': len(lignes),
        'contacts': ContactLog.objects.filter(organization=organization, contacted_at__gte=d0, contacted_at__lte=d1).count(),
        'loyal_rate': None,
        'patients_by_service': {k: len(v) for k, v in sorted(patients_service.items(), key=lambda x: -len(x[1]))},
        'walk_ins': PatientInteraction.objects.filter(organization=organization, occurred_at__gte=d0, occurred_at__lte=d1).count(),
        'lost_sales': PatientInteraction.objects.filter(organization=organization, occurred_at__gte=d0, occurred_at__lte=d1)
        .exclude(lost_reason__isnull=True).exclude(lost_reason='').count(),
        'revenue_paid': None, 'revenue_invoiced': None, 'to_collect': None, 'average_basket': None,
        'revenue_per_patient': None, 'revenue_per_day': None, 'by_service': None, 'by_payment': None,
    }
    if patients:
        resultat['loyal_rate'] = round(100 * resultat['returning_patients'] / len(patients), 1)
    if avec_montants:
        payees = [f['id'] for f in lignes if f['status'] == 'paid']
        par_service = defaultdict(float)
        types = {f['id']: f['invoice_type'] for f in lignes}
        for it in (InvoiceItem.objects.filter(invoice_id__in=payees).order_by()
                   .values('invoice_id', 'total_price', 'product__category__name', 'product__product_type')):
            typ = types.get(it['invoice_id'])
            service = SERVICE_PAR_TYPE.get(typ) or _service_ligne(it['product__category__name'], it['product__product_type'])
            par_service[service] += float(it['total_price'] or 0)
        resultat.update({
            'revenue_paid': round(ca_encaisse),
            'revenue_invoiced': round(ca_facture),
            'to_collect': round(ca_facture - ca_encaisse),
            'average_basket': round(ca_encaisse / len(passages_payes)) if passages_payes else None,
            'revenue_per_patient': round(ca_encaisse / len(patients)) if patients else None,
            'revenue_per_day': round(ca_encaisse / ecoules) if ecoules else None,
            'by_service': {k: round(v) for k, v in sorted(par_service.items(), key=lambda x: -x[1])},
            # Mode de paiement : Invoice.payment_method fait foi (la table Payment est quasi vide).
            'by_payment': {
                {'cash': 'Espèces', 'mobile_money': 'Mobile Money'}.get(r['payment_method'], 'Non précisé'): round(float(r['t'] or 0))
                for r in factures.filter(status='paid').order_by().values('payment_method').annotate(t=Sum('total_amount'))
            },
        })
    return resultat


def comparer(organization, periodes, avec_montants):
    return {
        'amounts_visible': bool(avec_montants),
        'periods': [indicateurs(organization, d, f, avec_montants) for d, f in periodes],
    }
