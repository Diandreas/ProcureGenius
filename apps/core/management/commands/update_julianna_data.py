"""
Management command pour mettre à jour les données du Centre Julianna
Usage: python manage.py update_julianna_data
"""
from django.core.management.base import BaseCommand
from apps.accounts.models import Organization
from apps.core.models import OrganizationSettings


class Command(BaseCommand):
    help = 'Met à jour les informations de contact du Centre Julianna'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Recherche du Centre Julianna...')

        # Chercher l'organisation du Centre Julianna
        try:
            # Essayer plusieurs variantes du nom
            org = None
            search_names = [
                'Centre Julianna',
                'centre julianna',
                'CENTRE JULIANNA',
                'Julianna',
            ]

            for name in search_names:
                orgs = Organization.objects.filter(name__icontains=name)
                if orgs.exists():
                    org = orgs.first()
                    break

            if not org:
                self.stdout.write(self.style.WARNING('⚠️  Organisation non trouvée. Organisations disponibles:'))
                for o in Organization.objects.all():
                    self.stdout.write(f'  - {o.name} (ID: {o.id})')
                return

            self.stdout.write(self.style.SUCCESS(f'✅ Organisation trouvée: {org.name}'))

            # Créer ou récupérer les settings
            settings, created = OrganizationSettings.objects.get_or_create(
                organization=org,
                defaults={
                    'company_name': 'Centre Médical Julianna',
                }
            )

            if created:
                self.stdout.write(self.style.SUCCESS('✅ Settings créés'))
            else:
                self.stdout.write('📝 Settings existants - Mise à jour...')

            # Afficher les anciennes valeurs
            self.stdout.write('\n📋 Anciennes valeurs:')
            self.stdout.write(f'  Téléphone: {settings.company_phone or "Non défini"}')
            self.stdout.write(f'  Adresse: {settings.company_address or "Non défini"}')

            # Mettre à jour les informations
            settings.company_phone = '655244149 / 679145198'
            settings.company_address = (
                'Entrée Marie Lumière à côté du Consulat Honoraire d\'Indonésie\n'
                'Makepe Saint-Tropez - Douala'
            )

            # Si le nom de l'entreprise est vide, le définir
            if not settings.company_name:
                settings.company_name = 'Centre Médical Julianna'

            settings.save()

            # Afficher les nouvelles valeurs
            self.stdout.write('\n✅ Nouvelles valeurs:')
            self.stdout.write(f'  Nom: {settings.company_name}')
            self.stdout.write(f'  Téléphone: {settings.company_phone}')
            self.stdout.write(f'  Adresse: {settings.company_address}')

            self.stdout.write(self.style.SUCCESS('\n🎉 Mise à jour réussie!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Erreur: {str(e)}'))
            import traceback
            traceback.print_exc()
