"""
Service d'intégration avec Mistral AI
"""
import os
import json
from typing import Dict, List, Any, Optional
from mistralai import Mistral
from django.conf import settings
from django.core.cache import cache
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
        Envoie un message à Mistral et retourne la réponse
        
        Args:
            message: Message de l'utilisateur
            conversation_history: Historique de la conversation
            user_context: Contexte utilisateur (entreprise, permissions, etc.)
            
        Returns:
            Dict contenant la réponse et éventuellement une action à exécuter
        """
        try:
            # Construire les messages
            messages = [
                {"role": "system", "content": self.create_system_prompt()}
            ]

            # Ajouter l'historique si disponible
            if conversation_history:
                for msg in conversation_history[-10:]:  # Garder les 10 derniers messages
                    messages.append({
                        "role": msg.get('role', 'user'),
                        "content": msg.get('content', '')
                    })

            # Ajouter le message actuel
            messages.append({"role": "user", "content": message})
            
            # Appeler Mistral
            response = self.client.chat.complete(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            # Extraire la réponse
            ai_response = response.choices[0].message.content
            
            # Parser pour les actions
            text_response, action_data = self.parse_ai_response(ai_response)
            
            result = {
                'response': text_response,
                'action': action_data,
                'success': True
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Mistral API error: {e}")
            return {
                'response': "Désolé, j'ai rencontré une erreur. Veuillez réessayer.",
                'action': None,
                'success': False,
                'error': str(e)
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
        if action not in self.actions:
            return {
                'success': False,
                'error': f"Action '{action}' non reconnue"
            }
        
        try:
            handler = self.actions[action]
            result = await handler(params, user)
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
        
        try:
            supplier = Supplier.objects.create(
                name=params.get('name'),
                contact_person=params.get('contact_person', ''),
                email=params.get('email', ''),
                phone=params.get('phone', ''),
                address=params.get('address', ''),
                city=params.get('city', ''),
                status='pending'
            )
            
            return {
                'success': True,
                'message': f"Fournisseur '{supplier.name}' créé avec succès",
                'data': {
                    'id': str(supplier.id),
                    'name': supplier.name
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
        
        query = params.get('query', '')
        suppliers = Supplier.objects.filter(
            Q(name__icontains=query) |
            Q(contact_person__icontains=query) |
            Q(email__icontains=query)
        )[:5]  # Limiter à 5 résultats
        
        results = [{
            'id': str(s.id),
            'name': s.name,
            'contact': s.contact_person,
            'email': s.email,
            'status': s.status
        } for s in suppliers]
        
        return {
            'success': True,
            'data': results,
            'count': len(results)
        }
    
    async def create_invoice(self, params: Dict, user) -> Dict:
        """Crée une nouvelle facture"""
        from apps.invoicing.models import Invoice, Client
        
        try:
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
                'success': True,
                'message': f"Facture '{invoice.invoice_number}' créée avec succès",
                'data': {
                    'id': str(invoice.id),
                    'invoice_number': invoice.invoice_number
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
        
        stats = {
            'total_suppliers': Supplier.objects.count(),
            'active_suppliers': Supplier.objects.filter(status='active').count(),
            'total_invoices': Invoice.objects.count(),
            'unpaid_invoices': Invoice.objects.filter(status='sent').count(),
            'total_revenue': Invoice.objects.filter(status='paid').aggregate(
                Sum('total_amount')
            )['total_amount__sum'] or 0
        }
        
        return {
            'success': True,
            'data': stats
        }