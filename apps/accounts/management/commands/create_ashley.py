"""
Crée le compte administrateur Ashley avec accès total (comme Boris).
Usage: python manage.py create_ashley
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Crée le compte administrateur Ashley avec accès total'

    def handle(self, *args, **options):
        self.stdout.write('Création du compte Ashley...')

        try:
            with transaction.atomic():
                # Chercher l'organisation de Boris pour l'associer à la même
                boris = User.objects.filter(username='boris').first()
                org = boris.organization if boris else None

                if org:
                    self.stdout.write(f'Organisation trouvée : {org.name}')
                else:
                    self.stdout.write(self.style.WARNING('Aucune organisation trouvée, Ashley sera créée sans organisation'))

                existing = User.objects.filter(username='ashley').first()
                if existing:
                    self.stdout.write(self.style.WARNING(f'Utilisateur ashley existe déjà ({existing.email}), mise à jour...'))
                    user = existing
                else:
                    user = User(username='ashley')

                user.email = 'ashley@csj.cm'
                user.first_name = 'Ashley'
                user.last_name = 'ADMIN'
                user.role = 'admin'
                user.is_staff = True
                user.is_superuser = True
                user.is_active = True
                user.set_password('ashley2025')

                if org:
                    user.organization = org

                user.save()

                self.stdout.write(self.style.SUCCESS('\nCompte Ashley créé avec succès !'))
                self.stdout.write('─' * 40)
                self.stdout.write(f'  Identifiant : ashley')
                self.stdout.write(f'  Mot de passe : ashley2025')
                self.stdout.write(f'  Email        : ashley@csj.cm')
                self.stdout.write(f'  Rôle         : admin')
                self.stdout.write(f'  is_superuser : True')
                self.stdout.write(f'  is_staff     : True')
                if org:
                    self.stdout.write(f'  Organisation : {org.name}')
                self.stdout.write('─' * 40)
                self.stdout.write(self.style.SUCCESS('Ashley a le même niveau d\'accès que Boris.'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erreur : {str(e)}'))
            import traceback
            traceback.print_exc()
