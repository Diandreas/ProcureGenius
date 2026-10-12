import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';
import useCurrency from '../../hooks/useCurrency';

const SupplierPerformanceWidget = ({ period = 'last_30_days' }) => {
  const { format } = useCurrency();
  const { t } = useTranslation(['dashboard', 'common']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('supplier_performance', { period, limit: 5 });
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
  if (!data.suppliers || data.suppliers.length === 0) {
    return (
      <div className="widget-empty">
        <Award size={40} className="widget-empty-icon" />
        <div className="widget-empty-text">{t('dashboard:widgets.supplier_performance_empty')}</div>
      </div>
    );
  }

  return (
    <div className="widget-list">
      {data.suppliers.map((supplier, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">#{i + 1} {supplier.name}</div>
            <div className="list-item-subtitle">{t('dashboard:widgets.supplierPerformance.ordersCount', { count: supplier.total_orders })}</div>
          </div>
          <div className="list-item-value">{format(supplier.total_amount, 0)}</div>
        </div>
      ))}
    </div>
  );
};

export default SupplierPerformanceWidget;
