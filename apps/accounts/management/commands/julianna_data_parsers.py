"""
Data parsers for Centre de Santé JULIANNA production data
Parses soins.md, medicament.md, and g.html files
"""

import csv
import re
from datetime import datetime, timedelta
from decimal import Decimal
from html.parser import HTMLParser
from pathlib import Path


class SoinsParser:
    """Parser for soins.md - Medical services with CSJ 2026 pricing"""

    SERVICE_CATEGORIES = {
        'Consultation': 'Consultations',
        'Hospitalisation': 'Hospitalisation et Observation',
        'Petite chirurgie': 'Petite Chirurgie et Soins',
        'ORL': 'ORL - Oto-Rhino-Laryngologie',
        'Laboratoire': 'Laboratoire',
    }

    @classmethod
    def parse(cls, file_path):
        """Parse soins.md file and extract services"""
        services = []

        with open(file_path, 'r', encoding='utf-8') as f:
            # Skip header line
            next(f)

            for line in f:
                if not line.strip():
                    continue

                parts = [p.strip() for p in line.split(';')]

                if len(parts) < 7:
                    continue

                # Extract fields
                code = parts[0]
                typologie = parts[1]
                denomination = parts[3]
                tarif_str = parts[5]
                personnel = parts[6] if len(parts) > 6 else ''

                # Skip empty or invalid rows
                if not denomination or not typologie:
                    continue

                # Clean and parse price
                price = cls._parse_price(tarif_str)

                if price is None:
                    continue  # Skip services without price

                # Create service entry
                service = {
                    'code': code or f'CSJ-{len(services)+1:03d}',
                    'name': denomination,
                    'category': cls.SERVICE_CATEGORIES.get(typologie, 'Autres Services'),
                    'price': price,
                    'personnel_required': personnel,
                    'service_type': typologie,
                }

                services.append(service)

        return services

    @staticmethod
    def _parse_price(price_str):
        """Extract numeric price from string like '5 000' or '10 000'"""
        if not price_str:
            return None

        # Remove all non-digit characters except comma/period
        cleaned = re.sub(r'[^\d,.]', '', price_str)

        if not cleaned:
            return None

        try:
            # Replace comma with nothing (French thousands separator)
            cleaned = cleaned.replace(',', '').replace('.', '')
            price = Decimal(cleaned)
            return price if price > 0 else None
        except:
            return None


class MedicamentParser:
    """Parser for medicament.md - Pharmacy inventory with expiration dates"""

    # Items that are not medications (equipment, supplies)
    NON_MEDICATION_ITEMS = [
        'Masque Bleu', 'Masque Blanc', 'Charlottes', 'Syladrape',
        'Mini-ciseaux', 'Kit prélèvement', 'Séringue', 'Perfuseur',
        'Compresses de Gaze', 'Sparadrap', 'Ruban périmètrique',
        'Drap d\'examen', 'Pot de prélèvement', 'Perfuseur',
    ]

    MEDICATION_CATEGORIES = {
        'Douleurs et fièvres': 'Antalgiques et Antipyrétiques',
        'Antibiotique': 'Antibiotiques',
        'Maux Estomac': 'Antiacides et Digestifs',
        'Maux de ventre': 'Antispasmodiques',
        'Laxatif': 'Laxatifs',
        'Constipation': 'Laxatifs',
        'Ballonement': 'Antiflatulents',
        'Remontées acides': 'Inhibiteurs de la pompe à protons',
        'Cortisone': 'Corticoïdes',
        'Nez bouché': 'Décongestionnants nasaux',
        'Diarrhées': 'Antidiarrhéiques',
        'Collyre yeux': 'Ophtalmologie',
        'Lavage oculaire': 'Ophtalmologie',
        'Manque de fer': 'Suppléments ferreux',
        'Femmes enceintes': 'Suppléments prénataux',
        'Ovaires polykystiques': 'Gynécologie',
        'Toux': 'Antitussifs',
        'Mycoses de la peau': 'Antifongiques',
        'Hypertension artérielle': 'Antihypertenseurs',
        'Soins': 'Antiseptiques et Désinfectants',
        'Nébulisation': 'Dispositifs respiratoires',
    }

    MONTH_MAP = {
        'janv': 1, 'févr': 2, 'mars': 3, 'avr': 4, 'mai': 5, 'juin': 6,
        'juil': 7, 'août': 8, 'sept': 9, 'oct': 10, 'nov': 11, 'déc': 12,
    }

    @classmethod
    def parse(cls, file_path):
        """Parse medicament.md file and extract medications"""
        medications = []

        with open(file_path, 'r', encoding='utf-8') as f:
            # Skip header line
            next(f)

            for line_num, line in enumerate(f, start=2):
                if not line.strip():
                    continue

                parts = [p.strip() for p in line.split(';')]

                if len(parts) < 8:
                    continue

                # Extract fields
                nom = parts[0]
                quantite_str = parts[1]
                unite = parts[2]
                laboratoire = parts[3]
                traitement = parts[4]
                personne = parts[5]
                date_peremption_str = parts[6]
                etat = parts[7]

                # Skip if medication name is empty
                if not nom:
                    continue

                # Filter out non-medication items
                if cls._is_non_medication(nom):
                    continue

                # Parse quantity
                quantite = cls._parse_quantity(quantite_str)

                # Parse expiration date
                expiry_date = cls._parse_expiration_date(date_peremption_str)

                # Determine category
                category = cls.MEDICATION_CATEGORIES.get(traitement, 'Médicaments Généraux')

                # Create medication entry
                medication = {
                    'name': f"{nom} - {unite}" if unite else nom,
                    'base_name': nom,
                    'quantity': quantite,
                    'unit': unite,
                    'manufacturer': laboratoire,
                    'treatment_type': traitement,
                    'category': category,
                    'person_type': personne,
                    'expiry_date': expiry_date,
                    'state': etat,
                }

                medications.append(medication)

        return cls._consolidate_medications(medications)

    @classmethod
    def _is_non_medication(cls, name):
        """Check if item is medical equipment, not medication"""
        return any(non_med.lower() in name.lower() for non_med in cls.NON_MEDICATION_ITEMS)

    @staticmethod
    def _parse_quantity(qty_str):
        """Parse quantity string to integer"""
        if not qty_str:
            return 1

        try:
            return int(qty_str)
        except:
            return 1

    @classmethod
    def _parse_expiration_date(cls, date_str):
        """Parse expiration date from format like 'janv-27', 'déc-26'"""
        if not date_str or date_str == 'N/A':
            return None

        # Match pattern: "janv-27" or "déc-26"
        match = re.match(r'([a-zé]+)-(\d{2})', date_str.lower())

        if not match:
            return None

        month_str, year_str = match.groups()

        month = cls.MONTH_MAP.get(month_str)
        if not month:
            return None

        # Convert 2-digit year to 4-digit (26 → 2026)
        year = 2000 + int(year_str)

        # Use last day of the month
        if month == 12:
            next_month = datetime(year + 1, 1, 1)
        else:
            next_month = datetime(year, month + 1, 1)

        last_day = next_month - timedelta(days=1)

        return last_day.date()

    @classmethod
    def _consolidate_medications(cls, medications):
        """Consolidate duplicate medications into batches"""
        from collections import defaultdict

        med_dict = defaultdict(list)

        for med in medications:
            key = (med['base_name'], med['unit'])
            med_dict[key].append(med)

        consolidated = []

        for (base_name, unit), meds in med_dict.items():
            # Use first entry as template
            template = meds[0]

            # Collect all batches with expiration dates
            batches = []
            total_quantity = 0

            for med in meds:
                if med['expiry_date']:
                    batch = {
                        'quantity': med['quantity'],
                        'expiry_date': med['expiry_date'],
                        'manufacturer': med['manufacturer'],
                    }
                    batches.append(batch)
                    total_quantity += med['quantity']

            # Sort batches by expiration date (earliest first)
            batches.sort(key=lambda x: x['expiry_date'])

            consolidated_med = {
                'name': template['name'],
                'base_name': base_name,
                'unit': unit,
                'manufacturer': template['manufacturer'],
                'treatment_type': template['treatment_type'],
                'category': template['category'],
                'person_type': template['person_type'],
                'total_quantity': total_quantity,
                'batches': batches,
            }

            consolidated.append(consolidated_med)

        return consolidated


