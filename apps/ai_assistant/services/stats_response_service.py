"""
Service de génération de réponses pour les statistiques
Détecte les requêtes de stats et génère des réponses fluides avec templates
"""
import logging
import re
from typing import Optional, Dict, Any
from apps.ai_assistant.prompts.stats_responses import (
    get_stats_response_template,
    enrich_stats_response_with_insights
)
from apps.api.views import DashboardStatsView

logger = logging.getLogger(__name__)


class StatsResponseService:
    """Service pour détecter et répondre aux requêtes de statistiques"""

    # Mots-clés pour détecter les requêtes de stats
    STATS_KEYWORDS = [
        'statistique', 'stats', 'données', 'chiffres', 'nombres',
        'combien', 'montre', 'affiche', 'donne', 'voir',
        'facture', 'fournisseur', 'client', 'produit', 'commande',
        'revenu', 'vente', 'achat', 'dépense', 'marge',
        'tableau de bord', 'dashboard', 'aperçu', 'résumé'
    ]

    @staticmethod
    def is_stats_request(message: str) -> bool:
        """
        Détecte si le message est une requête de statistiques
        
        Args:
            message: Message de l'utilisateur
            
        Returns:
            True si c'est une requête de stats
        """
        message_lower = message.lower()
        
        # Vérifier la présence de mots-clés de stats
        has_stats_keyword = any(keyword in message_lower for keyword in StatsResponseService.STATS_KEYWORDS)
        
        # Vérifier les patterns spécifiques
        patterns = [
            r'combien.*(facture|fournisseur|client|produit)',
            r'(montre|donne|affiche).*(stat|chiffre|donnée)',
            r'(statistique|stats).*(facture|fournisseur|client)',
            r'analyse.*(comportement|performance|vente)',
        ]
        
        has_pattern = any(re.search(pattern, message_lower) for pattern in patterns)
        
        return has_stats_keyword or has_pattern

    @staticmethod
    def detect_stats_type(message: str) -> Optional[str]:
        """
        Détecte le type de statistiques demandé
        
        Returns:
            Type de stats ('general', 'invoices', 'suppliers', 'clients', 'products') ou None
        """
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['facture', 'invoice', 'revenu', 'vente', 'revenue']):
            return 'invoices'
        elif any(word in message_lower for word in ['fournisseur', 'supplier', 'achat', 'purchase']):
            return 'suppliers'
        elif any(word in message_lower for word in ['client', 'customer', 'comportement', 'habitude']):
            return 'clients'
        elif any(word in message_lower for word in ['produit', 'product', 'stock', 'catalogue']):
            return 'products'
        elif any(word in message_lower for word in ['général', 'global', 'tout', 'all', 'aperçu', 'résumé', 'tableau']):
            return 'general'
        
        return 'general'  # Par défaut

    @staticmethod
    def generate_stats_response(user, message: str) -> Optional[str]:
        """
        Génère une réponse de statistiques fluide
        
        Args:
            user: Utilisateur
            message: Message de l'utilisateur
            
        Returns:
            Réponse formatée ou None si pas de stats
        """
        if not StatsResponseService.is_stats_request(message):
            return None

        try:
            # Détecter le type de stats
            stats_type = StatsResponseService.detect_stats_type(message)
            
            # Récupérer les données depuis DashboardStatsView
            from rest_framework.test import RequestFactory
            from apps.core.modules import get_user_accessible_modules
            
            factory = RequestFactory()
            request = factory.get('/api/v1/dashboard/stats/')
            request.user = user
            
            # Appeler DashboardStatsView pour obtenir les données
            view = DashboardStatsView()
            view.request = request
            response = view.get(request)
            
            if response.status_code != 200:
                logger.error(f"Error fetching dashboard stats: {response.data}")
                return None
            
            stats_data = response.data
            
            # Générer la réponse avec le template
            from apps.ai_assistant.prompts.stats_responses import get_stats_response_template
            response_text = get_stats_response_template(stats_type, stats_data)
            
            # Enrichir avec insights
            response_text = enrich_stats_response_with_insights(response_text, stats_data)
            
            return response_text

        except Exception as e:
            logger.error(f"Error generating stats response: {e}", exc_info=True)
            return None

