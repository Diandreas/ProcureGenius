"""
Script de test pour vérifier la génération PDF avec ReportLab (QR code inclus)
"""
import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.invoicing.models import Invoice
from apps.api.services.pdf_generator import generate_invoice_pdf


def test_reportlab():
    """Teste la génération de PDF avec ReportLab"""

    print("\n" + "="*60)
    print("TEST DE GENERATION PDF AVEC REPORTLAB")
    print("="*60 + "\n")

    # Récupérer une facture existante
    try:
        invoice = Invoice.objects.first()

        if not invoice:
            print("[X] Aucune facture trouvee dans la base de donnees.")
            print("   Veuillez creer une facture avant de lancer ce test.")
            return

        print(f"[OK] Facture trouvee: {invoice.invoice_number}")
        print(f"  Client: {invoice.client.name if invoice.client else 'Aucun'}")
        print(f"  Montant: {invoice.total_amount}")
        print(f"  Nombre d'articles: {invoice.items.count()}\n")

        # Tester les 3 templates
        templates = ['classic', 'modern', 'minimal']

        for template_type in templates:
            print(f"\n[PDF] Test du template '{template_type.upper()}'...")

            try:
                # Générer le PDF
                pdf_buffer = generate_invoice_pdf(invoice, template_type)

                # Sauvegarder le PDF
                filename = f'test_reportlab_{template_type}.pdf'
                with open(filename, 'wb') as f:
                    f.write(pdf_buffer.read())

                # Vérifier la taille du fichier
                file_size = os.path.getsize(filename)
                file_size_kb = file_size / 1024

                print(f"   [OK] PDF genere avec succes!")
                print(f"   [FILE] Fichier: {filename}")
                print(f"   [SIZE] Taille: {file_size_kb:.2f} Ko")

            except Exception as e:
                print(f"   [ERREUR] Erreur lors de la generation: {e}")
                import traceback
                traceback.print_exc()

        print("\n" + "="*60)
        print("[OK] TEST TERMINE!")
        print("="*60)
        print("\nVerifiez les fichiers PDF generes:")
        print("  - test_reportlab_classic.pdf")
        print("  - test_reportlab_modern.pdf")
        print("  - test_reportlab_minimal.pdf")
        print("\nLes PDFs contiennent:")
        print("  - Un design professionnel (ReportLab)")
        print("  - Un QR code de verification en bas de page")
        print("  - Le logo de l'organisation (si configure)")

    except Exception as e:
        print(f"\n[ERREUR] ERREUR GENERALE: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    test_reportlab()
