import paypalrestsdk
from django.conf import settings
from django.utils.translation import gettext as _
import logging

logger = logging.getLogger(__name__)


class PayPalService:
    """Service pour gérer les interactions avec PayPal"""
    
    def __init__(self):
        """Initialise la configuration PayPal"""
        paypalrestsdk.configure({
            "mode": settings.PAYPAL_MODE,  # sandbox ou live
            "client_id": settings.PAYPAL_CLIENT_ID,
            "client_secret": settings.PAYPAL_CLIENT_SECRET
        })
    
    def create_payment(self, payment_data):
        """
        Crée un paiement PayPal
        
        Args:
            payment_data (dict): Données du paiement contenant:
                - amount (float): Montant
                - currency (str): Devise (CAD, USD, EUR, etc.)
                - description (str): Description
                - invoice_id (str): ID de la facture
                - return_url (str): URL de retour en cas de succès
                - cancel_url (str): URL de retour en cas d'annulation
        
        Returns:
            Payment: Objet Payment PayPal ou None en cas d'erreur
        """
        try:
            payment = paypalrestsdk.Payment({
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": payment_data['return_url'],
                    "cancel_url": payment_data['cancel_url']
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": payment_data['description'],
                            "sku": payment_data['invoice_id'],
                            "price": str(payment_data['amount']),
                            "currency": payment_data['currency'],
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "total": str(payment_data['amount']),
                        "currency": payment_data['currency']
                    },
                    "description": payment_data['description'],
                    "invoice_number": payment_data['invoice_id']
                }]
            })
            
            if payment.create():
                logger.info(f"Paiement PayPal créé avec succès: {payment.id}")
                return payment
            else:
                logger.error(f"Erreur création paiement PayPal: {payment.error}")
                return None
                
        except Exception as e:
            logger.error(f"Exception lors de la création du paiement PayPal: {str(e)}")
            return None
    
    def execute_payment(self, payment_id, payer_id):
        """
        Exécute un paiement PayPal après approbation
        
        Args:
            payment_id (str): ID du paiement PayPal
            payer_id (str): ID du payeur
        
        Returns:
            Payment: Objet Payment exécuté ou None en cas d'erreur
        """
        try:
            payment = paypalrestsdk.Payment.find(payment_id)
            
            if payment.execute({"payer_id": payer_id}):
                logger.info(f"Paiement PayPal exécuté avec succès: {payment_id}")
                return payment
            else:
                logger.error(f"Erreur exécution paiement PayPal {payment_id}: {payment.error}")
                return None
                
        except Exception as e:
            logger.error(f"Exception lors de l'exécution du paiement PayPal: {str(e)}")
            return None
    
    def get_payment_details(self, payment_id):
        """
        Récupère les détails d'un paiement PayPal
        
        Args:
            payment_id (str): ID du paiement PayPal
        
        Returns:
            Payment: Objet Payment ou None en cas d'erreur
        """
        try:
            payment = paypalrestsdk.Payment.find(payment_id)
            return payment
        except Exception as e:
            logger.error(f"Erreur récupération détails paiement PayPal {payment_id}: {str(e)}")
            return None
    
    def refund_payment(self, sale_id, amount=None):
        """
        Rembourse un paiement PayPal
        
        Args:
            sale_id (str): ID de la vente PayPal
            amount (float, optional): Montant à rembourser (remboursement partiel)
        
        Returns:
            Refund: Objet Refund ou None en cas d'erreur
        """
        try:
            sale = paypalrestsdk.Sale.find(sale_id)
            
            refund_data = {}
            if amount:
                refund_data["amount"] = {
                    "total": str(amount),
                    "currency": "CAD"  # À adapter selon la devise
                }
            
            refund = sale.refund(refund_data)
            
            if refund:
                logger.info(f"Remboursement PayPal créé: {refund.id}")
                return refund
            else:
                logger.error(f"Erreur remboursement PayPal: {refund.error if refund else 'Refund is None'}")
                return None
                
        except Exception as e:
            logger.error(f"Exception lors du remboursement PayPal: {str(e)}")
            return None
    
    def create_recurring_payment(self, plan_data):
        """
        Crée un plan de paiement récurrent PayPal
        
        Args:
            plan_data (dict): Données du plan contenant:
                - name (str): Nom du plan
                - description (str): Description
                - amount (float): Montant
                - currency (str): Devise
                - frequency (str): Fréquence (MONTH, YEAR, etc.)
                - cycles (int): Nombre de cycles
        
        Returns:
            BillingPlan: Objet BillingPlan ou None en cas d'erreur
        """
        try:
            billing_plan = paypalrestsdk.BillingPlan({
                "name": plan_data['name'],
                "description": plan_data['description'],
                "merchant_preferences": {
                    "auto_bill_amount": "yes",
                    "cancel_url": plan_data.get('cancel_url', ''),
                    "initial_fail_amount_action": "continue",
                    "max_fail_attempts": "1",
                    "return_url": plan_data.get('return_url', ''),
                    "setup_fee": {
                        "currency": plan_data['currency'],
                        "value": "0"
                    }
                },
                "payment_definitions": [
                    {
                        "amount": {
                            "currency": plan_data['currency'],
                            "value": str(plan_data['amount'])
                        },
                        "cycles": str(plan_data.get('cycles', '0')),  # 0 = infini
                        "frequency": "1",
                        "frequency_interval": plan_data['frequency'],
                        "name": "Regular payment definition",
                        "type": "REGULAR"
                    }
                ],
                "type": "INFINITE"
            })
            
            if billing_plan.create():
                # Activer le plan
                if billing_plan.activate():
                    logger.info(f"Plan de paiement récurrent PayPal créé: {billing_plan.id}")
                    return billing_plan
                else:
                    logger.error(f"Erreur activation plan PayPal: {billing_plan.error}")
                    return None
            else:
                logger.error(f"Erreur création plan PayPal: {billing_plan.error}")
                return None
                
        except Exception as e:
            logger.error(f"Exception lors de la création du plan récurrent PayPal: {str(e)}")
            return None
    
    def create_billing_agreement(self, plan_id, agreement_data):
        """
        Crée un accord de facturation pour les paiements récurrents
        
        Args:
            plan_id (str): ID du plan de facturation
            agreement_data (dict): Données de l'accord
        
        Returns:
            BillingAgreement: Objet BillingAgreement ou None en cas d'erreur
        """
        try:
            from datetime import datetime, timedelta
            
            start_date = (datetime.now() + timedelta(minutes=10)).strftime('%Y-%m-%dT%H:%M:%SZ')
            
            billing_agreement = paypalrestsdk.BillingAgreement({
                "name": agreement_data['name'],
                "description": agreement_data['description'],
                "start_date": start_date,
                "plan": {
                    "id": plan_id
                },
                "payer": {
                    "payment_method": "paypal"
                }
            })
            
            if billing_agreement.create():
                logger.info(f"Accord de facturation PayPal créé: {billing_agreement.id}")
                return billing_agreement
            else:
                logger.error(f"Erreur création accord facturation PayPal: {billing_agreement.error}")
                return None
                
        except Exception as e:
            logger.error(f"Exception lors de la création de l'accord de facturation: {str(e)}")
            return None
    
    def verify_webhook_signature(self, headers, body):
        """
        Vérifie la signature d'un webhook PayPal
        
        Args:
            headers (dict): En-têtes HTTP de la requête
            body (str): Corps de la requête
        
        Returns:
            bool: True si la signature est valide
        """
        try:
            # Récupérer les en-têtes nécessaires
            auth_algo = headers.get('PAYPAL-AUTH-ALGO')
            transmission_id = headers.get('PAYPAL-TRANSMISSION-ID')
            cert_id = headers.get('PAYPAL-CERT-ID')
            transmission_sig = headers.get('PAYPAL-TRANSMISSION-SIG')
            transmission_time = headers.get('PAYPAL-TRANSMISSION-TIME')
            
            if not all([auth_algo, transmission_id, cert_id, transmission_sig, transmission_time]):
                return False
            
            # Vérifier la signature avec l'API PayPal
            webhook_event = paypalrestsdk.WebhookEvent({
                "auth_algo": auth_algo,
                "transmission_id": transmission_id,
                "cert_id": cert_id,
                "transmission_sig": transmission_sig,
                "transmission_time": transmission_time,
                "webhook_id": settings.PAYPAL_WEBHOOK_ID,  # À configurer
                "webhook_event": body
            })
            
            return webhook_event.verify()
            
        except Exception as e:
            logger.error(f"Erreur vérification signature webhook PayPal: {str(e)}")
            return False
    
    def get_transaction_fees(self, payment_id):
        """
        Récupère les frais de transaction PayPal
        
        Args:
            payment_id (str): ID du paiement PayPal
        
        Returns:
            float: Montant des frais ou 0 en cas d'erreur
        """
        try:
            payment = self.get_payment_details(payment_id)
            if payment and payment.transactions:
                transaction = payment.transactions[0]
                if hasattr(transaction, 'related_resources'):
                    for resource in transaction.related_resources:
                        if hasattr(resource, 'sale') and hasattr(resource.sale, 'transaction_fee'):
                            return float(resource.sale.transaction_fee.value)
            return 0.0
        except Exception as e:
            logger.error(f"Erreur récupération frais transaction PayPal: {str(e)}")
            return 0.0


