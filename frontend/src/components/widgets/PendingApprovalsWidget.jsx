import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';
import useCurrency from '../../hooks/useCurrency';

const PendingApprovalsWidget = ({ period = 'last_30_days' }) => {
  const { format } = useCurrency();
  const { t } = useTranslation(['dashboard', 'common']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('pending_approvals', { period });
        if (response.success) setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) return <div className="widget-loading">{t('common:labels.loading')}</div>;
  if (!data) return <div className="widget-error">{t('dashboard:widgets.shared.error')}</div>;
  if (!data.purchase_orders || data.purchase_orders.length === 0) {
    return (
      <div className="widget-empty">
        <CheckSquare size={40} className="widget-empty-icon" />
        <div className="widget-empty-text">{t('dashboard:widgets.pending_approvals_empty')}</div>
      </div>
    );
  }

  return (
    <div className="widget-list">
      {data.purchase_orders.slice(0, 5).map((po, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{po.po_number}</div>
            <div className="list-item-subtitle">{po.supplier_name}</div>
          </div>
          <div className="list-item-value">{format(po.total_amount, 0)}</div>
        </div>
      ))}
    </div>
  );
};

export default PendingApprovalsWidget;
