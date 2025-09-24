// PDF Service for generating and handling PDF documents

export const TEMPLATE_TYPES = {
  INVOICE: 'invoice',
  PURCHASE_ORDER: 'purchase_order',
  RECEIPT: 'receipt',
};

// Generate Invoice PDF
export const generateInvoicePDF = async (invoiceData) => {
  try {
    console.log('Generating invoice PDF for:', invoiceData);

    // Try to call backend API for PDF generation
    try {
      const response = await fetch(`/api/invoices/${invoiceData.id}/pdf/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template: 'classic' })
      });

      if (response.ok) {
        const blob = await response.blob();
        return blob;
      }
    } catch (apiError) {
      console.warn('Backend PDF generation not available, using fallback:', apiError);
    }

    // Fallback: Create a simple HTML-based PDF simulation
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Facture ${invoiceData.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; color: #2563eb; font-weight: bold; }
          .invoice-number { font-size: 18px; margin: 10px 0; }
          .section { margin: 20px 0; }
          .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #374151; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          .table th { background-color: #f9fafb; font-weight: bold; }
          .totals { text-align: right; margin-top: 20px; }
          .total-row { margin: 5px 0; }
          .grand-total { font-size: 16px; font-weight: bold; color: #2563eb; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">FACTURE</div>
          <div class="invoice-number">N° ${invoiceData.invoice_number}</div>
          <div>Date: ${new Date(invoiceData.issue_date).toLocaleDateString('fr-FR')}</div>
          ${invoiceData.due_date ? `<div>Échéance: ${new Date(invoiceData.due_date).toLocaleDateString('fr-FR')}</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Détails de la facture</div>
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">${invoiceData.title || 'Sans titre'}</div>
          ${invoiceData.description ? `<div style="color: #6b7280;">${invoiceData.description}</div>` : ''}
        </div>

        ${invoiceData.client ? `
        <div class="section">
          <div class="section-title">Client</div>
          <div><strong>${invoiceData.client.name}</strong></div>
          <div>${invoiceData.client.email}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Articles</div>
          <table class="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items?.map(item => `
                <tr>
                  <td>${item.product_reference || '-'}</td>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.unit_price)}</td>
                  <td>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.total_price)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" style="text-align: center;">Aucun article</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="total-row">Sous-total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceData.subtotal || 0)}</div>
          ${invoiceData.tax_amount > 0 ? `<div class="total-row">Taxes: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceData.tax_amount)}</div>` : ''}
          <div class="total-row grand-total">Total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceData.total_amount || 0)}</div>
        </div>

        <div class="footer">
          <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
          <div>ProcureGenius - Gestion des factures</div>
        </div>
      </body>
      </html>
    `;

    // Create blob with HTML content that browsers can display
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return blob;

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
};

// Generate Purchase Order PDF
export const generatePurchaseOrderPDF = async (purchaseOrderData) => {
  try {
    // This would typically call a PDF generation library like jsPDF or make an API call
    console.log('Generating purchase order PDF for:', purchaseOrderData);

    // Placeholder implementation - replace with actual PDF generation
    const blob = new Blob(['Purchase Order PDF content'], { type: 'application/pdf' });
    return blob;
  } catch (error) {
    console.error('Error generating purchase order PDF:', error);
    throw error;
  }
};

// Download PDF file
export const downloadPDF = (blob, filename) => {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

// Open PDF in new tab
export const openPDFInNewTab = (blob) => {
  try {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Note: URL is not revoked here as the new tab needs it
  } catch (error) {
    console.error('Error opening PDF in new tab:', error);
    throw error;
  }
};