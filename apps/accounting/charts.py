"""
Plans comptables par référentiel, et « rôles » des comptes.

Les écritures automatiques (ventes, encaissements, achats, dépenses) ne citent jamais un numéro de
compte : elles demandent un rôle (`customers`, `cash`, `vat_collected`, `exp_rent`…) et
`account_for_role(org, role)` renvoie le compte de l'organisation selon son référentiel
(`OrganizationSettings.accounting_standard`).

Référentiels :
  procura   — plan historique de Procura (codes à 4 chiffres). Utilisé quand le référentiel est vide,
              c'est-à-dire par les organisations créées avant octobre 2026 qui n'ont pas changé de plan.
  syscohada — SYSCOHADA révisé (OHADA : Cameroun, Côte d'Ivoire, Sénégal…)
  pcg       — Plan comptable général (France, Belgique, Maghreb)
  us_gaap   — plan type d'une petite entreprise américaine
  ca        — plan type d'une petite entreprise canadienne (ASPE)
"""
from decimal import Decimal

LEGACY = 'procura'

# (code, intitulé, type, rôle ou None)
CHARTS = {
    LEGACY: [
        ('1100', 'Capital social', 'equity', 'capital'),
        ('1200', 'Réserves', 'equity', None),
        ('1300', "Résultat de l'exercice", 'equity', 'retained_earnings'),
        ('2100', 'Matériel et outillage', 'asset', None),
        ('2200', 'Mobilier et matériel de bureau', 'asset', None),
        ('2300', 'Matériel informatique', 'asset', None),
        ('2400', 'Matériel de transport', 'asset', None),
        ('2800', 'Amortissements (-)', 'asset', None),
        ('4010', 'Fournisseurs', 'liability', 'suppliers'),
        ('4100', 'Clients', 'asset', 'customers'),
        ('4300', 'Personnel — Salaires à payer', 'liability', 'staff_payable'),
        ('4400', 'État — TVA et taxes à payer', 'liability', 'vat_collected'),
        ('5100', 'Caisse', 'asset', 'cash'),
        ('5110', 'Caisse secondaire', 'asset', None),
        ('5200', 'Banque', 'asset', 'bank'),
        ('5210', 'Mobile Money', 'asset', 'mobile_money'),
        ('6100', 'Achats de marchandises', 'expense', 'exp_goods'),
        ('6200', 'Achats de matières et fournitures', 'expense', 'exp_supplies'),
        ('6300', 'Fournitures de bureau', 'expense', 'exp_office'),
        ('6400', 'Salaires et charges sociales', 'expense', 'exp_salaries'),
        ('6500', 'Loyer et charges locatives', 'expense', 'exp_rent'),
        ('6600', 'Électricité / Eau / Internet', 'expense', 'exp_utilities'),
        ('6700', 'Entretien et réparations', 'expense', 'exp_repairs'),
        ('6800', 'Frais administratifs et bancaires', 'expense', 'exp_bank_fees'),
        ('6900', 'Autres charges', 'expense', 'exp_other'),
        ('7100', 'Prestations de services', 'revenue', None),
        ('7200', 'Ventes de marchandises', 'revenue', None),
        ('7300', 'Ventes de produits finis', 'revenue', None),
        ('7400', 'Travaux et autres prestations', 'revenue', None),
        ('7500', 'Ventes et prestations', 'revenue', 'sales'),
        ('7600', "Autres produits d'exploitation", 'revenue', 'other_income'),
        ('7900', 'Produits divers', 'revenue', None),
    ],
    'syscohada': [
        ('101', 'Capital social', 'equity', 'capital'),
        ('111', 'Réserve légale', 'equity', None),
        ('121', 'Report à nouveau créditeur', 'equity', 'retained_earnings'),
        ('131', 'Résultat net : bénéfice', 'equity', None),
        ('139', 'Résultat net : perte', 'equity', None),
        ('162', 'Emprunts auprès des établissements de crédit', 'liability', 'loans'),
        ('231', 'Bâtiments', 'asset', None),
        ('241', 'Matériel et outillage industriel et commercial', 'asset', None),
        ('2441', 'Matériel de bureau', 'asset', None),
        ('2442', 'Matériel informatique', 'asset', None),
        ('2444', 'Mobilier de bureau', 'asset', None),
        ('245', 'Matériel de transport', 'asset', None),
        ('284', 'Amortissements du matériel', 'asset', None),
        ('311', 'Marchandises', 'asset', 'stock'),
        ('401', 'Fournisseurs, dettes en compte', 'liability', 'suppliers'),
        ('411', 'Clients', 'asset', 'customers'),
        ('421', 'Personnel, rémunérations dues', 'liability', 'staff_payable'),
        ('431', 'Sécurité sociale (CNPS)', 'liability', 'social_payable'),
        ('4431', 'État, TVA facturée sur ventes', 'liability', 'vat_collected'),
        ('4452', 'État, TVA récupérable sur achats', 'asset', 'vat_deductible'),
        ('4441', 'État, TVA due', 'liability', 'vat_payable'),
        ('447', 'État, impôts retenus à la source', 'liability', None),
        ('471', 'Débiteurs et créditeurs divers', 'liability', None),
        ('521', 'Banques locales', 'asset', 'bank'),
        ('552', 'Monnaie électronique — Mobile Money', 'asset', 'mobile_money'),
        ('571', 'Caisse', 'asset', 'cash'),
        ('585', 'Virements de fonds', 'asset', None),
        ('601', 'Achats de marchandises', 'expense', 'exp_goods'),
        ('6031', 'Variation des stocks de marchandises', 'expense', None),
        ('602', 'Achats de matières premières', 'expense', None),
        ('604', 'Achats stockés de matières et fournitures', 'expense', 'exp_supplies'),
        ('6051', 'Fournitures non stockables — eau', 'expense', None),
        ('6052', 'Fournitures non stockables — électricité', 'expense', 'exp_utilities'),
        ('6055', 'Fournitures de bureau', 'expense', 'exp_office'),
        ('612', 'Transports sur ventes', 'expense', None),
        ('618', 'Autres frais de transport', 'expense', 'exp_transport'),
        ('622', 'Locations et charges locatives', 'expense', 'exp_rent'),
        ('624', 'Entretien, réparations et maintenance', 'expense', 'exp_repairs'),
        ('625', "Primes d'assurance", 'expense', 'exp_insurance'),
        ('627', 'Publicité, publications, relations publiques', 'expense', 'exp_advertising'),
        ('628', 'Frais de télécommunications', 'expense', 'exp_telecom'),
        ('631', 'Frais bancaires', 'expense', 'exp_bank_fees'),
        ('632', "Rémunérations d'intermédiaires et de conseils", 'expense', 'exp_fees'),
        ('641', 'Impôts et taxes directs', 'expense', 'exp_taxes'),
        ('658', 'Charges diverses', 'expense', 'exp_other'),
        ('661', 'Rémunérations directes versées au personnel', 'expense', 'exp_salaries'),
        ('664', 'Charges sociales', 'expense', 'exp_social'),
        ('671', 'Intérêts des emprunts', 'expense', 'exp_interest'),
        ('681', "Dotations aux amortissements d'exploitation", 'expense', 'exp_depreciation'),
        ('701', 'Ventes de marchandises', 'revenue', 'sales_goods'),
        ('702', 'Ventes de produits finis', 'revenue', None),
        ('706', 'Services vendus', 'revenue', 'sales_services'),
        ('707', 'Produits accessoires', 'revenue', None),
        ('758', 'Produits divers', 'revenue', 'other_income'),
        ('771', 'Intérêts de prêts', 'revenue', None),
    ],
    'pcg': [
        ('101', 'Capital', 'equity', 'capital'),
        ('106', 'Réserves', 'equity', None),
        ('110', 'Report à nouveau', 'equity', 'retained_earnings'),
        ('120', "Résultat de l'exercice (bénéfice)", 'equity', None),
        ('129', "Résultat de l'exercice (perte)", 'equity', None),
        ('164', 'Emprunts auprès des établissements de crédit', 'liability', 'loans'),
        ('2154', 'Matériel industriel', 'asset', None),
        ('2182', 'Matériel de transport', 'asset', None),
        ('2183', 'Matériel de bureau et informatique', 'asset', None),
        ('2184', 'Mobilier', 'asset', None),
        ('2818', 'Amortissements des autres immobilisations corporelles', 'asset', None),
        ('37', 'Stocks de marchandises', 'asset', 'stock'),
        ('401', 'Fournisseurs', 'liability', 'suppliers'),
        ('411', 'Clients', 'asset', 'customers'),
        ('421', 'Personnel — rémunérations dues', 'liability', 'staff_payable'),
        ('431', 'Sécurité sociale', 'liability', 'social_payable'),
        ('44566', 'TVA déductible sur autres biens et services', 'asset', 'vat_deductible'),
        ('44571', 'TVA collectée', 'liability', 'vat_collected'),
        ('44551', 'TVA à décaisser', 'liability', 'vat_payable'),
        ('512', 'Banque', 'asset', 'bank'),
        ('517', 'Autres organismes financiers (monnaie électronique)', 'asset', 'mobile_money'),
        ('530', 'Caisse', 'asset', 'cash'),
        ('601', 'Achats de matières premières', 'expense', None),
        ('6037', 'Variation des stocks de marchandises', 'expense', None),
        ('6061', 'Fournitures non stockables (eau, énergie)', 'expense', 'exp_utilities'),
        ('6064', 'Fournitures administratives', 'expense', 'exp_office'),
        ('6068', 'Autres matières et fournitures', 'expense', 'exp_supplies'),
        ('607', 'Achats de marchandises', 'expense', 'exp_goods'),
        ('6132', 'Locations immobilières', 'expense', 'exp_rent'),
        ('615', 'Entretien et réparations', 'expense', 'exp_repairs'),
        ('616', "Primes d'assurance", 'expense', 'exp_insurance'),
        ('622', 'Rémunérations d\'intermédiaires et honoraires', 'expense', 'exp_fees'),
        ('623', 'Publicité, publications, relations publiques', 'expense', 'exp_advertising'),
        ('624', 'Transports de biens et transports collectifs', 'expense', 'exp_transport'),
        ('626', 'Frais postaux et de télécommunications', 'expense', 'exp_telecom'),
        ('627', 'Services bancaires et assimilés', 'expense', 'exp_bank_fees'),
        ('635', 'Autres impôts, taxes et versements assimilés', 'expense', 'exp_taxes'),
        ('641', 'Rémunérations du personnel', 'expense', 'exp_salaries'),
        ('645', 'Charges de sécurité sociale et de prévoyance', 'expense', 'exp_social'),
        ('658', 'Charges diverses de gestion courante', 'expense', 'exp_other'),
        ('661', "Charges d'intérêts", 'expense', 'exp_interest'),
        ('681', 'Dotations aux amortissements', 'expense', 'exp_depreciation'),
        ('701', 'Ventes de produits finis', 'revenue', None),
        ('706', 'Prestations de services', 'revenue', 'sales_services'),
        ('707', 'Ventes de marchandises', 'revenue', 'sales_goods'),
        ('708', 'Produits des activités annexes', 'revenue', None),
        ('758', 'Produits divers de gestion courante', 'revenue', 'other_income'),
        ('768', 'Autres produits financiers', 'revenue', None),
    ],
    'us_gaap': [
        ('1000', 'Cash on hand', 'asset', 'cash'),
        ('1010', 'Checking account', 'asset', 'bank'),
        ('1020', 'Mobile wallet / e-money', 'asset', 'mobile_money'),
        ('1200', 'Accounts receivable', 'asset', 'customers'),
        ('1300', 'Inventory', 'asset', 'stock'),
        ('1500', 'Equipment', 'asset', None),
        ('1510', 'Furniture and fixtures', 'asset', None),
        ('1520', 'Vehicles', 'asset', None),
        ('1590', 'Accumulated depreciation', 'asset', None),
        ('2000', 'Accounts payable', 'liability', 'suppliers'),
        ('2100', 'Sales tax payable', 'liability', 'vat_collected'),
        ('2200', 'Payroll liabilities', 'liability', 'staff_payable'),
        ('2700', 'Loans payable', 'liability', 'loans'),
        ('3000', "Owner's equity / common stock", 'equity', 'capital'),
        ('3100', 'Retained earnings', 'equity', 'retained_earnings'),
        ('4000', 'Sales revenue', 'revenue', 'sales_goods'),
        ('4100', 'Service revenue', 'revenue', 'sales_services'),
        ('4900', 'Other income', 'revenue', 'other_income'),
        ('5000', 'Cost of goods sold / purchases', 'expense', 'exp_goods'),
        ('5100', 'Supplies and materials', 'expense', 'exp_supplies'),
        ('6000', 'Rent', 'expense', 'exp_rent'),
        ('6100', 'Utilities', 'expense', 'exp_utilities'),
        ('6200', 'Salaries and wages', 'expense', 'exp_salaries'),
        ('6210', 'Payroll taxes', 'expense', 'exp_social'),
        ('6300', 'Office supplies', 'expense', 'exp_office'),
        ('6400', 'Repairs and maintenance', 'expense', 'exp_repairs'),
        ('6500', 'Insurance', 'expense', 'exp_insurance'),
        ('6600', 'Advertising', 'expense', 'exp_advertising'),
        ('6650', 'Professional fees', 'expense', 'exp_fees'),
        ('6700', 'Bank fees', 'expense', 'exp_bank_fees'),
        ('6710', 'Telephone and internet', 'expense', 'exp_telecom'),
        ('6800', 'Travel and transportation', 'expense', 'exp_transport'),
        ('6850', 'Taxes and licenses', 'expense', 'exp_taxes'),
        ('6900', 'Depreciation expense', 'expense', 'exp_depreciation'),
        ('7000', 'Interest expense', 'expense', 'exp_interest'),
        ('7900', 'Miscellaneous expense', 'expense', 'exp_other'),
    ],
    'ca': [
        ('1000', 'Petty cash', 'asset', 'cash'),
        ('1060', 'Chequing bank account', 'asset', 'bank'),
        ('1070', 'E-money / mobile wallet', 'asset', 'mobile_money'),
        ('1200', 'Accounts receivable', 'asset', 'customers'),
        ('1260', 'Inventory', 'asset', 'stock'),
        ('1500', 'Equipment', 'asset', None),
        ('1550', 'Furniture', 'asset', None),
        ('1600', 'Vehicles', 'asset', None),
        ('1700', 'Accumulated amortization', 'asset', None),
        ('2000', 'Accounts payable', 'liability', 'suppliers'),
        ('2310', 'GST/HST charged on sales', 'liability', 'vat_collected'),
        ('2315', 'GST/HST paid on purchases (ITC)', 'asset', 'vat_deductible'),
        ('2400', 'Payroll liabilities', 'liability', 'staff_payable'),
        ('2700', 'Loans payable', 'liability', 'loans'),
        ('3000', 'Share capital', 'equity', 'capital'),
        ('3600', 'Retained earnings', 'equity', 'retained_earnings'),
        ('4000', 'Sales', 'revenue', 'sales_goods'),
        ('4100', 'Service revenue', 'revenue', 'sales_services'),
        ('4400', 'Other revenue', 'revenue', 'other_income'),
        ('5000', 'Purchases / cost of goods sold', 'expense', 'exp_goods'),
        ('5050', 'Supplies', 'expense', 'exp_supplies'),
        ('5100', 'Rent', 'expense', 'exp_rent'),
        ('5200', 'Utilities', 'expense', 'exp_utilities'),
        ('5300', 'Wages and salaries', 'expense', 'exp_salaries'),
        ('5310', 'EI, CPP and payroll expenses', 'expense', 'exp_social'),
        ('5400', 'Office supplies', 'expense', 'exp_office'),
        ('5500', 'Repairs and maintenance', 'expense', 'exp_repairs'),
        ('5600', 'Insurance', 'expense', 'exp_insurance'),
        ('5700', 'Advertising and promotion', 'expense', 'exp_advertising'),
        ('5750', 'Professional fees', 'expense', 'exp_fees'),
        ('5800', 'Bank charges', 'expense', 'exp_bank_fees'),
        ('5810', 'Telephone and internet', 'expense', 'exp_telecom'),
        ('5900', 'Travel and transportation', 'expense', 'exp_transport'),
        ('5920', 'Business taxes and licences', 'expense', 'exp_taxes'),
        ('5950', 'Amortization expense', 'expense', 'exp_depreciation'),
        ('5960', 'Interest expense', 'expense', 'exp_interest'),
        ('5990', 'Other expenses', 'expense', 'exp_other'),
    ],
}

