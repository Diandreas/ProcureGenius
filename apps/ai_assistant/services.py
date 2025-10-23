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
                    "name": "get_stats",
                    "description": "Affiche les statistiques de l'entreprise (fournisseurs, factures, chiffre d'affaires, bons de commande)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "period": {
                                "type": "string",
                                "enum": ["today", "week", "month", "year", "all"],
                                "description": "Période des statistiques"
                            },
                            "category": {
                                "type": "string",
                                "enum": ["suppliers", "invoices", "revenue", "purchase_orders", "all"],
                                "description": "Catégorie de statistiques"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_client",
                    "description": "Recherche des clients par nom, prénom, email ou entreprise",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Terme de recherche"},
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 5)"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "list_clients",
                    "description": "Liste tous les clients de l'entreprise",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 10)"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_latest_invoice",
                    "description": "Récupère la ou les dernière(s) facture(s) créée(s)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "description": "Nombre de factures récentes à afficher (défaut: 1)"},
                            "client_name": {"type": "string", "description": "Filtrer par nom de client (optionnel)"}
                        },
                        "required": []
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
                        'search_client': "Je recherche les clients",
                        'list_clients': "Je liste les clients",
                        'get_stats': "Je récupère les statistiques",
                        'get_latest_invoice': "Je récupère les dernières factures",
                        'search_invoice': "Je recherche les factures"
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
            'search_client': self.search_client,
            'list_clients': self.list_clients,
            'get_latest_invoice': self.get_latest_invoice,
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
        """Crée un nouveau fournisseur après vérification des doublons"""
        from apps.suppliers.models import Supplier
        from asgiref.sync import sync_to_async
        from .entity_matcher import entity_matcher

        try:
            name = params.get('name')
            email = params.get('email', '')
            phone = params.get('phone', '')

            # Vérifier les doublons potentiels
            @sync_to_async
            def check_similar():
                return entity_matcher.find_similar_suppliers(
                    name=name,
                    email=email if email else None,
                    phone=phone if phone else None
                )

            similar_suppliers = await check_similar()

            # Si des fournisseurs similaires sont trouvés
            if similar_suppliers:
                # Retourner les similarités pour confirmation
                return {
                    'success': False,
                    'error': 'similar_entities_found',
                    'similar_entities': [
                        {
                            'id': str(supplier.id),
                            'name': supplier.name,
                            'email': supplier.email,
                            'phone': supplier.phone,
                            'similarity': score,
                            'reason': entity_matcher.format_match_reason(reason)
                        }
                        for supplier, score, reason in similar_suppliers[:3]
                    ],
                    'message': entity_matcher.create_similarity_message('supplier', similar_suppliers)
                }

            # Aucun doublon, créer le fournisseur
            @sync_to_async
            def create_supplier_sync():
                return Supplier.objects.create(
                    name=name,
                    contact_person=params.get('contact_person', ''),
                    email=email,
                    phone=phone,
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
            import traceback
            logger.error(f"Error creating supplier: {e}")
            logger.error(traceback.format_exc())
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
        from apps.invoicing.models import Invoice
        from apps.accounts.models import Client
        from asgiref.sync import sync_to_async
        from datetime import datetime, timedelta

        try:
            @sync_to_async
            def create_invoice_sync():
                # Trouver ou créer le client (modèle Client, pas CustomUser!)
                client_name = params.get('client_name')
                client_email = params.get('client_email', '')
                client_phone = params.get('client_phone', '')

                # Chercher un client existant par nom ou email
                client = None
                if client_email:
                    client = Client.objects.filter(email=client_email).first()

                if not client and client_name:
                    # Chercher par nom
                    client = Client.objects.filter(name__iexact=client_name).first()

                # Si pas trouvé, créer un nouveau client
                if not client:
                    client = Client.objects.create(
                        name=client_name,
                        email=client_email,
                        phone=client_phone,
                        contact_person=params.get('contact_person', ''),
                        address=params.get('client_address', ''),
                        payment_terms=params.get('payment_terms', 'Net 30'),
                        is_active=True
                    )

                # Créer la facture
                title = params.get('title', f'Facture pour {client_name}')
                description = params.get('description', '')
                amount = params.get('amount', 0)
                due_date = params.get('due_date')

                # Parser la date d'échéance
                if due_date:
                    if isinstance(due_date, str):
                        try:
                            # Essayer plusieurs formats
                            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                                try:
                                    due_date = datetime.strptime(due_date, fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except:
                            due_date = (datetime.now() + timedelta(days=30)).date()
                else:
                    due_date = (datetime.now() + timedelta(days=30)).date()

                invoice = Invoice.objects.create(
                    title=title,
                    client=client,
                    description=description,
                    created_by=user,
                    due_date=due_date,
                    subtotal=amount,
                    total_amount=amount,
                    status='draft'
                )

                # Ajouter des items si fournis
                items = params.get('items', [])
                if items:
                    for item in items:
                        # Utiliser la méthode add_item si elle existe
                        if hasattr(invoice, 'add_item'):
                            invoice.add_item(
                                service_code=item.get('service_code', 'SVC-001'),
                                description=item.get('description', ''),
                                quantity=item.get('quantity', 1),
                                unit_price=item.get('unit_price', 0)
                            )
                    if hasattr(invoice, 'recalculate_totals'):
                        invoice.recalculate_totals()

                return {
                    'id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'client_name': client.name
                }

            result = await create_invoice_sync()

            return {
                'success': True,
                'message': f"Facture '{result['invoice_number']}' créée avec succès pour {result['client_name']}",
                'data': {
                    **result,
                    'entity_type': 'invoice'
                }
            }
        except Exception as e:
            import traceback
            logger.error(f"Error creating invoice: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }
    
    async def search_invoice(self, params: Dict, user) -> Dict:
        """Recherche des factures"""
        from apps.invoicing.models import Invoice
        from django.db.models import Q
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_invoices_sync():
            query = params.get('query', '')
            status_filter = params.get('status')
            limit = params.get('limit', 5)

            invoices_qs = Invoice.objects.filter(
                Q(invoice_number__icontains=query) |
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(client__name__icontains=query) |
                Q(client__email__icontains=query) |
                Q(client__contact_person__icontains=query)
            )

            if status_filter:
                invoices_qs = invoices_qs.filter(status=status_filter)

            invoices = invoices_qs.order_by('-created_at')[:limit]

            return [{
                'id': str(i.id),
                'invoice_number': i.invoice_number,
                'title': i.title,
                'client_name': i.client.name if i.client else 'N/A',
                'total_amount': float(i.total_amount),
                'status': i.status,
                'due_date': str(i.due_date) if i.due_date else None
            } for i in invoices]

        results = await search_invoices_sync()

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"J'ai trouvé {len(results)} facture(s)"
        }
    
    async def create_purchase_order(self, params: Dict, user) -> Dict:
        """Crée un bon de commande"""
        from apps.purchase_orders.models import PurchaseOrder
        from apps.suppliers.models import Supplier
        from asgiref.sync import sync_to_async
        from datetime import datetime, timedelta

        try:
            @sync_to_async
            def create_po_sync():
                # Trouver le fournisseur
                supplier_name = params.get('supplier_name')
                supplier = Supplier.objects.filter(name__icontains=supplier_name).first()

                if not supplier:
                    raise ValueError(f"Fournisseur '{supplier_name}' non trouvé. Créez-le d'abord.")

                # Préparer les données
                description = params.get('description', '')
                total_amount = params.get('total_amount', 0)
                delivery_date = params.get('delivery_date')

                # Parser la date de livraison
                if delivery_date:
                    if isinstance(delivery_date, str):
                        try:
                            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                                try:
                                    delivery_date = datetime.strptime(delivery_date, fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except:
                            delivery_date = (datetime.now() + timedelta(days=30)).date()
                else:
                    delivery_date = (datetime.now() + timedelta(days=30)).date()

                # Créer le bon de commande
                po = PurchaseOrder.objects.create(
                    supplier=supplier,
                    title=f"BC {supplier.name}",
                    description=description,
                    created_by=user,
                    delivery_date=delivery_date,
                    total_amount=total_amount,
                    status='draft'
                )

                # Ajouter des items si fournis
                items = params.get('items', [])
                if items:
                    for item in items:
                        # Logique d'ajout d'items si le modèle PurchaseOrder l'implémente
                        pass

                return {
                    'id': str(po.id),
                    'po_number': po.po_number,
                    'supplier_name': supplier.name
                }

            result = await create_po_sync()

            return {
                'success': True,
                'message': f"Bon de commande '{result['po_number']}' créé avec succès",
                'data': {
                    **result,
                    'entity_type': 'purchase_order'
                }
            }
        except Exception as e:
            import traceback
            logger.error(f"Error creating purchase order: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }
    
    async def search_purchase_order(self, params: Dict, user) -> Dict:
        """Recherche des bons de commande"""
        from apps.purchase_orders.models import PurchaseOrder
        from django.db.models import Q
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_pos_sync():
            query = params.get('query', '')
            limit = params.get('limit', 5)

            pos = PurchaseOrder.objects.filter(
                Q(po_number__icontains=query) |
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(supplier__name__icontains=query)
            ).order_by('-created_at')[:limit]

            return [{
                'id': str(po.id),
                'po_number': po.po_number,
                'title': po.title,
                'supplier_name': po.supplier.name if po.supplier else 'N/A',
                'total_amount': float(po.total_amount),
                'status': po.status,
                'delivery_date': str(po.delivery_date) if po.delivery_date else None
            } for po in pos]

        results = await search_pos_sync()

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"J'ai trouvé {len(results)} bon(s) de commande"
        }
    
    async def get_stats(self, params: Dict, user) -> Dict:
        """Récupère les statistiques"""
        from apps.suppliers.models import Supplier
        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder
        from apps.accounts.models import Client
        from django.db.models import Sum
        from asgiref.sync import sync_to_async

        @sync_to_async
        def get_stats_sync():
            return {
                'total_suppliers': Supplier.objects.count(),
                'active_suppliers': Supplier.objects.filter(status='active').count(),
                'total_clients': Client.objects.filter(is_active=True).count(),
                'total_invoices': Invoice.objects.count(),
                'paid_invoices': Invoice.objects.filter(status='paid').count(),
                'unpaid_invoices': Invoice.objects.filter(status='sent').count(),
                'overdue_invoices': Invoice.objects.filter(status='overdue').count(),
                'total_revenue': Invoice.objects.filter(status='paid').aggregate(
                    Sum('total_amount')
                )['total_amount__sum'] or 0,
                'total_purchase_orders': PurchaseOrder.objects.count(),
                'pending_purchase_orders': PurchaseOrder.objects.filter(status='sent').count()
            }

        stats = await get_stats_sync()

        return {
            'success': True,
            'data': stats,
            'message': f"Statistiques récupérées: {stats['total_invoices']} factures, {stats['total_suppliers']} fournisseurs, {stats['total_clients']} clients"
        }

    async def search_client(self, params: Dict, user) -> Dict:
        """Recherche des clients par nom, email ou contact"""
        from apps.accounts.models import Client
        from django.db.models import Q
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_clients_sync():
            query = params.get('query', '')
            limit = params.get('limit', 5)

            # Chercher dans les clients
            clients = Client.objects.filter(
                Q(name__icontains=query) |
                Q(email__icontains=query) |
                Q(contact_person__icontains=query) |
                Q(phone__icontains=query)
            ).filter(
                is_active=True
            )[:limit]

            return [{
                'id': str(c.id),
                'name': c.name,
                'email': c.email,
                'phone': c.phone or '',
                'contact_person': c.contact_person or '',
                'payment_terms': c.payment_terms
            } for c in clients]

        results = await search_clients_sync()

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"J'ai trouvé {len(results)} client(s)"
        }

    async def list_clients(self, params: Dict, user) -> Dict:
        """Liste tous les clients de l'entreprise"""
        from apps.accounts.models import Client
        from asgiref.sync import sync_to_async

        @sync_to_async
        def list_clients_sync():
            limit = params.get('limit', 10)

            # Récupérer tous les clients actifs
            clients = Client.objects.filter(
                is_active=True
            ).order_by('-created_at')[:limit]

            return [{
                'id': str(c.id),
                'name': c.name,
                'email': c.email,
                'phone': c.phone or '',
                'contact_person': c.contact_person or '',
                'payment_terms': c.payment_terms,
                'created_at': str(c.created_at.date()) if c.created_at else None
            } for c in clients]

        results = await list_clients_sync()

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"Voici les {len(results)} derniers clients"
        }

    async def get_latest_invoice(self, params: Dict, user) -> Dict:
        """Récupère la ou les dernière(s) facture(s) créée(s)"""
        from apps.invoicing.models import Invoice
        from django.db.models import Q
        from asgiref.sync import sync_to_async

        @sync_to_async
        def get_latest_invoices_sync():
            limit = params.get('limit', 1)
            client_name = params.get('client_name')

            invoices_qs = Invoice.objects.all()

            # Filtrer par client si spécifié (utilise le modèle Client)
            if client_name:
                invoices_qs = invoices_qs.filter(
                    Q(client__name__icontains=client_name) |
                    Q(client__email__icontains=client_name) |
                    Q(client__contact_person__icontains=client_name)
                )

            # Trier par date de création (plus récent en premier)
            invoices = invoices_qs.order_by('-created_at')[:limit]

            return [{
                'id': str(i.id),
                'invoice_number': i.invoice_number,
                'title': i.title,
                'client_name': i.client.name if i.client else 'N/A',
                'total_amount': float(i.total_amount),
                'status': i.status,
                'created_at': str(i.created_at.date()) if i.created_at else None,
                'due_date': str(i.due_date) if i.due_date else None
            } for i in invoices]

        results = await get_latest_invoices_sync()

        if not results:
            return {
                'success': True,
                'data': [],
                'count': 0,
                'message': "Aucune facture trouvée"
            }

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"Voici {'la dernière facture' if len(results) == 1 else f'les {len(results)} dernières factures'}"
        }