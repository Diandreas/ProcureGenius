"""
Commande Django : setup_accounting
Crée le plan comptable de base et les journaux pour un centre de santé.

Usage:
    python manage.py setup_accounting
    python manage.py setup_accounting --org-id <uuid>  (pour une org spécifique)
"""
from django.core.management.base import BaseCommand
from apps.accounts.models import Organization


DEFAULT_ACCOUNTS = [
    # (code, name, account_type)
    # ── Classe 1 : Capitaux ──
    ('1100', 'Capital social',                    'equity'),
    ('1200', 'Réserves',                          'equity'),
    ('1300', 'Résultat de l\'exercice',           'equity'),
    # ── Classe 2 : Immobilisations ──
    ('2100', 'Équipements médicaux',              'asset'),
    ('2200', 'Mobilier et matériel de bureau',    'asset'),
    ('2800', 'Amortissements (-)' ,               'asset'),
    # ── Classe 4 : Comptes de tiers ──
    ('4010', 'Fournisseurs',                      'liability'),
    ('4100', 'Clients / Patients',                'asset'),
    ('4300', 'Personnel — Salaires à payer',      'liability'),
    ('4400', 'État — Taxes à payer',              'liability'),
    # ── Classe 5 : Trésorerie ──
    ('5100', 'Caisse principale',                 'asset'),
    ('5110', 'Caisse secondaire',                 'asset'),
    ('5200', 'Banque',                            'asset'),
    ('5210', 'Mobile Money',                      'asset'),
    # ── Classe 6 : Charges ──
    ('6100', 'Achats médicaments',                'expense'),
    ('6200', 'Achats réactifs laboratoire',       'expense'),
    ('6300', 'Achats fournitures médicales',      'expense'),
    ('6400', 'Salaires et charges sociales',      'expense'),
    ('6500', 'Loyer et charges locatives',        'expense'),
    ('6600', 'Électricité / Eau / Internet',      'expense'),
    ('6700', 'Entretien et réparations',          'expense'),
    ('6800', 'Frais administratifs',              'expense'),
    ('6900', 'Autres charges',                    'expense'),
    # ── Classe 7 : Produits / Recettes ──
    ('7100', 'Recettes — Consultations',          'revenue'),
    ('7200', 'Recettes — Laboratoire',            'revenue'),
    ('7300', 'Recettes — Pharmacie',              'revenue'),
    ('7400', 'Recettes — Soins / Chirurgie',      'revenue'),
    ('7500', 'Recettes — Ventes comptoir',        'revenue'),
    ('7600', 'Recettes — Autres services',        'revenue'),
    ('7900', 'Produits divers',                   'revenue'),
]

DEFAULT_JOURNALS = [
    # (code, name, journal_type)
    ('VTE', 'Journal des Ventes',      'sales'),
    ('ACH', 'Journal des Achats',      'purchases'),
    ('CAI', 'Journal de Caisse',       'cash'),
    ('BNQ', 'Journal de Banque',       'bank'),
    ('OD',  'Opérations Diverses',     'misc'),
]


class Command(BaseCommand):
    help = 'Crée le plan comptable de base et les journaux pour un centre de santé'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-id',
            type=str,
            help='UUID de l\'organisation (optionnel — si omis, toutes les organisations)',
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Réinitialiser les comptes système existants (mise à jour des noms)',
        )

    def handle(self, *args, **options):
        from apps.accounting.models import Account, AccountingJournal

        org_id = options.get('org_id')
        if org_id:
            try:
                orgs = [Organization.objects.get(pk=org_id)]
            except Organization.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Organisation {org_id} introuvable'))
                return
        else:
            orgs = Organization.objects.all()

        reset = options.get('reset', False)

        for org in orgs:
            self.stdout.write(f'\n[*] Organisation : {org.name}')
            accounts_created = 0
            accounts_updated = 0

            for code, name, atype in DEFAULT_ACCOUNTS:
                acc, created = Account.objects.get_or_create(
                    organization=org,
                    code=code,
                    defaults={
                        'name': name,
                        'account_type': atype,
                        'is_system': False,
                        'is_active': True,
                    }
                )
                if created:
                    accounts_created += 1
                elif reset:
                    acc.name = name
                    acc.account_type = atype
                    acc.is_system = False
                    acc.save(update_fields=['name', 'account_type', 'is_system'])
                    accounts_updated += 1

            journals_created = 0
            for code, name, jtype in DEFAULT_JOURNALS:
                _, created = AccountingJournal.objects.get_or_create(
                    organization=org,
                    code=code,
                    defaults={'name': name, 'journal_type': jtype, 'is_active': True}
                )
                if created:
                    journals_created += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'  OK {accounts_created} comptes crees, {accounts_updated} mis a jour'
                    f' | {journals_created} journaux crees'
                )
            )

        self.stdout.write(self.style.SUCCESS('\nSetup comptabilite termine.'))
