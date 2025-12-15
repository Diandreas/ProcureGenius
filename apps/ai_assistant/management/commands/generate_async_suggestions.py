"""
Commande Django pour générer des suggestions asynchrones
À exécuter via cron toutes les heures: python manage.py generate_async_suggestions
"""
from django.core.management.base import BaseCommand
from apps.ai_assistant.services.async_suggestion_service import AsyncSuggestionService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Génère des suggestions intelligentes pour tous les utilisateurs actifs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Générer suggestions pour un utilisateur spécifique (ID)',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Nettoyer les suggestions anciennes',
        )
        parser.add_argument(
            '--cleanup-days',
            type=int,
            default=30,
            help='Nombre de jours pour le nettoyage (défaut: 30)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Démarrage de la génération de suggestions...'))

        if options['user_id']:
            # Générer pour un utilisateur spécifique
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(id=options['user_id'])
                suggestions, notifications = AsyncSuggestionService.generate_suggestions_for_user(user)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Généré {suggestions} suggestions et {notifications} notifications pour {user.username}'
                    )
                )
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Utilisateur avec ID {options["user_id"]} non trouvé'))
        else:
            # Générer pour tous les utilisateurs
            result = AsyncSuggestionService.generate_suggestions_for_all_users()
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Traité {result["users_processed"]} utilisateurs\n'
                    f'  - {result["suggestions_created"]} suggestions créées\n'
                    f'  - {result["notifications_created"]} notifications créées'
                )
            )

        # Nettoyage si demandé
        if options['cleanup']:
            deleted = AsyncSuggestionService.cleanup_old_suggestions(days=options['cleanup_days'])
            self.stdout.write(
                self.style.SUCCESS(f'✓ Nettoyé {deleted} suggestions anciennes')
            )

        self.stdout.write(self.style.SUCCESS('Génération terminée!'))

