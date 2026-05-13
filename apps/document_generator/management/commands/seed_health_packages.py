from django.core.management.base import BaseCommand
from apps.document_generator.models import HealthPackage
from apps.accounts.models import Organization


PACKAGES = [
    # ── COUPLES & PROJETS DE VIE ──
    {
        'category': 'couples',
        'name': 'Coup de foudre',
        'description': 'Bilan de base pour les couples souhaitant démarrer leur vie ensemble.',
        'original_price': 12500,
        'discounted_price': 9000,
        'included_tests_text': 'VIH 1 & 2\nChimie Urinaire\nSYPHILIS (TPHA - VDRL)\nHBsAg Hepatitis B Surface Ag',
        'display_order': 1,
    },
    {
        'category': 'couples',
        'name': 'Avenir Serein',
        'description': "Bilan complet pour un projet de vie serein à deux.",
        'original_price': 35250,
        'discounted_price': 30000,
        'included_tests_text': 'Groupe sanguin Rhésus\nÉlectrophorèse de l\'hémoglobine\nChimie Urinaire\nBilan IST',
        'display_order': 2,
    },
    {
        'category': 'couples',
        'name': 'Pacte de confiance',
        'description': 'Bilan IST complet pour vivre votre relation en toute confiance.',
        'original_price': 34500,
        'discounted_price': 25000,
        'included_tests_text': 'VIH 1 & 2\nChlamydia Trachomatis Ab Test\nChlamydia Trachomatis Ag Test\nGonorrhea Ag\nSYPHILIS (TPHA - VDRL)\nHBsAg Hepatitis B\nHépatite C\nChimie Urinaire',
        'display_order': 3,
    },
    {
        'category': 'couples',
        'name': 'Fertilité & Projet',
        'description': 'Bilan fertilité complet pour les couples en projet de conception.',
        'original_price': 117750,
        'discounted_price': 80000,
        'included_tests_text': 'Groupe sanguin Rhésus\nÉlectrophorèse de l\'hémoglobine\nBilan Hormonal Femme (FSH, LH, AMH)\nBilan IST\nSpermogramme\nSpermoculture\nChimie Urinaire',
        'display_order': 4,
    },
    # ── MATERNITÉ & PETITE ENFANCE ──
    {
        'category': 'maternity',
        'name': 'Premier souffle',
        'description': 'Bilan prénatal essentiel pour démarrer la grossesse en sécurité.',
        'original_price': 28500,
        'discounted_price': 25000,
        'included_tests_text': 'VIH 1 & 2\nSYPHILIS (TPHA - VDRL)\nChimie Urinaire\nTOXO Toxoplasma IgM/IgG\nRubéole (IgG/IgM)\nHBsAg Hepatitis B\nMalaria',
        'display_order': 5,
    },
    {
        'category': 'maternity',
        'name': 'Grossesse en beauté',
        'description': 'Bilan prénatal complet pour une grossesse sereine.',
        'original_price': 51750,
        'discounted_price': 40000,
        'included_tests_text': 'VIH 1 & 2\nSYPHILIS (TPHA - VDRL)\nChimie Urinaire\nTOXO Toxoplasma IgM/IgG\nRubéole (IgG/IgM)\nHBsAg Hepatitis B\nHépatite C\nGroupe sanguin Rhésus\nNFS\nECBU\nMalaria',
        'display_order': 6,
    },
    {
        'category': 'maternity',
        'name': 'Maman & Bébé en sécurité',
        'description': 'Bilan prénatal premium pour une protection maximale mère-enfant.',
        'original_price': 86750,
        'discounted_price': 65000,
        'included_tests_text': 'VIH\nSyphilis\nChimie Urinaire\nToxoplasmose\nRubéole\nHBsAg Hepatitis B\nHépatite C\nChlamydia Ag & Ab\nGroupe sanguin Rhésus\nNFS\nECBU\nPCV + ATB\nÉlectrophorèse Hb\nGlycémie à jeun\nMalaria',
        'display_order': 7,
    },
    # ── SÉNIORITÉ & VITALITÉ ──
    {
        'category': 'seniority',
        'name': 'Cœur léger',
        'description': 'Bilan cardiovasculaire de base pour prévenir les risques.',
        'original_price': 18000,
        'discounted_price': 15000,
        'included_tests_text': 'Glycémie\nProfil lipidique\nChimie Urinaire',
        'display_order': 8,
    },
    {
        'category': 'seniority',
        'name': 'Cap santé',
        'description': 'Bilan complet pour surveiller sa santé après 50 ans.',
        'original_price': 33750,
        'discounted_price': 25000,
        'included_tests_text': 'Glycémie à jeun\nProfil lipidique\nChimie Urinaire\nCréatinine\nUrée\nAcide urique\nNFS\nVS',
        'display_order': 9,
    },
    {
        'category': 'seniority',
        'name': 'Longue vie',
        'description': 'Bilan senior premium pour une santé optimale et durable.',
        'original_price': 88750,
        'discounted_price': 70000,
        'included_tests_text': 'Profil lipidique\nCréatinine\nUrée\nAcide urique\nIonogramme complet\nNFS\nVS\nCRP\nTSH\nPSA\nChimie urinaire\nGlycémie à jeun',
        'display_order': 10,
    },
    # ── BILAN GÉNÉRAL ──
    {
        'category': 'general',
        'name': 'Santé général',
        'description': 'Check-up essentiel pour tous, un bilan santé complet à tarif préférentiel.',
        'original_price': 32250,
        'discounted_price': 25000,
        'included_tests_text': 'Profil lipidique\nCréatinine\nUrée\nGroupe sanguin Rhésus\nNFS\nChimie urinaire\nGlycémie à jeun',
        'display_order': 11,
    },
]


class Command(BaseCommand):
    help = 'Seed HealthPackage data from the static packs catalog'

    def add_arguments(self, parser):
        parser.add_argument('--org-id', type=str, help='Organization UUID (default: first org)')
        parser.add_argument('--clear', action='store_true', help='Delete existing packages before seeding')

    def handle(self, *args, **options):
        if options['org_id']:
            try:
                org = Organization.objects.get(id=options['org_id'])
            except Organization.DoesNotExist:
                self.stderr.write(f"Organization {options['org_id']} introuvable.")
                return
        else:
            org = Organization.objects.first()
            if not org:
                self.stderr.write("Aucune organisation en base.")
                return

        self.stdout.write(f"Organisation: {org.name} ({org.id})")

        if options['clear']:
            deleted, _ = HealthPackage.objects.filter(organization=org).delete()
            self.stdout.write(f"Supprimé {deleted} packs existants.")

        created = updated = 0
        for data in PACKAGES:
            pkg, is_new = HealthPackage.objects.update_or_create(
                organization=org,
                name=data['name'],
                defaults={
                    'category': data['category'],
                    'description': data['description'],
                    'original_price': data['original_price'],
                    'discounted_price': data['discounted_price'],
                    'included_tests_text': data['included_tests_text'],
                    'display_order': data['display_order'],
                    'is_active': True,
                }
            )
            if is_new:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Terminé : {created} créés, {updated} mis à jour."
        ))