ACCOUNTING_STANDARD_LABELS = {
    LEGACY: 'Plan Procura (historique)',
    'syscohada': 'SYSCOHADA (OHADA)',
    'pcg': 'Plan comptable général (France / Europe)',
    'us_gaap': 'US GAAP (États-Unis)',
    'ca': 'Canada (ASPE)',
}

JOURNALS = [
    ('VTE', 'Journal des Ventes', 'sales'),
    ('ACH', 'Journal des Achats', 'purchases'),
    ('CAI', 'Journal de Caisse', 'cash'),
    ('BNQ', 'Journal de Banque', 'bank'),
    ('OD', 'Opérations Diverses', 'misc'),
]

# Rôles de repli : si un rôle manque dans un plan, on prend le suivant.
FALLBACK = {
    'sales_goods': 'sales', 'sales_services': 'sales', 'sales': 'sales_goods',
    'mobile_money': 'cash',
    'exp_transport': 'exp_other', 'exp_telecom': 'exp_utilities', 'exp_insurance': 'exp_other',
    'exp_advertising': 'exp_other', 'exp_fees': 'exp_other', 'exp_taxes': 'exp_other',
    'exp_social': 'exp_salaries', 'exp_interest': 'exp_bank_fees', 'exp_depreciation': 'exp_other',
    'exp_supplies': 'exp_goods', 'exp_office': 'exp_supplies',
    'exp_utilities': 'exp_other', 'exp_rent': 'exp_other', 'exp_repairs': 'exp_other',
    'exp_bank_fees': 'exp_other', 'exp_salaries': 'exp_other', 'exp_goods': 'exp_other',
}

