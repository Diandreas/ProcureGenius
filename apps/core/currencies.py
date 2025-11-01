"""
Currency configuration for ProcureGenius
Comprehensive list of 35+ currencies including FCFA and major world currencies
"""

# Currency choices for models
CURRENCY_CHOICES = [
    # Major Currencies
    ('EUR', 'Euro (€)'),
    ('USD', 'US Dollar ($)'),
    ('GBP', 'British Pound (£)'),
    ('CAD', 'Canadian Dollar (C$)'),
    ('CHF', 'Swiss Franc (CHF)'),
    ('JPY', 'Japanese Yen (¥)'),
    ('CNY', 'Chinese Yuan (¥)'),
    ('AUD', 'Australian Dollar (A$)'),
    ('NZD', 'New Zealand Dollar (NZ$)'),

    # African Francophone (CFA Franc)
    ('XOF', 'CFA Franc BCEAO (FCFA)'),  # West African CFA franc
    ('XAF', 'CFA Franc BEAC (FCFA)'),   # Central African CFA franc

    # African Francophone (Other)
    ('MAD', 'Moroccan Dirham (DH)'),
    ('TND', 'Tunisian Dinar (TND)'),
    ('DZD', 'Algerian Dinar (DZD)'),
    ('MRU', 'Mauritanian Ouguiya (UM)'),
    ('KMF', 'Comorian Franc (CF)'),

    # African Anglophone
    ('ZAR', 'South African Rand (R)'),
    ('NGN', 'Nigerian Naira (₦)'),
    ('KES', 'Kenyan Shilling (KSh)'),
    ('GHS', 'Ghanaian Cedi (GH₵)'),
    ('UGX', 'Ugandan Shilling (USh)'),
    ('TZS', 'Tanzanian Shilling (TSh)'),
    ('EGP', 'Egyptian Pound (E£)'),
    ('ETB', 'Ethiopian Birr (Br)'),
    ('ZMW', 'Zambian Kwacha (ZK)'),
    ('BWP', 'Botswana Pula (P)'),

    # Middle East
    ('AED', 'UAE Dirham (AED)'),
    ('SAR', 'Saudi Riyal (SR)'),
    ('QAR', 'Qatari Riyal (QR)'),
    ('ILS', 'Israeli Shekel (₪)'),
    ('TRY', 'Turkish Lira (₺)'),

    # Asia
    ('INR', 'Indian Rupee (₹)'),
    ('SGD', 'Singapore Dollar (S$)'),
    ('HKD', 'Hong Kong Dollar (HK$)'),
    ('MYR', 'Malaysian Ringgit (RM)'),
    ('THB', 'Thai Baht (฿)'),
    ('PHP', 'Philippine Peso (₱)'),

    # Latin America
    ('BRL', 'Brazilian Real (R$)'),
    ('MXN', 'Mexican Peso (MX$)'),
    ('ARS', 'Argentine Peso (AR$)'),
    ('CLP', 'Chilean Peso (CL$)'),
]

# Currency symbols for display
CURRENCY_SYMBOLS = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'CAD': 'C$',
    'CHF': 'CHF',
    'JPY': '¥',
    'CNY': '¥',
    'AUD': 'A$',
    'NZD': 'NZ$',
    'XOF': 'FCFA',
    'XAF': 'FCFA',
    'MAD': 'DH',
    'TND': 'TND',
    'DZD': 'DZD',
    'MRU': 'UM',
    'KMF': 'CF',
    'ZAR': 'R',
    'NGN': '₦',
    'KES': 'KSh',
    'GHS': 'GH₵',
    'UGX': 'USh',
    'TZS': 'TSh',
    'EGP': 'E£',
    'ETB': 'Br',
    'ZMW': 'ZK',
    'BWP': 'P',
    'AED': 'AED',
    'SAR': 'SR',
    'QAR': 'QR',
    'ILS': '₪',
    'TRY': '₺',
    'INR': '₹',
    'SGD': 'S$',
    'HKD': 'HK$',
    'MYR': 'RM',
    'THB': '฿',
    'PHP': '₱',
    'BRL': 'R$',
    'MXN': 'MX$',
    'ARS': 'AR$',
    'CLP': 'CL$',
}

