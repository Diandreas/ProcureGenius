"""
Service d'extraction de clauses de contrat avec Mistral AI
"""
import json
import logging
from typing import Dict, List, Any
from mistralai import Mistral
from django.conf import settings

logger = logging.getLogger(__name__)


class ContractAIService:
    """Service pour l'extraction et l'analyse de clauses de contrat avec Mistral AI"""

    def __init__(self):
        self.client = Mistral(api_key=settings.MISTRAL_API_KEY)
        self.model = settings.MISTRAL_MODEL

    def extract_clauses(self, contract_text: str, language: str = 'fr') -> Dict[str, Any]:
        """
        Extrait les clauses d'un contrat en utilisant Mistral AI

        Args:
            contract_text: Texte complet du contrat
            language: Langue du contrat ('fr' ou 'en')

        Returns:
            Dictionnaire contenant les clauses extraites et l'analyse
        """
        try:
            prompt = self._build_extraction_prompt(contract_text, language)

            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt(language)
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Plus déterministe pour l'extraction
                max_tokens=4000
            )

            content = response.choices[0].message.content

            # Parse la réponse JSON
            result = self._parse_ai_response(content)

            return result

        except Exception as e:
            logger.error(f"Erreur lors de l'extraction de clauses: {str(e)}")
            raise

    def _get_system_prompt(self, language: str) -> str:
        """Retourne le prompt système pour Mistral AI"""
        if language == 'fr':
            return """Tu es un expert juridique spécialisé dans l'analyse de contrats commerciaux.
Ta mission est d'analyser les contrats et d'en extraire les clauses importantes avec une évaluation précise des risques.

Tu dois identifier et extraire:
1. Les clauses de paiement
2. Les clauses de livraison
3. Les garanties
4. Les clauses de responsabilité
5. Les conditions de résiliation
6. Les clauses de confidentialité
7. La propriété intellectuelle
8. La résolution des litiges
9. Les clauses de force majeure
10. Les conditions de renouvellement
11. Les pénalités
12. Les SLA (niveaux de service)

Pour chaque clause, évalue le niveau de risque (faible, moyen, élevé, critique) et fournis une analyse détaillée.

Réponds UNIQUEMENT en JSON selon le format spécifié."""
        else:
            return """You are a legal expert specialized in commercial contract analysis.
Your mission is to analyze contracts and extract important clauses with precise risk assessment.

You must identify and extract:
1. Payment clauses
2. Delivery clauses
3. Warranties
4. Liability clauses
5. Termination conditions
6. Confidentiality clauses
7. Intellectual property
8. Dispute resolution
9. Force majeure clauses
10. Renewal conditions
11. Penalties
12. SLAs (service level agreements)

For each clause, assess the risk level (low, medium, high, critical) and provide detailed analysis.

Respond ONLY in JSON according to the specified format."""

    def _build_extraction_prompt(self, contract_text: str, language: str) -> str:
        """Construit le prompt d'extraction"""
        if language == 'fr':
            return f"""Analyse le contrat suivant et extrais toutes les clauses importantes.

CONTRAT:
{contract_text}

Réponds en JSON avec cette structure exacte:
{{
    "clauses": [
        {{
            "clause_type": "payment|delivery|warranty|liability|termination|confidentiality|intellectual_property|dispute_resolution|force_majeure|renewal|penalty|sla|other",
            "title": "Titre court de la clause",
            "content": "Texte complet de la clause",
            "section_reference": "Référence de section (ex: Article 3.2)",
            "risk_level": "low|medium|high|critical",
            "ai_confidence_score": 85.5,
            "ai_analysis": "Analyse détaillée de la clause",
            "ai_recommendations": "Recommandations pour cette clause"
        }}
    ],
    "summary": "Résumé global du contrat en 2-3 phrases",
    "overall_risk_assessment": "Évaluation globale du risque du contrat",
    "key_dates": [
        {{"date": "2025-12-31", "description": "Date de fin", "importance": "high"}}
    ],
    "recommendations": [
        "Recommandation 1",
        "Recommandation 2"
    ]
}}

IMPORTANT: Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après."""
        else:
            return f"""Analyze the following contract and extract all important clauses.

CONTRACT:
{contract_text}

Respond in JSON with this exact structure:
{{
    "clauses": [
        {{
            "clause_type": "payment|delivery|warranty|liability|termination|confidentiality|intellectual_property|dispute_resolution|force_majeure|renewal|penalty|sla|other",
            "title": "Short clause title",
            "content": "Full clause text",
            "section_reference": "Section reference (e.g., Article 3.2)",
            "risk_level": "low|medium|high|critical",
            "ai_confidence_score": 85.5,
            "ai_analysis": "Detailed clause analysis",
            "ai_recommendations": "Recommendations for this clause"
        }}
    ],
    "summary": "Overall contract summary in 2-3 sentences",
    "overall_risk_assessment": "Overall contract risk assessment",
    "key_dates": [
        {{"date": "2025-12-31", "description": "End date", "importance": "high"}}
    ],
    "recommendations": [
        "Recommendation 1",
        "Recommendation 2"
    ]
}}

IMPORTANT: Respond ONLY with valid JSON, no text before or after."""

    def _parse_ai_response(self, content: str) -> Dict[str, Any]:
        """Parse la réponse JSON de l'IA"""
        try:
            # Nettoie le contenu en retirant les balises markdown si présentes
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()

            # Parse le JSON
            result = json.loads(content)

            # Validation basique
            if 'clauses' not in result:
                result['clauses'] = []
            if 'summary' not in result:
                result['summary'] = ''
            if 'overall_risk_assessment' not in result:
                result['overall_risk_assessment'] = ''
            if 'key_dates' not in result:
                result['key_dates'] = []
            if 'recommendations' not in result:
                result['recommendations'] = []

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Erreur de parsing JSON: {str(e)}\nContenu: {content}")
            # Retourne une structure vide en cas d'erreur
            return {
                'clauses': [],
                'summary': 'Erreur lors de l\'analyse du contrat',
                'overall_risk_assessment': 'Non disponible',
                'key_dates': [],
                'recommendations': ['Veuillez réessayer l\'analyse']
            }

    def analyze_clause_risk(self, clause_text: str, clause_type: str, language: str = 'fr') -> Dict[str, Any]:
        """
        Analyse le risque d'une clause spécifique

        Args:
            clause_text: Texte de la clause
            clause_type: Type de clause
            language: Langue

        Returns:
            Analyse de risque détaillée
        """
        try:
            if language == 'fr':
                prompt = f"""Analyse cette clause de type '{clause_type}' et évalue son niveau de risque:

CLAUSE:
{clause_text}

Réponds en JSON avec cette structure:
{{
    "risk_level": "low|medium|high|critical",
    "confidence_score": 85.5,
    "analysis": "Analyse détaillée",
    "recommendations": "Recommandations",
    "red_flags": ["Point d'attention 1", "Point d'attention 2"]
}}"""
            else:
                prompt = f"""Analyze this '{clause_type}' clause and assess its risk level:

CLAUSE:
{clause_text}

Respond in JSON with this structure:
{{
    "risk_level": "low|medium|high|critical",
    "confidence_score": 85.5,
    "analysis": "Detailed analysis",
    "recommendations": "Recommendations",
    "red_flags": ["Red flag 1", "Red flag 2"]
}}"""

            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt(language)
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=1000
            )

            content = response.choices[0].message.content.strip()

            # Nettoie et parse
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()

            result = json.loads(content)
            return result

        except Exception as e:
            logger.error(f"Erreur lors de l'analyse de risque: {str(e)}")
            return {
                'risk_level': 'medium',
                'confidence_score': 0,
                'analysis': 'Erreur lors de l\'analyse',
                'recommendations': 'Veuillez réessayer',
                'red_flags': []
            }
