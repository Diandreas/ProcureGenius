"""
Service de gestion des alertes de stock
"""
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import F
from .models import Product

User = get_user_model()


class StockAlertService:
    """Service pour gérer les alertes de stock bas"""

    @staticmethod
    def check_low_stock_products():
        """
        Vérifie tous les produits physiques avec stock bas

        Returns:
            list: Liste des produits avec stock bas
        """
        low_stock_products = Product.objects.filter(
            product_type='physical',
            is_active=True,
            stock_quantity__lte=F('low_stock_threshold')
        )

        return list(low_stock_products)

    @staticmethod
    def get_out_of_stock_products():
        """
        Retourne tous les produits en rupture de stock

        Returns:
            list: Liste des produits en rupture
        """
        return list(Product.objects.filter(
            product_type='physical',
            stock_quantity=0,
            is_active=True
        ))

    @staticmethod
    def send_low_stock_alert(product, recipients=None):
        """
        Envoie une alerte pour un produit avec stock bas (Email + In-app + Push)
        """
        organization = product.organization
        if not organization:
            return

        # Déterminer les destinataires (Admins et Managers de l'organisation)
        if not recipients:
            recipients_users = User.objects.filter(
                organization=organization,
                role__in=['admin', 'manager'],
                is_active=True
            )
            recipients = list(recipients_users.values_list('email', flat=True))
        else:
            recipients_users = User.objects.filter(email__in=recipients, organization=organization)

        if not recipients:
            return

        subject = f"⚠️ Alerte Stock Bas - {product.name}"
        message = f"""
Bonjour,

Le produit suivant est en stock bas dans votre espace Procura :

Produit: {product.name}
Référence: {product.reference or 'N/A'}
Stock actuel: {product.stock_quantity}
Seuil d'alerte: {product.low_stock_threshold}
Fournisseur: {product.supplier.name if product.supplier else 'N/A'}

Veuillez passer une commande de réapprovisionnement.

---
Procura - Gestion des achats intelligente
"""

        # 1. Alerte Email (via SMTP organisation si configuré)
        try:
            from apps.core.email_utils import get_organization_email_backend
            connection = get_organization_email_backend(organization)
            
            from_email = settings.DEFAULT_FROM_EMAIL
            if connection:
                # Utiliser l'email par défaut de la config si dispo
                from apps.accounts.models import EmailConfiguration
                config = EmailConfiguration.objects.filter(organization=organization).first()
                if config:
                    from_email = config.default_from_email

            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipients,
                connection=connection,
                fail_silently=True,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Erreur envoi email alerte stock: {e}")

        # 2. Notification In-app (AINotification)
        try:
            from apps.ai_assistant.models import AINotification
            for user in recipients_users:
                AINotification.objects.get_or_create(
                    user=user,
                    organization=organization,
                    notification_type='alert',
                    title=f"Stock bas : {product.name}",
                    defaults={
                        'message': f"Il ne reste que {product.stock_quantity} unités de {product.name}. (Seuil: {product.low_stock_threshold})",
                        'action_label': "Voir le produit",
                        'action_url': f"/products/{product.id}",
                        'priority': 7
                    }
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Erreur création notification in-app stock: {e}")

        # 3. Push notification native
        try:
            from apps.ai_assistant.web_push_service import notify_stock_bas
            for user in recipients_users:
                notify_stock_bas(
                    user, product.name,
                    int(product.stock_quantity),
                    int(product.low_stock_threshold),
                    product_id=str(product.id)
                )
        except Exception:
            pass

    @staticmethod
    def send_out_of_stock_alert(product, recipients=None):
        """
        Envoie une alerte pour un produit en rupture de stock (Email + In-app + Push)
        """
        organization = product.organization
        if not organization:
            return

        if not recipients:
            recipients_users = User.objects.filter(
                organization=organization,
                role__in=['admin', 'manager'],
                is_active=True
            )
            recipients = list(recipients_users.values_list('email', flat=True))
        else:
            recipients_users = User.objects.filter(email__in=recipients, organization=organization)

        if not recipients:
            return

        subject = f"🚨 RUPTURE DE STOCK - {product.name}"
        message = f"""
Bonjour,

⚠️ ALERTE URGENTE: Rupture de stock dans votre espace Procura ⚠️

Produit: {product.name}
Référence: {product.reference or 'N/A'}
Stock actuel: 0
Fournisseur: {product.supplier.name if product.supplier else 'N/A'}

ACTION REQUISE: Commande urgente de réapprovisionnement nécessaire.

---
Procura - Gestion des achats intelligente
"""

        # 1. Email
        try:
            from apps.core.email_utils import get_organization_email_backend
            connection = get_organization_email_backend(organization)
            
            from_email = settings.DEFAULT_FROM_EMAIL
            if connection:
                from apps.accounts.models import EmailConfiguration
                config = EmailConfiguration.objects.filter(organization=organization).first()
                if config:
                    from_email = config.default_from_email

            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipients,
                connection=connection,
                fail_silently=True,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Erreur envoi email alerte rupture: {e}")

        # 2. In-app
        try:
            from apps.ai_assistant.models import AINotification
            for user in recipients_users:
                AINotification.objects.get_or_create(
                    user=user,
                    organization=organization,
                    notification_type='alert',
                    title=f"RUPTURE DE STOCK : {product.name}",
                    defaults={
                        'message': f"Le produit {product.name} est en rupture de stock ! Action urgente requise.",
                        'action_label': "Commander",
                        'action_url': f"/purchase-orders/create?product_id={product.id}",
                        'priority': 9
                    }
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Erreur création notification in-app rupture: {e}")

        # 3. Push
        try:
            from apps.ai_assistant.web_push_service import notify_stock_rupture
            for user in recipients_users:
                notify_stock_rupture(user, product.name, product_id=str(product.id))
        except Exception:
            pass


    @staticmethod
    def check_and_send_alerts():
        """
        Vérifie tous les produits et envoie les alertes nécessaires

        Returns:
            dict: Résumé des alertes envoyées
        """
        # Produits en rupture
        out_of_stock = StockAlertService.get_out_of_stock_products()

        # Produits en stock bas (mais pas rupture)
        low_stock = [p for p in StockAlertService.check_low_stock_products()
                     if p.stock_quantity > 0]

        # Envoyer les alertes
        for product in out_of_stock:
            StockAlertService.send_out_of_stock_alert(product)

        for product in low_stock:
            StockAlertService.send_low_stock_alert(product)

        return {
            'out_of_stock_count': len(out_of_stock),
            'low_stock_count': len(low_stock),
            'total_alerts': len(out_of_stock) + len(low_stock)
        }


def check_stock_after_movement(product):
    """
    Vérifie le stock après un mouvement et envoie une alerte si nécessaire

    Args:
        product: Instance du produit
    """
    if product.product_type != 'physical':
        return

    if product.is_out_of_stock:
        StockAlertService.send_out_of_stock_alert(product)
    elif product.is_low_stock:
        StockAlertService.send_low_stock_alert(product)
