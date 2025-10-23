"""
Services pour la gestion des emails E-Sourcing
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import SupplierInvitation, SupplierBid
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service centralisé pour l'envoi d'emails E-Sourcing"""

    @staticmethod
    def send_supplier_invitation(invitation):
        """
        Envoie un email d'invitation à un fournisseur pour un événement e-sourcing

        Args:
            invitation: Instance de SupplierInvitation

        Returns:
            bool: True si envoyé avec succès, False sinon
        """
        try:
            sourcing_event = invitation.sourcing_event
            supplier = invitation.supplier

            # Contexte pour le template
            context = {
                'supplier_name': supplier.name,
                'event_title': sourcing_event.title,
                'event_description': sourcing_event.description,
                'deadline': sourcing_event.deadline,
                'submission_url': f"{settings.FRONTEND_URL}/e-sourcing/events/{sourcing_event.public_token}/submit",
                'access_token': invitation.access_token,
            }

            # Générer le contenu HTML et texte
            html_content = render_to_string('emails/invitation_supplier.html', context)
            text_content = render_to_string('emails/invitation_supplier.txt', context)

            # Créer et envoyer l'email
            email = EmailMultiAlternatives(
                subject=f"Invitation: {sourcing_event.title}",
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[supplier.email],
            )
            email.attach_alternative(html_content, "text/html")
            email.send()

            # Marquer comme envoyé
            invitation.sent_at = timezone.now()
            invitation.save()

            logger.info(f"Email invitation envoyé à {supplier.email} pour l'événement {sourcing_event.id}")
            return True

        except Exception as e:
            logger.error(f"Erreur envoi email invitation: {str(e)}")
            return False

    @staticmethod
    def send_bid_accepted_notification(bid):
        """
        Envoie une notification d'acceptation de soumission

        Args:
            bid: Instance de Bid acceptée

        Returns:
            bool: True si envoyé avec succès, False sinon
        """
        try:
            context = {
                'bidder_email': bid.submitted_by_email,
                'event_title': bid.sourcing_event.title,
                'bid_amount': bid.total_amount,
                'accepted_at': timezone.now(),
            }

            html_content = render_to_string('emails/bid_accepted.html', context)
            text_content = render_to_string('emails/bid_accepted.txt', context)

            email = EmailMultiAlternatives(
                subject=f"Votre soumission a été acceptée - {bid.sourcing_event.title}",
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[bid.submitted_by_email],
            )
            email.attach_alternative(html_content, "text/html")
            email.send()

            logger.info(f"Email acceptation envoyé à {bid.submitted_by_email}")
            return True

        except Exception as e:
            logger.error(f"Erreur envoi email acceptation: {str(e)}")
            return False

    @staticmethod
    def send_bid_rejected_notification(bid):
        """
        Envoie une notification de rejet de soumission

        Args:
            bid: Instance de Bid rejetée

        Returns:
            bool: True si envoyé avec succès, False sinon
        """
        try:
            context = {
                'bidder_email': bid.submitted_by_email,
                'event_title': bid.sourcing_event.title,
                'rejected_at': timezone.now(),
            }

            html_content = render_to_string('emails/bid_rejected.html', context)
            text_content = render_to_string('emails/bid_rejected.txt', context)

            email = EmailMultiAlternatives(
                subject=f"Mise à jour de votre soumission - {bid.sourcing_event.title}",
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[bid.submitted_by_email],
            )
            email.attach_alternative(html_content, "text/html")
            email.send()

            logger.info(f"Email rejet envoyé à {bid.submitted_by_email}")
            return True

        except Exception as e:
            logger.error(f"Erreur envoi email rejet: {str(e)}")
            return False

    @staticmethod
    def send_otp_email(email, otp_code, sourcing_event):
        """
        Envoie un code OTP par email pour la vérification

        Args:
            email: Email du destinataire
            otp_code: Code OTP à 6 chiffres
            sourcing_event: Événement e-sourcing concerné

        Returns:
            bool: True si envoyé avec succès, False sinon
        """
        try:
            context = {
                'otp_code': otp_code,
                'event_title': sourcing_event.title,
                'valid_minutes': 10,
            }

            html_content = render_to_string('emails/otp_verification.html', context)
            text_content = render_to_string('emails/otp_verification.txt', context)

            email_message = EmailMultiAlternatives(
                subject=f"Code de vérification - {sourcing_event.title}",
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            )
            email_message.attach_alternative(html_content, "text/html")
            email_message.send()

            logger.info(f"OTP envoyé à {email}")
            return True

        except Exception as e:
            logger.error(f"Erreur envoi OTP: {str(e)}")
            return False


class EmailLog:
    """Logger pour tracer tous les emails envoyés"""

    @staticmethod
    def log_email_sent(email_type, recipient, event_id, success=True, error_message=None):
        """
        Enregistre l'envoi d'un email dans les logs

        Args:
            email_type: Type d'email (invitation, acceptance, rejection, otp)
            recipient: Email du destinataire
            event_id: ID de l'événement e-sourcing
            success: Statut de l'envoi
            error_message: Message d'erreur si échec
        """
        log_entry = {
            'timestamp': timezone.now(),
            'type': email_type,
            'recipient': recipient,
            'event_id': event_id,
            'success': success,
            'error': error_message,
        }

        if success:
            logger.info(f"Email log: {log_entry}")
        else:
            logger.error(f"Email failed: {log_entry}")
