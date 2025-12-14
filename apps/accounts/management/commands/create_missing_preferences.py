"""
Commande Django pour créer les UserPreferences et UserPermissions manquantes
pour les utilisateurs existants.

Usage:
    python manage.py create_missing_preferences
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import UserPreferences, UserPermissions


User = get_user_model()


class Command(BaseCommand):
    help = 'Crée les UserPreferences et UserPermissions pour les utilisateurs qui n\'en ont pas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forcer la création même si les préférences existent déjà',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        
        self.stdout.write(self.style.MIGRATE_HEADING('🔍 Recherche des utilisateurs sans préférences...'))
        
        users = User.objects.all()
        users_created = 0
        users_updated = 0
        users_skipped = 0
        
        for user in users:
            try:
                # Vérifier/créer UserPreferences
                prefs_created = False
                perms_created = False
                
                if force or not hasattr(user, 'preferences') or user.preferences is None:
                    from apps.accounts.models import _get_default_modules_for_role, _get_default_permissions_for_role
                    
                    default_modules = _get_default_modules_for_role(user.role, user.organization)
                    prefs, prefs_created = UserPreferences.objects.get_or_create(
                        user=user,
                        defaults={
                            'enabled_modules': default_modules,
                            'onboarding_completed': False,  # Forcer false pour déclencher l'onboarding
                            'onboarding_data': {},
                            'dashboard_layout': {},
                            'notification_settings': {},
                            'preferred_currency': 'CAD',
                            'preferred_language': 'fr',
                        }
                    )
                    
                    if prefs_created:
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ UserPreferences créées pour {user.email}')
                        )
                    elif force:
                        # Si force, mettre à jour onboarding_completed
                        prefs.onboarding_completed = False
                        prefs.save()
                        self.stdout.write(
                            self.style.WARNING(f'  ⟳ onboarding_completed réinitialisé pour {user.email}')
                        )
                        users_updated += 1
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'  ⊘ UserPreferences existe déjà pour {user.email}')
                        )
                        users_skipped += 1
                        continue
                    
                # Vérifier/créer UserPermissions
                if force or not hasattr(user, 'permissions') or user.permissions is None:
                    from apps.accounts.models import _get_default_permissions_for_role
                    
                    default_permissions = _get_default_permissions_for_role(user.role)
                    perms, perms_created = UserPermissions.objects.get_or_create(
                        user=user,
                        defaults={
                            'module_access': [],
                            **default_permissions
                        }
                    )
                    
                    if perms_created:
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ UserPermissions créées pour {user.email}')
                        )
                
                if prefs_created or perms_created:
                    users_created += 1
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Erreur pour {user.email}: {e}')
                )
        
        self.stdout.write('\n' + self.style.MIGRATE_HEADING('📊 Résumé:'))
        self.stdout.write(f'  Total utilisateurs: {users.count()}')
        self.stdout.write(self.style.SUCCESS(f'  ✓ Créés: {users_created}'))
        if users_updated > 0:
            self.stdout.write(self.style.WARNING(f'  ⟳ Mis à jour: {users_updated}'))
        if users_skipped > 0:
            self.stdout.write(f'  ⊘ Ignorés: {users_skipped}')
        
        self.stdout.write(
            self.style.SUCCESS('\n✅ Commande terminée avec succès!')
        )

