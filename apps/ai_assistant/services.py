"""
Service d'intégration avec Mistral AI
"""
import os
import json
from typing import Dict, List, Any, Optional
from mistralai import Mistral
from django.conf import settings
from django.core.cache import cache
from .action_manager import action_manager
import logging

logger = logging.getLogger(__name__)


class MistralService:
    """Service pour interagir avec l'API Mistral AI"""
    
    def __init__(self):
        api_key = getattr(settings, 'MISTRAL_API_KEY', os.getenv('MISTRAL_API_KEY'))
        if not api_key:
            raise ValueError("MISTRAL_API_KEY not configured")
        
        self.client = Mistral(api_key=api_key)
        self.model = getattr(settings, 'MISTRAL_MODEL', 'mistral-large-latest')
        self.tools = self._define_tools()
        
    def create_system_prompt(self) -> str:
        """Crée le prompt système pour l'assistant"""
        return """Tu es un assistant IA pour une application de gestion d'entreprise. Tu peux aider les utilisateurs à :
        
1. Gérer les fournisseurs (créer, rechercher, modifier, supprimer)
2. Créer et suivre les bons de commande
3. Gérer les factures et la facturation
4. Consulter les produits et stocks
5. Gérer les clients
6. Analyser les données et statistiques

Tu peux exécuter des actions dans le système en retournant des commandes JSON structurées.

Format des commandes :
{
    "action": "create_supplier" | "search_supplier" | "create_invoice" | etc.,
    "params": {
        // Paramètres spécifiques à l'action
    }
}

Réponds toujours en français et sois professionnel mais amical."""

    def _define_tools(self) -> List[Dict]:
        """Définit tous les tools/functions disponibles pour Mistral"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "create_supplier",
                    "description": "Crée un nouveau fournisseur dans le système",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Nom du fournisseur (obligatoire)"},
                            "contact_person": {"type": "string", "description": "Nom de la personne de contact"},
                            "email": {"type": "string", "description": "Adresse email du fournisseur"},
                            "phone": {"type": "string", "description": "Numéro de téléphone"},
                            "address": {"type": "string", "description": "Adresse complète"},
                            "city": {"type": "string", "description": "Ville"},
                            "website": {"type": "string", "description": "Site web"},
                            "notes": {"type": "string", "description": "Notes additionnelles"}
                        },
                        "required": ["name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_supplier",
                    "description": "Recherche des fournisseurs par nom, contact ou email",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Terme de recherche"},
                            "status": {
                                "type": "string",
                                "enum": ["active", "pending", "inactive"],
                                "description": "Filtrer par statut"
                            },
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 5)"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_invoice",
                    "description": "Crée une nouvelle facture pour un client",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_name": {"type": "string", "description": "Nom du client"},
                            "description": {"type": "string", "description": "Description de la facture"},
                            "amount": {"type": "number", "description": "Montant total"},
                            "due_date": {"type": "string", "description": "Date d'échéance (format: YYYY-MM-DD)"},
                            "items": {
                                "type": "array",
                                "description": "Liste des articles/services",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "description": {"type": "string"},
                                        "quantity": {"type": "number"},
                                        "unit_price": {"type": "number"}
                                    }
                                }
                            },
                            "tax_rate": {"type": "number", "description": "Taux de TVA (défaut: 20)"}
                        },
                        "required": ["client_name", "description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_purchase_order",
                    "description": "Crée un nouveau bon de commande pour un fournisseur",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "supplier_name": {"type": "string", "description": "Nom du fournisseur"},
                            "description": {"type": "string", "description": "Description de la commande"},
                            "total_amount": {"type": "number", "description": "Montant total"},
                            "delivery_date": {"type": "string", "description": "Date de livraison souhaitée (YYYY-MM-DD)"},
                            "items": {
                                "type": "array",
                                "description": "Liste des articles commandés",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "description": {"type": "string"},
                                        "quantity": {"type": "number"},
                                        "unit_price": {"type": "number"}
                                    }
                                }
                            },
                            "notes": {"type": "string", "description": "Notes pour le fournisseur"}
                        },
                        "required": ["supplier_name", "description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_statistics",
                    "description": "Affiche les statistiques de l'entreprise",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "period": {
                                "type": "string",
                                "enum": ["today", "week", "month", "year"],
                                "description": "Période des statistiques"
                            },
                            "category": {
                                "type": "string",
                                "enum": ["suppliers", "invoices", "revenue", "purchase_orders", "all"],
                                "description": "Catégorie de statistiques"
                            }
                        },
                        "required": ["period"]
                    }
                }
            }
        ]

    def parse_ai_response(self, response: str) -> tuple[str, Optional[Dict]]:
        """Parse la réponse de l'IA pour extraire le texte et les actions"""
        # Chercher du JSON dans la réponse
        try:
            # Essayer de trouver un bloc JSON dans la réponse
            import re
            json_pattern = r'\{[^{}]*\}'
            matches = re.findall(json_pattern, response)
            
            for match in matches:
                try:
                    action_data = json.loads(match)
                    if 'action' in action_data:
                        # Retirer le JSON du texte de réponse
                        clean_response = response.replace(match, '').strip()
                        return clean_response, action_data
                except json.JSONDecodeError:
                    continue
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
        
        return response, None

    async def chat(self,
                   message: str,
                   conversation_history: List[Dict] = None,
                   user_context: Dict = None) -> Dict[str, Any]:
        """
        Envoie un message à Mistral avec function calling et retourne la réponse
        """
        try:
            # Construire les messages
            messages = [
                {"role": "system", "content": self.create_system_prompt()}
            ]

            # Ajouter l'historique si disponible
            if conversation_history:
                for msg in conversation_history[-10:]:
                    messages.append({
                        "role": msg.get('role', 'user'),
                        "content": msg.get('content', '') if msg.get('content') else None,
                        "tool_calls": msg.get('tool_calls') if msg.get('tool_calls') else None
                    })

            # Ajouter le message actuel
            messages.append({"role": "user", "content": message})

            # Appeler Mistral avec tools
            response = self.client.chat.complete(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1500
            )

            # Extraire la réponse
            choice = response.choices[0]
            message_response = choice.message

            result = {
                'success': True,
                'response': message_response.content if message_response.content else "",
                'tool_calls': None,
                'finish_reason': choice.finish_reason
            }

            # Si l'IA a décidé d'appeler des fonctions
            if message_response.tool_calls:
                result['tool_calls'] = [
                    {
                        'id': tool_call.id,
                        'function': tool_call.function.name,
                        'arguments': json.loads(tool_call.function.arguments)
                    }
                    for tool_call in message_response.tool_calls
                ]

                # Si pas de contenu textuel, générer un message par défaut
                if not result['response']:
                    # Créer un message descriptif basé sur les tool_calls
                    action_descriptions = {
                        'create_supplier': "Je vais créer le fournisseur",
                        'create_invoice': "Je vais créer la facture",
                        'create_purchase_order': "Je vais créer le bon de commande",
                        'search_supplier': "Je recherche les fournisseurs",
                        'get_statistics': "Je récupère les statistiques"
                    }

                    actions = [action_descriptions.get(tc['function'], f"J'exécute {tc['function']}")
                              for tc in result['tool_calls']]
                    result['response'] = " et ".join(actions) + "..."

            return result

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Mistral API error: {e}")
            logger.error(f"Full traceback: {error_details}")
            return {
                'response': f"Désolé, j'ai rencontré une erreur: {str(e)}",
                'tool_calls': None,
                'success': False,
                'error': str(e),
                'error_details': error_details
            }
    
    def analyze_document(self, text: str, document_type: str) -> Dict[str, Any]:
        """
        Analyse un document scanné pour extraire les informations
        
        Args:
            text: Texte extrait par OCR
            document_type: Type de document (invoice, purchase_order, etc.)
            
        Returns:
            Dict avec les données extraites
        """
        prompts = {
            'invoice': """Analyse cette facture et extrais les informations suivantes au format JSON:
            - invoice_number: numéro de facture
            - date: date de la facture
            - client_name: nom du client
            - items: liste des articles avec description, quantité, prix unitaire
            - subtotal: sous-total
            - tax: taxes
            - total: total
            
            Texte de la facture:
            """,
            'purchase_order': """Analyse ce bon de commande et extrais les informations suivantes au format JSON:
            - po_number: numéro du bon de commande
            - date: date
            - supplier_name: nom du fournisseur
            - items: liste des articles avec description, quantité, prix
            - total: montant total
            
            Texte du bon de commande:
            """,
            'supplier_list': """Analyse cette liste de fournisseurs et extrais les informations au format JSON:
            - suppliers: liste avec pour chaque fournisseur:
              - name: nom
              - contact: personne contact
              - email: email
              - phone: téléphone
              - address: adresse
            
            Texte:
            """
        }
        
        prompt = prompts.get(document_type, prompts['invoice'])
        
        try:
            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Tu es un expert en extraction de données de documents. Retourne uniquement du JSON valide."
                    },
                    {"role": "user", "content": prompt + text}
                ],
                temperature=0.3,  # Plus déterministe pour l'extraction
                max_tokens=1000
            )
            
            # Extraire et parser le JSON
            json_str = response.choices[0].message.content
            # Nettoyer le JSON si nécessaire
            json_str = json_str.strip()
            if json_str.startswith('```json'):
                json_str = json_str[7:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]
            
            data = json.loads(json_str)
            
            return {
                'success': True,
                'data': data,
                'document_type': document_type
            }
            
        except Exception as e:
            logger.error(f"Document analysis error: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_type': document_type
            }


