"""
Réglages par pays : devise, taux de TVA standard, fuseau horaire, région fiscale et norme comptable.

Source unique utilisée par l'onboarding (pré-remplissage), l'API des paramètres de l'organisation
et la création des enregistrements (facture, contrat…) quand aucune devise n'est fournie.
Les taux sont les taux standard en vigueur ; l'organisation peut toujours les modifier.
"""

# code ISO -> (nom, devise, TVA %, fuseau, région fiscale, plan comptable)
# plan comptable : 'syscohada' (OHADA), 'pcg' (France / Europe francophone), 'us_gaap', 'ca'
COUNTRIES = {
    # CEMAC (franc CFA BEAC, XAF)
    'CM': ('Cameroun', 'XAF', 19.25, 'Africa/Douala', 'cameroon', 'syscohada'),
    'GA': ('Gabon', 'XAF', 18.0, 'Africa/Libreville', 'ohada', 'syscohada'),
    'CG': ('Congo', 'XAF', 18.9, 'Africa/Brazzaville', 'ohada', 'syscohada'),
    'TD': ('Tchad', 'XAF', 18.0, 'Africa/Ndjamena', 'ohada', 'syscohada'),
    'CF': ('Centrafrique', 'XAF', 19.0, 'Africa/Bangui', 'ohada', 'syscohada'),
    'GQ': ('Guinée équatoriale', 'XAF', 15.0, 'Africa/Malabo', 'ohada', 'syscohada'),
    # UEMOA (franc CFA BCEAO, XOF)
    'CI': ("Côte d'Ivoire", 'XOF', 18.0, 'Africa/Abidjan', 'ohada', 'syscohada'),
    'SN': ('Sénégal', 'XOF', 18.0, 'Africa/Dakar', 'ohada', 'syscohada'),
    'BJ': ('Bénin', 'XOF', 18.0, 'Africa/Porto-Novo', 'ohada', 'syscohada'),
    'BF': ('Burkina Faso', 'XOF', 18.0, 'Africa/Ouagadougou', 'ohada', 'syscohada'),
    'ML': ('Mali', 'XOF', 18.0, 'Africa/Bamako', 'ohada', 'syscohada'),
    'NE': ('Niger', 'XOF', 19.0, 'Africa/Niamey', 'ohada', 'syscohada'),
    'TG': ('Togo', 'XOF', 18.0, 'Africa/Lome', 'ohada', 'syscohada'),
    'GW': ('Guinée-Bissau', 'XOF', 19.0, 'Africa/Bissau', 'ohada', 'syscohada'),
    # Autres pays OHADA
    'GN': ('Guinée', 'GNF', 18.0, 'Africa/Conakry', 'ohada', 'syscohada'),
    'CD': ('RD Congo', 'CDF', 16.0, 'Africa/Kinshasa', 'ohada', 'syscohada'),
    'KM': ('Comores', 'KMF', 10.0, 'Indian/Comoro', 'ohada', 'syscohada'),
    # Maghreb (plan proche du PCG)
    'MA': ('Maroc', 'MAD', 20.0, 'Africa/Casablanca', 'international', 'pcg'),
    'TN': ('Tunisie', 'TND', 19.0, 'Africa/Tunis', 'international', 'pcg'),
    'DZ': ('Algérie', 'DZD', 19.0, 'Africa/Algiers', 'international', 'pcg'),
    # Europe
    'FR': ('France', 'EUR', 20.0, 'Europe/Paris', 'eu', 'pcg'),
    'BE': ('Belgique', 'EUR', 21.0, 'Europe/Brussels', 'eu', 'pcg'),
    'LU': ('Luxembourg', 'EUR', 17.0, 'Europe/Luxembourg', 'eu', 'pcg'),
    'CH': ('Suisse', 'CHF', 8.1, 'Europe/Zurich', 'eu', 'pcg'),
    # Amérique du Nord
    'US': ('États-Unis', 'USD', 0.0, 'America/New_York', 'usa', 'us_gaap'),
    'CA': ('Canada', 'CAD', 5.0, 'America/Toronto', 'canada', 'ca'),
}

DEFAULT_COUNTRY = 'CM'

ACCOUNTING_STANDARDS = {
    'syscohada': 'SYSCOHADA (OHADA)',
    'pcg': 'Plan comptable général (France / Europe)',
    'us_gaap': 'US GAAP (États-Unis)',
    'ca': 'Canada (ASPE)',
}


def country_profile(code):
    """Réglages d'un pays, ou None si le code est inconnu."""
    row = COUNTRIES.get((code or '').upper())
    if not row:
        return None
    name, currency, vat, tz, region, chart = row
    return {
        'code': code.upper(), 'name': name, 'currency': currency, 'vat_rate': vat,
        'timezone': tz, 'tax_region': region, 'accounting_standard': chart,
    }


def country_choices():
    return [(code, row[0]) for code, row in sorted(COUNTRIES.items(), key=lambda kv: kv[1][0])]


def org_currency(organization, fallback='XAF'):
    """Devise par défaut de l'organisation (paramètres), sinon `fallback`."""
    if organization is None:
        return fallback
    try:
        cur = organization.settings.default_currency
    except Exception:
        cur = None
    return cur or fallback


def org_tax_rate(organization, fallback=0):
    try:
        return organization.settings.default_tax_rate
    except Exception:
        return fallback
