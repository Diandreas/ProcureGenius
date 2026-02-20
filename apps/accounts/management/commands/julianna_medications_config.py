"""
Medication configuration for Centre de Santé JULIANNA
Complete medication catalog with pricing, stock levels, and batch information
"""

from decimal import Decimal
from datetime import date


# Pricing multipliers for calculating selling price from cost
PRICING_MULTIPLIERS = {
    'Antalgiques et Antipyrétiques': Decimal('1.4'),  # 40% markup
    'Antibiotiques': Decimal('1.5'),  # 50% markup
    'Antiacides et Digestifs': Decimal('1.45'),
    'Laxatifs': Decimal('1.4'),
    'Antispasmodiques': Decimal('1.45'),
    'Inhibiteurs de la pompe à protons': Decimal('1.5'),
    'Corticoïdes': Decimal('1.55'),
    'Suppléments ferreux': Decimal('1.4'),
    'Antihypertenseurs': Decimal('1.5'),
    'Antiseptiques et Désinfectants': Decimal('1.3'),
    'default': Decimal('1.45'),
}

# Estimated cost prices in FCFA (based on Cameroon pharmaceutical market)
MEDICATION_COSTS = {
    # Analgesics
    'Paracétamol 500mg': 500,
    'Paracétamol 1000mg': 800,
    'Doliprane': 600,
    'Ibuprofène 400mg': 800,
    'Paracétamol codéiné': 1200,
    'Dafalgan codéine': 1500,

    # Antibiotics
    'Amoxicilline 500mg': 1500,
    'Amoxicilline 1g': 2000,
    'Amoxiciline - Clamoxyl': 2500,
    'Ciprofloxacine 500mg': 2000,
    'Azithromycine': 3000,

    # Gastrointestinal
    'Omeprazole': 1500,
    'Esoméprazole': 1800,
    'Spasfon': 1200,
    'Gaviscon': 2000,
    'Alginate de sodium': 1500,
    'Meteospasmyl': 1800,
    'Carbosylane': 1500,

    # Laxatives
    'Lactulose': 1200,
    'Macrogol': 1500,

    # Antimalarials
    'Coartem': 2500,
    'Artemether': 2000,

    # Supplements
    'Tardyferon': 2500,
    'Acide folique': 800,
    'Vitamine C': 500,

    # Cardiovascular
    'Coveram': 5000,
    'Amlodipine': 2000,

    # Respiratory
    'Helicidine': 1800,
    'Tixocortol': 1500,

    # Antiseptics
    'Betadine': 2000,
    'Dakin': 1200,
    'Chlorhexidine': 1500,
    'Eau oxygénée': 500,
    'Alcool': 800,

    # Topical
    'Locoïd': 2500,
    'Econazole': 1800,
    'Diclofénac': 2000,

    # Other
    'Contraceptive pills': 1500,
    'Levothyrox': 3000,
    'Nicopatch': 8000,
    'Gynositol Plus': 12000,
    'Laroxyl': 2500,
    'Lopéramide': 1000,
    'Acide borique': 800,
    'Monosept': 1200,
}

# Stock level templates (monthly consumption estimates)
STOCK_LEVELS = {
    'very_high': {'initial': 200, 'min_threshold': 30},  # High-rotation items
    'high': {'initial': 100, 'min_threshold': 20},
    'medium': {'initial': 50, 'min_threshold': 10},
    'low': {'initial': 20, 'min_threshold': 5},
}

# High-rotation medications (commonly prescribed)
HIGH_ROTATION_MEDS = [
    'Paracétamol', 'Doliprane', 'Amoxicilline', 'Ibuprofène',
    'Spasfon', 'Omeprazole', 'Gaviscon', 'Alginate',
]

# Medium-rotation medications
MEDIUM_ROTATION_MEDS = [
    'Ciprofloxacine', 'Metronidazole', 'Betadine', 'Chlorhexidine',
    'Lactulose', 'Tardyferon', 'Coartem', 'Helicidine',
]


