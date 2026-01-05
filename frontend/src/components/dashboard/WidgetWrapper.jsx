import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, GripVertical } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { fadeInUp } from '../../animations/variants/scroll-reveal';

// Widget titles mapping
const getWidgetTitle = (t, widgetCode) => {
  const titles = {
    // Global (3)
    'financial_summary': t('widgets.financial_summary'),
    'alerts_notifications': t('widgets.alerts_notifications'),
    'cash_flow_summary': t('widgets.cash_flow_summary_title'),
    // Clients (3)
    'top_clients': t('widgets.top_clients'),
    'clients_at_risk': t('widgets.clients_at_risk'),
    'pareto_clients': t('widgets.pareto_clients_title'),
    // Products (3)
    'top_selling_products': t('widgets.top_selling_products'),
    'stock_alerts': t('widgets.stock_alerts'),
    'margin_analysis': t('widgets.margin_analysis'),
    // Invoices (2)
    'invoices_overview': t('widgets.invoices_overview'),
    'overdue_invoices': t('widgets.overdue_invoices'),
    // Purchase Orders (4)
    'po_overview': t('widgets.po_overview'),
    'overdue_po': t('widgets.overdue_po'),
    'supplier_performance': t('widgets.supplier_performance'),
    'pending_approvals': t('widgets.pending_approvals'),
    // AI (1)
    'ai_suggestions': t('widgets.ai_suggestions'),
    // Legacy/Deprecated (for backward compatibility)
    'recent_activity': t('widgets.recent_activity'),
    'global_performance': t('widgets.global_performance'),
    'products_overview': t('widgets.products_overview'),
    'stock_movements': t('widgets.stock_movements'),
    'clients_overview': t('widgets.clients_overview'),
    'client_acquisition': t('widgets.client_acquisition'),
    'client_segmentation': t('widgets.client_segmentation'),
    'invoices_status': t('widgets.invoices_status'),
    'revenue_chart': t('widgets.revenue_chart'),
    'payment_performance': t('widgets.payment_performance'),
    'recent_invoices': t('widgets.recent_invoices'),
    'po_status': t('widgets.po_status'),
    'expenses_chart': t('widgets.expenses_chart'),
    'budget_tracking': t('widgets.budget_tracking'),
    'ai_usage': t('widgets.ai_usage'),
    'ai_documents': t('widgets.ai_documents'),
    'ai_last_conversation': t('widgets.ai_last_conversation'),
  };
  return titles[widgetCode] || widgetCode;
};

const WidgetWrapper = ({ widgetCode, onRemove, isEditMode, children }) => {
  const { t } = useTranslation('dashboard');
  const widgetTitle = getWidgetTitle(t, widgetCode);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`widget-wrapper ${isEditMode ? 'edit-mode' : ''}`}
    >
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
    </motion.div>
  );
};

export default WidgetWrapper;
