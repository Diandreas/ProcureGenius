"""
Services pour les fournisseurs - Calcul automatique des ratings
"""
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class SupplierRatingService:
    """Service pour calculer automatiquement les ratings des fournisseurs"""
    
    # Poids des différents critères
    PUNCTUALITY_WEIGHT = 0.4  # 40%
    QUALITY_WEIGHT = 0.3      # 30%
    PAYMENT_WEIGHT = 0.3       # 30%
    
    @staticmethod
    def calculate_punctuality_score(supplier, days_back=365):
        """
        Calcule le score de ponctualité basé sur les livraisons à temps.
        
        Args:
            supplier: Instance du modèle Supplier
            days_back: Nombre de jours en arrière pour analyser (défaut: 365)
        
        Returns:
            float: Score de 0 à 5.0
        """
        try:
            from apps.purchase_orders.models import PurchaseOrder
            
            cutoff_date = timezone.now() - timedelta(days=days_back)
            
            # Récupérer les purchase orders reçus dans la période
            pos = PurchaseOrder.objects.filter(
                supplier=supplier,
                status__in=['received', 'invoiced'],
                created_at__gte=cutoff_date
            )
            
            if not pos.exists():
                # Pas de données, retourner un score neutre
                return 3.0
            
            on_time_count = 0
            total_count = 0
            
            for po in pos:
                if po.expected_delivery_date and po.updated_at:
                    # Comparer la date de livraison prévue avec la date de réception
                    # On considère qu'un PO est "reçu" quand son statut passe à "received"
                    # La date de réception est approximée par updated_at quand le statut change
                    delivery_date = po.expected_delivery_date
                    received_date = po.updated_at.date()
                    
                    # Si reçu avant ou le jour de la date prévue, c'est à temps
                    if received_date <= delivery_date:
                        on_time_count += 1
                    total_count += 1
            
            if total_count == 0:
                return 3.0
            
            # Score basé sur le pourcentage de livraisons à temps
            on_time_percentage = on_time_count / total_count
            # Convertir en score sur 5.0 (0% = 0.0, 100% = 5.0)
            score = on_time_percentage * 5.0
            
            return min(5.0, max(0.0, score))
            
        except Exception as e:
            logger.error(f"Error calculating punctuality score for supplier {supplier.id}: {e}")
            return 3.0
    
    @staticmethod
    def calculate_quality_score(supplier, days_back=365):
        """
        Calcule le score de qualité basé sur les retours/réclamations.
        
        Note: Pour l'instant, on utilise un score par défaut car il n'y a pas
        encore de modèle pour les retours/réclamations. À améliorer quand
        ce modèle sera ajouté.
        
        Args:
            supplier: Instance du modèle Supplier
            days_back: Nombre de jours en arrière pour analyser (défaut: 365)
        
        Returns:
            float: Score de 0 à 5.0
        """
        try:
            # TODO: Implémenter quand le modèle de retours/réclamations sera disponible
            # Pour l'instant, on retourne un score neutre basé sur le nombre de commandes
            # Plus de commandes = meilleure qualité supposée
            
            from apps.purchase_orders.models import PurchaseOrder
            
            cutoff_date = timezone.now() - timedelta(days=days_back)
            
            pos_count = PurchaseOrder.objects.filter(
                supplier=supplier,
                status__in=['received', 'invoiced'],
                created_at__gte=cutoff_date
            ).count()
            
            # Score basé sur le nombre de commandes (plus = mieux, jusqu'à un certain point)
            if pos_count == 0:
                return 3.0
            elif pos_count < 5:
                return 3.5
            elif pos_count < 10:
                return 4.0
            elif pos_count < 20:
                return 4.5
            else:
                return 5.0
                
        except Exception as e:
            logger.error(f"Error calculating quality score for supplier {supplier.id}: {e}")
            return 3.0
    
    @staticmethod
    def calculate_payment_score(supplier, days_back=365):
        """
        Calcule le score basé sur les délais de paiement des factures.
        
        Args:
            supplier: Instance du modèle Supplier
            days_back: Nombre de jours en arrière pour analyser (défaut: 365)
        
        Returns:
            float: Score de 0 à 5.0
        """
        try:
            from apps.invoicing.models import Invoice
            from apps.purchase_orders.models import PurchaseOrder
            
            cutoff_date = timezone.now() - timedelta(days=days_back)
            
            # Récupérer les factures liées aux purchase orders de ce fournisseur
            pos = PurchaseOrder.objects.filter(
                supplier=supplier,
                created_at__gte=cutoff_date
            )
            
            invoices = Invoice.objects.filter(
                purchase_order__in=pos,
                status__in=['paid', 'overdue']
            )
            
            if not invoices.exists():
                # Pas de données, retourner un score neutre
                return 3.0
            
            on_time_count = 0
            total_count = 0
            
            for invoice in invoices:
                if invoice.status == 'paid' and invoice.due_date:
                    # Vérifier si la facture a été payée à temps
                    # On considère qu'une facture payée est à temps si le statut est 'paid'
                    # et qu'il n'y a pas eu de passage par 'overdue'
                    # Pour simplifier, on considère toutes les factures payées comme à temps
                    on_time_count += 1
                elif invoice.status == 'overdue':
                    # Facture en retard
                    pass
                total_count += 1
            
            if total_count == 0:
                return 3.0
            
            # Score basé sur le pourcentage de factures payées à temps
            on_time_percentage = on_time_count / total_count
            # Convertir en score sur 5.0
            score = on_time_percentage * 5.0
            
            return min(5.0, max(0.0, score))
            
        except Exception as e:
            logger.error(f"Error calculating payment score for supplier {supplier.id}: {e}")
            return 3.0
    
    @classmethod
    def calculate_rating(cls, supplier, days_back=365):
        """
        Calcule le rating global d'un fournisseur.
        
        Args:
            supplier: Instance du modèle Supplier
            days_back: Nombre de jours en arrière pour analyser (défaut: 365)
        
        Returns:
            dict: {
                'rating': float,  # Rating final sur 5.0
                'punctuality_score': float,
                'quality_score': float,
                'payment_score': float,
                'details': dict avec plus d'infos
            }
        """
        punctuality = cls.calculate_punctuality_score(supplier, days_back)
        quality = cls.calculate_quality_score(supplier, days_back)
        payment = cls.calculate_payment_score(supplier, days_back)
        
        # Calcul du rating pondéré
        rating = (
            punctuality * cls.PUNCTUALITY_WEIGHT +
            quality * cls.QUALITY_WEIGHT +
            payment * cls.PAYMENT_WEIGHT
        )
        
        # Arrondir à 1 décimale
        rating = round(rating, 1)
        
        return {
            'rating': rating,
            'punctuality_score': round(punctuality, 1),
            'quality_score': round(quality, 1),
            'payment_score': round(payment, 1),
            'details': {
                'punctuality_weight': cls.PUNCTUALITY_WEIGHT,
                'quality_weight': cls.QUALITY_WEIGHT,
                'payment_weight': cls.PAYMENT_WEIGHT,
            }
        }
    
    @classmethod
    def update_supplier_rating(cls, supplier, days_back=365):
        """
        Met à jour le rating d'un fournisseur dans la base de données.
        
        Args:
            supplier: Instance du modèle Supplier
            days_back: Nombre de jours en arrière pour analyser (défaut: 365)
        
        Returns:
            dict: Résultat du calcul avec le rating mis à jour
        """
        result = cls.calculate_rating(supplier, days_back)
        
        # Mettre à jour le rating dans la base de données
        supplier.rating = Decimal(str(result['rating']))
        supplier.save(update_fields=['rating', 'updated_at'])
        
        return result