def get_medication_cost(medication_name):
    """
    Get estimated cost price for a medication
    Uses fuzzy matching to find closest match
    """
    # Try exact match first
    if medication_name in MEDICATION_COSTS:
        return MEDICATION_COSTS[medication_name]

    # Try partial match
    name_lower = medication_name.lower()
    for key, cost in MEDICATION_COSTS.items():
        if key.lower() in name_lower or name_lower in key.lower():
            return cost

    # Default cost based on category
    if any(keyword in name_lower for keyword in ['paracétamol', 'doliprane', 'dafalgan']):
        return 600
    elif 'amox' in name_lower:
        return 1800
    elif any(keyword in name_lower for keyword in ['gaviscon', 'omeprazole', 'spasfon']):
        return 1500
    elif 'antibiotic' in name_lower or 'cilline' in name_lower:
        return 2000
    elif any(keyword in name_lower for keyword in ['betadine', 'dakin', 'chlorhexidine']):
        return 1500
    else:
        return 1000  # Default


def get_selling_price(cost_price, category):
    """Calculate selling price based on cost and category"""
    multiplier = PRICING_MULTIPLIERS.get(category, PRICING_MULTIPLIERS['default'])
    return int(cost_price * multiplier)


def get_stock_levels(medication_name):
    """Determine appropriate stock levels based on medication popularity"""
    name_lower = medication_name.lower()

    # Check if high-rotation
    if any(high_med.lower() in name_lower for high_med in HIGH_ROTATION_MEDS):
        return STOCK_LEVELS['very_high']

    # Check if medium-rotation
    if any(med_med.lower() in name_lower for med_med in MEDIUM_ROTATION_MEDS):
        return STOCK_LEVELS['medium']

    # Check if low-rotation (specialized medications)
    if any(keyword in name_lower for keyword in ['nicopatch', 'gynositol', 'levothyrox', 'laroxyl']):
        return STOCK_LEVELS['low']

    # Default to medium
    return STOCK_LEVELS['medium']


def generate_batch_numbers(medication_name, num_batches=3):
    """
    Generate realistic batch numbers for a medication
    Format: LOT-YYYY-MM-XXX
    """
    from datetime import datetime

    batches = []
    base_year = 2024

    for i in range(num_batches):
        year = base_year + i
        month = ((hash(medication_name) % 12) + 1 + i) % 12 + 1
        batch_num = f"LOT-{year}-{month:02d}-{hash(medication_name + str(i)) % 900 + 100:03d}"
        batches.append(batch_num)

    return batches


def enrich_medication_data(parsed_medications):
    """
    Enrich parsed medication data with pricing, stock, and reference codes

    Args:
        parsed_medications: List of medications from MedicamentParser

    Returns:
        List of enriched medication dictionaries
    """
    enriched = []

    for i, med in enumerate(parsed_medications, 1):
        base_name = med.get('base_name')
        unit = med.get('unit')
        category = med.get('category', 'Médicaments Généraux')

        # Calculate costs and prices
        cost_price = get_medication_cost(base_name)
        selling_price = get_selling_price(cost_price, category)

        # Determine stock levels
        stock_info = get_stock_levels(base_name)

        # Generate product reference code
        # Format: JUL-MED-{CATEGORY_ABBREV}-{SEQ}
        category_abbrev = ''.join([word[0].upper() for word in category.split()[:2]])
        if len(category_abbrev) < 2:
            category_abbrev = category[:3].upper()

        reference = f"JUL-MED-{category_abbrev}-{i:04d}"

        # Enrich batches with quantities
        if med['batches']:
            # Distribute total quantity across batches
            total_qty = stock_info['initial']
            num_batches = len(med['batches'])

            for i, batch in enumerate(med['batches']):
                # Distribute quantity: older batches have less (already consumed)
                if i == 0:
                    batch['quantity'] = int(total_qty * 0.2)  # 20% remaining in oldest
                elif i == 1:
                    batch['quantity'] = int(total_qty * 0.3)  # 30% in middle
                else:
                    batch['quantity'] = int(total_qty * 0.5)  # 50% in newest

            # Adjust total to match
            med['total_quantity'] = sum(b['quantity'] for b in med['batches'])
        else:
            med['total_quantity'] = stock_info['initial']

        enriched_med = {
            'reference': reference,
            'name': med['name'],
            'base_name': base_name,
            'unit': med['unit'],
            'manufacturer': med['manufacturer'],
            'category': med['category'],
            'treatment_type': med['treatment_type'],
            'person_type': med['person_type'],
            'cost_price': cost_price,
            'selling_price': selling_price,
            'initial_stock': med['total_quantity'],
            'min_stock_threshold': stock_info['min_threshold'],
            'batches': med['batches'],
        }

        enriched.append(enriched_med)

    return enriched


