import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, GripVertical } from 'lucide-react';

// Widget titles mapping
const getWidgetTitle = (t, widgetCode) => {
  const titles = {
    // Global
    'financial_summary': t('widgets.financial_summary'),
    'recent_activity': t('widgets.recent_activity'),
    'alerts_notifications': t('widgets.alerts_notifications'),
    'global_performance': t('widgets.global_performance'),
    // Products
    'products_overview': t('widgets.products_overview'),
    'top_selling_products': t('widgets.top_selling_products'),
    'stock_alerts': t('widgets.stock_alerts'),
    'margin_analysis': t('widgets.margin_analysis'),
    'stock_movements': t('widgets.stock_movements'),
    // Clients
    'clients_overview': t('widgets.clients_overview'),
    'top_clients': t('widgets.top_clients'),
    'clients_at_risk': t('widgets.clients_at_risk'),
    'client_acquisition': t('widgets.client_acquisition'),
    'client_segmentation': t('widgets.client_segmentation'),
    // Invoices
    'invoices_overview': t('widgets.invoices_overview'),
    'invoices_status': t('widgets.invoices_status'),
    'revenue_chart': t('widgets.revenue_chart'),
    'overdue_invoices': t('widgets.overdue_invoices'),
    'payment_performance': t('widgets.payment_performance'),
    'recent_invoices': t('widgets.recent_invoices'),
    // Purchase Orders
    'po_overview': t('widgets.po_overview'),
    'po_status': t('widgets.po_status'),
    'expenses_chart': t('widgets.expenses_chart'),
    'overdue_po': t('widgets.overdue_po'),
    'supplier_performance': t('widgets.supplier_performance'),
    'pending_approvals': t('widgets.pending_approvals'),
    'budget_tracking': t('widgets.budget_tracking'),
    // AI
    'ai_usage': t('widgets.ai_usage'),
    'ai_documents': t('widgets.ai_documents'),
    'ai_last_conversation': t('widgets.ai_last_conversation'),
  };
  return titles[widgetCode] || widgetCode;
};

const WidgetWrapper = ({ widgetCode, onRemove, isEditMode, children }) => {
  const { t } = useTranslation('dashboard');
  const widgetTitle = getWidgetTitle(t, widgetCode);

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
            title={t('actions.remove')}
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
