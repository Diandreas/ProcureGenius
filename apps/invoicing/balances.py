"""Montants payes / restant dus d'un ensemble de factures, calcules a partir des paiements reels.

Pourquoi ce module : la fiche client additionnait le montant TOTAL des factures
« envoyee » ou « en retard », sans tenir compte des acomptes deja recus. Une
facture de 38 000 reglee a 27 500 comptait pour 38 000 « en attente » alors que la
liste des factures et l'ecran Sous-traitance affichaient le vrai reste (10 500).

Regle (voir memoire project_paiement_mode_source) : pour une facture au statut
« payee », le statut fait foi, jamais la table Payment (quasi vide cote patients,
`get_balance_due()` y renverrait le total meme pour une facture soldee). Les
paiements ne servent donc qu'a mesurer ce qui reste sur les factures NON soldees.
"""
from decimal import Decimal

from django.db.models import Sum

from .models import Payment

STATUTS_A_REGLER = ('sent', 'overdue')


def montants_factures(factures):
    """(paye, reste_du) pour un queryset de factures d'un meme client.

    - paye    : total des factures soldees + acomptes recus sur les non soldees
                (plafonnes au montant de la facture)
    - reste_du: pour chaque facture envoyee / en retard, total - paiements recus
                (jamais negatif : un trop-percu n'efface pas la dette d'une autre facture)
    """
    factures = list(factures.exclude(status__in=['draft', 'cancelled']).values('id', 'status', 'total_amount'))
    a_regler = [f['id'] for f in factures if f['status'] in STATUTS_A_REGLER]
    recu = {}
    if a_regler:
        recu = {
            r['invoice']: r['total'] or Decimal('0')
            for r in Payment.objects.filter(invoice_id__in=a_regler, status='success')
            .values('invoice').annotate(total=Sum('amount'))
        }
    paye = Decimal('0')
    reste = Decimal('0')
    for f in factures:
        total = Decimal(str(f['total_amount'] or 0))
        if f['status'] == 'paid':
            paye += total
        elif f['status'] in STATUTS_A_REGLER:
            deja = min(recu.get(f['id'], Decimal('0')), total)
            paye += deja
            reste += total - deja
    return paye, reste