class PayPalWebhookProcessor:
    """Processeur pour les webhooks PayPal"""
    
    def __init__(self):
        self.paypal_service = PayPalService()
    
    def process_webhook(self, headers, body):
        """
        Traite un webhook PayPal
        
        Args:
            headers (dict): En-têtes HTTP
            body (dict): Corps du webhook
        
        Returns:
            bool: True si traité avec succès
        """
        try:
            # Vérifier la signature (en production)
            if settings.PAYPAL_MODE == 'live':
                if not self.paypal_service.verify_webhook_signature(headers, body):
                    logger.warning("Signature webhook PayPal invalide")
                    return False
            
            event_type = body.get('event_type')
            
            # Traiter selon le type d'événement
            if event_type == 'PAYMENT.SALE.COMPLETED':
                return self._handle_payment_completed(body)
            elif event_type == 'PAYMENT.SALE.REFUNDED':
                return self._handle_payment_refunded(body)
            elif event_type == 'BILLING.SUBSCRIPTION.CREATED':
                return self._handle_subscription_created(body)
            elif event_type == 'BILLING.SUBSCRIPTION.CANCELLED':
                return self._handle_subscription_cancelled(body)
            else:
                logger.info(f"Type d'événement PayPal non traité: {event_type}")
                return True
                
        except Exception as e:
            logger.error(f"Erreur traitement webhook PayPal: {str(e)}")
            return False
    
    def _handle_payment_completed(self, webhook_data):
        """Traite un paiement complété"""
        try:
            resource = webhook_data.get('resource', {})
            parent_payment = resource.get('parent_payment')
            
            if parent_payment:
                # Mettre à jour les frais de transaction
                from .models import PayPalTransaction
                transaction = PayPalTransaction.objects.filter(
                    paypal_payment_id=parent_payment
                ).first()
                
                if transaction:
                    fee_amount = float(resource.get('transaction_fee', {}).get('value', 0))
                    gross_amount = float(resource.get('amount', {}).get('total', 0))
                    
                    transaction.fee_amount = fee_amount
                    transaction.net_amount = gross_amount - fee_amount
                    transaction.save()
                    
                    logger.info(f"Transaction PayPal mise à jour: {transaction.paypal_transaction_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur traitement paiement complété: {str(e)}")
            return False
    
    def _handle_payment_refunded(self, webhook_data):
        """Traite un remboursement"""
        try:
            resource = webhook_data.get('resource', {})
            sale_id = resource.get('sale_id')
            
            if sale_id:
                from .models import PayPalTransaction, Payment
                
                # Créer un enregistrement de remboursement
                original_transaction = PayPalTransaction.objects.filter(
                    paypal_transaction_id=sale_id
                ).first()
                
                if original_transaction:
                    refund_amount = float(resource.get('amount', {}).get('total', 0))
                    
                    PayPalTransaction.objects.create(
                        invoice=original_transaction.invoice,
                        paypal_transaction_id=resource.get('id'),
                        transaction_type='refund',
                        status='completed',
                        gross_amount=-refund_amount,  # Négatif pour remboursement
                        fee_amount=0,
                        net_amount=-refund_amount,
                        payer_email=original_transaction.payer_email,
                        raw_data=webhook_data,
                        transaction_date=timezone.now()
                    )
                    
                    # Mettre à jour le statut de la facture si nécessaire
                    original_transaction.invoice.update_status_from_payments()
                    original_transaction.invoice.save()
                    
                    logger.info(f"Remboursement PayPal traité: {resource.get('id')}")
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur traitement remboursement: {str(e)}")
            return False
    
    def _handle_subscription_created(self, webhook_data):
        """Traite la création d'un abonnement"""
        # À implémenter selon les besoins
        return True
    
    def _handle_subscription_cancelled(self, webhook_data):
        """Traite l'annulation d'un abonnement"""
        # À implémenter selon les besoins
        return True