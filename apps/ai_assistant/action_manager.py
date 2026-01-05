"""
Gestionnaire d'actions IA configurables
"""
import json
import os
from typing import Dict, List, Any, Optional
from django.conf import settings
from django.urls import reverse
import logging

logger = logging.getLogger(__name__)


class ActionManager:
    """Gestionnaire des actions IA avec configuration JSON"""

    def __init__(self):
        self.config = self._load_config()

    def _load_config(self) -> Dict:
        """Charge la configuration depuis le fichier JSON"""
        config_path = os.path.join(
            os.path.dirname(__file__),
            'actions_config.json'
        )

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {config_path}")
            return {"actions": {}, "workflows": {}, "ui_animations": {}}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config: {e}")
            return {"actions": {}, "workflows": {}, "ui_animations": {}}

    def get_action_config(self, action_name: str) -> Optional[Dict]:
        """Récupère la configuration d'une action"""
        return self.config.get('actions', {}).get(action_name)

    def get_available_actions(self, category: str = None) -> List[Dict]:
        """Récupère toutes les actions disponibles, optionnellement filtrées par catégorie"""
        actions = []

        for action_name, config in self.config.get('actions', {}).items():
            if category is None or config.get('category') == category:
                actions.append({
                    'id': action_name,
                    'name': config.get('name'),
                    'description': config.get('description'),
                    'icon': config.get('icon'),
                    'category': config.get('category')
                })

        return actions

    def validate_action_params(self, action_name: str, params: Dict) -> tuple[bool, List[str]]:
        """Valide les paramètres d'une action"""
        config = self.get_action_config(action_name)
        if not config:
            return False, [f"Action inconnue: {action_name}"]

        errors = []
        required_params = config.get('required_params', [])

        # Vérifier les paramètres obligatoires
        for param in required_params:
            if param not in params or not params[param]:
                errors.append(f"Paramètre obligatoire manquant: {param}")

        return len(errors) == 0, errors

    def generate_success_actions(self, action_name: str, result_data: Dict) -> List[Dict]:
        """Génère les actions de suivi après le succès d'une action"""
        config = self.get_action_config(action_name)
        if not config:
            return []

        success_actions = []

        for action_config in config.get('success_actions', []):
            success_action = self._process_success_action(action_config, result_data)
            if success_action:
                success_actions.append(success_action)

        return success_actions

    def _process_success_action(self, action_config: Dict, result_data: Dict) -> Optional[Dict]:
        """Traite une action de succès en remplaçant les variables"""
        action_type = action_config.get('type')

        if action_type == 'notification':
            return {
                'type': 'notification',
                'message': self._replace_variables(action_config.get('message', ''), result_data),
                'variant': action_config.get('variant', 'success')
            }

        elif action_type == 'redirect_option':
            return {
                'type': 'redirect_option',
                'url': self._replace_variables(action_config.get('url', ''), result_data),
                'label': action_config.get('label', 'Voir'),
                'icon': action_config.get('icon', 'open_in_new')
            }

        elif action_type == 'quick_action':
            return {
                'type': 'quick_action',
                'label': action_config.get('label'),
                'action': action_config.get('action'),
                'params': self._replace_variables_in_dict(
                    action_config.get('params', {}),
                    result_data
                ),
                'icon': action_config.get('icon', 'play_arrow')
            }

        elif action_type == 'file_action':
            return {
                'type': 'file_action',
                'label': action_config.get('label'),
                'url': self._replace_variables(action_config.get('url', ''), result_data),
                'icon': action_config.get('icon', 'download')
            }

        elif action_type == 'refresh_data':
            return {
                'type': 'refresh_data',
                'target': action_config.get('target')
            }

        return None

    def _replace_variables(self, text: str, data: Dict) -> str:
        """Remplace les variables dans le texte avec les données"""
        for key, value in data.items():
            text = text.replace(f'{{{key}}}', str(value))
        return text

    def _replace_variables_in_dict(self, d: Dict, data: Dict) -> Dict:
        """Remplace les variables dans un dictionnaire"""
        result = {}
        for key, value in d.items():
            if isinstance(value, str):
                result[key] = self._replace_variables(value, data)
            else:
                result[key] = value
        return result

    def get_ui_animation_config(self, animation_type: str) -> Dict:
        """Récupère la configuration d'animation UI"""
        return self.config.get('ui_animations', {}).get(animation_type, {})

    def get_quick_responses(self, category: str) -> List[str]:
        """Récupère les réponses rapides pour une catégorie"""
        return self.config.get('quick_responses', {}).get(category, [])

    def get_workflow_config(self, workflow_name: str) -> Optional[Dict]:
        """Récupère la configuration d'un workflow"""
        return self.config.get('workflows', {}).get(workflow_name)

    def create_ai_prompt(self, action_name: str, prompt_type: str, **kwargs) -> str:
        """Crée un prompt IA basé sur la configuration"""
        config = self.get_action_config(action_name)
        if not config:
            return ""

        prompts = config.get('ai_prompts', {})
        prompt_template = prompts.get(prompt_type, '')

        # Remplacer les variables dans le prompt
        for key, value in kwargs.items():
            prompt_template = prompt_template.replace(f'{{{key}}}', str(value))

        return prompt_template

    def get_action_summary(self) -> Dict:
        """Retourne un résumé de toutes les actions disponibles"""
        summary = {
            'total_actions': len(self.config.get('actions', {})),
            'categories': {},
            'workflows': len(self.config.get('workflows', {}))
        }

        for action_name, config in self.config.get('actions', {}).items():
            category = config.get('category', 'other')
            if category not in summary['categories']:
                summary['categories'][category] = 0
            summary['categories'][category] += 1

        return summary


# Instance globale
action_manager = ActionManager()