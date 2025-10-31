"""
Service d'export des statistiques du dashboard en PDF et Excel
"""
from io import BytesIO
from datetime import datetime
from django.utils import timezone
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class DashboardExportService:
    """Service pour exporter les statistiques du dashboard"""

    def __init__(self, stats_data: Dict, user):
        """
        Initialize export service

        Args:
            stats_data: Dictionnaire des statistiques à exporter
            user: Utilisateur Django
        """
        self.stats_data = stats_data
        self.user = user
        self.metadata = stats_data.get('metadata', {})

    def export_to_pdf(self) -> BytesIO:
        """
        Exporte les statistiques en PDF avec graphiques

        Returns:
            BytesIO: Buffer contenant le PDF
        """
        try:
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch, cm
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
            from reportlab.lib import colors
            from reportlab.graphics.shapes import Drawing
            from reportlab.graphics.charts.linecharts import HorizontalLineChart
            from reportlab.graphics.charts.barcharts import VerticalBarChart
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=landscape(A4),
                rightMargin=1*cm,
                leftMargin=1*cm,
                topMargin=1.5*cm,
                bottomMargin=1.5*cm
            )
            story = []
            styles = getSampleStyleSheet()

            # Style personnalisé pour le titre
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1976d2'),
                spaceAfter=20,
                alignment=TA_CENTER
            )

            # Style pour les sous-titres
            subtitle_style = ParagraphStyle(
                'Subtitle',
                parent=styles['Heading2'],
                fontSize=16,
                textColor=colors.HexColor('#424242'),
                spaceAfter=12,
                spaceBefore=12
            )

            # En-tête du rapport
            story.append(Paragraph("Tableau de Bord - Rapport d'Analyse", title_style))
            story.append(Spacer(1, 0.3*cm))

            # Informations sur la période
            period_info = [
                ['Période', f"{self.metadata.get('start_date', 'N/A')} - {self.metadata.get('end_date', 'N/A')}"],
                ['Nombre de jours', str(self.metadata.get('period_days', 'N/A'))],
                ['Généré le', datetime.now().strftime('%d/%m/%Y à %H:%M')],
                ['Par', f"{self.user.get_full_name() or self.user.username}"],
            ]

            period_table = Table(period_info, colWidths=[4*cm, 10*cm])
            period_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
            ]))
            story.append(period_table)
            story.append(Spacer(1, 0.5*cm))

            # Résumé financier
            if 'financial' in self.stats_data:
                story.append(Paragraph("Résumé Financier", subtitle_style))
                financial = self.stats_data['financial']

                financial_data = [
                    ['Indicateur', 'Valeur', 'Variation'],
                    ['Revenus', f"{financial.get('revenue', 0):,.2f} €", self._format_comparison(financial, 'revenue')],
                    ['Dépenses', f"{financial.get('expenses', 0):,.2f} €", self._format_comparison(financial, 'expenses')],
                    ['Profit Net', f"{financial.get('net_profit', 0):,.2f} €", self._format_comparison(financial, 'profit')],
                    ['Marge', f"{financial.get('profit_margin', 0):.1f}%", ''],
                    ['Revenus en attente', f"{financial.get('pending_revenue', 0):,.2f} €", ''],
                ]

                financial_table = Table(financial_data, colWidths=[6*cm, 5*cm, 5*cm])
                financial_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 10),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
                ]))
                story.append(financial_table)
                story.append(Spacer(1, 0.5*cm))

            # Statistiques des factures
            if 'invoices' in self.stats_data:
                story.append(Paragraph("Factures", subtitle_style))
                invoices = self.stats_data['invoices']

                invoice_summary = [
                    ['Métrique', 'Valeur'],
                    ['Total factures', str(invoices.get('total', 0))],
                    ['Factures payées', str(invoices.get('by_status', {}).get('paid', 0))],
                    ['Factures en attente', str(invoices.get('by_status', {}).get('sent', 0))],
                    ['Factures en retard', str(invoices.get('by_status', {}).get('overdue', 0))],
                ]

                if 'period' in invoices:
                    period = invoices['period']
                    invoice_summary.extend([
                        ['Nouvelles (période)', str(period.get('count', 0))],
                        ['Montant total (période)', f"{period.get('total_amount', 0):,.2f} €"],
                        ['Montant payé (période)', f"{period.get('paid_amount', 0):,.2f} €"],
                        ['Taux de paiement', f"{period.get('payment_rate', 0):.1f}%"],
                    ])

                invoice_table = Table(invoice_summary, colWidths=[8*cm, 8*cm])
                invoice_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4caf50')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
                ]))
                story.append(invoice_table)
                story.append(Spacer(1, 0.5*cm))

            # Statistiques des bons de commande
            if 'purchase_orders' in self.stats_data:
                story.append(Paragraph("Bons de Commande", subtitle_style))
                pos = self.stats_data['purchase_orders']

                po_summary = [
                    ['Métrique', 'Valeur'],
                    ['Total BCs', str(pos.get('total', 0))],
                    ['Approuvés', str(pos.get('by_status', {}).get('approved', 0))],
                    ['Reçus', str(pos.get('by_status', {}).get('received', 0))],
                    ['En attente', str(pos.get('by_status', {}).get('pending', 0))],
                ]

                if 'period' in pos:
                    period = pos['period']
                    po_summary.extend([
                        ['Nouveaux (période)', str(period.get('count', 0))],
                        ['Montant total (période)', f"{period.get('total_amount', 0):,.2f} €"],
                        ['Montant moyen', f"{period.get('average_amount', 0):,.2f} €"],
                    ])

                po_table = Table(po_summary, colWidths=[8*cm, 8*cm])
                po_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ff9800')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
                ]))
                story.append(po_table)
                story.append(Spacer(1, 0.5*cm))

            # Nouvelle page pour les autres statistiques
            story.append(PageBreak())

            # Top Clients
            if 'clients' in self.stats_data and 'top_clients' in self.stats_data['clients']:
                story.append(Paragraph("Top 5 Clients", subtitle_style))
                top_clients = self.stats_data['clients']['top_clients']

                if top_clients:
                    clients_data = [['Client', 'Factures', 'Chiffre d\'affaires']]
                    for client in top_clients:
                        clients_data.append([
                            client['name'],
                            str(client['total_invoices']),
                            f"{client['total_revenue']:,.2f} €"
                        ])

                    clients_table = Table(clients_data, colWidths=[8*cm, 4*cm, 4*cm])
                    clients_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9c27b0')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                        ('TOPPADDING', (0, 0), (-1, -1), 8),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
                    ]))
                    story.append(clients_table)
                    story.append(Spacer(1, 0.5*cm))

            # Top Fournisseurs
            if 'suppliers' in self.stats_data and 'top_suppliers' in self.stats_data['suppliers']:
                story.append(Paragraph("Top 5 Fournisseurs", subtitle_style))
                top_suppliers = self.stats_data['suppliers']['top_suppliers']

                if top_suppliers:
                    suppliers_data = [['Fournisseur', 'Commandes', 'Montant total']]
                    for supplier in top_suppliers:
                        suppliers_data.append([
                            supplier['name'],
                            str(supplier['total_orders']),
                            f"{supplier['total_amount']:,.2f} €"
                        ])

                    suppliers_table = Table(suppliers_data, colWidths=[8*cm, 4*cm, 4*cm])
                    suppliers_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#00bcd4')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                        ('TOPPADDING', (0, 0), (-1, -1), 8),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
                    ]))
                    story.append(suppliers_table)
                    story.append(Spacer(1, 0.5*cm))

            # Statistiques produits et stock
            if 'products' in self.stats_data:
                story.append(Paragraph("Produits et Stock", subtitle_style))
                products = self.stats_data['products']

                product_data = [
                    ['Métrique', 'Valeur'],
                    ['Total produits', str(products.get('total', 0))],
                    ['Produits actifs', str(products.get('active', 0))],
                    ['Produits physiques', str(products.get('by_type', {}).get('physical', 0))],
                    ['Services', str(products.get('by_type', {}).get('service', 0))],
                ]

                if 'stock' in products:
                    stock = products['stock']
                    product_data.extend([
                        ['Stock bas', str(stock.get('low_stock', 0))],
                        ['Rupture de stock', str(stock.get('out_of_stock', 0))],
                        ['Valeur stock total', f"{stock.get('total_value', 0):,.2f} €"],
                    ])

                product_table = Table(product_data, colWidths=[8*cm, 8*cm])
                product_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#795548')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
                ]))
                story.append(product_table)
                story.append(Spacer(1, 0.5*cm))

            # Pied de page
            story.append(Spacer(1, 1*cm))
            footer_text = f"<i>Rapport généré par ProcureGenius le {datetime.now().strftime('%d/%m/%Y à %H:%M')}</i>"
            footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
            story.append(Paragraph(footer_text, footer_style))

            # Construire le PDF
            doc.build(story)
            buffer.seek(0)
            return buffer

        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            raise

    def export_to_excel(self) -> BytesIO:
        """
        Exporte les statistiques en Excel avec plusieurs feuilles

        Returns:
            BytesIO: Buffer contenant le fichier Excel
        """
        try:
            import openpyxl
            from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
            from openpyxl.utils import get_column_letter

            workbook = openpyxl.Workbook()

            # Supprimer la feuille par défaut
            workbook.remove(workbook.active)

            # Style pour les en-têtes
            header_fill = PatternFill(start_color="1976D2", end_color="1976D2", fill_type="solid")
            header_font = Font(bold=True, color="FFFFFF", size=12)
            border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )

            # Feuille Résumé
            ws_summary = workbook.create_sheet("Résumé")
            ws_summary.append(["Tableau de Bord - Résumé"])
            ws_summary.merge_cells('A1:B1')
            ws_summary['A1'].font = Font(bold=True, size=16, color="1976D2")
            ws_summary.append([])

            ws_summary.append(["Période", f"{self.metadata.get('start_date')} - {self.metadata.get('end_date')}"])
            ws_summary.append(["Nombre de jours", self.metadata.get('period_days', 'N/A')])
            ws_summary.append(["Généré le", datetime.now().strftime('%d/%m/%Y %H:%M')])
            ws_summary.append([])

            # Données financières
            if 'financial' in self.stats_data:
                ws_summary.append(["Résumé Financier"])
                ws_summary.append(["Indicateur", "Valeur"])
                financial = self.stats_data['financial']
                ws_summary.append(["Revenus", financial.get('revenue', 0)])
                ws_summary.append(["Dépenses", financial.get('expenses', 0)])
                ws_summary.append(["Profit Net", financial.get('net_profit', 0)])
                ws_summary.append(["Marge bénéficiaire", f"{financial.get('profit_margin', 0):.2f}%"])

            # Feuille Factures
            if 'invoices' in self.stats_data:
                ws_invoices = workbook.create_sheet("Factures")
                ws_invoices.append(["Statistiques des Factures"])
                ws_invoices.merge_cells('A1:B1')
                ws_invoices['A1'].font = Font(bold=True, size=14)
                ws_invoices.append([])

                invoices = self.stats_data['invoices']
                ws_invoices.append(["Métrique", "Valeur"])
                ws_invoices.append(["Total factures", invoices.get('total', 0)])

                by_status = invoices.get('by_status', {})
                for status, count in by_status.items():
                    ws_invoices.append([f"Statut: {status}", count])

                if 'period' in invoices:
                    ws_invoices.append([])
                    ws_invoices.append(["Période analysée"])
                    period = invoices['period']
                    ws_invoices.append(["Nouvelles factures", period.get('count', 0)])
                    ws_invoices.append(["Montant total", period.get('total_amount', 0)])
                    ws_invoices.append(["Montant payé", period.get('paid_amount', 0)])
                    ws_invoices.append(["Taux de paiement", f"{period.get('payment_rate', 0):.2f}%"])

            # Feuille Bons de Commande
            if 'purchase_orders' in self.stats_data:
                ws_pos = workbook.create_sheet("Bons de Commande")
                ws_pos.append(["Statistiques des Bons de Commande"])
                ws_pos.merge_cells('A1:B1')
                ws_pos['A1'].font = Font(bold=True, size=14)
                ws_pos.append([])

                pos = self.stats_data['purchase_orders']
                ws_pos.append(["Métrique", "Valeur"])
                ws_pos.append(["Total BCs", pos.get('total', 0)])

                by_status = pos.get('by_status', {})
                for status, count in by_status.items():
                    ws_pos.append([f"Statut: {status}", count])

                if 'period' in pos:
                    ws_pos.append([])
                    ws_pos.append(["Période analysée"])
                    period = pos['period']
                    ws_pos.append(["Nouveaux BCs", period.get('count', 0)])
                    ws_pos.append(["Montant total", period.get('total_amount', 0)])

            # Auto-ajuster les colonnes
            for sheet in workbook.worksheets:
                for column in sheet.columns:
                    max_length = 0
                    column_letter = get_column_letter(column[0].column)
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(cell.value)
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    sheet.column_dimensions[column_letter].width = adjusted_width

            buffer = BytesIO()
            workbook.save(buffer)
            buffer.seek(0)
            return buffer

        except Exception as e:
            logger.error(f"Error generating Excel: {e}")
            raise

    def _format_comparison(self, data: Dict, key: str) -> str:
        """Formate la comparaison avec période précédente"""
        if 'comparison' not in data:
            return ''

        comparison = data['comparison']
        change_key = f"{key}_change" if f"{key}_change" in comparison else 'change'
        percent_key = f"{key}_percent_change" if f"{key}_percent_change" in comparison else 'percent_change'

        change = comparison.get(change_key, 0)
        percent = comparison.get(percent_key, 0)

        if change == 0:
            return '='

        symbol = '▲' if change > 0 else '▼'
        return f"{symbol} {abs(percent):.1f}%"
