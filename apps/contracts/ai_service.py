"""
Service d'extraction de clauses et génération de contrats section par section avec Mistral AI.
Optimisé pour économiser les tokens : chaque section est générée individuellement.
"""
import json
import logging
from typing import Dict, List, Any
from django.conf import settings

logger = logging.getLogger(__name__)


# ===================================================================
# Prompts de génération par type de section
# Chaque section a un prompt court et ciblé → économie de tokens
# ===================================================================

SECTION_PROMPTS = {
    'parties': {
        'instruction': "Rédige la clause d'identification des parties contractantes. Présente chaque partie (nom, adresse, rôle) de manière formelle. Utilise 'ci-après désigné(e)' pour les dénominations abrégées.",
        'max_tokens': 600,
    },
    'object': {
        'instruction': "Rédige la clause définissant l'objet du contrat. Décris précisément les prestations, produits ou engagements convenus. Sois exhaustif sur le périmètre.",
        'max_tokens': 800,
    },
    'duration': {
        'instruction': "Rédige la clause de durée du contrat. Précise la date d'effet, la durée, les conditions de renouvellement (tacite ou express) et les délais de préavis.",
        'max_tokens': 500,
    },
    'obligations_provider': {
        'instruction': "Rédige les obligations du prestataire/fournisseur. Inclus : obligation de moyens/résultat, livraisons, communication, qualité, délais, confidentialité. Numérote les sous-clauses (4.1, 4.2...).",
        'max_tokens': 800,
    },
    'obligations_client': {
        'instruction': "Rédige les obligations du client. Inclus : fourniture des éléments nécessaires, validation et retours dans les délais, paiement, désignation d'un interlocuteur. Numérote les sous-clauses.",
        'max_tokens': 700,
    },
    'financial': {
        'instruction': "Rédige les conditions financières. Inclus : montant total, devise, devis, modalités de facturation, modes de paiement acceptés, pénalités de retard, frais supplémentaires. Sois précis sur les pourcentages de pénalité.",
        'max_tokens': 800,
    },
    'payment_schedule': {
        'instruction': "Rédige l'échéancier de paiement détaillé. Présente sous forme de liste ou tableau : avance à la signature, versements intermédiaires avec dates, solde final. Précise les montants et les conditions de chaque versement.",
        'max_tokens': 600,
    },
    'payment_terms': {
        'instruction': "Rédige les modalités de paiement. Inclus : délais de paiement, moyens acceptés (virement, chèque, etc.), conditions de suspension en cas de retard, pénalités, caractère non-remboursable de l'avance, taxes applicables.",
        'max_tokens': 700,
    },
    'delivery': {
        'instruction': "Rédige les conditions de livraison et transport. Inclus : délais estimés, support technique post-livraison, conditions de modification du cahier des charges, transfert de risque.",
        'max_tokens': 600,
    },
    'acceptance': {
        'instruction': "Rédige la clause de livraison et acceptation. Inclus : modalités de livraison (voie électronique, physique), procédure d'acceptation avec délai de test (ex: 7 jours ouvrés), réserves et corrections, recette finale.",
        'max_tokens': 700,
    },
    'intellectual_property': {
        'instruction': "Rédige la clause de propriété intellectuelle. Inclus : transfert de propriété conditionné au paiement intégral, réserve de propriété avant paiement complet, outils/bibliothèques tiers, droit de référence commerciale.",
        'max_tokens': 700,
    },
    'warranty': {
        'instruction': "Rédige la clause de garantie. Inclus : durée de garantie (ex: 30 jours), périmètre couvert (bugs, anomalies), exclusions de garantie (modifications tierces, services externes), support post-garantie optionnel.",
        'max_tokens': 600,
    },
    'liability': {
        'instruction': "Rédige la clause de limitation de responsabilité. Inclus : plafonnement au montant du contrat, exclusion des dommages indirects (perte de revenus, d'image), clause de force majeure.",
        'max_tokens': 600,
    },
    'confidentiality': {
        'instruction': "Rédige la clause de confidentialité complète. Inclus : définition des informations confidentielles, obligations réciproques de non-divulgation, durée (pendant le contrat + N ans après), exceptions (domaine public, obligation légale).",
        'max_tokens': 700,
    },
    'data_protection': {
        'instruction': "Rédige la clause de protection des données personnelles. Référence les lois applicables (RGPD, CCPA, LPRPDE selon le contexte). Précise les responsabilités du client pour la conformité de l'application déployée.",
        'max_tokens': 500,
    },
    'subcontracting': {
        'instruction': "Rédige la clause de sous-traitance. Précise le droit du prestataire de faire appel à des sous-traitants sous sa responsabilité, avec mêmes obligations de confidentialité et qualité.",
        'max_tokens': 400,
    },
    'termination': {
        'instruction': "Rédige la clause de résiliation complète. Inclus : résiliation d'un commun accord, pour faute (avec mise en demeure 15 jours), à l'initiative du client (indemnité de 20%), à l'initiative du prestataire (remboursement), restitution des éléments sous 15 jours.",
        'max_tokens': 800,
    },
    'force_majeure': {
        'instruction': "Rédige la clause de force majeure. Définis les événements (catastrophe naturelle, guerre, pandémie, cyberattaque, panne infrastructure). Précise les obligations d'information et les conséquences sur le planning.",
        'max_tokens': 400,
    },
    'applicable_law': {
        'instruction': "Rédige la clause de droit applicable et règlement des litiges. Inclus : loi applicable, tentative de résolution amiable (15 jours), médiation optionnelle, attribution de juridiction. Adapte selon la localisation des parties.",
        'max_tokens': 600,
    },
    'general_provisions': {
        'instruction': "Rédige les dispositions générales. Inclus : intégralité de l'accord, modifications par avenant écrit, nullité partielle, non-renonciation, indépendance des parties, interdiction de cession sans accord, modalités de notification.",
        'max_tokens': 700,
    },
    'annexes': {
        'instruction': "Rédige la clause d'annexes. Liste les annexes faisant partie intégrante du contrat : Annexe A (technique), Annexe B (financière), etc. Précise la primauté du contrat en cas de contradiction.",
        'max_tokens': 400,
    },
    'signatures': {
        'instruction': "Rédige le bloc de signatures. Inclus : déclaration d'engagement des parties, mention 'Fait en deux exemplaires', espaces pour signature du prestataire et du client avec nom, qualité, date et signature.",
        'max_tokens': 500,
    },
    'receipt_info': {
        'instruction': "Rédige les informations du reçu de paiement : numéro de reçu, date, référence au contrat, nature du paiement (acompte, versement, solde).",
        'max_tokens': 400,
    },
    'receipt_detail': {
        'instruction': "Rédige le détail financier du reçu : montant reçu, description, montant total du contrat, montant déjà versé, solde restant dû. Précise HT/TTC.",
        'max_tokens': 400,
    },
    'receipt_confirmation': {
        'instruction': "Rédige la confirmation de réception avec espace pour signature du prestataire et du client, mention légale que le reçu tient lieu de preuve de paiement.",
        'max_tokens': 300,
    },
    'custom': {
        'instruction': "Rédige cette section personnalisée de manière professionnelle et juridiquement rigoureuse.",
        'max_tokens': 600,
    },
}


