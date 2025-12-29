"""
Service pour matcher les suggestions proactives avec les utilisateurs
Combine suggestions statiques et analyses intelligentes en temps réel
"""
from datetime import datetime, timedelta
from django.db.models import Count, Q
from .models import ProactiveSuggestion, UserSuggestionHistory, AINotification
from .intelligent_insights import generate_intelligent_suggestions
import logging

logger = logging.getLogger(__name__)


class SuggestionMatcher:
    """Service pour déterminer quelles suggestions afficher à un utilisateur"""

    @staticmethod
    def get_suggestions_for_user(user, include_intelligent=True):
        """
        Retourne les suggestions pertinentes pour l'utilisateur
        Combine suggestions statiques et analyses intelligentes en temps réel

        Args:
            user: Utilisateur
            include_intelligent: Si True, inclut les suggestions intelligentes générées dynamiquement

        Limite: Maximum 1 suggestion par jour (fréquence modérée)
        """
        # Vérifier fréquence (max 1/jour) pour suggestions statiques seulement
        last_shown = UserSuggestionHistory.objects.filter(
            user=user,
            displayed_at__gte=datetime.now() - timedelta(days=1)
        ).exists()

        matched = []

        # 1. SUGGESTIONS INTELLIGENTES (prioritaires car basées sur données réelles)
        if include_intelligent and not last_shown:
            try:
                intelligent_insights = generate_intelligent_suggestions(user)
                logger.info(f"Generated {len(intelligent_insights)} intelligent insights for {user.username}")

                # Créer des notifications push pour les insights critiques (priorité >= 8)
                for insight in intelligent_insights:
                    if insight.get('priority', 0) >= 8:
                        SuggestionMatcher._create_notification(user, insight)

                # Retourner le insight le plus important
                if intelligent_insights:
                    return [{'is_intelligent': True, **intelligent_insights[0]}]
            except Exception as e:
                logger.error(f"Error generating intelligent suggestions: {e}")

        # 2. SUGGESTIONS STATIQUES (fallback)
        if last_shown:
            logger.debug(f"User {user.username} already saw a suggestion today")
            return []

        # Récupérer suggestions actives
        active_suggestions = ProactiveSuggestion.objects.filter(
            is_active=True
        )

        for suggestion in active_suggestions:
            # Vérifier si déjà montré trop de fois
            history_count = UserSuggestionHistory.objects.filter(
                user=user,
                suggestion=suggestion
            ).count()

            if history_count >= suggestion.max_displays:
                continue

            # Vérifier conditions de déclenchement
            if SuggestionMatcher._check_conditions(user, suggestion.trigger_conditions):
                matched.append(suggestion)

        # Trier par priorité
        matched.sort(key=lambda x: x.priority, reverse=True)

        # Retourner max 1 suggestion
        return matched[:1] if matched else []

    @staticmethod
    def _create_notification(user, insight):
        """Crée une notification push pour un insight important"""
        try:
            # Vérifier si notification similaire n'existe pas déjà (même titre dans les 24h)
            recent_notif = AINotification.objects.filter(
                user=user,
                title=insight['title'],
                created_at__gte=datetime.now() - timedelta(days=1)
            ).exists()

            if not recent_notif:
                AINotification.objects.create(
                    user=user,
                    notification_type=insight.get('type', 'suggestion'),
                    title=insight['title'],
                    message=insight['message'],
                    action_label=insight.get('action_label', ''),
                    action_url=insight.get('action_url', ''),
                    data=insight.get('data', {})
                )
                logger.info(f"Created push notification for {user.username}: {insight['title']}")
        except Exception as e:
            logger.error(f"Error creating notification: {e}")

    @staticmethod
    def _check_conditions(user, conditions):
        """
        Vérifie si les conditions de déclenchement sont remplies

        Conditions supportées:
        - min_invoices: nombre minimum de factures créées
        - min_clients: nombre minimum de clients
        - min_suppliers: nombre minimum de fournisseurs
        - min_products: nombre minimum de produits
        - never_used_feature: fonctionnalité jamais utilisée
        - has_module: module activé
        """
        if not conditions:
            return True

        try:
            organization = user.organization

            # Vérifier min_invoices
            if 'min_invoices' in conditions:
                from apps.invoicing.models import Invoice
                count = Invoice.objects.filter(organization=organization).count()
                if count < conditions['min_invoices']:
                    return False

            # Vérifier min_clients
            if 'min_clients' in conditions:
                from apps.accounts.models import Client
                count = Client.objects.filter(organization=organization).count()
                if count < conditions['min_clients']:
                    return False

            # Vérifier min_suppliers
            if 'min_suppliers' in conditions:
                from apps.suppliers.models import Supplier
                count = Supplier.objects.filter(organization=organization).count()
                if count < conditions['min_suppliers']:
                    return False

            # Vérifier min_products
            if 'min_products' in conditions:
                from apps.invoicing.models import Product
                count = Product.objects.filter(organization=organization).count()
                if count < conditions['min_products']:
                    return False

            # Vérifier never_used_feature
            if 'never_used_feature' in conditions:
                feature = conditions['never_used_feature']

                if feature == 'email_invoice':
                    # Vérifier si jamais envoyé d'email de facture
                    from apps.analytics.models import ActivityLog
                    has_sent = ActivityLog.objects.filter(
                        user=user,
                        action_type='send',
                        entity_type='invoice'
                    ).exists()
                    if has_sent:
                        return False

                elif feature == 'scan_document':
                    # Vérifier si jamais scanné de document
                    from .models import DocumentScan
                    has_scanned = DocumentScan.objects.filter(user=user).exists()
                    if has_scanned:
                        return False

                elif feature == 'ai_chat':
                    # Vérifier si jamais utilisé l'IA
                    from .models import Conversation
                    has_chatted = Conversation.objects.filter(user=user).exists()
                    if has_chatted:
                        return False

            # Vérifier has_module
            if 'has_module' in conditions:
                module = conditions['has_module']
                if not organization.enabled_modules:
                    return False
                if module not in organization.enabled_modules:
                    return False

            return True

        except Exception as e:
            logger.error(f"Error checking suggestion conditions: {e}")
            return False

    @staticmethod
    def mark_suggestion_displayed(user, suggestion):
        """Marque une suggestion comme affichée"""
        UserSuggestionHistory.objects.get_or_create(
            user=user,
            suggestion=suggestion,
            defaults={'displayed_at': datetime.now()}
        )

    @staticmethod
    def mark_suggestion_dismissed(user, suggestion_id):
        """Marque une suggestion comme rejetée"""
        try:
            history = UserSuggestionHistory.objects.get(
                user=user,
                suggestion_id=suggestion_id
            )
            history.dismissed_at = datetime.now()
            history.save()
            return True
        except UserSuggestionHistory.DoesNotExist:
            logger.warning(f"No history found for user {user.username} and suggestion {suggestion_id}")
            return False

    @staticmethod
    def mark_action_taken(user, suggestion_id):
        """Marque l'action d'une suggestion comme effectuée"""
        try:
            history = UserSuggestionHistory.objects.get(
                user=user,
                suggestion_id=suggestion_id
            )
            history.action_taken = True
            history.save()
            return True
        except UserSuggestionHistory.DoesNotExist:
            logger.warning(f"No history found for user {user.username} and suggestion {suggestion_id}")
            return False

    @staticmethod
    def get_active_suggestions_count(user):
        """Retourne le nombre de suggestions actives disponibles pour l'utilisateur"""
        active_suggestions = ProactiveSuggestion.objects.filter(is_active=True)

        count = 0
        for suggestion in active_suggestions:
            # Vérifier si pas déjà affiché max fois
            history_count = UserSuggestionHistory.objects.filter(
                user=user,
                suggestion=suggestion
            ).count()

            if history_count < suggestion.max_displays:
                # Vérifier conditions
                if SuggestionMatcher._check_conditions(user, suggestion.trigger_conditions):
                    count += 1

        return count


# Instance singleton
suggestion_matcher = SuggestionMatcher()
