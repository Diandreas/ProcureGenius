# Méthode PDF à ajouter au InvoiceViewSet

@action(detail=True, methods=['post'], url_path='pdf')
def generate_pdf(self, request, pk=None):
    """Générer un PDF de la facture"""
    try:
        from django.http import HttpResponse
        from .services.pdf_generator import generate_invoice_pdf

        invoice = self.get_object()
        template_type = request.data.get('template', 'classic')

        # Générer le PDF
        pdf_buffer = generate_invoice_pdf(invoice, template_type)

        # Créer la réponse HTTP avec le PDF
        response = HttpResponse(
            pdf_buffer.getvalue(),
            content_type='application/pdf'
        )

        # Définir les en-têtes pour le téléchargement
        filename = f"facture-{invoice.invoice_number}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(response.content)

        return response

    except ImportError as e:
        return Response(
            {'error': 'PDF generation service not available', 'details': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        return Response(
            {'error': f'Error generating PDF: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )