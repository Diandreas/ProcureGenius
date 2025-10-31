import React from 'react';
import { X, GripVertical } from 'lucide-react';

// Widget titles mapping
const WIDGET_TITLES = {
  // Global
  'financial_summary': 'Vue Financière Globale',
  'recent_activity': 'Activité Récente',
  'alerts_notifications': 'Alertes et Notifications',
  'global_performance': 'Performance Globale',
  // Products
  'products_overview': 'Aperçu Stock',
  'top_selling_products': 'Produits les Plus Vendus',
  'stock_alerts': 'Alertes Stock',
  'margin_analysis': 'Analyse Marges',
  'stock_movements': 'Mouvements de Stock',
  // Clients
  'clients_overview': 'Aperçu Clients',
  'top_clients': 'Top Clients',
  'clients_at_risk': 'Clients à Risque',
  'client_acquisition': 'Acquisition Clients',
  'client_segmentation': 'Segmentation Clients',
  // Invoices
  'invoices_overview': 'Aperçu Factures',
  'invoices_status': 'Statut Factures',
  'revenue_chart': 'Revenus',
  'overdue_invoices': 'Factures en Retard',
  'payment_performance': 'Performance Paiements',
  'recent_invoices': 'Factures Récentes',
  // Purchase Orders
  'po_overview': 'Aperçu Bons de Commande',
  'po_status': 'Statut Bons de Commande',
  'expenses_chart': 'Dépenses Achats',
  'overdue_po': 'BCs en Retard',
  'supplier_performance': 'Performance Fournisseurs',
  'pending_approvals': 'Approbations en Attente',
  'budget_tracking': 'Suivi Budget',
  // AI
  'ai_usage': 'Utilisation IA',
  'ai_documents': 'Documents Traités',
  'ai_last_conversation': 'Dernière Conversation',
};

const WidgetWrapper = ({ widgetCode, onRemove, isEditMode, children }) => {
  const widgetTitle = WIDGET_TITLES[widgetCode] || widgetCode;

  return (
    <div className={`widget-wrapper ${isEditMode ? 'edit-mode' : ''}`}>
      <div className="widget-header">
        {isEditMode && (
          <div className="widget-drag-handle">
            <GripVertical size={18} />
          </div>
        )}
        <div className="widget-title-text">{widgetTitle}</div>
        {isEditMode && (
          <button
            className="widget-action-btn widget-remove-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(widgetCode);
            }}
            title="Supprimer"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="widget-content">
        {children}
      </div>
    </div>
  );
};

export default WidgetWrapper;
