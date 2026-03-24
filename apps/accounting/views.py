"""
Vues API — Module Comptabilité
"""
from decimal import Decimal
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Account, AccountingJournal, JournalEntry, JournalEntryLine
from .serializers import (
    AccountSerializer, AccountingJournalSerializer,
    JournalEntrySerializer, JournalEntryListSerializer,
)


# ─────────────────────────────────────────────
#  Plan Comptable
# ─────────────────────────────────────────────

class AccountListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        qs = Account.objects.filter(organization=org)

        account_type = request.GET.get('type')
        if account_type:
            qs = qs.filter(account_type=account_type)

        active_only = request.GET.get('active', 'true').lower() == 'true'
        if active_only:
            qs = qs.filter(is_active=True)

        parent = request.GET.get('parent')
        if parent == 'root':
            qs = qs.filter(parent__isnull=True)
        elif parent:
            qs = qs.filter(parent_id=parent)

        serializer = AccountSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        org = request.user.organization
        serializer = AccountSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(organization=org)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AccountDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_account(self, request, pk):
        try:
            return Account.objects.get(pk=pk, organization=request.user.organization)
        except Account.DoesNotExist:
            return None

    def get(self, request, pk):
        acc = self._get_account(request, pk)
        if not acc:
            return Response({'error': 'Compte introuvable'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AccountSerializer(acc).data)

    def patch(self, request, pk):
        acc = self._get_account(request, pk)
        if not acc:
            return Response({'error': 'Compte introuvable'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AccountSerializer(acc, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        acc = self._get_account(request, pk)
        if not acc:
            return Response({'error': 'Compte introuvable'}, status=status.HTTP_404_NOT_FOUND)
        if acc.lines.exists():
            return Response({'error': 'Impossible de supprimer : ce compte a des transactions associées'},
                            status=status.HTTP_400_BAD_REQUEST)
        acc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────
#  Journaux
# ─────────────────────────────────────────────

class JournalListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        journals = AccountingJournal.objects.filter(organization=org, is_active=True)
        return Response(AccountingJournalSerializer(journals, many=True).data)

    def post(self, request):
        org = request.user.organization
        serializer = AccountingJournalSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(organization=org)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  Écritures Comptables
# ─────────────────────────────────────────────

class JournalEntryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        qs = JournalEntry.objects.filter(organization=org).select_related('journal')

        journal_id = request.GET.get('journal')
        if journal_id:
            qs = qs.filter(journal_id=journal_id)

        status_filter = request.GET.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        source = request.GET.get('source')
        if source:
            qs = qs.filter(source=source)

        start = request.GET.get('start_date')
        end = request.GET.get('end_date')
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)

        search = request.GET.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(description__icontains=search) |
                Q(entry_number__icontains=search) |
                Q(reference__icontains=search)
            )

        serializer = JournalEntryListSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        org = request.user.organization
        serializer = JournalEntrySerializer(data=request.data)
        if serializer.is_valid():
            entry = serializer.save(organization=org, created_by=request.user, source='manual')
            return Response(JournalEntrySerializer(entry).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JournalEntryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_entry(self, request, pk):
        try:
            return JournalEntry.objects.get(pk=pk, organization=request.user.organization)
        except JournalEntry.DoesNotExist:
            return None

    def get(self, request, pk):
        entry = self._get_entry(request, pk)
        if not entry:
            return Response({'error': 'Écriture introuvable'}, status=status.HTTP_404_NOT_FOUND)
        return Response(JournalEntrySerializer(entry).data)

    def patch(self, request, pk):
        entry = self._get_entry(request, pk)
        if not entry:
            return Response({'error': 'Écriture introuvable'}, status=status.HTTP_404_NOT_FOUND)
        if entry.status != 'draft':
            return Response({'error': 'Seules les écritures en brouillon sont modifiables'},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = JournalEntrySerializer(entry, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(JournalEntrySerializer(entry).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        entry = self._get_entry(request, pk)
        if not entry:
            return Response({'error': 'Écriture introuvable'}, status=status.HTTP_404_NOT_FOUND)
        if entry.status == 'posted':
            return Response({'error': 'Écriture validée non supprimable — annulez-la d\'abord'},
                            status=status.HTTP_400_BAD_REQUEST)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JournalEntryPostView(APIView):
    """Valider une écriture (draft → posted)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            entry = JournalEntry.objects.get(pk=pk, organization=request.user.organization)
        except JournalEntry.DoesNotExist:
            return Response({'error': 'Écriture introuvable'}, status=status.HTTP_404_NOT_FOUND)

        if entry.status != 'draft':
            return Response({'error': f'Écriture déjà {entry.get_status_display()}'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not entry.lines.exists():
            return Response({'error': 'L\'écriture n\'a aucune ligne'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not entry.is_balanced:
            diff = entry.total_debit - entry.total_credit
            return Response({
                'error': f'Écriture déséquilibrée — écart : {diff:+.2f}',
                'total_debit': str(entry.total_debit),
                'total_credit': str(entry.total_credit),
            }, status=status.HTTP_400_BAD_REQUEST)

        entry.status = 'posted'
        entry.save(update_fields=['status'])
        return Response(JournalEntrySerializer(entry).data)


class JournalEntryCancelView(APIView):
    """Annuler une écriture (posted → cancelled avec écriture de contrepassation)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            entry = JournalEntry.objects.get(pk=pk, organization=request.user.organization)
        except JournalEntry.DoesNotExist:
            return Response({'error': 'Écriture introuvable'}, status=status.HTTP_404_NOT_FOUND)

        if entry.status == 'cancelled':
            return Response({'error': 'Écriture déjà annulée'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Créer l'écriture de contrepassation (débit ↔ crédit inversés)
            reverse_entry = JournalEntry.objects.create(
                organization=entry.organization,
                journal=entry.journal,
                entry_number=JournalEntry.generate_entry_number(entry.organization, entry.journal),
                date=date.today(),
                description=f"Contrepassation : {entry.description}",
                reference=entry.entry_number,
                status='posted',
                source='manual',
                created_by=request.user if request.user.is_authenticated else None,
            )
            for line in entry.lines.all():
                JournalEntryLine.objects.create(
                    entry=reverse_entry,
                    account=line.account,
                    description=line.description,
                    debit=line.credit,
                    credit=line.debit,
                )
            entry.status = 'cancelled'
            entry.save(update_fields=['status'])

        return Response({
            'message': 'Écriture annulée et contrepassation créée',
            'original': JournalEntrySerializer(entry).data,
            'reversal': JournalEntrySerializer(reverse_entry).data,
        })


# ─────────────────────────────────────────────
#  Rapports
# ─────────────────────────────────────────────

def _parse_date_range(request, default_days=30):
    """Helper pour parser start_date / end_date depuis la requête"""
    today = date.today()
    start_str = request.GET.get('start_date')
    end_str = request.GET.get('end_date')
    try:
        start = date.fromisoformat(start_str) if start_str else today - timedelta(days=default_days)
    except ValueError:
        start = today - timedelta(days=default_days)
    try:
        end = date.fromisoformat(end_str) if end_str else today
    except ValueError:
        end = today
    return start, end


class TrialBalanceView(APIView):
    """Balance des comptes — solde débit/crédit par compte sur période"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        start, end = _parse_date_range(request, default_days=365)

        # Agréger les mouvements des écritures validées
        lines = (
            JournalEntryLine.objects
            .filter(
                entry__organization=org,
                entry__status='posted',
                entry__date__gte=start,
                entry__date__lte=end,
            )
            .values('account__id', 'account__code', 'account__name', 'account__account_type')
            .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
            .order_by('account__code')
        )

        rows = []
        total_d = Decimal('0')
        total_c = Decimal('0')
        for line in lines:
            d = line['total_debit'] or Decimal('0')
            c = line['total_credit'] or Decimal('0')
            solde_d = max(d - c, Decimal('0'))
            solde_c = max(c - d, Decimal('0'))
            rows.append({
                'account_id': str(line['account__id']),
                'code': line['account__code'],
                'name': line['account__name'],
                'account_type': line['account__account_type'],
                'total_debit': str(d),
                'total_credit': str(c),
                'solde_debiteur': str(solde_d),
                'solde_crediteur': str(solde_c),
            })
            total_d += d
            total_c += c

        return Response({
            'start_date': str(start),
            'end_date': str(end),
            'rows': rows,
            'total_debit': str(total_d),
            'total_credit': str(total_c),
            'is_balanced': total_d == total_c,
        })


class GeneralLedgerView(APIView):
    """Grand livre — mouvements détaillés par compte"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        start, end = _parse_date_range(request)
        account_id = request.GET.get('account_id')

        qs = JournalEntryLine.objects.filter(
            entry__organization=org,
            entry__status='posted',
            entry__date__gte=start,
            entry__date__lte=end,
        ).select_related('entry', 'entry__journal', 'account').order_by(
            'account__code', 'entry__date', 'entry__entry_number'
        )

        if account_id:
            qs = qs.filter(account_id=account_id)

        # Regrouper par compte
        accounts_map = {}
        for line in qs:
            acc_id = str(line.account_id)
            if acc_id not in accounts_map:
                accounts_map[acc_id] = {
                    'account_id': acc_id,
                    'code': line.account.code,
                    'name': line.account.name,
                    'account_type': line.account.account_type,
                    'movements': [],
                    'total_debit': Decimal('0'),
                    'total_credit': Decimal('0'),
                }
            accounts_map[acc_id]['movements'].append({
                'date': str(line.entry.date),
                'entry_number': line.entry.entry_number,
                'journal': line.entry.journal.code,
                'description': line.description or line.entry.description,
                'reference': line.entry.reference,
                'debit': str(line.debit),
                'credit': str(line.credit),
            })
            accounts_map[acc_id]['total_debit'] += line.debit
            accounts_map[acc_id]['total_credit'] += line.credit

        result = []
        for acc in accounts_map.values():
            d = acc['total_debit']
            c = acc['total_credit']
            acc['total_debit'] = str(d)
            acc['total_credit'] = str(c)
            acc['solde'] = str(d - c)
            result.append(acc)

        return Response({
            'start_date': str(start),
            'end_date': str(end),
            'accounts': result,
        })


class IncomeStatementView(APIView):
    """Compte de résultat — Produits vs Charges"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        start, end = _parse_date_range(request)

        def get_totals(account_type):
            return (
                JournalEntryLine.objects
                .filter(
                    entry__organization=org,
                    entry__status='posted',
                    entry__date__gte=start,
                    entry__date__lte=end,
                    account__account_type=account_type,
                )
                .values('account__code', 'account__name')
                .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
                .order_by('account__code')
            )

        revenue_lines = []
        total_revenue = Decimal('0')
        for r in get_totals('revenue'):
            # Pour les comptes de produits, le solde créditeur = revenu
            amount = (r['total_credit'] or Decimal('0')) - (r['total_debit'] or Decimal('0'))
            revenue_lines.append({
                'code': r['account__code'],
                'name': r['account__name'],
                'amount': str(amount),
            })
            total_revenue += amount

        expense_lines = []
        total_expenses = Decimal('0')
        for e in get_totals('expense'):
            # Pour les comptes de charges, le solde débiteur = charge
            amount = (e['total_debit'] or Decimal('0')) - (e['total_credit'] or Decimal('0'))
            expense_lines.append({
                'code': e['account__code'],
                'name': e['account__name'],
                'amount': str(amount),
            })
            total_expenses += amount

        net_result = total_revenue - total_expenses

        return Response({
            'start_date': str(start),
            'end_date': str(end),
            'revenue': {
                'lines': revenue_lines,
                'total': str(total_revenue),
            },
            'expenses': {
                'lines': expense_lines,
                'total': str(total_expenses),
            },
            'net_result': str(net_result),
            'is_profit': net_result >= 0,
        })


class AccountingDashboardView(APIView):
    """KPIs pour le dashboard comptable"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        today = date.today()

        # Période courante : mois en cours
        start_month = today.replace(day=1)
        # 12 derniers mois pour le graphe
        start_year = today.replace(month=1, day=1)

        def period_totals(account_type, start, end):
            result = JournalEntryLine.objects.filter(
                entry__organization=org,
                entry__status='posted',
                entry__date__gte=start,
                entry__date__lte=end,
                account__account_type=account_type,
            ).aggregate(d=Sum('debit'), c=Sum('credit'))
            d = result['d'] or Decimal('0')
            c = result['c'] or Decimal('0')
            if account_type == 'revenue':
                return c - d
            return d - c

        revenue_month = period_totals('revenue', start_month, today)
        expenses_month = period_totals('expense', start_month, today)
        revenue_year = period_totals('revenue', start_year, today)
        expenses_year = period_totals('expense', start_year, today)

        # Graphe mensuel (12 derniers mois)
        monthly = []
        for i in range(11, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            from calendar import monthrange
            last_day = monthrange(y, m)[1]
            ms = date(y, m, 1)
            me = date(y, m, last_day)
            rev = period_totals('revenue', ms, me)
            exp = period_totals('expense', ms, me)
            monthly.append({
                'month': f"{y}-{m:02d}",
                'revenue': str(rev),
                'expenses': str(exp),
                'result': str(rev - exp),
            })

        entries_count = JournalEntry.objects.filter(
            organization=org, status='draft'
        ).count()

        return Response({
            'current_month': {
                'revenue': str(revenue_month),
                'expenses': str(expenses_month),
                'result': str(revenue_month - expenses_month),
            },
            'current_year': {
                'revenue': str(revenue_year),
                'expenses': str(expenses_year),
                'result': str(revenue_year - expenses_year),
            },
            'pending_entries': entries_count,
            'monthly_chart': monthly,
        })


class SIGView(APIView):
    """Soldes Intermédiaires de Gestion"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        start, end = _parse_date_range(request, default_days=365)

        def net_by_codes(prefixes_revenue=None, prefixes_expense=None):
            """Calcule (crédit - débit) pour les produits et (débit - crédit) pour les charges
            sur les comptes dont le code commence par un des préfixes donnés."""
            total = Decimal('0')
            lines = []

            if prefixes_revenue:
                q = Q()
                for p in prefixes_revenue:
                    q |= Q(account__code__startswith=p)
                qs = (
                    JournalEntryLine.objects
                    .filter(q, entry__organization=org, entry__status='posted',
                            entry__date__gte=start, entry__date__lte=end,
                            account__account_type='revenue')
                    .values('account__code', 'account__name')
                    .annotate(d=Sum('debit'), c=Sum('credit'))
                    .order_by('account__code')
                )
                for r in qs:
                    amt = (r['c'] or Decimal('0')) - (r['d'] or Decimal('0'))
                    lines.append({'code': r['account__code'], 'name': r['account__name'], 'amount': str(amt)})
                    total += amt

            if prefixes_expense:
                q = Q()
                for p in prefixes_expense:
                    q |= Q(account__code__startswith=p)
                qs = (
                    JournalEntryLine.objects
                    .filter(q, entry__organization=org, entry__status='posted',
                            entry__date__gte=start, entry__date__lte=end,
                            account__account_type='expense')
                    .values('account__code', 'account__name')
                    .annotate(d=Sum('debit'), c=Sum('credit'))
                    .order_by('account__code')
                )
                for r in qs:
                    amt = (r['d'] or Decimal('0')) - (r['c'] or Decimal('0'))
                    lines.append({'code': r['account__code'], 'name': r['account__name'], 'amount': str(-amt)})
                    total -= amt

            return total, lines

        # ── 1. Chiffre d'affaires (70-75) ──────────────────────────────
        ca, ca_lines = net_by_codes(prefixes_revenue=['70', '71', '72', '73', '74', '75'])

        # ── 2. Coût des ventes / Achats consommés (60) ─────────────────
        achats, achats_lines = net_by_codes(prefixes_expense=['60'])
        marge_brute = ca + achats  # achats est négatif dans total

        # ── 3. Services extérieurs (61, 62) ────────────────────────────
        services, services_lines = net_by_codes(prefixes_expense=['61', '62'])
        valeur_ajoutee = marge_brute + services

        # ── 4. Charges de personnel (63, 64) ───────────────────────────
        personnel, personnel_lines = net_by_codes(prefixes_expense=['63', '64'])
        ebe = valeur_ajoutee + personnel  # EBE = VA - charges personnel

        # ── 5. Autres charges d'exploitation (65) ──────────────────────
        autres_charges, autres_lines = net_by_codes(prefixes_expense=['65'])

        # ── 6. Dotations aux amortissements (68) ───────────────────────
        dotations, dotations_lines = net_by_codes(prefixes_expense=['68'])
        resultat_exploitation = ebe + autres_charges + dotations

        # ── 7. Résultat financier (66 charges / 76 produits) ───────────
        ch_fin, ch_fin_lines = net_by_codes(prefixes_expense=['66'])
        pr_fin, pr_fin_lines = net_by_codes(prefixes_revenue=['76'])
        resultat_financier = pr_fin + ch_fin
        resultat_courant = resultat_exploitation + resultat_financier

        # ── 8. Résultat exceptionnel (67 charges / 77 produits) ────────
        ch_exc, ch_exc_lines = net_by_codes(prefixes_expense=['67'])
        pr_exc, pr_exc_lines = net_by_codes(prefixes_revenue=['77'])
        resultat_exceptionnel = pr_exc + ch_exc
        resultat_net = resultat_courant + resultat_exceptionnel

        def s(v): return str(v)

        return Response({
            'start_date': str(start),
            'end_date': str(end),
            'soldes': [
                {
                    'label': "Chiffre d'affaires",
                    'description': 'Comptes 70 à 75',
                    'montant': s(ca),
                    'lines': ca_lines,
                },
                {
                    'label': 'Marge brute',
                    'description': 'CA − Achats consommés (60)',
                    'montant': s(marge_brute),
                    'lines': achats_lines,
                    'sous_total': True,
                },
                {
                    'label': 'Valeur ajoutée',
                    'description': 'Marge brute − Services extérieurs (61, 62)',
                    'montant': s(valeur_ajoutee),
                    'lines': services_lines,
                    'sous_total': True,
                },
                {
                    'label': 'EBE (Excédent Brut d\'Exploitation)',
                    'description': 'VA − Charges de personnel (63, 64)',
                    'montant': s(ebe),
                    'lines': personnel_lines,
                    'sous_total': True,
                },
                {
                    'label': 'Résultat d\'exploitation',
                    'description': 'EBE − Autres charges (65) − Dotations amort. (68)',
                    'montant': s(resultat_exploitation),
                    'lines': autres_lines + dotations_lines,
                    'sous_total': True,
                },
                {
                    'label': 'Résultat financier',
                    'description': 'Produits fin. (76) − Charges fin. (66)',
                    'montant': s(resultat_financier),
                    'lines': pr_fin_lines + ch_fin_lines,
                },
                {
                    'label': 'Résultat courant',
                    'description': 'Résultat exploitation + Résultat financier',
                    'montant': s(resultat_courant),
                    'lines': [],
                    'sous_total': True,
                },
                {
                    'label': 'Résultat exceptionnel',
                    'description': 'Produits excep. (77) − Charges excep. (67)',
                    'montant': s(resultat_exceptionnel),
                    'lines': pr_exc_lines + ch_exc_lines,
                },
                {
                    'label': 'Résultat net',
                    'description': 'Résultat courant + Résultat exceptionnel',
                    'montant': s(resultat_net),
                    'lines': [],
                    'sous_total': True,
                    'final': True,
                },
            ],
        })


class BalanceSheetView(APIView):
    """Bilan comptable — Actif / Passif / Capitaux propres à une date donnée"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        today = date.today()
        end_str = request.GET.get('end_date')
        try:
            as_of = date.fromisoformat(end_str) if end_str else today
        except ValueError:
            as_of = today

        def get_account_balance(account_type):
            """Retourne le solde cumulé depuis l'origine jusqu'à as_of"""
            rows = (
                JournalEntryLine.objects
                .filter(
                    entry__organization=org,
                    entry__status='posted',
                    entry__date__lte=as_of,
                    account__account_type=account_type,
                )
                .values('account__id', 'account__code', 'account__name')
                .annotate(total_debit=Sum('debit'), total_credit=Sum('credit'))
                .order_by('account__code')
            )
            lines = []
            total = Decimal('0')
            for r in rows:
                d = r['total_debit'] or Decimal('0')
                c = r['total_credit'] or Decimal('0')
                # Actif : solde débiteur (débit - crédit)
                # Passif/Capitaux : solde créditeur (crédit - débit)
                if account_type == 'asset':
                    balance = d - c
                else:
                    balance = c - d
                if balance != 0:
                    lines.append({
                        'code': r['account__code'],
                        'name': r['account__name'],
                        'balance': str(balance),
                    })
                    total += balance
            return lines, total

        asset_lines, total_assets = get_account_balance('asset')
        liability_lines, total_liabilities = get_account_balance('liability')
        equity_lines, total_equity = get_account_balance('equity')

        # Résultat net de l'exercice (produits - charges) intégré dans les capitaux
        revenue_total = (
            JournalEntryLine.objects
            .filter(entry__organization=org, entry__status='posted',
                    entry__date__lte=as_of, account__account_type='revenue')
            .aggregate(d=Sum('debit'), c=Sum('credit'))
        )
        expense_total = (
            JournalEntryLine.objects
            .filter(entry__organization=org, entry__status='posted',
                    entry__date__lte=as_of, account__account_type='expense')
            .aggregate(d=Sum('debit'), c=Sum('credit'))
        )
        rev = (revenue_total['c'] or Decimal('0')) - (revenue_total['d'] or Decimal('0'))
        exp = (expense_total['d'] or Decimal('0')) - (expense_total['c'] or Decimal('0'))
        net_result = rev - exp

        total_passif = total_liabilities + total_equity + net_result
        is_balanced = abs(total_assets - total_passif) < Decimal('0.01')

        return Response({
            'as_of': str(as_of),
            'assets': {
                'lines': asset_lines,
                'total': str(total_assets),
            },
            'liabilities': {
                'lines': liability_lines,
                'total': str(total_liabilities),
            },
            'equity': {
                'lines': equity_lines,
                'total': str(total_equity),
            },
            'net_result': str(net_result),
            'total_assets': str(total_assets),
            'total_passif': str(total_passif),
            'is_balanced': is_balanced,
        })


class SyncInvoiceView(APIView):
    """Générer/régénérer manuellement l'écriture comptable pour une facture"""
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        from apps.invoicing.models import Invoice
        try:
            invoice = Invoice.objects.get(pk=invoice_id, organization=request.user.organization)
        except Invoice.DoesNotExist:
            return Response({'error': 'Facture introuvable'}, status=status.HTTP_404_NOT_FOUND)

        from .signals import create_invoice_entry
        entry = create_invoice_entry(invoice, request.user)
        if entry:
            return Response({
                'message': 'Écriture générée',
                'entry': JournalEntrySerializer(entry).data,
            })
        return Response({'error': 'Impossible de générer l\'écriture (comptes manquants ?)'},
                        status=status.HTTP_400_BAD_REQUEST)


class SetupAccountingView(APIView):
    """
    POST /accounting/setup/
    Initialise le plan comptable et les journaux par défaut pour l'organisation.
    Idempotent — ne supprime rien, ne modifie pas les comptes existants.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        org = getattr(request.user, 'organization', None)
        if not org:
            return Response({'error': 'Aucune organisation associée'}, status=status.HTTP_400_BAD_REQUEST)

        from .setup_utils import setup_accounting_for_org
        accounts_created, journals_created = setup_accounting_for_org(org)

        return Response({
            'message': 'Plan comptable initialisé',
            'accounts_created': accounts_created,
            'journals_created': journals_created,
        })

    def get(self, request):
        """Vérifie si un plan comptable existe déjà"""
        org = getattr(request.user, 'organization', None)
        if not org:
            return Response({'has_chart': False})
        count = Account.objects.filter(organization=org, is_active=True).count()
        return Response({'has_chart': count > 0, 'account_count': count})
