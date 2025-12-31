
import os
import sys
import traceback

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
import django
django.setup()

from apps.invoicing.models import Invoice
from apps.invoicing.views_pdf import InvoicePDFView
from django.test import RequestFactory

def test_pdf_generation():
    invoice_id = '4b5b5e2e-5bd7-4955-bc19-1791b0417357'
    print(f"Testing PDF generation for Invoice ID: {invoice_id}")

    try:
        invoice = Invoice.objects.get(pk=invoice_id)
        print(f"Invoice found: {invoice}")
    except Invoice.DoesNotExist:
        print(f"Invoice {invoice_id} not found!")
        return
    except Exception as e:
        print(f"Error fetching invoice: {e}")
        return

    factory = RequestFactory()
    request = factory.get(f'/api/v1/invoices/{invoice_id}/pdf/?template=classic')
    
    # Simulate logged in user if necessary, though the view might mostly rely on the invoice object
    # If the view checks permissions/user in _get_organization_data, we need a user.
    # The view checks: invoice.created_by.organization
    
    try:
        view = InvoicePDFView.as_view()
        print("Calling view...")
        response = view(request, pk=invoice_id)
        
        print(f"Response status code: {response.status_code}")
        if hasattr(response, 'render'):
             print("Rendering response...")
             response.render()
             print("Render successful.")
             print(f"Content type: {response['Content-Type']}")
             print(f"Content length: {len(response.content)}")
        else:
             print("Response is not renderable (maybe a direct HttpResponse)")

    except Exception as e:
        print("\n!!! EXCEPTION CAUGHT !!!")
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf_generation()