class LabTestsParser(HTMLParser):
    """Parser for g.html - Laboratory tests from HTML tables"""

    def __init__(self):
        super().__init__()
        self.tests = []
        self.current_table = []
        self.current_row = []
        self.current_cell = []
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.in_header = False
        self.current_category = None
        self.category_pattern = re.compile(r'[🧪🩸⚡🔬🦠].*')

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.in_table = True
            self.current_table = []
        elif tag == 'tr' and self.in_table:
            self.in_row = True
            self.current_row = []
        elif tag in ['td', 'th'] and self.in_row:
            self.in_cell = True
            self.current_cell = []
            if tag == 'th':
                self.in_header = True

    def handle_endtag(self, tag):
        if tag == 'table':
            self.in_table = False
            self._process_table()
            self.current_table = []
        elif tag == 'tr' and self.in_row:
            self.in_row = False
            if self.current_row:
                self.current_table.append(self.current_row)
            self.current_row = []
        elif tag in ['td', 'th'] and self.in_cell:
            self.in_cell = False
            cell_text = ''.join(self.current_cell).strip()
            self.current_row.append(cell_text)
            self.current_cell = []
            if tag == 'th':
                self.in_header = False

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell.append(data)
        elif self.in_table and not self.in_row:
            # Check for category headers
            if self.category_pattern.match(data.strip()):
                self.current_category = data.strip()

    def _process_table(self):
        """Process completed table and extract test data"""
        if not self.current_table:
            return

        # Skip empty tables or tables without enough rows
        if len(self.current_table) < 2:
            return

        # First row is header
        headers = self.current_table[0]

        # Check if this is an analysis table
        if 'Analyses' not in headers and 'analyses' not in ' '.join(headers).lower():
            return

        # Process data rows
        for row in self.current_table[1:]:
            if len(row) < 5:
                continue

            # Extract test information
            test_name = row[0] if len(row) > 0 else ''
            prelevement = row[1] if len(row) > 1 else ''
            exigences = row[2] if len(row) > 2 else ''
            conservation = row[3] if len(row) > 3 else ''
            tube = row[4] if len(row) > 4 else ''
            prix_str = row[5] if len(row) > 5 else ''

            # Skip header rows and empty rows
            if not test_name or 'Analyses' in test_name:
                continue

            # Extract test number and name
            match = re.match(r'(\d+)\.\s*(.+)', test_name)
            if match:
                test_num, name = match.groups()
            else:
                name = test_name

            # Clean price
            price = self._parse_price(prix_str)

            if not price:
                continue

            # Determine category
            category = self._determine_category(name)

            test = {
                'name': name,
                'sample_type': prelevement,
                'requirements': exigences,
                'storage': conservation,
                'tube': tube,
                'price': price,
                'category': category,
            }

            self.tests.append(test)

    @staticmethod
    def _parse_price(price_str):
        """Extract numeric price from string"""
        if not price_str:
            return None

        # Remove all non-digit characters
        cleaned = re.sub(r'[^\d]', '', price_str)

        if not cleaned:
            return None

        try:
            return Decimal(cleaned)
        except:
            return None

    @staticmethod
    def _determine_category(test_name):
        """Determine test category from name"""
        test_lower = test_name.lower()

        if any(keyword in test_lower for keyword in ['nfs', 'numération', 'hémoglobine', 'leucocytes', 'plaquettes', 'groupe sanguin', 'réticulocytes', 'prothrombine']):
            return 'Hématologie'
        elif any(keyword in test_lower for keyword in ['glycémie', 'glucose', 'cholestérol', 'triglycérides', 'urée', 'créatinine', 'acide urique', 'bilirubine', 'calcium', 'phosphore']):
            return 'Biochimie Générale'
        elif any(keyword in test_lower for keyword in ['ionogramme', 'sodium', 'potassium', 'magnésium']):
            return 'Ionogrammes et Électrolytes'
        elif any(keyword in test_lower for keyword in ['sérologie', 'hépatite', 'vih', 'syphilis', 'toxoplasmose', 'herpes', 'aslo']):
            return 'Sérologie'
        elif any(keyword in test_lower for keyword in ['ecbu', 'cytobact', 'coproculture', 'spermoculture']):
            return 'Bactériologie'
        elif any(keyword in test_lower for keyword in ['kaop', 'selles', 'paludisme', 'parasit']):
            return 'Parasitologie'
        elif any(keyword in test_lower for keyword in ['psa', 'tsh', 'œstrogène', 'progestérone', 'testostérone', 'fsh', 'lh']):
            return 'Hormonologie'
        elif 'électrophorèse' in test_lower:
            return 'Électrophorèses'
        else:
            return 'Analyses Générales'

    @classmethod
    def parse(cls, file_path):
        """Parse HTML file and extract lab tests"""
        parser = cls()

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            parser.feed(content)

        return parser.tests


def parse_all_source_files(soins_path, medicament_path, html_path):
    """
    Parse all three source files and return consolidated data

    Returns:
        dict: {
            'services': list of medical services,
            'medications': list of medications with batches,
            'lab_tests': list of laboratory tests
        }
    """
    services = SoinsParser.parse(soins_path)
    medications = MedicamentParser.parse(medicament_path)
    lab_tests = LabTestsParser.parse(html_path)

    return {
        'services': services,
        'medications': medications,
        'lab_tests': lab_tests,
    }
