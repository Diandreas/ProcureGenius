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

        # Styles selon le template choisi
        styles = self._get_styles(template_type)

        # Log du template utilisé
        print(f"[TEMPLATE] Template utilise: {template_type}")

        # En-tête
        story.extend(self._build_header(invoice, styles, template_type))
        story.append(Spacer(1, 10 * mm))

        # Informations facture et client
        story.extend(self._build_invoice_info(invoice, styles))
        story.append(Spacer(1, 10 * mm))

        # Tableau des articles
        story.extend(self._build_items_table(invoice, styles, template_type))
        story.append(Spacer(1, 10 * mm))

        # Totaux
        story.extend(self._build_totals(invoice, styles, template_type))
        story.append(Spacer(1, 15 * mm))

        # QR Code et pied de page
        story.extend(self._build_footer(invoice, styles))

        # Construire le PDF
        doc.build(story)

        # Retourner le buffer
        buffer.seek(0)
        return buffer

    def _get_styles(self, template_type='classic'):
        """Définit les styles utilisés dans le document selon le template"""
        styles = getSampleStyleSheet()

        # Couleurs selon le template
        if template_type == 'modern':
            # Modern : Violet/Rose moderne
            primary_color = Color(139/255, 92/255, 246/255)  # Violet
            secondary_color = Color(236/255, 72/255, 153/255)  # Rose
            text_dark = Color(15/255, 23/255, 42/255)  # Gris très foncé
        elif template_type == 'minimal':
            # Minimal : Noir et gris
            primary_color = Color(0, 0, 0)  # Noir
            secondary_color = Color(75/255, 85/255, 99/255)  # Gris
            text_dark = Color(0, 0, 0)  # Noir
        else:  # classic
            # Classic : Bleu traditionnel
            primary_color = Color(37/255, 99/255, 235/255)  # Bleu
            secondary_color = Color(59/255, 130/255, 246/255)  # Bleu clair
            text_dark = Color(55/255, 65/255, 81/255)  # Gris foncé

        # Style pour le titre principal
        title_size = 28 if template_type == 'modern' else 24
        styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=styles['Heading1'],
            fontSize=title_size,
            textColor=primary_color,
            alignment=TA_CENTER,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        ))

        # Style pour les numéros de facture
        styles.add(ParagraphStyle(
            name='InvoiceNumber',
            parent=styles['Heading2'],
            fontSize=16 if template_type != 'minimal' else 14,
            alignment=TA_CENTER,
            spaceAfter=15,
            textColor=text_dark
        ))

        # Style pour les titres de section
        styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=styles['Heading3'],
            fontSize=14 if template_type != 'minimal' else 12,
            textColor=primary_color if template_type != 'minimal' else text_dark,
            spaceAfter=8,
            fontName='Helvetica-Bold'
        ))

        # Style pour les totaux
        styles.add(ParagraphStyle(
            name='Total',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_RIGHT,
            textColor=primary_color,
            fontName='Helvetica-Bold'
        ))

        # Stocker les couleurs pour utilisation dans les autres méthodes
        styles.primary_color = primary_color
        styles.secondary_color = secondary_color
        styles.text_dark = text_dark

        return styles

    def _build_header(self, invoice, styles, template_type='classic'):
        """Construit l'en-tête de la facture avec logo et informations de l'organisation"""
        elements = []

        # Récupérer les paramètres de l'organisation ET le template d'impression
        org_settings = None
        print_template = None
        organization = None

        try:
            from apps.core.models import OrganizationSettings
            from apps.invoicing.models import PrintTemplate

            # Récupérer l'organisation via l'utilisateur créateur
            if hasattr(invoice, 'created_by') and invoice.created_by:
                if hasattr(invoice.created_by, 'organization') and invoice.created_by.organization:
                    organization = invoice.created_by.organization
                    print(f"[OK] Organisation trouvee: {organization.name}")

                    # Récupérer OrganizationSettings
                    org_settings = OrganizationSettings.objects.filter(
                        organization=organization
                    ).first()

                    # Récupérer le PrintTemplate par défaut pour les factures
                    print_template = PrintTemplate.objects.filter(
                        organization=organization,
                        template_type='invoice',
                        is_default=True
                    ).first()

                    if print_template:
                        print(f"[OK] PrintTemplate trouve: {print_template.name}")
                    else:
                        print("[INFO] Pas de PrintTemplate par defaut, utilisation de OrganizationSettings uniquement")
                else:
                    print(f"[WARN] Utilisateur {invoice.created_by.username} n'a pas d'organisation")
            else:
                print("[WARN] Facture sans created_by")
        except Exception as e:
            print(f"[ERROR] Erreur lors de la recuperation des parametres: {e}")

        # Récupérer le logo
        logo_image = None
        logo_loaded = False

        # Essayer d'abord le logo du PrintTemplate
        if print_template and print_template.header_logo:
            try:
                logo_path = print_template.header_logo.path
                print(f"[OK] Logo du PrintTemplate trouve: {logo_path}")
                logo_image = Image(logo_path, width=50*mm, height=30*mm, kind='proportional')
                logo_loaded = True
            except Exception as e:
                print(f"[ERROR] Erreur lors du chargement du logo PrintTemplate: {e}")

        # Sinon, essayer le logo de OrganizationSettings
        if not logo_loaded and org_settings and org_settings.company_logo:
            try:
                import os
                logo_path = org_settings.company_logo.path
                print(f"[OK] Logo OrganizationSettings trouve: {logo_path}")
                print(f"  Fichier existe: {os.path.exists(logo_path)}")

                if os.path.exists(logo_path):
                    print(f"  Taille: {os.path.getsize(logo_path)} bytes")
                    logo_image = Image(logo_path, width=50*mm, height=30*mm, kind='proportional')
                    print(f"  Image créée: {logo_image.drawWidth}x{logo_image.drawHeight}")
                    logo_loaded = True
                    print(f"[OK] Logo ajoute avec succes")
                else:
                    print(f"[ERROR] Fichier logo n'existe pas sur le disque!")
            except Exception as e:
                import traceback
                print(f"[ERROR] Erreur lors du chargement du logo OrganizationSettings: {e}")
                traceback.print_exc()

        # Récupérer les informations entreprise
        company_name = None
        if print_template and print_template.header_company_name:
            company_name = print_template.header_company_name
        elif org_settings and org_settings.company_name:
            company_name = org_settings.company_name

        address = None
        if print_template and print_template.header_address:
            address = print_template.header_address
        elif org_settings and org_settings.company_address:
            address = org_settings.company_address

        phone = None
        if print_template and print_template.header_phone:
            phone = print_template.header_phone
        elif org_settings and org_settings.company_phone:
            phone = org_settings.company_phone

        email = None
        if print_template and print_template.header_email:
            email = print_template.header_email
        elif org_settings and org_settings.company_email:
            email = org_settings.company_email

        website = None
        if print_template and print_template.header_website:
            website = print_template.header_website

        # DESIGN SELON LE TEMPLATE
        if template_type == 'modern':
            # MODERN: Bande de couleur en haut + design carte
            from reportlab.graphics.shapes import Drawing, Rect

            # Bande de couleur dégradée en haut (violet à rose)
            d = Drawing(self.content_width, 15*mm)
            d.add(Rect(0, 0, self.content_width, 15*mm, fillColor=styles.primary_color, strokeColor=None))
            elements.append(d)
            elements.append(Spacer(1, 3*mm))

            # Logo et infos sur fond blanc
            if logo_loaded:
                elements.append(logo_image)
                elements.append(Spacer(1, 2*mm))

            if company_name:
                elements.append(Paragraph(f"<b><font size=16 color='#{int(styles.primary_color.red*255):02x}{int(styles.primary_color.green*255):02x}{int(styles.primary_color.blue*255):02x}'>{company_name}</font></b>", styles['Normal']))

            company_details = []
            if address:
                company_details.append(address.replace('\n', '<br/>'))
            if phone:
                company_details.append(f"📞 {phone}")
            if email:
                company_details.append(f"✉ {email}")
            if website:
                company_details.append(f"🌐 {website}")

            if company_details:
                elements.append(Paragraph("<br/>".join(company_details), styles['Normal']))

            elements.append(Spacer(1, 5*mm))

            # Titre FACTURE avec badge moderne
            d2 = Drawing(self.content_width, 15*mm)
            d2.add(Rect(0, 0, 60*mm, 12*mm, fillColor=styles.secondary_color, strokeColor=None, rx=3*mm, ry=3*mm))
            elements.append(d2)
            elements.append(Spacer(1, -10*mm))  # Superposition
            elements.append(Paragraph(f"<font size=20 color='white'><b>FACTURE</b></font>", styles['Normal']))
            elements.append(Spacer(1, 2*mm))

            # Numéro avec badge
            status_text = f"<font size=14><b>N° {invoice.invoice_number}</b></font>"
            if hasattr(invoice, 'status'):
                status_map = {
                    'draft': 'BROUILLON',
                    'sent': 'ENVOYÉE',
                    'paid': 'PAYÉE',
                    'overdue': 'EN RETARD',
                    'cancelled': 'ANNULÉE'
                }
                status_badge = status_map.get(invoice.status, invoice.status.upper())
                status_text += f" <font size=10 color='#{int(styles.primary_color.red*255):02x}{int(styles.primary_color.green*255):02x}{int(styles.primary_color.blue*255):02x}'>• {status_badge}</font>"

            elements.append(Paragraph(status_text, styles['Normal']))

        elif template_type == 'classic':
            # CLASSIC: En-tête corporatif avec cadre
            from reportlab.graphics.shapes import Drawing, Rect

            # Cadre supérieur bleu
            d = Drawing(self.content_width, 3*mm)
            d.add(Rect(0, 0, self.content_width, 3*mm, fillColor=styles.primary_color, strokeColor=None))
            elements.append(d)
            elements.append(Spacer(1, 5*mm))

            # Logo et infos côte à côte
            left_col = []
            if logo_loaded:
                left_col.append(logo_image)
            else:
                left_col.append(Paragraph("", styles['Normal']))

            right_col = []
            company_info = []

            if company_name:
                company_info.append(f"<b><font size=14 color='#{int(styles.primary_color.red*255):02x}{int(styles.primary_color.green*255):02x}{int(styles.primary_color.blue*255):02x}'>{company_name}</font></b>")

            if address:
                company_info.append(f"<font size=9>{address.replace(chr(10), '<br/>')}</font>")
            if phone:
                company_info.append(f"<font size=9>Tél: {phone}</font>")
            if email:
                company_info.append(f"<font size=9>Email: {email}</font>")
            if website:
                company_info.append(f"<font size=9>Web: {website}</font>")

            if company_info:
                right_col.append(Paragraph("<br/>".join(company_info), styles['Normal']))
            else:
                right_col.append(Paragraph("", styles['Normal']))

            header_table = Table([[left_col[0], right_col[0]]],
                                colWidths=[70*mm, self.content_width-70*mm])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ]))
            elements.append(header_table)
            elements.append(Spacer(1, 8*mm))

            # Titre FACTURE
            elements.append(Paragraph("<b><font size=24 color='#{:02x}{:02x}{:02x}'>FACTURE</font></b>".format(
                int(styles.primary_color.red*255),
                int(styles.primary_color.green*255),
                int(styles.primary_color.blue*255)
            ), styles['Normal']))

            # Numéro et statut
            status_text = f"<font size=14>N° {invoice.invoice_number}</font>"
            if hasattr(invoice, 'status'):
                status_map = {
                    'draft': 'BROUILLON',
                    'sent': 'ENVOYÉE',
                    'paid': 'PAYÉE',
                    'overdue': 'EN RETARD',
                    'cancelled': 'ANNULÉE'
                }
                status_text += f" - <font size=10>{status_map.get(invoice.status, invoice.status.upper())}</font>"

            elements.append(Paragraph(status_text, styles['Normal']))
            elements.append(Spacer(1, 2*mm))

            # Ligne de séparation
            from reportlab.platypus import HRFlowable
            elements.append(HRFlowable(
                width="100%",
                thickness=2,
                color=styles.primary_color,
                spaceBefore=2,
                spaceAfter=5
            ))

        else:  # minimal
            # MINIMAL: Ultra épuré avec typographie soignée

            # Logo centré
            if logo_loaded:
                logo_table = Table([[logo_image]], colWidths=[self.content_width])
                logo_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                ]))
                elements.append(logo_table)
                elements.append(Spacer(1, 3*mm))

            # Nom entreprise centré
            if company_name:
                elements.append(Paragraph(f"<font size=12><b>{company_name}</b></font>", ParagraphStyle(
                    'CompanyName',
                    parent=styles['Normal'],
                    alignment=TA_CENTER,
                    fontSize=12
                )))

            # Infos en une ligne centrée
            info_parts = []
            if address:
                info_parts.append(address.replace('\n', ', '))
            if phone:
                info_parts.append(phone)
            if email:
                info_parts.append(email)

            if info_parts:
                elements.append(Paragraph(f"<font size=8>{' • '.join(info_parts)}</font>", ParagraphStyle(
                    'CompanyInfo',
                    parent=styles['Normal'],
                    alignment=TA_CENTER,
                    fontSize=8
                )))

            elements.append(Spacer(1, 10*mm))

            # FACTURE en grand
            elements.append(Paragraph("<font size=32><b>FACTURE</b></font>", ParagraphStyle(
                'InvoiceTitle',
                parent=styles['Normal'],
                alignment=TA_CENTER,
                fontSize=32,
                spaceAfter=5
            )))

            # Numéro simple
            elements.append(Paragraph(f"<font size=11>{invoice.invoice_number}</font>", ParagraphStyle(
                'InvoiceNumber',
                parent=styles['Normal'],
                alignment=TA_CENTER,
                fontSize=11
            )))

            elements.append(Spacer(1, 2*mm))

            # Ligne fine
            from reportlab.platypus import HRFlowable
            elements.append(HRFlowable(
                width="30%",
                thickness=0.5,
                color=Color(0.5, 0.5, 0.5),
                spaceBefore=3,
                spaceAfter=8,
                hAlign='CENTER'
            ))

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

        # Créer la table avec les couleurs du template
        table = Table(data, colWidths=[self.content_width/2, self.content_width/2])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 0), (-1, 0), Color(243/255, 244/255, 246/255)),
            ('TEXTCOLOR', (0, 0), (-1, 0), styles.text_dark),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 1, Color(229/255, 231/255, 235/255))
        ]))

        elements.append(table)
        return elements

    def _build_items_table(self, invoice, styles, template_type='classic'):
        """Construit le tableau des articles"""
        elements = []

        # Titre de section
        elements.append(Paragraph("<b>Articles facturés</b>", styles['SectionTitle']))
        elements.append(Spacer(1, 3*mm))

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

        if template_type == 'modern':
            # Style moderne: en-tête violet/rose, pas de bordures verticales
            table.setStyle(TableStyle([
                # En-tête avec couleur moderne
                ('BACKGROUND', (0, 0), (-1, 0), styles.primary_color),
                ('TEXTCOLOR', (0, 0), (-1, 0), Color(1, 1, 1)),  # Blanc
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('PADDING', (0, 0), (-1, 0), 8),

                # Corps du tableau
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                ('ALIGN', (0, 1), (1, -1), 'LEFT'),
                ('PADDING', (0, 1), (-1, -1), 7),

                # Lignes alternées
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [Color(1, 1, 1), Color(0.98, 0.98, 0.98)]),

                # Bordures horizontales seulement
                ('LINEABOVE', (0, 0), (-1, 0), 2, styles.primary_color),
                ('LINEBELOW', (0, 0), (-1, 0), 1, styles.secondary_color),
                ('LINEBELOW', (0, -1), (-1, -1), 2, styles.primary_color),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
            ]))

        elif template_type == 'classic':
            # Style classique: en-tête bleu, bordures propres
            table.setStyle(TableStyle([
                # En-tête corporatif
                ('BACKGROUND', (0, 0), (-1, 0), styles.primary_color),
                ('TEXTCOLOR', (0, 0), (-1, 0), Color(1, 1, 1)),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

                # Corps du tableau
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                ('ALIGN', (0, 1), (1, -1), 'LEFT'),

                # Bordures complètes
                ('GRID', (0, 0), (-1, -1), 0.5, Color(0.7, 0.7, 0.7)),
                ('BOX', (0, 0), (-1, -1), 1.5, styles.primary_color),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
            ]))

        else:  # minimal
            # Style minimal: pas de couleurs, bordures fines
            table.setStyle(TableStyle([
                # En-tête simple
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('TEXTCOLOR', (0, 0), (-1, 0), Color(0.3, 0.3, 0.3)),

                # Corps du tableau
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                ('ALIGN', (0, 1), (1, -1), 'LEFT'),

                # Bordures minimales
                ('LINEBELOW', (0, 0), (-1, 0), 1, Color(0, 0, 0)),
                ('LINEBELOW', (0, -1), (-1, -1), 0.5, Color(0.5, 0.5, 0.5)),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
            ]))

        elements.append(table)
        return elements

    def _build_totals(self, invoice, styles, template_type='classic'):
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

        if template_type == 'modern':
            # Style moderne avec fond coloré pour le total
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -2), 11),
                ('FONTSIZE', (0, -1), (-1, -1), 14),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('TEXTCOLOR', (0, 0), (-1, -2), Color(0.3, 0.3, 0.3)),
                # Total avec fond coloré
                ('BACKGROUND', (0, -1), (-1, -1), styles.primary_color),
                ('TEXTCOLOR', (0, -1), (-1, -1), Color(1, 1, 1)),
                ('PADDING', (0, 0), (-1, -2), 5),
                ('PADDING', (0, -1), (-1, -1), 8),
                ('LINEABOVE', (0, -1), (-1, -1), 2, styles.secondary_color)
            ]))

        elif template_type == 'classic':
            # Style classique avec encadrement
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('FONTSIZE', (0, -1), (-1, -1), 13),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('TEXTCOLOR', (0, -1), (-1, -1), styles.primary_color),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('LINEBELOW', (0, -2), (-1, -2), 1, Color(0.7, 0.7, 0.7)),
                ('LINEABOVE', (0, -1), (-1, -1), 2, styles.primary_color),
                ('BOX', (0, 0), (-1, -1), 1, Color(0.7, 0.7, 0.7))
            ]))

        else:  # minimal
            # Style minimal épuré
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -2), 10),
                ('FONTSIZE', (0, -1), (-1, -1), 13),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('TEXTCOLOR', (0, 0), (-1, -1), Color(0, 0, 0)),
                ('PADDING', (0, 0), (-1, -1), 5),
                ('LINEABOVE', (0, -1), (-1, -1), 1.5, Color(0, 0, 0))
            ]))

        # Conteneur pour aligner à droite
        elements.append(Table([[table]], colWidths=[self.content_width]))

        return elements

    def _build_footer(self, invoice, styles):
        """Construit le pied de page avec QR code"""
        elements = []

        # Ajouter une ligne décorative avant le footer selon le template
        from reportlab.platypus import HRFlowable
        elements.append(HRFlowable(
            width="100%",
            thickness=1 if hasattr(styles, 'primary_color') else 0.5,
            color=styles.secondary_color if hasattr(styles, 'secondary_color') else Color(0.8, 0.8, 0.8),
            spaceBefore=5,
            spaceAfter=10
        ))

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

        # Table du footer avec couleur selon le template
        footer_text_color = Color(107/255, 114/255, 128/255)  # Gris par défaut

        footer_table = Table(footer_data, colWidths=[self.content_width-20*mm, 20*mm])
        footer_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (-1, -1), footer_text_color),
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