class ContractAIService:
    """Service pour l'extraction, l'analyse et la génération de contrats avec Mistral AI"""

    def __init__(self):
        from mistralai import Mistral
        self.client = Mistral(api_key=settings.MISTRAL_API_KEY)
        self.model = settings.MISTRAL_MODEL

    # ===================================================================
    # NOUVELLE MÉTHODE : Génération section par section (économe en tokens)
    # ===================================================================

    def generate_section(self, section_type: str, section_title: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Génère le contenu HTML d'UNE SEULE section de contrat.
        Beaucoup plus économe en tokens qu'une génération monolithique.

        Args:
            section_type: Type de section (ex: 'parties', 'object', 'financial')
            section_title: Titre affiché (ex: 'ARTICLE 1 — PARTIES CONTRACTANTES')
            context: Données du contrat (titre, type, parties, montant, dates, description, etc.)

        Returns:
            {'content': '<p>HTML de la section</p>', 'tokens_used': 123}
        """
        try:
            prompt_def = SECTION_PROMPTS.get(section_type, SECTION_PROMPTS['custom'])
            max_tokens = prompt_def['max_tokens']

            # Construire un contexte minimal pour économiser les tokens
            context_summary = self._build_minimal_context(context)

            system_prompt = (
                "Tu es un juriste expert en rédaction de contrats commerciaux professionnels. "
                "Tu rédiges des clauses rigoureuses, conformes aux bonnes pratiques juridiques. "
                "Réponds UNIQUEMENT en HTML sémantique (<p>, <strong>, <ul>, <li>, <br>). "
                "PAS de <h1>/<h2> (le titre est géré séparément). PAS de markdown. PAS de commentaires."
            )

            user_prompt = (
                f"CONTEXTE DU CONTRAT:\n{context_summary}\n\n"
                f"SECTION: {section_title}\n"
                f"INSTRUCTION: {prompt_def['instruction']}\n\n"
                "Rédige UNIQUEMENT le contenu de cette section en HTML. "
                "Sois professionnel, précis et rigoureux juridiquement. "
                "Numérote les sous-clauses si pertinent."
            )

            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.35,
                max_tokens=max_tokens
            )

            content = response.choices[0].message.content.strip()
            # Nettoyer les balises code si présentes
            content = self._clean_html_response(content)

            tokens_used = getattr(response, 'usage', None)
            total_tokens = tokens_used.total_tokens if tokens_used else 0

            return {
                'content': content,
                'tokens_used': total_tokens
            }

        except Exception as e:
            logger.error(f"Erreur génération section '{section_type}': {str(e)}")
            raise

    def generate_all_sections(self, contract_type: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Génère TOUTES les sections d'un contrat en parallèle (ThreadPoolExecutor).
        Retourne la liste des sections avec leur contenu, triées par order.
        """
        from .models import CONTRACT_SECTION_DEFINITIONS
        from concurrent.futures import ThreadPoolExecutor, as_completed

        section_defs = CONTRACT_SECTION_DEFINITIONS.get(contract_type, CONTRACT_SECTION_DEFINITIONS['other'])
        results = [None] * len(section_defs)
        total_tokens = 0

        def _generate_one(i, section_def):
            section_type = section_def['type']
            section_title = section_def['title']
            try:
                result = self.generate_section(section_type, section_title, context)
                return i, {
                    'section_type': section_type,
                    'title': section_title,
                    'content': result['content'],
                    'order': i + 1,
                    'tokens_used': result['tokens_used'],
                }
            except Exception as e:
                logger.error(f"Erreur section {section_type}: {e}")
                return i, {
                    'section_type': section_type,
                    'title': section_title,
                    'content': '<p><em>Erreur de génération pour cette section. Veuillez la régénérer.</em></p>',
                    'order': i + 1,
                    'tokens_used': 0,
                }

        # Paralléliser avec max 6 workers pour ne pas surcharger l'API Mistral
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {executor.submit(_generate_one, i, sd): i for i, sd in enumerate(section_defs)}
            for future in as_completed(futures):
                i, section_result = future.result()
                results[i] = section_result
                total_tokens += section_result['tokens_used']

        logger.info(f"Contrat '{contract_type}' généré: {len(results)} sections, {total_tokens} tokens total")
        return results

    def _build_minimal_context(self, context: Dict[str, Any]) -> str:
        """Construit un contexte compact pour minimiser les tokens envoyés"""
        lines = []
        if context.get('title'):
            lines.append(f"Titre: {context['title']}")
        if context.get('contract_type'):
            lines.append(f"Type: {context['contract_type']}")
        if context.get('description'):
            lines.append(f"Objet: {context['description']}")
        if context.get('organization_name'):
            lines.append(f"Notre entreprise: {context['organization_name']}")
        if context.get('organization_address'):
            lines.append(f"Notre adresse: {context['organization_address']}")
        if context.get('counterpart_name'):
            lines.append(f"Contrepartie: {context['counterpart_name']}")
        if context.get('counterpart_address'):
            lines.append(f"Adresse contrepartie: {context['counterpart_address']}")
        if context.get('total_value'):
            currency = context.get('currency', 'CAD')
            lines.append(f"Montant: {context['total_value']} {currency}")
        if context.get('start_date'):
            lines.append(f"Début: {context['start_date']}")
        if context.get('end_date'):
            lines.append(f"Fin: {context['end_date']}")
        if context.get('payment_terms'):
            lines.append(f"Paiement: {context['payment_terms']}")
        if context.get('extra_instructions'):
            lines.append(f"Instructions: {context['extra_instructions']}")
        return '\n'.join(lines)

    def _clean_html_response(self, content: str) -> str:
        """Nettoie les balises markdown/code de la réponse IA"""
        if content.startswith('```html'):
            content = content[7:]
        elif content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        return content.strip()

    # ===================================================================
    # MÉTHODES EXISTANTES (conservées)
    # ===================================================================

    def extract_clauses(self, contract_text: str, language: str = 'fr') -> Dict[str, Any]:
        """Extrait les clauses d'un contrat existant en utilisant Mistral AI"""
        try:
            prompt = self._build_extraction_prompt(contract_text, language)

            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_extraction_system_prompt(language)},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=4000
            )

            content = response.choices[0].message.content
            return self._parse_json_response(content)

        except Exception as e:
            logger.error(f"Erreur lors de l'extraction de clauses: {str(e)}")
            raise

    def analyze_clause_risk(self, clause_text: str, clause_type: str, language: str = 'fr') -> Dict[str, Any]:
        """Analyse le risque d'une clause spécifique"""
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
    "red_flags": ["Point d'attention 1"]
}}"""
            else:
                prompt = f"""Analyze this '{clause_type}' clause and assess its risk level:

CLAUSE:
{clause_text}

Respond in JSON:
{{
    "risk_level": "low|medium|high|critical",
    "confidence_score": 85.5,
    "analysis": "Detailed analysis",
    "recommendations": "Recommendations",
    "red_flags": ["Red flag 1"]
}}"""

            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_extraction_system_prompt(language)},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )

            content = response.choices[0].message.content.strip()
            content = self._clean_html_response(content)
            return json.loads(content)

        except Exception as e:
            logger.error(f"Erreur lors de l'analyse de risque: {str(e)}")
            return {
                'risk_level': 'medium',
                'confidence_score': 0,
                'analysis': 'Erreur lors de l\'analyse',
                'recommendations': 'Veuillez réessayer',
                'red_flags': []
            }

    def generate_from_template(self, template_content: str, prompt_instructions: str, context_data: Dict[str, Any]) -> Dict[str, str]:
        """Génère un document final en fusionnant un modèle avec des données de contexte via l'IA"""
        try:
            context_json = json.dumps(context_data, indent=2, ensure_ascii=False)

            system_prompt = (
                "Tu es un assistant juridique expert en rédaction de contrats. "
                "Ta tâche est de générer un document contractuel final à partir d'un modèle et de données de contexte."
            )

            user_prompt = f"""Voici le modèle de base du document:
{template_content}

Voici les données de contexte à intégrer:
{context_json}

{f'Instructions additionnelles: {prompt_instructions}' if prompt_instructions else ''}

IMPORTANT: Formatte en HTML Sémantique valide (<h1>, <h2>, <strong>, <ul>, <p>, <br>).
Inclus un espace pour les signatures à la fin.
Ne renvoie QUE le code HTML, sans balises ``` et sans commentaire."""

            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.4,
                max_tokens=4000
            )

            generated_content = response.choices[0].message.content.strip()
            generated_content = self._clean_html_response(generated_content)

            return {'generated_content': generated_content}

        except Exception as e:
            logger.error(f"Erreur lors de la génération depuis le modèle: {str(e)}")
            raise

    # ===================================================================
    # HELPERS INTERNES
    # ===================================================================

    def _get_extraction_system_prompt(self, language: str) -> str:
        if language == 'fr':
            return (
                "Tu es un expert juridique spécialisé dans l'analyse de contrats commerciaux. "
                "Analyse les contrats et extrais les clauses avec évaluation des risques. "
                "Réponds UNIQUEMENT en JSON."
            )
        return (
            "You are a legal expert specialized in commercial contract analysis. "
            "Analyze contracts and extract clauses with risk assessment. "
            "Respond ONLY in JSON."
        )

    def _build_extraction_prompt(self, contract_text: str, language: str) -> str:
        structure = """{{
    "clauses": [{{
        "clause_type": "payment|delivery|warranty|liability|termination|confidentiality|intellectual_property|dispute_resolution|force_majeure|renewal|penalty|sla|other",
        "title": "Titre",
        "content": "Texte",
        "section_reference": "Article X",
        "risk_level": "low|medium|high|critical",
        "ai_confidence_score": 85.5,
        "ai_analysis": "Analyse",
        "ai_recommendations": "Recommandations"
    }}],
    "summary": "Résumé",
    "overall_risk_assessment": "Évaluation globale",
    "key_dates": [{{"date": "2025-12-31", "description": "...", "importance": "high"}}],
    "recommendations": ["..."]
}}"""

        if language == 'fr':
            return f"Analyse ce contrat et extrais les clauses.\n\nCONTRAT:\n{contract_text}\n\nRéponds en JSON:\n{structure}\n\nIMPORTANT: JSON valide uniquement."
        return f"Analyze this contract and extract clauses.\n\nCONTRACT:\n{contract_text}\n\nRespond in JSON:\n{structure}\n\nIMPORTANT: Valid JSON only."

    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        """Parse la réponse JSON de l'IA"""
        try:
            content = self._clean_html_response(content)
            result = json.loads(content)

            result.setdefault('clauses', [])
            result.setdefault('summary', '')
            result.setdefault('overall_risk_assessment', '')
            result.setdefault('key_dates', [])
            result.setdefault('recommendations', [])

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Erreur de parsing JSON: {str(e)}\nContenu: {content}")
            return {
                'clauses': [],
                'summary': 'Erreur lors de l\'analyse du contrat',
                'overall_risk_assessment': 'Non disponible',
                'key_dates': [],
                'recommendations': ['Veuillez réessayer l\'analyse']
            }
