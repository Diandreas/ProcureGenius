# PDF generation service using ReportLab
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import Color, black, blue
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.barcharts import VerticalBarChart
import qrcode
import base64
from datetime import datetime
from django.conf import settings


class InvoicePDFGenerator:
    """Service pour générer des PDFs de facture avec ReportLab"""

    def __init__(self):
        self.page_width, self.page_height = A4
        self.margin = 25 * mm
        self.content_width = self.page_width - (2 * self.margin)

    def generate_invoice_pdf(self, invoice, template_type='classic'):
        """
        Génère un PDF pour une facture donnée

        Args:
            invoice: Instance du modèle Invoice
            template_type: Type de template ('classic', 'modern', 'minimal')

        Returns:
            BytesIO: Buffer contenant le PDF généré
        """
        buffer = BytesIO()

        # Créer le document PDF
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=self.margin,
            bottomMargin=self.margin,
            leftMargin=self.margin,
            rightMargin=self.margin
        )

        # Construire le contenu du document
        story = []

        # Styles
        styles = self._get_styles()

        # En-tête
        story.extend(self._build_header(invoice, styles))
        story.append(Spacer(1, 10 * mm))

        # Informations facture et client
        story.extend(self._build_invoice_info(invoice, styles))
        story.append(Spacer(1, 10 * mm))

        # Tableau des articles
        story.extend(self._build_items_table(invoice, styles))
        story.append(Spacer(1, 10 * mm))

        # Totaux
        story.extend(self._build_totals(invoice, styles))
        story.append(Spacer(1, 15 * mm))

        # QR Code et pied de page
        story.extend(self._build_footer(invoice, styles))

        # Construire le PDF
        doc.build(story)

        # Retourner le buffer
        buffer.seek(0)
        return buffer

    def _get_styles(self):
        """Définit les styles utilisés dans le document"""
        styles = getSampleStyleSheet()

        # Style pour le titre principal
        styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=Color(37/255, 99/255, 235/255),  # Bleu
            alignment=TA_CENTER,
            spaceAfter=10
        ))

        # Style pour les numéros de facture
        styles.add(ParagraphStyle(
            name='InvoiceNumber',
            parent=styles['Heading2'],
            fontSize=16,
            alignment=TA_CENTER,
            spaceAfter=15
        ))

        # Style pour les titres de section
        styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=styles['Heading3'],
            fontSize=14,
            textColor=Color(55/255, 65/255, 81/255),  # Gris foncé
            spaceAfter=8
        ))

        # Style pour les totaux
        styles.add(ParagraphStyle(
            name='Total',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_RIGHT,
            textColor=Color(37/255, 99/255, 235/255),  # Bleu
            fontName='Helvetica-Bold'
        ))

        return styles

    def _build_header(self, invoice, styles):
        """Construit l'en-tête de la facture"""
        elements = []

        # Titre principal
        elements.append(Paragraph("FACTURE", styles['InvoiceTitle']))

        # Numéro de facture et statut
        status_text = f"N° {invoice.invoice_number}"
        if hasattr(invoice, 'status'):
            status_map = {
                'draft': 'BROUILLON',
                'sent': 'ENVOYÉE',
                'paid': 'PAYÉE',
                'overdue': 'EN RETARD',
                'cancelled': 'ANNULÉE'
            }
            status_text += f" - {status_map.get(invoice.status, invoice.status.upper())}"

        elements.append(Paragraph(status_text, styles['InvoiceNumber']))

        return elements

    def _build_invoice_info(self, invoice, styles):
        """Construit la section informations facture et client"""
        elements = []

        # Données de la table d'informations
        data = [
            ['Détails de la facture', 'Informations client'],
            ['', '']  # Ligne vide pour structurer
        ]

        # Détails facture
        invoice_details = []
        invoice_details.append(f"<b>{invoice.title or 'Sans titre'}</b>")

        if hasattr(invoice, 'description') and invoice.description:
            invoice_details.append(invoice.description)

        # Utiliser created_at comme date d'émission
        issue_date = getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None)
        if issue_date:
            date_str = issue_date.strftime('%d/%m/%Y') if hasattr(issue_date, 'strftime') else str(issue_date)
            invoice_details.append(f"Date d'émission: {date_str}")
        else:
            invoice_details.append("Date d'émission: N/A")

        if hasattr(invoice, 'due_date') and invoice.due_date:
            invoice_details.append(f"Date d'échéance: {invoice.due_date.strftime('%d/%m/%Y')}")

        # Informations client
        client_details = []
        if hasattr(invoice, 'client') and invoice.client:
            # Gérer les différents types de clients (User ou Client model)
            client_name = getattr(invoice.client, 'name', None) or f"{getattr(invoice.client, 'first_name', '')} {getattr(invoice.client, 'last_name', '')}".strip() or "Client"
            client_details.append(f"<b>{client_name}</b>")
            if hasattr(invoice.client, 'email') and invoice.client.email:
                client_details.append(invoice.client.email)
            if hasattr(invoice.client, 'address') and invoice.client.address:
                client_details.append(invoice.client.address)
        else:
            client_details.append("Aucun client spécifié")

        # Remplacer les données vides
        data[1] = [
            Paragraph('<br/>'.join(invoice_details), styles['Normal']),
            Paragraph('<br/>'.join(client_details), styles['Normal'])
        ]

        # Créer la table
        table = Table(data, colWidths=[self.content_width/2, self.content_width/2])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 0), (-1, 0), Color(243/255, 244/255, 246/255)),
            ('TEXTCOLOR', (0, 0), (-1, 0), Color(55/255, 65/255, 81/255)),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 1, Color(229/255, 231/255, 235/255))
        ]))

        elements.append(table)
        return elements

    def _build_items_table(self, invoice, styles):
        """Construit le tableau des articles"""
        elements = []

        # Titre de section
        elements.append(Paragraph("Articles facturés", styles['SectionTitle']))

        # En-têtes du tableau
        headers = ['Réf.', 'Description', 'Qté', 'Prix unitaire', 'Total']
        data = [headers]

        # Lignes des articles
        if hasattr(invoice, 'items') and invoice.items.exists():
            for item in invoice.items.all():
                data.append([
                    item.product_reference or '-',
                    item.description or '-',
                    str(item.quantity or 0),
                    f"{item.unit_price or 0:.2f} €",
                    f"{(item.quantity or 0) * (item.unit_price or 0):.2f} €"
                ])
        else:
            data.append(['-', 'Aucun article', '0', '0.00 €', '0.00 €'])

        # Créer la table
        table = Table(data, colWidths=[
            30*mm,  # Référence
            80*mm,  # Description
            20*mm,  # Quantité
            30*mm,  # Prix unitaire
            30*mm   # Total
        ])

        table.setStyle(TableStyle([
            # En-tête
            ('BACKGROUND', (0, 0), (-1, 0), Color(243/255, 244/255, 246/255)),
            ('TEXTCOLOR', (0, 0), (-1, 0), Color(31/255, 41/255, 55/255)),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Corps du tableau
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),  # Aligner droite qty, prix, total
            ('ALIGN', (0, 1), (1, -1), 'LEFT'),    # Aligner gauche ref, desc

            # Bordures et padding
            ('GRID', (0, 0), (-1, -1), 1, Color(229/255, 231/255, 235/255)),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))

        elements.append(table)
        return elements

    def _build_totals(self, invoice, styles):
        """Construit la section des totaux"""
        elements = []

        # Données des totaux
        totals_data = []

        subtotal = getattr(invoice, 'subtotal', 0) or 0
        tax_amount = getattr(invoice, 'tax_amount', 0) or 0
        total = getattr(invoice, 'total_amount', 0) or subtotal + tax_amount

        totals_data.append(['Sous-total:', f"{subtotal:.2f} €"])

        if tax_amount > 0:
            totals_data.append(['Taxes:', f"{tax_amount:.2f} €"])

        totals_data.append(['TOTAL:', f"{total:.2f} €"])

        # Créer la table des totaux (alignée à droite)
        table = Table(totals_data, colWidths=[40*mm, 40*mm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('TEXTCOLOR', (0, -1), (-1, -1), Color(37/255, 99/255, 235/255)),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('LINEBELOW', (0, -2), (-1, -2), 1, Color(229/255, 231/255, 235/255))
        ]))

        # Conteneur pour aligner à droite
        elements.append(Table([[table]], colWidths=[self.content_width]))

        return elements

    def _build_footer(self, invoice, styles):
        """Construit le pied de page avec QR code"""
        elements = []

        footer_data = []

        # Texte du pied de page
        footer_text = f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}<br/>ProcureGenius - Gestion des factures"

        # QR Code
        qr_code = None
        try:
            issue_date = getattr(invoice, 'issue_date', None) or getattr(invoice, 'created_at', None)
            qr_data = {
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'total': float(getattr(invoice, 'total_amount', 0) or 0),
                'date': issue_date.isoformat() if issue_date else None
            }

            qr = qrcode.QRCode(version=1, box_size=3, border=1)
            qr.add_data(str(qr_data))
            qr.make(fit=True)

            qr_img = qr.make_image(fill_color="black", back_color="white")

            # Convertir en format compatible ReportLab
            img_buffer = BytesIO()
            qr_img.save(img_buffer, format='PNG')
            img_buffer.seek(0)

            qr_code = Image(img_buffer, width=15*mm, height=15*mm)

        except Exception as e:
            print(f"Erreur génération QR code: {e}")

        if qr_code:
            footer_data = [[
                Paragraph(footer_text, styles['Normal']),
                Table([[qr_code], [Paragraph("Code de vérification", styles['Normal'])]],
                      colWidths=[15*mm])
            ]]
        else:
            footer_data = [[Paragraph(footer_text, styles['Normal']), ""]]

        # Table du footer
        footer_table = Table(footer_data, colWidths=[self.content_width-20*mm, 20*mm])
        footer_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (-1, -1), Color(107/255, 114/255, 128/255)),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))

        elements.append(footer_table)
        return elements


def generate_invoice_pdf(invoice, template_type='classic'):
    """
    Fonction utilitaire pour générer un PDF de facture

    Args:
        invoice: Instance du modèle Invoice
        template_type: Type de template

    Returns:
        BytesIO: Buffer contenant le PDF
    """
    generator = InvoicePDFGenerator()
    return generator.generate_invoice_pdf(invoice, template_type)