# Catégories de dépense proposées à l'utilisateur (rôle -> libellé)
EXPENSE_CATEGORIES = [
    ('exp_goods', 'Achats de marchandises'),
    ('exp_supplies', 'Fournitures et consommables'),
    ('exp_rent', 'Loyer'),
    ('exp_utilities', 'Électricité, eau'),
    ('exp_telecom', 'Téléphone, internet'),
    ('exp_transport', 'Transport, carburant'),
    ('exp_salaries', 'Salaires'),
    ('exp_social', 'Charges sociales (CNPS…)'),
    ('exp_office', 'Fournitures de bureau'),
    ('exp_repairs', 'Entretien, réparations'),
    ('exp_insurance', 'Assurances'),
    ('exp_advertising', 'Publicité'),
    ('exp_fees', 'Honoraires, conseils'),
    ('exp_bank_fees', 'Frais bancaires et Mobile Money'),
    ('exp_taxes', 'Impôts et taxes'),
    ('exp_other', 'Autres dépenses'),
]

# Mode de paiement -> rôle de trésorerie
PAYMENT_ROLE = {
    'cash': 'cash', 'other': 'cash',
    'mobile_money': 'mobile_money', 'orange_money': 'mobile_money', 'mtn_momo': 'mobile_money', 'wave': 'mobile_money',
    'bank_transfer': 'bank', 'check': 'bank', 'credit_card': 'bank', 'paypal': 'bank',
}


