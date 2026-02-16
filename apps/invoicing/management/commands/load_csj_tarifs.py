"""
Management command to load Centre de Santé Julianna tariffs
Usage: python manage.py load_csj_tarifs
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.invoicing.models import Product, ProductCategory
from apps.accounts.models import Organization
from decimal import Decimal


class Command(BaseCommand):
    help = 'Charge les tarifs du Centre de Santé Julianna'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-id',
            type=str,
            help='ID de l\'organisation (optionnel, utilise la première si non spécifié)',
        )

    def handle(self, *args, **options):
        org_id = options.get('org_id')

        if org_id:
            try:
                organization = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Organisation {org_id} non trouvée'))
                return
        else:
            organization = Organization.objects.first()
            if not organization:
                self.stdout.write(self.style.ERROR('Aucune organisation trouvée'))
                return

        self.stdout.write(f'Chargement des tarifs pour: {organization.name}')

        # Tarifs Centre de Santé Julianna
        tarifs_data = {
            'Consultation': [
                ('Consultation Infirmier', 3000),
                ('Consultation Médecin général', 5000),
            ],
            'Hospitalisation': [
                ('Pose de cathéter - Perfusion', 1000),
                ('Pose de sonde urinaire', 1000),
                ('Drap pour lit', 1000),
                ('Forfait simple deux lits', 7500),
                ('Forfait VIP deux lits', 7500),
                ('Mise En Observation (MEO) - Soins', 1500),
                ('Forfait concentrateur / Heure', 5000),
                ('Ponction pleural', 7500),
                ('Ponction d\'ascite', 7500),
                ('Nebulisation', 5000),
            ],
            'Petite chirurgie': [
                ('Ongle incarné', 15000),
                ('Incision et drainage panaris', 10000),
                ('Infiltration corticoïdes', 2500),
                ('Kystectomie/Lipomectomie S-C', 5000),
                ('Petite cheloïdectomie', 5000),
                ('Pansement simple', 500),
                ('Suture +5 points/trois plans', 12000),
                ('Suture 1 à 3 points/un plan', 3000),
                ('Suture 3 à 5 points/deux plans', 4000),
                ('Extraction corps étranger', 5000),
                ('Incision + drainage Abcès', 15000),
                ('Circonsition', 5000),
                ('Ablation petite lipome', 10000),
                ('Injection simple', 500),
                ('Lavage des oreilles', 5000),
                ('Ablation d\'un frein de langue', 1500),
                ('Attelle plâtrée/Plâtre', 7000),
                ('Incision d\'Abcès complexe', 6000),
                ('Pansement complexe', 2500),
                ('Incision d\'Abcès simple', 3000),
                ('Lavage plaies', 3000),
            ],
            'ORL': [
                ('Lavage nasal', 500),
            ],
            'Laboratoire': [
                ('Kit de prélèvement', 400),
            ],
        }

        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for category_name, services in tarifs_data.items():
                # Créer ou récupérer la catégorie
                category, created = ProductCategory.objects.get_or_create(
                    organization=organization,
                    name=category_name,
                    defaults={
                        'slug': category_name.lower().replace(' ', '-'),
                        'description': f'Services de {category_name}',
                        'is_active': True,
                    }
                )

                if created:
                    self.stdout.write(self.style.SUCCESS(f'[OK] Categorie creee: {category_name}'))

                # Créer ou mettre à jour les services
                for service_name, price in services:
                    # Générer une référence unique
                    reference = service_name[:3].upper() + str(abs(hash(service_name)))[:6]

                    product, created = Product.objects.update_or_create(
                        organization=organization,
                        name=service_name,
                        defaults={
                            'reference': reference,
                            'category': category,
                            'product_type': 'service',
                            'price': Decimal(price),
                            'cost_price': Decimal(0),  # Pas de coût pour un service
                            'description': f'{service_name} - Centre de Sante Julianna',
                            'stock_quantity': 0,  # Les services ne sont pas en stock
                            'low_stock_threshold': 0,
                        }
                    )

                    if created:
                        created_count += 1
                        self.stdout.write(f'  [+] Service cree: {service_name} - {price} FCFA')
                    else:
                        updated_count += 1
                        self.stdout.write(f'  [*] Service mis a jour: {service_name} - {price} FCFA')

        self.stdout.write(self.style.SUCCESS(f'\n[DONE] Termine!'))
        self.stdout.write(f'  - {created_count} services crees')
        self.stdout.write(f'  - {updated_count} services mis a jour')
        self.stdout.write(f'  - Total: {created_count + updated_count} services')
