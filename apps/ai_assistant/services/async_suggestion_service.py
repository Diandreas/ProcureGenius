"""
Service de génération asynchrone de suggestions intelligentes
S'exécute en arrière-plan pour analyser les données et générer des suggestions
"""
import logging
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from apps.ai_assistant.models import ProactiveSuggestion, AINotification, UserSuggestionHistory
from apps.ai_assistant.intelligent_insights import generate_intelligent_suggestions

logger = logging.getLogger(__name__)
User = get_user_model()


class AsyncSuggestionService:
    """Service pour générer des suggestions de manière asynchrone"""

    @staticmethod
    def generate_suggestions_for_all_users():
        """
        Génère des suggestions pour tous les utilisateurs actifs
        À appeler via une tâche cron ou Celery
        """
        # Récupérer tous les utilisateurs actifs avec une organisation
        users = User.objects.filter(
            is_active=True,
            organization__isnull=False
        ).select_related('organization')

        total_suggestions = 0
        total_notifications = 0

        for user in users:
            try:
                suggestions_created, notifications_created = AsyncSuggestionService.generate_suggestions_for_user(user)
                total_suggestions += suggestions_created
                total_notifications += notifications_created
            except Exception as e:
                logger.error(f"Error generating suggestions for user {user.username}: {e}", exc_info=True)

        logger.info(f"Generated {total_suggestions} suggestions and {total_notifications} notifications for {users.count()} users")
        return {
            'users_processed': users.count(),
            'suggestions_created': total_suggestions,
            'notifications_created': total_notifications
        }

    @staticmethod
    def generate_suggestions_for_user(user):
        """
        Génère des suggestions intelligentes pour un utilisateur spécifique
        
        Returns:
            tuple: (nombre de suggestions créées, nombre de notifications créées)
        """
        if not user.organization:
            logger.warning(f"User {user.username} has no organization, skipping")
            return 0, 0

        # Vérifier si on doit générer de nouvelles suggestions
        # (éviter de générer trop souvent)
        last_suggestion = ProactiveSuggestion.objects.filter(
            trigger_conditions__user_id=str(user.id)
        ).order_by('-created_at').first()

        if last_suggestion:
            # Ne pas générer si déjà généré dans les dernières 6 heures
            time_since_last = timezone.now() - last_suggestion.created_at
            if time_since_last < timedelta(hours=6):
                logger.debug(f"Skipping user {user.username}, suggestions generated recently")
                return 0, 0

        # Générer les suggestions intelligentes
        try:
            intelligent_suggestions = generate_intelligent_suggestions(user)
        except Exception as e:
            logger.error(f"Error generating intelligent suggestions for {user.username}: {e}", exc_info=True)
            return 0, 0

        suggestions_created = 0
        notifications_created = 0

        # Créer des ProactiveSuggestion pour chaque insight
        for insight in intelligent_suggestions[:5]:  # Limiter à 5 suggestions
            # Vérifier si une suggestion similaire existe déjà
            existing = ProactiveSuggestion.objects.filter(
                title=insight.get('title'),
                suggestion_type=insight.get('type', 'optimization'),
                trigger_conditions__user_id=str(user.id)
            ).first()

            if existing:
                # Mettre à jour la priorité si nécessaire
                if insight.get('priority', 5) > existing.priority:
                    existing.priority = insight.get('priority', 5)
                    existing.save()
                continue

            # Créer la suggestion
            suggestion = ProactiveSuggestion.objects.create(
                suggestion_type=insight.get('type', 'optimization'),
                title=insight.get('title', 'Suggestion'),
                message=insight.get('message', ''),
                action_label=insight.get('action_label', ''),
                action_url=insight.get('action_url', ''),
                trigger_conditions={
                    'user_id': str(user.id),
                    'organization_id': str(user.organization.id),
                    **insight.get('data', {})
                },
                priority=insight.get('priority', 5),
                is_active=True,
                max_displays=3
            )
            suggestions_created += 1

            # Créer une notification pour les suggestions critiques (priorité >= 8)
            if insight.get('priority', 5) >= 8:
                notification = AINotification.objects.create(
                    user=user,
                    organization=user.organization,
                    notification_type='insight',
                    title=insight.get('title', 'Nouvelle suggestion'),
                    message=insight.get('message', ''),
                    priority=insight.get('priority', 5),
                    action_url=insight.get('action_url', ''),
                    metadata={
                        'suggestion_id': str(suggestion.id),
                        'suggestion_type': insight.get('type', 'optimization'),
                        'data': insight.get('data', {})
                    },
                    data={
                        'suggestion_id': str(suggestion.id),
                        'suggestion_type': insight.get('type', 'optimization'),
                        'data': insight.get('data', {})
                    }
                )
                notifications_created += 1
                logger.info(f"Created critical notification for user {user.username}: {insight.get('title')}")

        return suggestions_created, notifications_created

    @staticmethod
    def cleanup_old_suggestions(days=30):
        """
        Nettoie les suggestions anciennes qui ne sont plus pertinentes
        
        Args:
            days: Nombre de jours après lesquels supprimer les suggestions inactives
        """
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Supprimer les suggestions inactives anciennes
        deleted = ProactiveSuggestion.objects.filter(
            is_active=False,
            created_at__lt=cutoff_date
        ).delete()
        
        logger.info(f"Cleaned up {deleted[0]} old suggestions")
        return deleted[0]

