// PDF Service for generating and handling PDF documents
import api from './api';

export const TEMPLATE_TYPES = {
  INVOICE: 'invoice',
  PURCHASE_ORDER: 'purchase_order',
  RECEIPT: 'receipt',
  // Template styles
  CLASSIC: 'classic',
  MODERN: 'modern',
  MINIMAL: 'minimal',
  PROFESSIONAL: 'professional',
};

// Generate Invoice PDF
export const generateInvoicePDF = async (invoiceData, selectedTemplate = 'classic') => {
  try {
    console.log('Generating invoice PDF for:', invoiceData);

    // Récupérer la devise de l'organisation
    let organizationCurrency = 'CAD'; // Devise par défaut
    try {
      const settingsResponse = await api.get('/accounts/organization/settings/');
      organizationCurrency = settingsResponse.data.defaultCurrency ||
                            settingsResponse.data.default_currency ||
                            'CAD';
      console.log('💰 Devise de l\'organisation pour PDF:', organizationCurrency);
    } catch (error) {
      console.warn('Impossible de récupérer la devise, utilisation de CAD par défaut:', error);
    }

    // Try to call backend API for PDF generation
    try {
      const response = await api.get(`/invoices/${invoiceData.id}/pdf/`, {
        params: { template: selectedTemplate },
        responseType: 'blob',
      });

      if (response.data) {
        return new Blob([response.data], { type: 'application/pdf' });
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
                  <td>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(item.unit_price)}</td>
                  <td>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(item.total_price)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" style="text-align: center;">Aucun article</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="total-row">Sous-total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(invoiceData.subtotal || 0)}</div>
          ${invoiceData.tax_amount > 0 ? `<div class="total-row">Taxes: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(invoiceData.tax_amount)}</div>` : ''}
          <div class="total-row grand-total">Total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(invoiceData.total_amount || 0)}</div>
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
export const generatePurchaseOrderPDF = async (purchaseOrderData, selectedTemplate = 'modern') => {
  try {
    console.log('Generating purchase order PDF for:', purchaseOrderData);

    // Récupérer la devise de l'organisation
    let organizationCurrency = 'CAD'; // Devise par défaut
    try {
      const settingsResponse = await api.get('/accounts/organization/settings/');
      organizationCurrency = settingsResponse.data.defaultCurrency ||
                            settingsResponse.data.default_currency ||
                            purchaseOrderData.currency ||
                            'CAD';
      console.log('💰 Devise de l\'organisation pour PDF:', organizationCurrency);
    } catch (error) {
      console.warn('Impossible de récupérer la devise, utilisation de CAD par défaut:', error);
    }

    // Try to call backend API for PDF generation
    try {
      const response = await api.get(`/purchase-orders/${purchaseOrderData.id}/pdf/`, {
        params: { template: selectedTemplate },
        responseType: 'blob',
      });

      if (response.data) {
        return new Blob([response.data], { type: 'application/pdf' });
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
        <title>Bon de Commande ${purchaseOrderData.po_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; color: #2563eb; font-weight: bold; }
          .po-number { font-size: 18px; margin: 10px 0; }
          .section { margin: 20px 0; }
          .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #374151; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          .table th { background-color: #f9fafb; font-weight: bold; }
          .totals { text-align: right; margin-top: 20px; }
          .total-row { margin: 5px 0; }
          .grand-total { font-size: 16px; font-weight: bold; color: #2563eb; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-draft { background-color: #e5e7eb; color: #374151; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-approved { background-color: #d1fae5; color: #065f46; }
          .status-received { background-color: #dbeafe; color: #1e40af; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">BON DE COMMANDE</div>
          <div class="po-number">N° ${purchaseOrderData.po_number}</div>
          <div>Date: ${new Date(purchaseOrderData.order_date).toLocaleDateString('fr-FR')}</div>
          ${purchaseOrderData.expected_delivery ? `<div>Livraison prévue: ${new Date(purchaseOrderData.expected_delivery).toLocaleDateString('fr-FR')}</div>` : ''}
          <div style="margin-top: 10px;">
            <span class="status-badge status-${purchaseOrderData.status || 'draft'}">${
              purchaseOrderData.status === 'draft' ? 'Brouillon' :
              purchaseOrderData.status === 'pending' ? 'En attente' :
              purchaseOrderData.status === 'approved' ? 'Approuvé' :
              purchaseOrderData.status === 'received' ? 'Reçu' :
              purchaseOrderData.status
            }</span>
          </div>
        </div>

        ${purchaseOrderData.supplier ? `
        <div class="section">
          <div class="section-title">Fournisseur</div>
          <div><strong>${purchaseOrderData.supplier.name}</strong></div>
          ${purchaseOrderData.supplier.email ? `<div>Email: ${purchaseOrderData.supplier.email}</div>` : ''}
          ${purchaseOrderData.supplier.phone ? `<div>Tél: ${purchaseOrderData.supplier.phone}</div>` : ''}
          ${purchaseOrderData.supplier.address ? `<div>Adresse: ${purchaseOrderData.supplier.address}</div>` : ''}
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Articles commandés</div>
          <table class="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Produit</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${purchaseOrderData.items?.map(item => `
                <tr>
                  <td>${item.product?.reference || item.product_reference || '-'}</td>
                  <td>${item.product?.name || item.product_name || 'N/A'}</td>
                  <td>${item.quantity} ${item.unit || 'unité(s)'}</td>
                  <td>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(item.unit_price)}</td>
                  <td>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(item.total_price || item.quantity * item.unit_price)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" style="text-align: center;">Aucun article</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="total-row">Sous-total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(purchaseOrderData.subtotal || 0)}</div>
          ${purchaseOrderData.tax_amount > 0 ? `<div class="total-row">Taxes: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(purchaseOrderData.tax_amount)}</div>` : ''}
          ${purchaseOrderData.shipping_cost > 0 ? `<div class="total-row">Frais de livraison: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(purchaseOrderData.shipping_cost)}</div>` : ''}
          <div class="total-row grand-total">Total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organizationCurrency }).format(purchaseOrderData.total_amount || 0)}</div>
        </div>

        ${purchaseOrderData.notes ? `
        <div class="section">
          <div class="section-title">Notes</div>
          <div style="padding: 10px; background-color: #f9fafb; border-radius: 4px;">${purchaseOrderData.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
          <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
          <div>ProcureGenius - Gestion des achats</div>
        </div>
      </body>
      </html>
    `;

    // Create blob with HTML content that browsers can display
    const blob = new Blob([htmlContent], { type: 'text/html' });
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