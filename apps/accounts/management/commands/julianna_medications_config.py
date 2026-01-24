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


# Medical supplies that should be tracked as products (not medications)
MEDICAL_SUPPLIES = []


def load_all_medications(parsed_data):
    """
    Load and enrich all medications from parsed data

    Args:
        parsed_data: Dict with 'medications' key from parse_all_source_files()

    Returns:
        Dict with 'medications' and 'supplies' lists
    """
    medications = enrich_medication_data(parsed_data['medications'])

    return {
        'medications': medications,
        'supplies': MEDICAL_SUPPLIES,
    }