def org_standard(organization):
    """Référentiel de l'organisation ; vide = plan historique Procura."""
    try:
        std = organization.settings.accounting_standard
    except Exception:
        std = ''
    return std if std in CHARTS else LEGACY


def role_code(standard, role):
    """Numéro de compte d'un rôle dans un référentiel (avec replis), ou None."""
    seen = set()
    while role and role not in seen:
        seen.add(role)
        for code, _n, _t, r in CHARTS.get(standard, CHARTS[LEGACY]):
            if r == role:
                return code
        role = FALLBACK.get(role)
    return None


def account_for_role(organization, role):
    """Compte actif de l'organisation pour un rôle, ou None (le plan n'est pas installé)."""
    from .models import Account
    code = role_code(org_standard(organization), role)
    if not code:
        return None
    return Account.objects.filter(organization=organization, code=code, is_active=True).first()


def install_chart(organization, standard):
    """Crée les comptes et journaux du référentiel (idempotent, n'écrase rien)."""
    from .models import Account, AccountingJournal
    created = 0
    for code, name, atype, _role in CHARTS[standard]:
        _, new = Account.objects.get_or_create(
            organization=organization, code=code,
            defaults={'name': name, 'account_type': atype, 'is_active': True, 'is_system': False},
        )
        created += int(new)
    for code, name, jtype in JOURNALS:
        AccountingJournal.objects.get_or_create(
            organization=organization, code=code, defaults={'name': name, 'journal_type': jtype, 'is_active': True})
    return created