# Currency display names
CURRENCY_NAMES = {
    'EUR': 'Euro',
    'USD': 'US Dollar',
    'GBP': 'British Pound',
    'CAD': 'Canadian Dollar',
    'CHF': 'Swiss Franc',
    'JPY': 'Japanese Yen',
    'CNY': 'Chinese Yuan',
    'AUD': 'Australian Dollar',
    'NZD': 'New Zealand Dollar',
    'XOF': 'CFA Franc BCEAO',
    'XAF': 'CFA Franc BEAC',
    'MAD': 'Moroccan Dirham',
    'TND': 'Tunisian Dinar',
    'DZD': 'Algerian Dinar',
    'MRU': 'Mauritanian Ouguiya',
    'KMF': 'Comorian Franc',
    'ZAR': 'South African Rand',
    'NGN': 'Nigerian Naira',
    'KES': 'Kenyan Shilling',
    'GHS': 'Ghanaian Cedi',
    'UGX': 'Ugandan Shilling',
    'TZS': 'Tanzanian Shilling',
    'EGP': 'Egyptian Pound',
    'ETB': 'Ethiopian Birr',
    'ZMW': 'Zambian Kwacha',
    'BWP': 'Botswana Pula',
    'AED': 'UAE Dirham',
    'SAR': 'Saudi Riyal',
    'QAR': 'Qatari Riyal',
    'ILS': 'Israeli Shekel',
    'TRY': 'Turkish Lira',
    'INR': 'Indian Rupee',
    'SGD': 'Singapore Dollar',
    'HKD': 'Hong Kong Dollar',
    'MYR': 'Malaysian Ringgit',
    'THB': 'Thai Baht',
    'PHP': 'Philippine Peso',
    'BRL': 'Brazilian Real',
    'MXN': 'Mexican Peso',
    'ARS': 'Argentine Peso',
    'CLP': 'Chilean Peso',
}

# Currencies that don't use decimal places (0 decimal digits)
ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND', 'CLP', 'XOF', 'XAF', 'KMF', 'UGX']

# Symbol position (before or after amount)
SYMBOL_POSITION = {
    'EUR': 'after',   # 100,00 €
    'USD': 'before',  # $100.00
    'GBP': 'before',  # £100.00
    'CAD': 'before',  # C$100.00
    'CHF': 'after',   # 100.00 CHF
    'JPY': 'before',  # ¥100
    'CNY': 'before',  # ¥100.00
    'XOF': 'after',   # 100 FCFA
    'XAF': 'after',   # 100 FCFA
    'MAD': 'after',   # 100,00 DH
    'TND': 'after',   # 100,000 TND
    'DZD': 'after',   # 100,00 DZD
    'ZAR': 'before',  # R100.00
    'NGN': 'before',  # ₦100.00
    'KES': 'before',  # KSh100.00
    'GHS': 'before',  # GH₵100.00
}

# Default to 'before' if not specified
def get_symbol_position(currency_code):
    """Get symbol position for a currency"""
    return SYMBOL_POSITION.get(currency_code, 'before')

# Decimal separator and thousands separator by currency
CURRENCY_FORMATS = {
    'EUR': {'decimal': ',', 'thousands': '.'},   # 1.234,56 €
    'USD': {'decimal': '.', 'thousands': ','},   # $1,234.56
    'GBP': {'decimal': '.', 'thousands': ','},   # £1,234.56
    'XOF': {'decimal': ',', 'thousands': ' '},   # 1 234 FCFA
    'XAF': {'decimal': ',', 'thousands': ' '},   # 1 234 FCFA
    'MAD': {'decimal': ',', 'thousands': ' '},   # 1 234,56 DH
    'TND': {'decimal': ',', 'thousands': ' '},   # 1 234,567 TND
    'CHF': {'decimal': '.', 'thousands': "'"},   # 1'234.56 CHF
}

def get_currency_format(currency_code):
    """Get decimal and thousands separators for a currency"""
    return CURRENCY_FORMATS.get(currency_code, {'decimal': '.', 'thousands': ','})

def format_currency(amount, currency_code):
    """
    Format amount with currency symbol and proper separators

    Args:
        amount (float): Amount to format
        currency_code (str): ISO currency code

    Returns:
        str: Formatted currency string (e.g., "1,234.56 €", "$1,234.56")
    """
    # Get currency info
    symbol = CURRENCY_SYMBOLS.get(currency_code, currency_code)
    position = get_symbol_position(currency_code)
    fmt = get_currency_format(currency_code)

    # Determine decimal places
    if currency_code in ZERO_DECIMAL_CURRENCIES:
        decimals = 0
        formatted_amount = f"{int(amount):,}"
    else:
        decimals = 2
        formatted_amount = f"{amount:,.{decimals}f}"

    # Replace separators based on currency format
    if fmt['thousands'] != ',':
        # Replace default separators
        parts = formatted_amount.split('.')
        integer_part = parts[0].replace(',', fmt['thousands'])
        if len(parts) > 1:
            formatted_amount = integer_part + fmt['decimal'] + parts[1]
        else:
            formatted_amount = integer_part

    # Add currency symbol
    if position == 'after':
        return f"{formatted_amount} {symbol}"
    else:
        return f"{symbol}{formatted_amount}"

def get_currency_info(currency_code):
    """
    Get complete currency information

    Returns:
        dict: Currency info including symbol, name, format settings
    """
    return {
        'code': currency_code,
        'symbol': CURRENCY_SYMBOLS.get(currency_code, currency_code),
        'name': CURRENCY_NAMES.get(currency_code, currency_code),
        'decimals': 0 if currency_code in ZERO_DECIMAL_CURRENCIES else 2,
        'position': get_symbol_position(currency_code),
        'format': get_currency_format(currency_code),
    }
