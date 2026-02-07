"""
Management command pour donner les permissions superuser à l'admin
Usage: python manage.py fix_admin_permissions
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Donne les permissions superuser à l\'administrateur Julianna'

    def handle(self, *args, **options):
        self.stdout.write('🔧 Correction des permissions admin...')

        try:
            # Chercher l'utilisateur admin
            admin_user = User.objects.filter(username='julianna_admin').first()

            if not admin_user:
                # Essayer par email
                admin_user = User.objects.filter(email='admin@csj.cm').first()

            if not admin_user:
                # Essayer par rôle
                admin_user = User.objects.filter(role='admin').first()

            if not admin_user:
                self.stdout.write(self.style.ERROR('❌ Utilisateur admin non trouvé'))
                self.stdout.write('\n📋 Utilisateurs disponibles:')
                for user in User.objects.all():
                    self.stdout.write(f'  - {user.username} ({user.email}) - Rôle: {user.role}')
                return

            self.stdout.write(f'✅ Admin trouvé: {admin_user.username} ({admin_user.get_full_name()})')

            # Afficher l'état actuel
            self.stdout.write('\n📋 État actuel:')
            self.stdout.write(f'  - is_staff: {admin_user.is_staff}')
            self.stdout.write(f'  - is_superuser: {admin_user.is_superuser}')
            self.stdout.write(f'  - role: {admin_user.role}')
            self.stdout.write(f'  - is_active: {admin_user.is_active}')

            # Mettre à jour les permissions
            modified = False

            if not admin_user.is_staff:
                admin_user.is_staff = True
                modified = True
                self.stdout.write('  ✏️  is_staff mis à True')

            if not admin_user.is_superuser:
                admin_user.is_superuser = True
                modified = True
                self.stdout.write('  ✏️  is_superuser mis à True')

            if admin_user.role != 'admin':
                admin_user.role = 'admin'
                modified = True
                self.stdout.write('  ✏️  role mis à admin')

            if not admin_user.is_active:
                admin_user.is_active = True
                modified = True
                self.stdout.write('  ✏️  is_active mis à True')

            if modified:
                admin_user.save()
                self.stdout.write('\n✅ Permissions mises à jour!')
            else:
                self.stdout.write('\n✅ Les permissions sont déjà correctes!')

            # Afficher l'état final
            admin_user.refresh_from_db()
            self.stdout.write('\n📋 État final:')
            self.stdout.write(f'  - is_staff: {admin_user.is_staff} ✅')
            self.stdout.write(f'  - is_superuser: {admin_user.is_superuser} ✅')
            self.stdout.write(f'  - role: {admin_user.role} ✅')
            self.stdout.write(f'  - is_active: {admin_user.is_active} ✅')

            self.stdout.write(self.style.SUCCESS('\n🎉 L\'admin a maintenant tous les accès!'))
            self.stdout.write(f'\n🔑 Connexion: {admin_user.username} / julianna2025')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Erreur: {str(e)}'))
            import traceback
            traceback.print_exc()