# =============================================================================
# CATALOGUE RÉEL DES MÉDICAMENTS - Centre de Santé JULIANNA
# Source : inventaire physique du centre (Février 2026)
# Format : { name, reference, category, sell_unit, weight, batches: [{number, expiry, qty}] }
# Le prix de vente et le coût sont calculés automatiquement via get_medication_cost/get_selling_price
# =============================================================================

REAL_MEDICATIONS = [
    # ── ANTALGIQUES & ANTIPYRÉTIQUES ─────────────────────────────────────────
    {
        'name': 'PARACETAMOL BIOGARAN 500mg',
        'base_name': 'Paracétamol 500mg',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '500mg',
        'batches': [
            {'number': 'LOT-2024-BIO-001', 'expiry': date(2027, 12, 31), 'qty': 8},
            {'number': 'LOT-2023-BIO-002', 'expiry': date(2026, 6, 30), 'qty': 4},
        ],
    },
    {
        'name': 'PARACETAMOL BIOGARAN 1g',
        'base_name': 'Paracétamol 1000mg',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '1g',
        'batches': [
            {'number': 'LOT-2025-BIO-003', 'expiry': date(2027, 12, 31), 'qty': 53},
            {'number': 'LOT-2025-BIO-004', 'expiry': date(2028, 6, 30), 'qty': 18},
        ],
    },
    {
        'name': 'PARACETAMOL VIATRIS 1000mg',
        'base_name': 'Paracétamol 1000mg',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '1000mg',
        'batches': [
            {'number': 'LOT-2024-VIA-001', 'expiry': date(2026, 12, 31), 'qty': 2},
        ],
    },
    {
        'name': 'PARACETAMOL/CODÉINE BIOGARAN 500mg/30mg',
        'base_name': 'Paracétamol codéiné',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '500mg/30mg',
        'batches': [
            {'number': 'LOT-2024-BIO-010', 'expiry': date(2027, 12, 31), 'qty': 3},
            {'number': 'LOT-2025-BIO-011', 'expiry': date(2029, 6, 30), 'qty': 29},
        ],
    },
    {
        'name': 'DOLIPRANE Paracétamol 1000mg',
        'base_name': 'Doliprane',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '1000mg',
        'batches': [
            {'number': 'LOT-2025-DOL-001', 'expiry': date(2028, 12, 31), 'qty': 39},
            {'number': 'LOT-2024-DOL-002', 'expiry': date(2026, 6, 30), 'qty': 6},
        ],
    },
    {
        'name': 'DOLIPRANE Paracétamol 300mg',
        'base_name': 'Doliprane',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '300mg',
        'batches': [
            {'number': 'LOT-2024-DOL-010', 'expiry': date(2026, 6, 30), 'qty': 4},
        ],
    },
    {
        'name': 'DOLIPRANE Paracétamol 200mg',
        'base_name': 'Doliprane',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '200mg',
        'batches': [
            {'number': 'LOT-2024-DOL-020', 'expiry': date(2026, 6, 30), 'qty': 2},
        ],
    },
    {
        'name': 'DOLIPRANE Paracétamol effervescent 1000mg',
        'base_name': 'Doliprane',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '1000mg effervescent',
        'batches': [
            {'number': 'LOT-2024-DOL-030', 'expiry': date(2026, 12, 31), 'qty': 1},
        ],
    },
    {
        'name': 'DOLIPRANE suspension buvable 2,4%',
        'base_name': 'Doliprane',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'flacon',
        'weight': '2.4%',
        'batches': [
            {'number': 'LOT-2024-DOL-040', 'expiry': date(2026, 6, 30), 'qty': 4},
        ],
    },
    {
        'name': 'DAFALGAN CODÉINE',
        'base_name': 'Dafalgan codéine',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '500mg/30mg',
        'batches': [
            {'number': 'LOT-2024-DAF-001', 'expiry': date(2026, 6, 30), 'qty': 1},
        ],
    },
    {
        'name': 'IBUPROFÈNE BIOGARAN 200mg',
        'base_name': 'Ibuprofène 400mg',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'boite',
        'weight': '200mg',
        'batches': [
            {'number': 'LOT-2025-IBU-001', 'expiry': date(2028, 12, 31), 'qty': 1},
        ],
    },
    {
        'name': 'DICLOFÉNAC SANDOZ 1% gel',
        'base_name': 'Diclofénac',
        'category': 'Antalgiques et Antipyrétiques',
        'sell_unit': 'tube',
        'weight': '1%',
        'batches': [
            {'number': 'LOT-2025-DIC-001', 'expiry': date(2027, 12, 31), 'qty': 1},
        ],
    },

    # ── ANTIBIOTIQUES ─────────────────────────────────────────────────────────
    {
        'name': 'CLAMOXYL Amoxicilline 500mg',
        'base_name': 'Amoxicilline 500mg',
        'category': 'Antibiotiques',
        'sell_unit': 'boite',
        'weight': '500mg',
        'batches': [
            {'number': 'LOT-2025-CLM-001', 'expiry': date(2027, 12, 31), 'qty': 2},
        ],
    },
    {
        'name': 'AMOXICILLINE SANDOZ 1g',
        'base_name': 'Amoxicilline 1g',
        'category': 'Antibiotiques',
        'sell_unit': 'boite',
        'weight': '1g',
        'batches': [
            {'number': 'LOT-2025-AMX-001', 'expiry': date(2027, 12, 31), 'qty': 2},
        ],
    },

    # ── ANTISPASMODIQUES ──────────────────────────────────────────────────────
    {
        'name': 'SPASFON phloroglucinol/triméthylphloroglucinol 80mg',
        'base_name': 'Spasfon',
        'category': 'Antispasmodiques',
        'sell_unit': 'boite',
        'weight': '30 comprimés enrobés',
        'batches': [
            {'number': 'LOT-2025-SPA-001', 'expiry': date(2030, 12, 31), 'qty': 1},
            {'number': 'LOT-2024-SPA-002', 'expiry': date(2028, 6, 30), 'qty': 1},
        ],
    },
    {
        'name': 'SPASFON-LYOC phloroglucinol 80mg lyophilisat',
        'base_name': 'Spasfon',
        'category': 'Antispasmodiques',
        'sell_unit': 'boite',
        'weight': '80mg',
        'batches': [
            {'number': 'LOT-2024-SPA-010', 'expiry': date(2026, 6, 30), 'qty': 1},
        ],
    },
    {
        'name': 'PHLOROGLUCINOL BGR 80mg',
        'base_name': 'Spasfon',
        'category': 'Antispasmodiques',
        'sell_unit': 'boite',
        'weight': '80mg',
        'batches': [
            {'number': 'LOT-2024-PHG-001', 'expiry': date(2026, 6, 30), 'qty': 1},
        ],
    },
    {
        'name': 'METEOSPASMYL',
        'base_name': 'Meteospasmyl',
        'category': 'Antispasmodiques',
        'sell_unit': 'boite',
        'weight': '',
        'batches': [
            {'number': 'LOT-2024-MET-001', 'expiry': date(2026, 6, 30), 'qty': 2},
        ],
    },

    # ── ANTIACIDES & DIGESTIFS ────────────────────────────────────────────────
    {
        'name': 'ESOMÉPRAZOLE BIOGARAN 20mg',
        'base_name': 'Esoméprazole',
        'category': 'Inhibiteurs de la pompe à protons',
        'sell_unit': 'boite',
        'weight': '20mg',
        'batches': [
            {'number': 'LOT-2024-ESO-001', 'expiry': date(2026, 6, 30), 'qty': 2},
        ],
    },
    {
        'name': 'GAVISCON sachets 10ml',
        'base_name': 'Gaviscon',
        'category': 'Antiacides et Digestifs',
        'sell_unit': 'boite',
        'weight': '24 sachets de 10ml',
        'batches': [
            {'number': 'LOT-2024-GAV-001', 'expiry': date(2026, 6, 30), 'qty': 1},
            {'number': 'LOT-2025-GAV-002', 'expiry': date(2027, 12, 31), 'qty': 2},
        ],
    },
    {
        'name': 'ALGINATE DE SODIUM / BICARBONATE Sandoz',
        'base_name': 'Alginate de sodium',
        'category': 'Antiacides et Digestifs',
        'sell_unit': 'boite',
        'weight': '',
        'batches': [
            {'number': 'LOT-2025-ALG-001', 'expiry': date(2027, 12, 31), 'qty': 4},
            {'number': 'LOT-2025-ALG-002', 'expiry': date(2028, 12, 31), 'qty': 6},
        ],
    },
    {
        'name': 'ALGINATE DE SODIUM / BICARBONATE Arrow',
        'base_name': 'Alginate de sodium',
        'category': 'Antiacides et Digestifs',
        'sell_unit': 'boite',
        'weight': '',
        'batches': [
            {'number': 'LOT-2025-ALG-010', 'expiry': date(2027, 12, 31), 'qty': 3},
        ],
    },
    {
        'name': 'ALGINATE DE SODIUM / BICARBONATE Viatris',
        'base_name': 'Alginate de sodium',
        'category': 'Antiacides et Digestifs',
        'sell_unit': 'boite',
        'weight': '',
        'batches': [
            {'number': 'LOT-2025-ALG-020', 'expiry': date(2027, 12, 31), 'qty': 3},
            {'number': 'LOT-2024-ALG-021', 'expiry': date(2026, 6, 30), 'qty': 1},
            {'number': 'LOT-2026-ALG-022', 'expiry': date(2028, 12, 31), 'qty': 2},
        ],
    },
    {
        'name': 'ALGINATE DE SODIUM / BICARBONATE Cristers',
        'base_name': 'Alginate de sodium',
        'category': 'Antiacides et Digestifs',
        'sell_unit': 'boite',
        'weight': '',
        'batches': [
            {'number': 'LOT-2025-ALG-030', 'expiry': date(2028, 12, 31), 'qty': 6},
        ],
    },
    {
        'name': 'MACROGOL BIOGARAN 4g',
        'base_name': 'Omeprazole',  # prix référence similaire
        'category': 'Laxatifs',
        'sell_unit': 'boite',
        'weight': '4g',
        'batches': [
            {'number': 'LOT-2024-MAC-001', 'expiry': date(2026, 6, 30), 'qty': 1},
        ],
    },
    {
        'name': 'LACTULOSE VIATRIS 10g/15ml sachets',
        'base_name': 'Omeprazole',
        'category': 'Laxatifs',
        'sell_unit': 'boite',
        'weight': '20 sachets de 10g/15ml',
        'batches': [
            {'number': 'LOT-2024-LAC-001', 'expiry': date(2026, 6, 30), 'qty': 8},
        ],
    },
    {
        'name': 'LOPÉRAMIDE TEVA 2mg',
        'base_name': 'Omeprazole',
        'category': 'Antiacides et Digestifs',
        'sell_unit': 'boite',
        'weight': '2mg',
        'batches': [
            {'number': 'LOT-2025-LOP-001', 'expiry': date(2027, 12, 31), 'qty': 1},
        ],
    },
    {
        'name': 'CARBOSYLANE',
        'base_name': 'Carbosylane',
        'category': 'Antiacides et Digestifs',
        'sell_unit': 'boite',
        'weight': '',
        'batches': [
            {'number': 'LOT-2024-CAR-001', 'expiry': date(2026, 6, 30), 'qty': 1},
        ],
    },

    # ── CORTICOÏDES / DERMATOLOGIE ────────────────────────────────────────────
    {
        'name': 'TIXOCORTOL ZENTIVA suspension nasale',
        'base_name': 'Tixocortol',
        'category': 'Corticoïdes',
        'sell_unit': 'flacon',
        'weight': '',
        'batches': [
            {'number': 'LOT-2025-TIX-001', 'expiry': date(2027, 12, 31), 'qty': 2},
        ],
    },
    {
        'name': 'TIXOCORTOL TEVA 1% suspension nasale 10ml',
        'base_name': 'Tixocortol',
        'category': 'Corticoïdes',
        'sell_unit': 'flacon',
        'weight': '10ml',
        'batches': [
            {'number': 'LOT-2025-TIX-010', 'expiry': date(2027, 12, 31), 'qty': 1},
            {'number': 'LOT-2024-TIX-011', 'expiry': date(2026, 6, 30), 'qty': 1},
        ],
    },
    {
        'name': 'LOCOID POMMADE hydrocortisone 30g',
        'base_name': 'Tixocortol',
        'category': 'Corticoïdes',
        'sell_unit': 'tube',
        'weight': '30g',
        'batches': [
            {'number': 'LOT-2025-LOC-001', 'expiry': date(2028, 12, 31), 'qty': 1},
        ],
    },

    # ── SUPPLÉMENTS FERREUX / VITAMINES ──────────────────────────────────────
    {
        'name': 'TARDYFERON sulfate ferreux 50mg',
        'base_name': 'Tardyferon',
        'category': 'Suppléments ferreux',
        'sell_unit': 'boite',
        'weight': '50mg',
        'batches': [
            {'number': 'LOT-2025-TAR-001', 'expiry': date(2027, 12, 31), 'qty': 1},
            {'number': 'LOT-2025-TAR-002', 'expiry': date(2028, 12, 31), 'qty': 1},
        ],
    },
    {
        'name': 'TARDYFERON Fer 80mg',
        'base_name': 'Tardyferon',
        'category': 'Suppléments ferreux',
        'sell_unit': 'boite',
        'weight': '80mg',
        'batches': [
            {'number': 'LOT-2025-TAR-010', 'expiry': date(2028, 12, 31), 'qty': 1},
        ],
    },
    {
        'name': 'ACIDE FOLIQUE CCD 0,4mg',
        'base_name': 'Acide folique',
        'category': 'Suppléments ferreux',
        'sell_unit': 'boite',
        'weight': '0.4mg',
        'batches': [
            {'number': 'LOT-2025-FOL-001', 'expiry': date(2028, 12, 31), 'qty': 1},
        ],
    },
    {
        'name': 'GYNOSITOL PLUS postbiotique',
        'base_name': 'Acide folique',
        'category': 'Suppléments ferreux',
        'sell_unit': 'boite',
        'weight': '',
        'batches': [
            {'number': 'LOT-2025-GYN-001', 'expiry': date(2027, 12, 31), 'qty': 2},
        ],
    },

    # ── NEUROLOGIE / PSYCHIATRIE ──────────────────────────────────────────────
    {
        'name': 'LAROXYL amitriptyline 40mg/ml',
        'base_name': 'Amitriptyline',
        'category': 'Médicaments Généraux',
        'sell_unit': 'flacon',
        'weight': '40mg/ml',
        'batches': [
            {'number': 'LOT-2024-LAR-001', 'expiry': date(2026, 6, 30), 'qty': 2},
        ],
    },
    {
        'name': 'NICOPATCHLIB 21mg/24h patch',
        'base_name': 'Nicopatch',
        'category': 'Médicaments Généraux',
        'sell_unit': 'boite',
        'weight': '21mg/24h',
        'batches': [
            {'number': 'LOT-2025-NIC-001', 'expiry': date(2027, 12, 31), 'qty': 2},
        ],
    },

    # ── ORL / ANTISEPTIQUES ───────────────────────────────────────────────────
    {
        'name': 'MONO-SEPT solution',
        'base_name': 'Antiseptique buccal',
        'category': 'Antiseptiques et Désinfectants',
        'sell_unit': 'flacon',
        'weight': '',
        'batches': [
            {'number': 'LOT-2025-MON-001', 'expiry': date(2027, 12, 31), 'qty': 1},
        ],
    },
    {
        'name': 'BORAX / ACIDE BORIQUE BIOGARAN 12mg/18mg par ml',
        'base_name': 'Antiseptique buccal',
        'category': 'Antiseptiques et Désinfectants',
        'sell_unit': 'flacon',
        'weight': '12mg/18mg par ml',
        'batches': [
            {'number': 'LOT-2025-BOR-001', 'expiry': date(2027, 12, 31), 'qty': 5},
        ],
    },
]

