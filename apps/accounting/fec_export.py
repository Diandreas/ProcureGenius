"""
Export FEC (Fichier des Écritures Comptables) — format défini par l'article
A47 A-1 du Livre des Procédures Fiscales (France) : 18 colonnes séparées par
tabulation, une ligne par ligne d'écriture validée.

Réservé au plan le plus élevé (fonctionnalité `advanced_exports`).
Le format est aussi utilisable comme export générique du journal (audit,
expert-comptable) hors de France.
"""
from datetime import date

from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.modules import organization_has_feature, Features
from .models import JournalEntryLine

# Les 18 colonnes officielles, dans l'ordre imposé.
FEC_COLUMNS = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
    'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
]


def _fec_date(d):
    """Date au format AAAAMMJJ (chaîne vide si absente)."""
    return d.strftime('%Y%m%d') if d else ''


def _fec_amount(value):
    """Montant à 2 décimales, virgule comme séparateur décimal."""
    return f"{value or 0:.2f}".replace('.', ',')


def _fec_text(value):
    """Nettoie un libellé : ni tabulation ni retour à la ligne (séparateurs)."""
    if not value:
        return ''
    return str(value).replace('\t', ' ').replace('\r', ' ').replace('\n', ' ').strip()


def _org_fiscal_id(org):
    """Identifiant fiscal pour le nom de fichier (SIREN en France, sinon le
    premier identifiant renseigné). Chiffres/lettres uniquement."""
    settings_obj = getattr(org, 'settings', None)
    candidates = []
    if settings_obj is not None:
        candidates = [
            getattr(settings_obj, 'company_tax_number', ''),
            getattr(settings_obj, 'company_niu', ''),
            getattr(settings_obj, 'company_vat_number', ''),
            getattr(settings_obj, 'company_rccm_number', ''),
        ]
    for c in candidates:
        cleaned = ''.join(ch for ch in str(c) if ch.isalnum())
        if cleaned:
            return cleaned
    return '000000000'


class FECExportView(APIView):
    """
    GET /api/v1/accounting/exports/fec/?start=AAAA-MM-JJ&end=AAAA-MM-JJ

    Télécharge les écritures VALIDÉES de la période au format FEC
    (texte tabulé, encodage ISO-8859-15, nom de fichier SirenFECAAAAMMJJ.txt).
    Par défaut : l'année civile en cours.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = getattr(request.user, 'organization', None)
        if not org:
            return Response({'error': "Aucune organisation associée"}, status=400)

        # Fonctionnalité réservée au plan le plus élevé.
        if not organization_has_feature(org, Features.ADVANCED_EXPORTS):
            return Response(
                {'error': "Fonctionnalité réservée au plan Business.",
                 'feature': Features.ADVANCED_EXPORTS},
                status=403,
            )

        today = date.today()
        try:
            start = date.fromisoformat(request.GET.get('start', f'{today.year}-01-01'))
            end = date.fromisoformat(request.GET.get('end', today.isoformat()))
        except ValueError:
            return Response({'error': "Dates invalides (format attendu AAAA-MM-JJ)."}, status=400)
        if start > end:
            return Response({'error': "La date de début doit précéder la date de fin."}, status=400)

        lines = (
            JournalEntryLine.objects
            .filter(
                entry__organization=org,
                entry__status='posted',
                entry__date__gte=start,
                entry__date__lte=end,
            )
            .select_related('entry', 'entry__journal', 'account')
            .order_by('entry__date', 'entry__entry_number', 'created_at')
        )

        rows = ['\t'.join(FEC_COLUMNS)]
        for line in lines:
            entry = line.entry
            rows.append('\t'.join([
                _fec_text(entry.journal.code),                    # JournalCode
                _fec_text(entry.journal.name),                    # JournalLib
                _fec_text(entry.entry_number),                    # EcritureNum
                _fec_date(entry.date),                            # EcritureDate
                _fec_text(line.account.code),                     # CompteNum
                _fec_text(line.account.name),                     # CompteLib
                '',                                               # CompAuxNum
                '',                                               # CompAuxLib
                _fec_text(entry.reference or entry.entry_number), # PieceRef
                _fec_date(entry.date),                            # PieceDate
                _fec_text(line.description or entry.description), # EcritureLib
                _fec_amount(line.debit),                          # Debit
                _fec_amount(line.credit),                         # Credit
                '',                                               # EcritureLet
                '',                                               # DateLet
                _fec_date(entry.updated_at.date() if entry.updated_at else entry.date),  # ValidDate
                '',                                               # Montantdevise
                '',                                               # Idevise
            ]))

        # Nom légal : SirenFECAAAAMMJJ.txt (AAAAMMJJ = date de clôture).
        filename = f"{_org_fiscal_id(org)}FEC{_fec_date(end)}.txt"
        content = '\r\n'.join(rows) + '\r\n'
        response = HttpResponse(
            content.encode('iso-8859-15', errors='replace'),
            content_type='text/plain; charset=iso-8859-15',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
