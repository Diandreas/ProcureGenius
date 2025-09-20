from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from django.conf import settings
from django.utils.translation import gettext as _
from django.utils import timezone
import json
import logging
import time

logger = logging.getLogger(__name__)


class MistralAIService:
    """Service principal pour l'intégration Mistral AI"""
    
    def __init__(self):
        """Initialise le client Mistral AI"""
        self.client = MistralClient(api_key=settings.MISTRAL_API_KEY)
        self.default_model = "mistral-medium"
        self.default_temperature = 0.7
        self.max_tokens = 2000
    
    def process_user_request(self, user_message, user_context):
        """
        Traite une demande utilisateur et détermine l'action à effectuer
        
        Args:
            user_message (str): Message de l'utilisateur
            user_context (dict): Contexte utilisateur (rôle, historique, etc.)
        
        Returns:
            dict: Réponse contenant le message IA et l'action éventuelle
        """
        try:
            start_time = time.time()
            
            # Construire le contexte système
            system_message = self._build_system_context(user_context)
            
            # Préparer les messages pour Mistral
            messages = [
                ChatMessage(role="system", content=system_message),
                ChatMessage(role="user", content=user_message)
            ]
            
            # Ajouter l'historique de conversation
            if user_context.get('conversation_history'):
                for msg in user_context['conversation_history'][-5:]:  # 5 derniers messages
                    messages.insert(-1, ChatMessage(
                        role=msg['role'], 
                        content=msg['content']
                    ))
            
            # Appel à Mistral AI
            response = self.client.chat(
                model=self.default_model,
                messages=messages,
                temperature=self.default_temperature,
                max_tokens=self.max_tokens
            )
            
            response_time = int((time.time() - start_time) * 1000)
            
            # Analyser la réponse pour détecter les actions
            ai_response = response.choices[0].message.content
            action_data = self._extract_action_from_response(ai_response, user_message, user_context)
            
            result = {
                'message': ai_response,
                'model': self.default_model,
                'tokens': response.usage.total_tokens if hasattr(response, 'usage') else 0,
                'response_time': response_time,
                'action': action_data.get('action'),
                'parameters': action_data.get('parameters', {}),
                'confidence': action_data.get('confidence', 0.8)
            }
            
            logger.info(f"Requête IA traitée avec succès - Tokens: {result['tokens']}, Temps: {response_time}ms")
            return result
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement de la requête IA: {str(e)}")
            return {
                'message': _("Désolé, je rencontre un problème technique. Pouvez-vous reformuler votre demande ?"),
                'error': str(e),
                'model': self.default_model,
                'tokens': 0,
                'response_time': 0
            }
    
    def _build_system_context(self, user_context):
        """Construit le message système avec le contexte utilisateur"""
        
        system_prompt = f"""Tu es un assistant IA spécialisé dans la gestion des achats et de la facturation pour l'application ProcureGenius.

CONTEXTE UTILISATEUR:
- Rôle: {user_context.get('user_role', 'utilisateur')}
- Langue: {user_context.get('language', 'français')}
- Entreprise: {user_context.get('tenant_name', 'Non spécifiée')}

TES CAPACITÉS:
1. BONS DE COMMANDE:
   - Créer des bons de commande à partir de descriptions
   - Suggérer des fournisseurs appropriés
   - Analyser et optimiser les commandes
   - Suivre les livraisons

2. FACTURATION:
   - Générer des factures depuis les bons de commande
   - Calculer les taxes canadiennes (TPS/TVH/TVQ)
   - Gérer les relances automatiques
   - Intégrer les paiements PayPal

3. FOURNISSEURS:
   - Rechercher et évaluer des fournisseurs
   - Analyser les performances
   - Suggérer des alternatives
   - Négocier les prix

4. ANALYTICS:
   - Analyser les dépenses
   - Identifier les tendances
   - Détecter les anomalies
   - Générer des rapports

ACTIONS DISPONIBLES:
- create_purchase_order: Créer un bon de commande
- create_invoice: Créer une facture
- send_reminder: Envoyer une relance
- analyze_spend: Analyser les dépenses
- suggest_supplier: Suggérer un fournisseur
- search_products: Rechercher des produits
- generate_report: Générer un rapport

RÈGLES IMPORTANTES:
1. Réponds toujours en {user_context.get('language', 'français')}
2. Sois précis et actionnable
3. Demande confirmation avant les actions importantes
4. Utilise les données du contexte pour personnaliser tes réponses
5. Respecte les permissions selon le rôle utilisateur

Si tu peux exécuter une action concrète, termine ta réponse par:
ACTION: nom_action
PARAMETERS: {{paramètres au format JSON}}
CONFIDENCE: score de confiance (0.0 à 1.0)
"""
        
        return system_prompt
    
    def _extract_action_from_response(self, ai_response, user_message, user_context):
        """Extrait une action potentielle de la réponse IA"""
        
        action_data = {}
        
        # Rechercher les marqueurs d'action dans la réponse
        lines = ai_response.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('ACTION:'):
                action_data['action'] = line.replace('ACTION:', '').strip()
            elif line.startswith('PARAMETERS:'):
                try:
                    params_str = line.replace('PARAMETERS:', '').strip()
                    action_data['parameters'] = json.loads(params_str)
                except json.JSONDecodeError:
                    action_data['parameters'] = {}
            elif line.startswith('CONFIDENCE:'):
                try:
                    confidence_str = line.replace('CONFIDENCE:', '').strip()
                    action_data['confidence'] = float(confidence_str)
                except ValueError:
                    action_data['confidence'] = 0.8
        
        # Si aucune action explicite, essayer de détecter par analyse du texte
        if not action_data.get('action'):
            action_data = self._detect_implicit_action(user_message, user_context)
        
        return action_data
    
    def _detect_implicit_action(self, user_message, user_context):
        """Détecte implicitement une action basée sur le message utilisateur"""
        
        message_lower = user_message.lower()
        
        # Patterns de détection d'actions
        if any(word in message_lower for word in ['créer', 'nouveau', 'commande', 'commander']):
            if any(word in message_lower for word in ['bon', 'commande', 'bc']):
                return {
                    'action': 'create_purchase_order',
                    'parameters': {'description': user_message},
                    'confidence': 0.7
                }
        
        if any(word in message_lower for word in ['facture', 'facturer', 'invoice']):
            return {
                'action': 'create_invoice',
                'parameters': {'description': user_message},
                'confidence': 0.7
            }
        
        if any(word in message_lower for word in ['analyse', 'rapport', 'statistique', 'dépense']):
            return {
                'action': 'analyze_spend',
                'parameters': {'query': user_message},
                'confidence': 0.6
            }
        
        if any(word in message_lower for word in ['fournisseur', 'supplier', 'cherche', 'trouve']):
            return {
                'action': 'suggest_supplier',
                'parameters': {'requirements': user_message},
                'confidence': 0.6
            }
        
        return {}
    
    def create_po_from_natural_request(self, user_request, user):
        """
        Crée un bon de commande à partir d'une demande en langage naturel
        
        Args:
            user_request (str): Demande utilisateur
            user (User): Utilisateur faisant la demande
        
        Returns:
            dict: Données du bon de commande à créer
        """
        try:
            # Prompt spécialisé pour extraction de données de bon de commande
            extraction_prompt = f"""
Analyse cette demande de bon de commande et extrais les informations structurées:

DEMANDE: "{user_request}"

Extrais et formate les informations suivantes au format JSON:
{{
    "items": [
        {{
            "description": "description du produit/service",
            "quantity": nombre,
            "unit": "unité (ex: pièce, kg, m²)",
            "estimated_unit_price": prix_estimé_ou_null
        }}
    ],
    "supplier_requirements": "critères pour choisir le fournisseur",
    "priority": "low|medium|high|urgent",
    "expected_delivery": "YYYY-MM-DD ou null",
    "notes": "notes additionnelles",
    "confidence": score_de_confiance_0_à_1
}}

Réponds UNIQUEMENT avec le JSON, sans autre texte.
"""
            
            messages = [
                ChatMessage(role="system", content="Tu es un expert en extraction de données pour les bons de commande."),
                ChatMessage(role="user", content=extraction_prompt)
            ]
            
            response = self.client.chat(
                model="mistral-small",  # Modèle plus rapide pour l'extraction
                messages=messages,
                temperature=0.3,  # Plus déterministe
                max_tokens=1000
            )
            
            # Parser la réponse JSON
            extracted_data = json.loads(response.choices[0].message.content)
            
            # Suggérer un fournisseur approprié
            supplier = self._suggest_best_supplier(extracted_data.get('supplier_requirements', ''))
            
            if supplier:
                po_data = {
                    'supplier': supplier.id,
                    'priority': extracted_data.get('priority', 'medium'),
                    'expected_delivery': extracted_data.get('expected_delivery'),
                    'notes': extracted_data.get('notes', ''),
                    'order_date': timezone.now().date(),
                    'created_by_ai': True,
                    'ai_confidence_score': extracted_data.get('confidence', 0.8),
                    'items': extracted_data.get('items', [])
                }
                
                return po_data
            else:
                raise Exception(_("Aucun fournisseur approprié trouvé"))
                
        except Exception as e:
            logger.error(f"Erreur création BC via IA: {str(e)}")
            raise e
    
    def generate_invoice_from_po(self, purchase_order):
        """
        Génère une facture à partir d'un bon de commande
        
        Args:
            purchase_order: Instance de PurchaseOrder
        
        Returns:
            dict: Données de la facture à créer
        """
        try:
            # Utiliser les données du BC pour créer la facture
            invoice_data = {
                'purchase_order': purchase_order.id,
                'billing_address': purchase_order.billing_address,
                'payment_terms': purchase_order.payment_terms,
                'notes': f'Facture générée automatiquement depuis le BC {purchase_order.number}',
                'invoice_date': timezone.now().date(),
                'generated_by_ai': True,
                'items': []
            }
            
            # Copier les lignes du BC
            for item in purchase_order.items.all():
                invoice_data['items'].append({
                    'description': item.description,
                    'quantity': float(item.quantity_received or item.quantity),
                    'unit_price': float(item.unit_price.amount),
                    'account_code': ''
                })
            
            return invoice_data
            
        except Exception as e:
            logger.error(f"Erreur génération facture via IA: {str(e)}")
            raise e
    
    def analyze_purchase_order(self, purchase_order):
        """
        Analyse un bon de commande avec l'IA
        
        Args:
            purchase_order: Instance de PurchaseOrder
        
        Returns:
            dict: Analyse détaillée
        """
        try:
            # Construire le prompt d'analyse
            analysis_prompt = f"""
Analyse ce bon de commande et fournis des insights:

BON DE COMMANDE:
- Numéro: {purchase_order.number}
- Fournisseur: {purchase_order.supplier.name}
- Montant total: {purchase_order.total_amount}
- Statut: {purchase_order.get_status_display()}
- Priorité: {purchase_order.get_priority_display()}

ARTICLES:
{chr(10).join([f"- {item.description}: {item.quantity} x {item.unit_price}" for item in purchase_order.items.all()])}

Analyse et fournis:
1. Évaluation du prix (comparé au marché)
2. Risques potentiels
3. Recommandations d'optimisation
4. Score de qualité global (0-100)

Format JSON:
{{
    "price_analysis": "analyse des prix",
    "risks": ["risque1", "risque2"],
    "recommendations": ["recommandation1", "recommandation2"],
    "quality_score": score_0_à_100,
    "summary": "résumé en 2-3 phrases"
}}
"""
            
            messages = [
                ChatMessage(role="system", content="Tu es un expert en analyse d'achats et procurement."),
                ChatMessage(role="user", content=analysis_prompt)
            ]
            
            response = self.client.chat(
                model="mistral-medium",
                messages=messages,
                temperature=0.3,
                max_tokens=1500
            )
            
            analysis = json.loads(response.choices[0].message.content)
            analysis['analyzed_at'] = timezone.now().isoformat()
            analysis['analyzed_by_ai'] = True
            
            return analysis
            
        except Exception as e:
            logger.error(f"Erreur analyse BC via IA: {str(e)}")
            return {
                'error': str(e),
                'summary': _("Impossible d'analyser ce bon de commande pour le moment."),
                'analyzed_at': timezone.now().isoformat()
            }
    
    def suggest_suppliers_for_request(self, requirements):
        """
        Suggère des fournisseurs appropriés pour une demande
        
        Args:
            requirements (str): Description des besoins
        
        Returns:
            list: Liste des fournisseurs suggérés avec scores
        """
        try:
            from apps.suppliers.models import Supplier
            
            # Récupérer les fournisseurs actifs
            suppliers = Supplier.objects.filter(is_active=True).prefetch_related('categories')
            
            # Utiliser l'IA pour scorer chaque fournisseur
            suggestions = []
            
            for supplier in suppliers[:20]:  # Limiter pour éviter trop d'appels API
                score = self._score_supplier_for_requirements(supplier, requirements)
                if score > 0.3:  # Seuil minimum
                    suggestions.append({
                        'supplier': supplier,
                        'score': score,
                        'reasoning': f"Score de pertinence: {score:.2f}"
                    })
            
            # Trier par score décroissant
            suggestions.sort(key=lambda x: x['score'], reverse=True)
            
            return suggestions[:5]  # Top 5
            
        except Exception as e:
            logger.error(f"Erreur suggestion fournisseurs: {str(e)}")
            return []
    
    def _score_supplier_for_requirements(self, supplier, requirements):
        """
        Score un fournisseur pour des exigences données
        
        Args:
            supplier: Instance de Supplier
            requirements (str): Exigences
        
        Returns:
            float: Score de 0.0 à 1.0
        """
        try:
            # Construire le profil du fournisseur
            supplier_profile = f"""
Fournisseur: {supplier.name}
Catégories: {', '.join([cat.name for cat in supplier.categories.all()])}
Localisation: {supplier.city}, {supplier.get_province_display()}
Note: {supplier.rating}/5
Performance IA: {supplier.ai_performance_score}/100
Local: {'Oui' if supplier.is_local else 'Non'}
"""
            
            scoring_prompt = f"""
Évalue la pertinence de ce fournisseur pour ces exigences:

FOURNISSEUR:
{supplier_profile}

EXIGENCES:
{requirements}

Donne un score de 0.0 à 1.0 basé sur:
- Correspondance des catégories de produits
- Localisation géographique
- Performance historique
- Capacités estimées

Réponds UNIQUEMENT avec le score numérique (ex: 0.85)
"""
            
            messages = [
                ChatMessage(role="system", content="Tu es un expert en évaluation de fournisseurs."),
                ChatMessage(role="user", content=scoring_prompt)
            ]
            
            response = self.client.chat(
                model="mistral-small",
                messages=messages,
                temperature=0.1,
                max_tokens=50
            )
            
            score_text = response.choices[0].message.content.strip()
            return float(score_text)
            
        except Exception as e:
            logger.error(f"Erreur scoring fournisseur {supplier.name}: {str(e)}")
            return 0.0
    
    def _suggest_best_supplier(self, requirements):
        """Suggère le meilleur fournisseur pour des exigences"""
        
        suggestions = self.suggest_suppliers_for_request(requirements)
        
        if suggestions:
            return suggestions[0]['supplier']
        
        return None
    
    def extract_invoice_data_from_document(self, document_content):
        """
        Extrait les données de facture depuis un document (OCR + IA)
        
        Args:
            document_content (str): Contenu du document
        
        Returns:
            dict: Données extraites
        """
        try:
            extraction_prompt = f"""
Extrais les informations de cette facture:

CONTENU DOCUMENT:
{document_content}

Extrais au format JSON:
{{
    "invoice_number": "numéro de facture",
    "supplier_name": "nom du fournisseur",
    "invoice_date": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD",
    "total_amount": montant_total,
    "tax_amount": montant_taxes,
    "items": [
        {{
            "description": "description",
            "quantity": nombre,
            "unit_price": prix_unitaire,
            "total": total_ligne
        }}
    ],
    "confidence": score_confiance_0_à_1
}}

Si certaines informations sont manquantes, utilise null.
"""
            
            messages = [
                ChatMessage(role="system", content="Tu es un expert en extraction de données de factures."),
                ChatMessage(role="user", content=extraction_prompt)
            ]
            
            response = self.client.chat(
                model="mistral-medium",
                messages=messages,
                temperature=0.2,
                max_tokens=1500
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error(f"Erreur extraction données facture: {str(e)}")
            return {'error': str(e), 'confidence': 0.0}
    
    def generate_spend_analysis(self, period_data):
        """
        Génère une analyse des dépenses avec insights IA
        
        Args:
            period_data (dict): Données de dépenses sur une période
        
        Returns:
            dict: Analyse et recommandations
        """
        try:
            analysis_prompt = f"""
Analyse ces données de dépenses et fournis des insights:

DONNÉES DE DÉPENSES:
{json.dumps(period_data, indent=2)}

Fournis une analyse au format JSON:
{{
    "key_insights": ["insight1", "insight2", "insight3"],
    "trends": {{
        "direction": "increasing|decreasing|stable",
        "percentage_change": pourcentage,
        "main_drivers": ["facteur1", "facteur2"]
    }},
    "recommendations": [
        {{
            "action": "action recommandée",
            "impact": "impact estimé",
            "priority": "high|medium|low"
        }}
    ],
    "anomalies": ["anomalie1", "anomalie2"],
    "summary": "résumé exécutif en 2-3 phrases"
}}
"""
            
            messages = [
                ChatMessage(role="system", content="Tu es un expert en analyse financière et procurement."),
                ChatMessage(role="user", content=analysis_prompt)
            ]
            
            response = self.client.chat(
                model="mistral-medium",
                messages=messages,
                temperature=0.4,
                max_tokens=2000
            )
            
            analysis = json.loads(response.choices[0].message.content)
            analysis['generated_at'] = timezone.now().isoformat()
            
            return analysis
            
        except Exception as e:
            logger.error(f"Erreur analyse dépenses: {str(e)}")
            return {
                'error': str(e),
                'summary': _("Impossible d'analyser les dépenses pour le moment.")
            }
    
    def generate_smart_reminders(self, overdue_invoices):
        """
        Génère des relances intelligentes personnalisées
        
        Args:
            overdue_invoices: QuerySet des factures en retard
        
        Returns:
            dict: Relances personnalisées par facture
        """
        try:
            reminders = {}
            
            for invoice in overdue_invoices[:10]:  # Limiter à 10 pour éviter trop d'appels
                # Analyser l'historique de paiement du client
                client_history = self._get_client_payment_history(invoice.client)
                
                reminder_prompt = f"""
Génère une relance personnalisée pour cette facture en retard:

FACTURE:
- Numéro: {invoice.number}
- Client: {invoice.client.name}
- Montant: {invoice.total_amount}
- Date d'échéance: {invoice.due_date}
- Jours de retard: {(timezone.now().date() - invoice.due_date).days}

HISTORIQUE CLIENT:
{client_history}

Génère une relance au ton approprié (ferme mais professionnel) au format JSON:
{{
    "subject": "sujet email",
    "body": "corps du message",
    "tone": "friendly|firm|urgent",
    "recommended_action": "action recommandée"
}}
"""
                
                messages = [
                    ChatMessage(role="system", content="Tu es un expert en recouvrement de créances professionnel."),
                    ChatMessage(role="user", content=reminder_prompt)
                ]
                
                response = self.client.chat(
                    model="mistral-small",
                    messages=messages,
                    temperature=0.6,
                    max_tokens=800
                )
                
                reminder_data = json.loads(response.choices[0].message.content)
                reminders[str(invoice.id)] = reminder_data
            
            return reminders
            
        except Exception as e:
            logger.error(f"Erreur génération relances: {str(e)}")
            return {}
    
    def _get_client_payment_history(self, client):
        """Récupère l'historique de paiement d'un client"""
        
        from apps.invoicing.models import Invoice, Payment
        
        # Statistiques de paiement du client
        client_invoices = Invoice.objects.filter(client=client)
        total_invoices = client_invoices.count()
        paid_invoices = client_invoices.filter(status='paid').count()
        
        if total_invoices > 0:
            payment_rate = (paid_invoices / total_invoices) * 100
            
            # Délai moyen de paiement
            paid_with_payments = client_invoices.filter(
                status='paid',
                payments__isnull=False
            ).distinct()
            
            avg_payment_days = 0
            if paid_with_payments.exists():
                total_days = 0
                count = 0
                for invoice in paid_with_payments:
                    last_payment = invoice.payments.order_by('-payment_date').first()
                    if last_payment:
                        days = (last_payment.payment_date - invoice.invoice_date).days
                        total_days += days
                        count += 1
                
                if count > 0:
                    avg_payment_days = total_days / count
            
            return f"""
Historique de paiement:
- Taux de paiement: {payment_rate:.1f}% ({paid_invoices}/{total_invoices} factures)
- Délai moyen de paiement: {avg_payment_days:.0f} jours
- Comportement: {'Bon payeur' if payment_rate > 80 and avg_payment_days < 45 else 'Attention requise'}
"""
        else:
            return "Nouveau client - Pas d'historique de paiement"