# =============================================================================
# CONSOMMABLES MÉDICAUX (non médicaments, mais produits tracés)
# =============================================================================
MEDICAL_SUPPLIES = [
    {
        'name': 'BÉTADINE DERMIQUE 10%',
        'reference': 'CONS-BETA-DERM',
        'category': 'Antiseptiques et Désinfectants',
        'sell_unit': 'flacon',
        'selling_price': 3500,
        'cost_price': 2500,
        'initial_stock': 3,
        'min_stock_threshold': 2,
        'batches': [{'number': 'LOT-2025-BET-001', 'expiry': date(2027, 12, 31), 'qty': 3}],
    },
    {
        'name': 'BÉTADINE SCRUB 4%',
        'reference': 'CONS-BETA-SCRUB',
        'category': 'Antiseptiques et Désinfectants',
        'sell_unit': 'flacon',
        'selling_price': 4000,
        'cost_price': 2800,
        'initial_stock': 4,
        'min_stock_threshold': 2,
        'batches': [{'number': 'LOT-2024-BET-010', 'expiry': date(2026, 6, 30), 'qty': 4}],
    },
    {
        'name': 'BÉTADINE ALCOOLIQUE 5%',
        'reference': 'CONS-BETA-ALC',
        'category': 'Antiseptiques et Désinfectants',
        'sell_unit': 'flacon',
        'selling_price': 3500,
        'cost_price': 2500,
        'initial_stock': 4,
        'min_stock_threshold': 2,
        'batches': [{'number': 'LOT-2025-BET-020', 'expiry': date(2028, 12, 31), 'qty': 4}],
    },
    {
        'name': 'EAU OXYGÉNÉE STABILISÉE 10 VOLUMES GILBERT 250ml',
        'reference': 'CONS-EAU-OXY',
        'category': 'Antiseptiques et Désinfectants',
        'sell_unit': 'flacon',
        'selling_price': 1500,
        'cost_price': 800,
        'initial_stock': 1,
        'min_stock_threshold': 2,
        'batches': [{'number': 'LOT-2025-EAU-001', 'expiry': date(2028, 12, 31), 'qty': 1}],
    },
    {
        'name': 'COMPRESSES DE GAZE STÉRILES',
        'reference': 'CONS-COMPRESSE-S',
        'category': 'Consommables Médicaux',
        'sell_unit': 'sachet',
        'selling_price': 500,
        'cost_price': 200,
        'initial_stock': 2,
        'min_stock_threshold': 5,
        'batches': [],
    },
    {
        'name': 'COMPRESSES NON TISSÉES STÉRILES',
        'reference': 'CONS-COMPRESSE-NT',
        'category': 'Consommables Médicaux',
        'sell_unit': 'sachet',
        'selling_price': 500,
        'cost_price': 200,
        'initial_stock': 2,
        'min_stock_threshold': 5,
        'batches': [],
    },
]


