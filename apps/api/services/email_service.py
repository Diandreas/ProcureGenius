"""
Service d'envoi d'emails pour les factures et documents
"""
from django.core.mail import EmailMessage
from django.conf import settings
from .pdf_generator import generate_invoice_pdf
import logging

logger = logging.getLogger(__name__)


class InvoiceEmailService:
    """Service pour envoyer des factures par email avec PDF attaché"""

    @staticmethod
    def send_invoice_email(invoice, recipient_email=None, template_type='classic'):
        """
        Envoie une facture par email avec le PDF en pièce jointe

        Args:
            invoice: Instance du modèle Invoice
            recipient_email: Email du destinataire (par défaut: email du client)
            template_type: Type de template PDF

        Returns:
            dict: Résultat de l'envoi avec 'success' et 'message'
        """
        try:
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

            # Générer le PDF
            pdf_buffer = generate_invoice_pdf(invoice, template_type)

            # Préparer l'email
            subject = f"Facture {invoice.invoice_number} - ProcureGenius"

            # Corps de l'email HTML
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

            # Créer l'email
            email = EmailMessage(
                subject=subject,
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@procuregenius.com',
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

            logger.info(f"Invoice {invoice.invoice_number} sent successfully to {recipient_email}")

            return {
                'success': True,
                'message': f'Facture envoyée avec succès à {recipient_email}'
            }

        except Exception as e:
            logger.error(f"Error sending invoice email: {str(e)}")
            return {
                'success': False,
                'message': f'Erreur lors de l\'envoi de l\'email: {str(e)}'
            }
