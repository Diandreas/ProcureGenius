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
        Envoie une alerte email pour un produit avec stock bas

        Args:
            product: Instance du produit
            recipients: Liste d'emails (optionnel, sinon tous les staff)
        """
        if not recipients:
            # Envoyer à tous les utilisateurs staff
            recipients = list(User.objects.filter(
                is_staff=True,
                is_active=True
            ).values_list('email', flat=True))

        if not recipients:
            return

        subject = f"⚠️ Alerte Stock Bas - {product.name}"
        message = f"""
Bonjour,

Le produit suivant est en stock bas :

Produit: {product.name}
Référence: {product.reference}
Stock actuel: {product.stock_quantity}
Seuil d'alerte: {product.low_stock_threshold}
Fournisseur: {product.supplier.name if product.supplier else 'N/A'}

Veuillez passer une commande de réapprovisionnement.

---
ProcureGenius - Système de gestion des achats
"""

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients,
                fail_silently=True,
            )
        except Exception as e:
            print(f"Erreur envoi email alerte stock: {e}")

        # Push notification native
        try:
            from apps.ai_assistant.web_push_service import notify_stock_bas
            users = User.objects.filter(is_staff=True, is_active=True)
            for user in users:
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
        Envoie une alerte email pour un produit en rupture de stock

        Args:
            product: Instance du produit
            recipients: Liste d'emails (optionnel)
        """
        if not recipients:
            recipients = list(User.objects.filter(
                is_staff=True,
                is_active=True
            ).values_list('email', flat=True))

        if not recipients:
            return

        subject = f"🚨 RUPTURE DE STOCK - {product.name}"
        message = f"""
Bonjour,

⚠️ ALERTE URGENTE: Rupture de stock ⚠️

Produit: {product.name}
Référence: {product.reference}
Stock actuel: 0
Fournisseur: {product.supplier.name if product.supplier else 'N/A'}

ACTION REQUISE: Commande urgente de réapprovisionnement nécessaire.

---
ProcureGenius - Système de gestion des achats
"""

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients,
                fail_silently=True,
            )
        except Exception as e:
            print(f"Erreur envoi email alerte rupture: {e}")

        # Push notification native
        try:
            from apps.ai_assistant.web_push_service import notify_stock_rupture
            users = User.objects.filter(is_staff=True, is_active=True)
            for user in users:
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