# ------------------------------------------------------------------ passage d'un plan à un autre

def plan_switch(organization, target):
    """
    Ce que ferait le passage au référentiel `target` : pour chaque compte existant qui a un rôle,
    son nouveau numéro. Les écritures restent attachées aux mêmes comptes (seuls code et intitulé
    changent), donc l'historique est conservé et toujours équilibré.
    """
    from .models import Account
    current = org_standard(organization)
    role_of = {code: role for code, _n, _t, role in CHARTS[current] if role}
    target_names = {code: name for code, name, _t, _r in CHARTS[target]}
    existing = {a.code: a for a in Account.objects.filter(organization=organization)}

    renames, used = [], set()
    for code, acc in existing.items():
        role = role_of.get(code)
        new_code = role_code(target, role) if role else None
        if not new_code or new_code == code or new_code in used:
            continue
        used.add(new_code)
        renames.append({'id': str(acc.pk), 'from': code, 'to': new_code, 'name': target_names[new_code], 'old_name': acc.name})

    # Comptes de l'ancien plan qui occupent un numéro du nouveau plan sans y correspondre :
    # on les met de côté (préfixe X, intitulé conservé) pour qu'aucun rôle ne pointe sur le mauvais compte.
    renamed_ids = {r['id'] for r in renames}
    moves = []
    for code in target_names:
        acc = existing.get(code)
        if acc and str(acc.pk) not in renamed_ids and (code in used or role_of.get(code) != _role_in(target, code)):
            moves.append({'id': str(acc.pk), 'from': code, 'to': f'X{code}', 'name': f'{acc.name} (ancien plan)'})
    return {'current': current, 'target': target, 'renames': renames, 'moves': moves}


