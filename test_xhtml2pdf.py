#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script pour tester la génération PDF avec xhtml2pdf"""

import os
import sys
import django

# Configuration Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.invoicing.models import Invoice
from apps.api.services.pdf_generator_weasy import generate_invoice_pdf_weasy

def test_pdf_generation():
    """Test la génération de PDFs avec les 3 templates"""

    # Récupérer la facture de Sophie
    invoice = Invoice.objects.get(invoice_number='FAC2025100013')
    print(f"✓ Facture trouvée: {invoice.invoice_number}")
    print(f"  Client: {invoice.client}")
    print(f"  Montant: {invoice.total_amount}€")
    print()

    templates = ['modern', 'classic', 'minimal']

    for template_type in templates:
        try:
            print(f"Génération du PDF avec template '{template_type}'...")

            # Générer le PDF
            pdf_buffer = generate_invoice_pdf_weasy(invoice, template_type)

            # Sauvegarder le PDF pour inspection
            output_file = f"test_invoice_{template_type}.pdf"
            with open(output_file, 'wb') as f:
                f.write(pdf_buffer.getvalue())

            file_size = os.path.getsize(output_file)
            print(f"  ✓ PDF généré: {output_file} ({file_size} bytes)")

        except Exception as e:
            print(f"  ✗ Erreur avec template '{template_type}': {e}")
            import traceback
            traceback.print_exc()

        print()

    print("=" * 60)
    print("Test terminé!")
    print("Vérifiez les fichiers: test_invoice_modern.pdf, test_invoice_classic.pdf, test_invoice_minimal.pdf")

if __name__ == '__main__':
    test_pdf_generation()