class ActionExecutor:
    """Exécute les actions demandées par l'IA"""
    
    def __init__(self):
        self.actions = {
            'create_supplier': self.create_supplier,
            'search_supplier': self.search_supplier,
            'create_invoice': self.create_invoice,
            'search_invoice': self.search_invoice,
            'create_purchase_order': self.create_purchase_order,
            'search_purchase_order': self.search_purchase_order,
            'get_stats': self.get_stats,
            # Ajouter d'autres actions ici
        }
    
    async def execute(self, action: str, params: Dict, user) -> Dict[str, Any]:
        """Exécute une action avec les paramètres donnés"""
        # Valider l'action et ses paramètres
        is_valid, errors = action_manager.validate_action_params(action, params)
        if not is_valid:
            return {
                'success': False,
                'error': '; '.join(errors)
            }

        if action not in self.actions:
            return {
                'success': False,
                'error': f"Action '{action}' non reconnue"
            }

        try:
            handler = self.actions[action]
            result = await handler(params, user)

            # Si l'action a réussi, générer les actions de suivi
            if result.get('success'):
                success_actions = action_manager.generate_success_actions(action, result.get('data', {}))
                result['success_actions'] = success_actions

            return result
        except Exception as e:
            logger.error(f"Action execution error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_supplier(self, params: Dict, user) -> Dict:
        """Crée un nouveau fournisseur"""
        from apps.suppliers.models import Supplier
        from asgiref.sync import sync_to_async

        try:
            # Utiliser sync_to_async pour les opérations Django ORM
            @sync_to_async
            def create_supplier_sync():
                return Supplier.objects.create(
                    name=params.get('name'),
                    contact_person=params.get('contact_person', ''),
                    email=params.get('email', ''),
                    phone=params.get('phone', ''),
                    address=params.get('address', ''),
                    city=params.get('city', ''),
                    status='pending'
                )

            supplier = await create_supplier_sync()

            return {
                'success': True,
                'message': f"Fournisseur '{supplier.name}' créé avec succès",
                'data': {
                    'id': str(supplier.id),
                    'name': supplier.name,
                    'contact_person': supplier.contact_person,
                    'email': supplier.email,
                    'entity_type': 'supplier'
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def search_supplier(self, params: Dict, user) -> Dict:
        """Recherche des fournisseurs"""
        from apps.suppliers.models import Supplier
        from django.db.models import Q
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_suppliers_sync():
            query = params.get('query', '')
            suppliers = Supplier.objects.filter(
                Q(name__icontains=query) |
                Q(contact_person__icontains=query) |
                Q(email__icontains=query)
            )[:5]  # Limiter à 5 résultats

            return [{
                'id': str(s.id),
                'name': s.name,
                'contact': s.contact_person,
                'email': s.email,
                'status': s.status
            } for s in suppliers]

        results = await search_suppliers_sync()

        return {
            'success': True,
            'data': results,
            'count': len(results)
        }
    
    async def create_invoice(self, params: Dict, user) -> Dict:
        """Crée une nouvelle facture"""
        from apps.invoicing.models import Invoice, Client
        from asgiref.sync import sync_to_async

        try:
            @sync_to_async
            def create_invoice_sync():
                # Trouver ou créer le client
                client_name = params.get('client_name')
                client = Client.objects.filter(name=client_name).first()

                if not client:
                    client = Client.objects.create(
                        name=client_name,
                        email=params.get('client_email', ''),
                        phone=params.get('client_phone', '')
                    )

                invoice = Invoice.objects.create(
                    title=params.get('title', f'Facture pour {client_name}'),
                    client=client,
                    description=params.get('description', ''),
                    created_by=user
                )

                return {
                    'id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'client_name': client.name
                }

            result = await create_invoice_sync()

            return {
                'success': True,
                'message': f"Facture '{result['invoice_number']}' créée avec succès",
                'data': {
                    **result,
                    'entity_type': 'invoice'
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def search_invoice(self, params: Dict, user) -> Dict:
        """Recherche des factures"""
        from apps.invoicing.models import Invoice
        
        # Implémentation similaire à search_supplier
        pass
    
    async def create_purchase_order(self, params: Dict, user) -> Dict:
        """Crée un bon de commande"""
        from apps.purchase_orders.models import PurchaseOrder
        from apps.suppliers.models import Supplier
        
        # Implémentation similaire à create_invoice
        pass
    
    async def search_purchase_order(self, params: Dict, user) -> Dict:
        """Recherche des bons de commande"""
        from apps.purchase_orders.models import PurchaseOrder
        
        # Implémentation similaire à search_supplier
        pass
    
    async def get_stats(self, params: Dict, user) -> Dict:
        """Récupère les statistiques"""
        from apps.suppliers.models import Supplier
        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder
        from django.db.models import Sum
        from asgiref.sync import sync_to_async

        @sync_to_async
        def get_stats_sync():
            return {
                'total_suppliers': Supplier.objects.count(),
                'active_suppliers': Supplier.objects.filter(status='active').count(),
                'total_invoices': Invoice.objects.count(),
                'unpaid_invoices': Invoice.objects.filter(status='sent').count(),
                'total_revenue': Invoice.objects.filter(status='paid').aggregate(
                    Sum('total_amount')
                )['total_amount__sum'] or 0
            }

        stats = await get_stats_sync()

        return {
            'success': True,
            'data': stats
        }