"""
Management command to set up healthcare data
Creates default lab tests, product categories, and sample data
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from decimal import Decimal


class Command(BaseCommand):
    help = 'Set up healthcare default data (lab tests, categories, etc.)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organization',
            type=str,
            help='Organization ID to set up (optional, creates for all if not specified)'
        )

    def handle(self, *args, **options):
        from apps.accounts.models import Organization
        from apps.invoicing.models import ProductCategory, Product
        from apps.laboratory.models import LabTestCategory, LabTest
        
        org_id = options.get('organization')
        
        if org_id:
            try:
                organizations = [Organization.objects.get(id=org_id)]
            except Organization.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Organization {org_id} not found'))
                return
        else:
            organizations = Organization.objects.all()
        
        for org in organizations:
            self.stdout.write(f'Setting up healthcare data for: {org.name}')
            
            # Create product categories
            self._create_product_categories(org)
            
            # Create lab test categories
            self._create_lab_test_categories(org)
            
            # Create default lab tests
            self._create_default_lab_tests(org)
            
            # Create default products (consultation, etc.)
            self._create_healthcare_products(org)
            
            self.stdout.write(self.style.SUCCESS(f'✓ Healthcare data created for {org.name}'))

    def _create_product_categories(self, org):
        """Create product categories for healthcare"""
        from apps.invoicing.models import ProductCategory
        
        categories = [
            {'name': 'Consultations', 'slug': 'consultations', 'description': 'Frais de consultation médicale'},
            {'name': 'Médicaments', 'slug': 'medications', 'description': 'Produits pharmaceutiques'},
            {'name': 'Tests Laboratoire', 'slug': 'lab-tests', 'description': 'Tests de laboratoire'},
            {'name': 'Fournitures Médicales', 'slug': 'medical-supplies', 'description': 'Consommables médicaux'},
        ]
        
        for cat_data in categories:
            ProductCategory.objects.get_or_create(
                organization=org,
                slug=cat_data['slug'],
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description'],
                }
            )
        
        self.stdout.write(f'  - Product categories created')

    def _create_lab_test_categories(self, org):
        """Create lab test categories"""
        from apps.laboratory.models import LabTestCategory
        
        categories = [
            {'name': 'Hématologie', 'slug': 'hematologie', 'order': 1},
            {'name': 'Biochimie', 'slug': 'biochimie', 'order': 2},
            {'name': 'Parasitologie', 'slug': 'parasitologie', 'order': 3},
            {'name': 'Microbiologie', 'slug': 'microbiologie', 'order': 4},
            {'name': 'Sérologie', 'slug': 'serologie', 'order': 5},
            {'name': 'Urinaire', 'slug': 'urinaire', 'order': 6},
            {'name': 'Imagerie', 'slug': 'imagerie', 'order': 7},
        ]
        
        for cat_data in categories:
            LabTestCategory.objects.get_or_create(
                organization=org,
                slug=cat_data['slug'],
                defaults={
                    'name': cat_data['name'],
                    'display_order': cat_data['order'],
                }
            )
        
        self.stdout.write(f'  - Lab test categories created')

    def _create_default_lab_tests(self, org):
        """Create default lab tests"""
        from apps.laboratory.models import LabTestCategory, LabTest
        
        # Get categories
        try:
            hematologie = LabTestCategory.objects.get(organization=org, slug='hematologie')
            biochimie = LabTestCategory.objects.get(organization=org, slug='biochimie')
            parasitologie = LabTestCategory.objects.get(organization=org, slug='parasitologie')
            serologie = LabTestCategory.objects.get(organization=org, slug='serologie')
            urinaire = LabTestCategory.objects.get(organization=org, slug='urinaire')
        except LabTestCategory.DoesNotExist:
            self.stdout.write(self.style.WARNING('  - Lab categories not found, skipping tests'))
            return
        
        tests = [
            # Hématologie
            {
                'category': hematologie,
                'test_code': 'HEM-NFS-001',
                'name': 'Numération Formule Sanguine (NFS)',
                'short_name': 'NFS',
                'price': Decimal('3000'),
                'sample_type': 'blood',
                'container_type': 'edta',
                'normal_range_general': 'Voir rapport détaillé',
                'unit_of_measurement': 'Voir rapport',
                'estimated_turnaround_hours': 2,
            },
            {
                'category': hematologie,
                'test_code': 'HEM-VS-001',
                'name': 'Vitesse de Sédimentation (VS)',
                'short_name': 'VS',
                'price': Decimal('1500'),
                'sample_type': 'blood',
                'container_type': 'citrate',
                'normal_range_male': '0-15 mm/h',
                'normal_range_female': '0-20 mm/h',
                'unit_of_measurement': 'mm/h',
                'estimated_turnaround_hours': 1,
            },
            {
                'category': hematologie,
                'test_code': 'HEM-GS-001',
                'name': 'Groupe Sanguin + Rhésus',
                'short_name': 'GS/Rh',
                'price': Decimal('2500'),
                'sample_type': 'blood',
                'container_type': 'edta',
                'estimated_turnaround_hours': 1,
            },
            # Biochimie
            {
                'category': biochimie,
                'test_code': 'BIO-GLY-001',
                'name': 'Glycémie à jeun',
                'short_name': 'Glycémie',
                'price': Decimal('1500'),
                'sample_type': 'blood',
                'container_type': 'fluoride',
                'fasting_required': True,
                'fasting_hours': 8,
                'normal_range_general': '0.70 - 1.10 g/L',
                'unit_of_measurement': 'g/L',
                'estimated_turnaround_hours': 2,
            },
            {
                'category': biochimie,
                'test_code': 'BIO-CREA-001',
                'name': 'Créatininémie',
                'short_name': 'Créat',
                'price': Decimal('2000'),
                'sample_type': 'blood',
                'container_type': 'serum',
                'normal_range_male': '7-13 mg/L',
                'normal_range_female': '6-11 mg/L',
                'unit_of_measurement': 'mg/L',
                'estimated_turnaround_hours': 2,
            },
            {
                'category': biochimie,
                'test_code': 'BIO-UREE-001',
                'name': 'Urée sanguine',
                'short_name': 'Urée',
                'price': Decimal('1500'),
                'sample_type': 'blood',
                'container_type': 'serum',
                'normal_range_general': '0.15 - 0.45 g/L',
                'unit_of_measurement': 'g/L',
                'estimated_turnaround_hours': 2,
            },
            {
                'category': biochimie,
                'test_code': 'BIO-CHOL-001',
                'name': 'Cholestérol total',
                'short_name': 'Chol',
                'price': Decimal('2000'),
                'sample_type': 'blood',
                'container_type': 'serum',
                'fasting_required': True,
                'fasting_hours': 12,
                'normal_range_general': '< 2.0 g/L',
                'unit_of_measurement': 'g/L',
                'estimated_turnaround_hours': 2,
            },
            # Parasitologie
            {
                'category': parasitologie,
                'test_code': 'PAR-GE-001',
                'name': 'Goutte épaisse (Paludisme)',
                'short_name': 'GE',
                'price': Decimal('2500'),
                'sample_type': 'blood',
                'container_type': 'edta',
                'normal_range_general': 'Négatif',
                'estimated_turnaround_hours': 1,
            },
            {
                'category': parasitologie,
                'test_code': 'PAR-TDR-001',
                'name': 'TDR Paludisme',
                'short_name': 'TDR Palu',
                'price': Decimal('2000'),
                'sample_type': 'blood',
                'container_type': 'edta',
                'normal_range_general': 'Négatif',
                'estimated_turnaround_hours': 0,  # Immediate
            },
            {
                'category': parasitologie,
                'test_code': 'PAR-SELLE-001',
                'name': 'Examen parasitologique des selles',
                'short_name': 'EPS',
                'price': Decimal('2000'),
                'sample_type': 'stool',
                'container_type': 'stool_cup',
                'normal_range_general': 'Absence de parasites',
                'estimated_turnaround_hours': 2,
            },
            # Sérologie
            {
                'category': serologie,
                'test_code': 'SER-HIV-001',
                'name': 'Sérologie VIH',
                'short_name': 'VIH',
                'price': Decimal('3000'),
                'sample_type': 'blood',
                'container_type': 'serum',
                'normal_range_general': 'Négatif',
                'estimated_turnaround_hours': 1,
                'requires_approval': True,
            },
            {
                'category': serologie,
                'test_code': 'SER-TYPHI-001',
                'name': 'Sérologie Typhoïde (Widal)',
                'short_name': 'Widal',
                'price': Decimal('3000'),
                'sample_type': 'blood',
                'container_type': 'serum',
                'normal_range_general': '< 1/80',
                'estimated_turnaround_hours': 2,
            },
            # Urinaire
            {
                'category': urinaire,
                'test_code': 'URI-ECBU-001',
                'name': 'ECBU (Examen CytoBactériologique des Urines)',
                'short_name': 'ECBU',
                'price': Decimal('5000'),
                'sample_type': 'urine',
                'container_type': 'urine_cup',
                'normal_range_general': 'Stérile',
                'estimated_turnaround_hours': 48,
            },
            {
                'category': urinaire,
                'test_code': 'URI-BU-001',
                'name': 'Bandelette urinaire',
                'short_name': 'BU',
                'price': Decimal('1000'),
                'sample_type': 'urine',
                'container_type': 'urine_cup',
                'estimated_turnaround_hours': 0,
            },
        ]
        
        created_count = 0
        for test_data in tests:
            _, created = LabTest.objects.get_or_create(
                organization=org,
                test_code=test_data['test_code'],
                defaults=test_data
            )
            if created:
                created_count += 1
        
        self.stdout.write(f'  - {created_count} lab tests created')

    def _create_healthcare_products(self, org):
        """Create healthcare service products"""
        from apps.invoicing.models import ProductCategory, Product
        
        try:
            consultations_cat = ProductCategory.objects.get(organization=org, slug='consultations')
        except ProductCategory.DoesNotExist:
            self.stdout.write(self.style.WARNING('  - Consultations category not found'))
            return
        
        products = [
            {
                'name': 'Consultation Générale',
                'reference': 'CONS-GEN',
                'price': Decimal('5000'),
                'product_type': 'service',
                'category': consultations_cat,
                'description': 'Consultation médicale générale',
            },
            {
                'name': 'Consultation Spécialisée',
                'reference': 'CONS-SPEC',
                'price': Decimal('10000'),
                'product_type': 'service',
                'category': consultations_cat,
                'description': 'Consultation avec un spécialiste',
            },
            {
                'name': 'Consultation Urgence',
                'reference': 'CONS-URG',
                'price': Decimal('7500'),
                'product_type': 'service',
                'category': consultations_cat,
                'description': 'Consultation en urgence',
            },
            {
                'name': 'Impression Historique Médical',
                'reference': 'DOC-HIST',
                'price': Decimal('1000'),
                'product_type': 'service',
                'category': consultations_cat,
                'description': 'Impression du dossier médical du patient',
            },
        ]
        
        created_count = 0
        for prod_data in products:
            _, created = Product.objects.get_or_create(
                organization=org,
                reference=prod_data['reference'],
                defaults=prod_data
            )
            if created:
                created_count += 1
        
        self.stdout.write(f'  - {created_count} healthcare products created')