def _role_in(standard, code):
    return next((r for c, _n, _t, r in CHARTS[standard] if c == code), None)


def apply_switch(organization, target):
    """Recode les comptes à rôle, installe les comptes manquants du nouveau plan, enregistre le référentiel."""
    from django.db import transaction
    from .models import Account
    plan = plan_switch(organization, target)
    with transaction.atomic():
        # deux passes (codes temporaires) pour éviter les collisions d'unicité pendant le recodage
        changes = plan['moves'] + plan['renames']
        for r in changes:
            Account.objects.filter(pk=r['id']).update(code=f"tmp-{r['id'][:8]}")
        for r in changes:
            Account.objects.filter(pk=r['id']).update(code=r['to'], name=r['name'])
        install_chart(organization, target)
        reglages = organization.settings
        reglages.accounting_standard = target
        reglages.save(update_fields=['accounting_standard'])
    return plan


# ------------------------------------------------------------------ soldes intermédiaires de gestion

SIG_BUCKETS = ['ca', 'achats', 'services', 'personnel', 'autres', 'dotations', 'fin_ch', 'fin_pr', 'exc_ch', 'exc_pr']

_LEGACY_SIG = {
    '6100': 'achats', '6200': 'achats', '6300': 'services', '6400': 'personnel', '6500': 'services',
    '6600': 'services', '6700': 'services', '6800': 'services', '6900': 'autres',
}
_ROLE_SIG = {
    'exp_goods': 'achats', 'exp_supplies': 'achats', 'exp_utilities': 'services', 'exp_office': 'services',
    'exp_rent': 'services', 'exp_repairs': 'services', 'exp_insurance': 'services', 'exp_advertising': 'services',
    'exp_fees': 'services', 'exp_telecom': 'services', 'exp_transport': 'services', 'exp_bank_fees': 'services',
    'exp_salaries': 'personnel', 'exp_social': 'personnel', 'exp_taxes': 'personnel',
    'exp_depreciation': 'dotations', 'exp_interest': 'fin_ch', 'exp_other': 'autres',
}