def load_all_medications(parsed_data=None):
    """
    Load medications from REAL_MEDICATIONS (inventaire physique CSJ Février 2026).
    The parsed_data argument is kept for backward compatibility but is ignored.

    Returns:
        Dict with 'medications' and 'supplies' lists
    """
    medications = []
    for i, med in enumerate(REAL_MEDICATIONS, 1):
        base_name = med.get('base_name', med['name'])
        category = med.get('category', 'Médicaments Généraux')

        cost_price = get_medication_cost(base_name)
        selling_price = get_selling_price(cost_price, category)

        # Reference code: JUL-MED-{ABBREV}-{SEQ:04d}
        words = category.split()
        abbrev = ''.join(w[0].upper() for w in words[:2]) if len(words) >= 2 else category[:3].upper()
        reference = f"JUL-MED-{abbrev}-{i:04d}"

        # Total initial stock = sum of batch quantities
        initial_stock = sum(b['qty'] for b in med['batches']) if med['batches'] else 0
        stock_info = get_stock_levels(base_name)

        medications.append({
            'reference': reference,
            'name': med['name'],
            'base_name': base_name,
            'unit': med.get('sell_unit', 'boite'),
            'manufacturer': '',
            'category': category,
            'treatment_type': '',
            'person_type': 'adult',
            'cost_price': cost_price,
            'selling_price': selling_price,
            'initial_stock': initial_stock,
            'min_stock_threshold': stock_info['min_threshold'],
            'batches': med['batches'],
        })

    return {
        'medications': medications,
        'supplies': MEDICAL_SUPPLIES,
    }
