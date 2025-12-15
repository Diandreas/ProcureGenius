"""
Commande Django pour générer des conversations proactives
À exécuter via cron quotidiennement: python manage.py generate_proactive_conversations
"""
from django.core.management.base import BaseCommand
from apps.ai_assistant.services.proactive_conversation_service import ProactiveConversationService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Génère des conversations proactives pour tous les utilisateurs actifs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Générer conversations pour un utilisateur spécifique (ID)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Démarrage de la génération de conversations proactives...'))

        if options['user_id']:
            # Générer pour un utilisateur spécifique
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(id=options['user_id'])
                conversations = ProactiveConversationService.generate_conversations_for_user(user)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Généré {conversations} conversation(s) proactive(s) pour {user.username}'
                    )
                )
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Utilisateur avec ID {options["user_id"]} non trouvé'))
        else:
            # Générer pour tous les utilisateurs
            result = ProactiveConversationService.generate_conversations_for_all_users()
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Traité {result["users_processed"]} utilisateurs\n'
                    f'  - {result["conversations_created"]} conversation(s) proactive(s) créée(s)'
                )
            )

        self.stdout.write(self.style.SUCCESS('Génération terminée!'))