def sig_bucket(standard, code, account_type):
    """Rubrique des soldes intermédiaires de gestion pour un compte de charge ou de produit."""
    code = str(code)
    if standard in ('pcg', 'syscohada'):
        if account_type == 'revenue':
            if standard == 'pcg':
                return 'fin_pr' if code.startswith('76') else 'exc_pr' if code.startswith('77') else 'ca'
            # SYSCOHADA : 77 revenus financiers, 8x hors activités ordinaires
            return 'fin_pr' if code.startswith('77') else 'exc_pr' if code.startswith('8') else 'ca'
        if standard == 'pcg':
            for prefixes, bucket in ((('60',), 'achats'), (('61', '62'), 'services'), (('63', '64'), 'personnel'),
                                     (('65',), 'autres'), (('68',), 'dotations'), (('66',), 'fin_ch'), (('67',), 'exc_ch')):
                if code.startswith(prefixes):
                    return bucket
            return 'autres'
        # SYSCOHADA : 60 achats, 61-63 services extérieurs, 64 impôts, 66 personnel, 65 autres, 67 financier, 68/69 dotations, 8x HAO
        for prefixes, bucket in ((('60',), 'achats'), (('61', '62', '63'), 'services'), (('64', '66'), 'personnel'),
                                 (('65',), 'autres'), (('68', '69'), 'dotations'), (('67',), 'fin_ch'), (('8',), 'exc_ch')):
            if code.startswith(prefixes):
                return bucket
        return 'autres'
    if account_type == 'revenue':
        return 'ca'
    if standard == LEGACY:
        return _LEGACY_SIG.get(code, 'autres')
    role = next((r for c, _n, _t, r in CHARTS.get(standard, []) if c == code), None)
    return _ROLE_SIG.get(role, 'autres')


def split_amount(total, ratio):
    """Coupe `total` en deux parts (ratio, reste) arrondies au centime, la somme restant exacte."""
    total = Decimal(total or 0)
    first = (total * Decimal(str(ratio))).quantize(Decimal('0.01'))
    return first, total - first
