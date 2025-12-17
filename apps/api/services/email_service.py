"""
Service d'envoi d'emails pour les factures et documents
"""
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from django.http import HttpResponse
from io import BytesIO
from .pdf_generator_weasy import generate_invoice_pdf_weasy
from apps.core.email_utils import configure_django_email_settings, restore_django_email_settings
import logging

logger = logging.getLogger(__name__)


class InvoiceEmailService:
    """Service pour envoyer des factures par email avec PDF attaché"""

    @staticmethod
    def send_invoice_email(invoice, recipient_email=None, template_type='classic', custom_message=None):
        """
        Envoie une facture par email avec le PDF en pièce jointe

        Args:
            invoice: Instance du modèle Invoice
            recipient_email: Email du destinataire (par défaut: email du client)
            template_type: Type de template PDF
            custom_message: Message personnalisé (optionnel, remplace le message par défaut)

        Returns:
            dict: Résultat de l'envoi avec 'success' et 'message'
        """
        try:
            # Récupérer l'organisation depuis la facture
            organization = None
            if hasattr(invoice, 'organization') and invoice.organization:
                organization = invoice.organization
            elif hasattr(invoice, 'created_by') and invoice.created_by and hasattr(invoice.created_by, 'organization'):
                organization = invoice.created_by.organization
            
            # Configurer les settings email Django avec la config de l'organisation
            original_settings = None
            if organization:
                original_settings = configure_django_email_settings(organization)
                if not original_settings:
                    logger.warning(f"Could not configure email settings for organization {organization.name}, using default")
            # Déterminer l'email du destinataire
            if not recipient_email:
                if invoice.client and hasattr(invoice.client, 'email'):
                    recipient_email = invoice.client.email
                else:
                    return {
                        'success': False,
                        'message': 'Aucun email de destinataire trouvé'
                    }

            if not recipient_email:
                return {
                    'success': False,
                    'message': 'Le client n\'a pas d\'email renseigné'
                }

            # Générer le nom du client
            client_name = 'Client'
            if invoice.client:
                client_name = getattr(invoice.client, 'name', None) or \
                             f"{getattr(invoice.client, 'first_name', '')} {getattr(invoice.client, 'last_name', '')}".strip() or \
                             'Client'

            # Générer le PDF avec WeasyPrint
            pdf_buffer = generate_invoice_pdf_weasy(invoice, template_type)

            # Préparer l'email
            subject = f"Facture {invoice.invoice_number} - ProcureGenius"
            
            # Utiliser le message personnalisé si fourni, sinon utiliser le template par défaut
            if custom_message:
                # Message personnalisé - créer un HTML simple
                html_body = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }}
                        .content {{
                            background: #f9f9f9;
                            padding: 30px;
                            border-radius: 8px;
                        }}
                        .footer {{
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 2px solid #eee;
                            color: #666;
                            font-size: 0.9em;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="content">
                            <p>Bonjour <strong>{client_name}</strong>,</p>
                            <div style="white-space: pre-wrap;">{custom_message}</div>
                            <p>Le PDF de votre facture est joint à cet email.</p>
                            <div class="footer">
                                <p><strong>ProcureGenius</strong></p>
                                <p>Système de gestion des achats et des factures</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """
                text_body = f"""Bonjour {client_name},

{custom_message}

Le PDF de votre facture est joint à cet email.

Cordialement,
ProcureGenius
                """
            else:
                # Corps de l'email HTML par défaut
                html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 8px 8px 0 0;
                    }}
                    .content {{
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 8px 8px;
                    }}
                    .invoice-details {{
                        background: white;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 6px;
                        border-left: 4px solid #667eea;
                    }}
                    .detail-row {{
                        display: flex;
                        justify-content: space-between;
                        margin: 10px 0;
                        padding: 8px 0;
                        border-bottom: 1px solid #eee;
                    }}
                    .label {{
                        font-weight: bold;
                        color: #666;
                    }}
                    .value {{
                        color: #333;
                    }}
                    .total {{
                        font-size: 1.2em;
                        color: #667eea;
                        font-weight: bold;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 2px solid #eee;
                        color: #666;
                        font-size: 0.9em;
                    }}
                    .button {{
                        display: inline-block;
                        padding: 12px 30px;
                        background: #667eea;
                        color: white !important;
                        text-decoration: none;
                        border-radius: 6px;
                        margin: 20px 0;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">Nouvelle Facture</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">ProcureGenius</p>
                    </div>

                    <div class="content">
                        <p>Bonjour <strong>{client_name}</strong>,</p>

                        <p>Veuillez trouver ci-joint votre facture <strong>{invoice.invoice_number}</strong>.</p>

                        <div class="invoice-details">
                            <div class="detail-row">
                                <span class="label">Numéro de facture:</span>
                                <span class="value">{invoice.invoice_number}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Date d'émission:</span>
                                <span class="value">{(getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None)).strftime('%d/%m/%Y') if (getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None)) else 'N/A'}</span>
                            </div>
                            {f'''<div class="detail-row">
                                <span class="label">Date d'échéance:</span>
                                <span class="value">{invoice.due_date.strftime('%d/%m/%Y')}</span>
                            </div>''' if hasattr(invoice, 'due_date') and invoice.due_date else ''}
                            <div class="detail-row">
                                <span class="label">Montant total:</span>
                                <span class="value total">{invoice.total_amount:.2f} €</span>
                            </div>
                        </div>

                        {f'<p><strong>Description:</strong> {invoice.description}</p>' if invoice.description else ''}

                        <p>Le PDF de votre facture est joint à cet email.</p>

                        <p>Pour toute question, n'hésitez pas à nous contacter.</p>

                        <div class="footer">
                            <p><strong>ProcureGenius</strong></p>
                            <p>Système de gestion des achats et des factures</p>
                            <p style="font-size: 0.8em; color: #999; margin-top: 10px;">
                                Ceci est un email automatique, merci de ne pas y répondre directement.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            # Version texte simple (fallback)
            text_body = f"""
Bonjour {client_name},

Veuillez trouver ci-joint votre facture {invoice.invoice_number}.

Détails de la facture:
- Numéro: {invoice.invoice_number}
- Date d'émission: {(getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None)).strftime('%d/%m/%Y') if (getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None)) else 'N/A'}
{'- Date d\'échéance: ' + invoice.due_date.strftime('%d/%m/%Y') if hasattr(invoice, 'due_date') and invoice.due_date else ''}
- Montant total: {invoice.total_amount:.2f} €

{f'Description: {invoice.description}' if invoice.description else ''}

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
ProcureGenius
            """

            # Déterminer l'email expéditeur
            from_email = settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@procuregenius.com'
            if organization:
                try:
                    from apps.accounts.models import EmailConfiguration
                    email_config = EmailConfiguration.objects.filter(organization=organization).first()
                    if email_config:
                        from_email = f"{email_config.default_from_name} <{email_config.default_from_email}>"
                except Exception as e:
                    logger.warning(f"Could not get email config for organization: {e}")
            
            # Créer l'email
            email = EmailMessage(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=[recipient_email],
            )

            # Ajouter le contenu HTML
            email.content_subtype = "html"
            email.body = html_body

            # Attacher le PDF
            pdf_filename = f"facture-{invoice.invoice_number}.pdf"
            email.attach(pdf_filename, pdf_buffer.getvalue(), 'application/pdf')

            # Envoyer l'email
            email.send(fail_silently=False)

            # Sauvegarder la date d'envoi
            from django.utils import timezone
            update_fields = []
            
            if hasattr(invoice, 'sent_at'):
                invoice.sent_at = timezone.now()
                update_fields.append('sent_at')
            elif hasattr(invoice, 'sent_date'):
                invoice.sent_date = timezone.now().date()
                update_fields.append('sent_date')
            
            # Mettre à jour le statut si c'était un brouillon
            if invoice.status == 'draft':
                invoice.status = 'sent'
                update_fields.append('status')
            
            # Sauvegarder la facture avec les nouvelles informations
            if update_fields:
                invoice.save(update_fields=update_fields)

            logger.info(f"Invoice {invoice.invoice_number} sent successfully to {recipient_email} at {timezone.now()}")

            # Restaurer les settings originaux
            if original_settings:
                restore_django_email_settings(original_settings)

            return {
                'success': True,
                'message': f'Facture envoyée avec succès à {recipient_email}',
                'sent_at': invoice.sent_at.isoformat() if hasattr(invoice, 'sent_at') and invoice.sent_at else None
            }

        except Exception as e:
            logger.error(f"Error sending invoice email: {str(e)}")
            # Restaurer les settings en cas d'erreur
            if original_settings:
                restore_django_email_settings(original_settings)
            return {
                'success': False,
                'message': f'Erreur lors de l\'envoi de l\'email: {str(e)}'
            }


class PurchaseOrderEmailService:
    """Service pour envoyer des bons de commande par email avec PDF attaché"""

    @staticmethod
    def _generate_purchase_order_pdf(po, template_type='modern'):
        """
        Génère le PDF d'un bon de commande en utilisant la vue Django
        
        Args:
            po: Instance du modèle PurchaseOrder
            template_type: Type de template ('classic', 'modern', 'minimal', 'professional')
            
        Returns:
            BytesIO: Buffer contenant le PDF généré
        """
        try:
            from django.test import RequestFactory
            from apps.purchase_orders.views_pdf import PurchaseOrderPDFView
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            
            # Créer une requête factice pour la vue
            factory = RequestFactory()
            request = factory.get(f'/purchase-orders/{po.id}/pdf/?template={template_type}')
            
            # Créer un utilisateur factice si nécessaire
            if hasattr(po, 'created_by') and po.created_by:
                request.user = po.created_by
            else:
                # Créer un utilisateur anonyme pour la vue
                request.user = User.objects.first() if User.objects.exists() else None
            
            # Appeler la vue pour générer le PDF
            view = PurchaseOrderPDFView()
            view.request = request
            view.kwargs = {'pk': str(po.id)}
            
            response = view.get(request, pk=str(po.id))
            
            if response.status_code == 200:
                # Convertir la réponse en BytesIO
                pdf_buffer = BytesIO()
                pdf_buffer.write(response.content)
                pdf_buffer.seek(0)
                return pdf_buffer
            else:
                raise Exception(f"Error generating PDF: HTTP {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error generating purchase order PDF: {e}")
            # Fallback: créer un PDF simple
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from io import BytesIO
            
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            p.drawString(100, 750, f"Bon de Commande {po.po_number}")
            p.drawString(100, 730, f"Fournisseur: {po.supplier.name if po.supplier else 'N/A'}")
            p.drawString(100, 710, f"Total: {po.total_amount}")
            p.showPage()
            p.save()
            buffer.seek(0)
            return buffer

    @staticmethod
    def send_purchase_order_email(po, recipient_email=None, custom_message=None, template_type='modern'):
        """
        Envoie un bon de commande par email avec le PDF en pièce jointe

        Args:
            po: Instance du modèle PurchaseOrder
            recipient_email: Email du destinataire (par défaut: email du fournisseur)
            custom_message: Message personnalisé (optionnel)
            template_type: Type de template PDF

        Returns:
            dict: Résultat de l'envoi avec 'success' et 'message'
        """
        try:
            # Récupérer l'organisation depuis le bon de commande
            organization = None
            if hasattr(po, 'organization') and po.organization:
                organization = po.organization
            elif hasattr(po, 'created_by') and po.created_by and hasattr(po.created_by, 'organization'):
                organization = po.created_by.organization
            
            # Configurer les settings email Django avec la config de l'organisation
            original_settings = None
            if organization:
                original_settings = configure_django_email_settings(organization)
                if not original_settings:
                    logger.warning(f"Could not configure email settings for organization {organization.name}, using default")
            
            # Déterminer l'email du destinataire
            if not recipient_email:
                if po.supplier and hasattr(po.supplier, 'email'):
                    recipient_email = po.supplier.email
                else:
                    return {
                        'success': False,
                        'message': 'Aucun email de destinataire trouvé'
                    }

            if not recipient_email:
                return {
                    'success': False,
                    'message': 'Le fournisseur n\'a pas d\'email renseigné'
                }

            # Générer le nom du fournisseur
            supplier_name = 'Fournisseur'
            if po.supplier:
                supplier_name = getattr(po.supplier, 'name', None) or 'Fournisseur'

            # Générer le PDF
            pdf_buffer = PurchaseOrderEmailService._generate_purchase_order_pdf(po, template_type)

            # Préparer l'email
            subject = f"Bon de Commande {po.po_number} - ProcureGenius"
            
            # Utiliser le message personnalisé si fourni
            if custom_message:
                html_body = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }}
                        .content {{
                            background: #f9f9f9;
                            padding: 30px;
                            border-radius: 8px;
                        }}
                        .footer {{
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 2px solid #eee;
                            color: #666;
                            font-size: 0.9em;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="content">
                            <p>Bonjour <strong>{supplier_name}</strong>,</p>
                            <div style="white-space: pre-wrap;">{custom_message}</div>
                            <p>Le PDF de votre bon de commande est joint à cet email.</p>
                            <div class="footer">
                                <p><strong>ProcureGenius</strong></p>
                                <p>Système de gestion des achats et des factures</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """
                text_body = f"""Bonjour {supplier_name},

{custom_message}

Le PDF de votre bon de commande est joint à cet email.

Cordialement,
ProcureGenius
                """
            else:
                # Message par défaut
                html_body = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }}
                        .header {{
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 8px 8px 0 0;
                        }}
                        .content {{
                            background: #f9f9f9;
                            padding: 30px;
                            border-radius: 0 0 8px 8px;
                        }}
                        .po-details {{
                            background: white;
                            padding: 20px;
                            margin: 20px 0;
                            border-radius: 6px;
                            border-left: 4px solid #667eea;
                        }}
                        .detail-row {{
                            display: flex;
                            justify-content: space-between;
                            margin: 10px 0;
                            padding: 8px 0;
                            border-bottom: 1px solid #eee;
                        }}
                        .label {{
                            font-weight: bold;
                            color: #666;
                        }}
                        .value {{
                            color: #333;
                        }}
                        .total {{
                            font-size: 1.2em;
                            color: #667eea;
                            font-weight: bold;
                        }}
                        .footer {{
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 2px solid #eee;
                            color: #666;
                            font-size: 0.9em;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0; font-size: 28px;">Nouveau Bon de Commande</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">ProcureGenius</p>
                        </div>

                        <div class="content">
                            <p>Bonjour <strong>{supplier_name}</strong>,</p>

                            <p>Veuillez trouver ci-joint votre bon de commande <strong>{po.po_number}</strong>.</p>

                            <div class="po-details">
                                <div class="detail-row">
                                    <span class="label">Numéro de BC:</span>
                                    <span class="value">{po.po_number}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Date de création:</span>
                                    <span class="value">{po.created_at.strftime('%d/%m/%Y') if po.created_at else 'N/A'}</span>
                                </div>
                                {f'''<div class="detail-row">
                                    <span class="label">Date requise:</span>
                                    <span class="value">{po.required_date.strftime('%d/%m/%Y')}</span>
                                </div>''' if hasattr(po, 'required_date') and po.required_date else ''}
                                <div class="detail-row">
                                    <span class="label">Montant total:</span>
                                    <span class="value total">{po.total_amount:.2f} €</span>
                                </div>
                            </div>

                            {f'<p><strong>Description:</strong> {po.description}</p>' if po.description else ''}

                            <p>Le PDF de votre bon de commande est joint à cet email.</p>

                            <p>Pour toute question, n'hésitez pas à nous contacter.</p>

                            <div class="footer">
                                <p><strong>ProcureGenius</strong></p>
                                <p>Système de gestion des achats et des factures</p>
                                <p style="font-size: 0.8em; color: #999; margin-top: 10px;">
                                    Ceci est un email automatique, merci de ne pas y répondre directement.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                text_body = f"""
Bonjour {supplier_name},

Veuillez trouver ci-joint votre bon de commande {po.po_number}.

Détails du bon de commande:
- Numéro: {po.po_number}
- Date de création: {po.created_at.strftime('%d/%m/%Y') if po.created_at else 'N/A'}
{'- Date requise: ' + po.required_date.strftime('%d/%m/%Y') if hasattr(po, 'required_date') and po.required_date else ''}
- Montant total: {po.total_amount:.2f} €

{f'Description: {po.description}' if po.description else ''}

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
ProcureGenius
                """

            # Déterminer l'email expéditeur
            from_email = settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@procuregenius.com'
            if organization:
                try:
                    from apps.accounts.models import EmailConfiguration
                    email_config = EmailConfiguration.objects.filter(organization=organization).first()
                    if email_config:
                        from_email = f"{email_config.default_from_name} <{email_config.default_from_email}>"
                except Exception as e:
                    logger.warning(f"Could not get email config for organization: {e}")

            # Créer l'email
            email = EmailMessage(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=[recipient_email],
            )

            # Ajouter le contenu HTML
            email.content_subtype = "html"
            email.body = html_body

            # Attacher le PDF
            pdf_filename = f"bon-commande-{po.po_number}.pdf"
            email.attach(pdf_filename, pdf_buffer.getvalue(), 'application/pdf')

            # Envoyer l'email
            email.send(fail_silently=False)

            logger.info(f"Purchase Order {po.po_number} sent successfully to {recipient_email}")

            # Restaurer les settings originaux
            if original_settings:
                restore_django_email_settings(original_settings)

            return {
                'success': True,
                'message': f'Bon de commande envoyé avec succès à {recipient_email}'
            }

        except Exception as e:
            logger.error(f"Error sending purchase order email: {str(e)}")
            # Restaurer les settings en cas d'erreur
            if original_settings:
                restore_django_email_settings(original_settings)
            return {
                'success': False,
                'message': f'Erreur lors de l\'envoi de l\'email: {str(e)}'
            }
