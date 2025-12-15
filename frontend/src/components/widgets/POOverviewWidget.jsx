import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, CheckCircle, Clock, Truck, XCircle } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import useCurrency from '../../hooks/useCurrency';
import '../../styles/Widgets.css';

const POOverviewWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('po_overview', { period });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="widget-loading">{t('labels.loading')}</div>;
  }

  if (!data) {
    return (
      <div className="widget-error">
        <ShoppingCart size={24} className="widget-error-icon" />
        <span>{t('messages.error')}</span>
      </div>
    );
  }

  const statuses = [
    {
      key: 'pending',
      label: t('widgets.po_status_pending', { ns: 'dashboard', defaultValue: 'En attente' }),
      count: data.by_status?.pending || 0,
      amount: data.amounts?.pending || 0,
      icon: Clock,
      color: 'var(--color-warning, #f59e0b)',
      bgColor: 'var(--color-warning-bg, rgba(245, 158, 11, 0.08))'
    },
    {
      key: 'approved',
      label: t('widgets.po_status_approved', { ns: 'dashboard', defaultValue: 'Approuvés' }),
      count: data.by_status?.approved || 0,
      amount: data.amounts?.approved || 0,
      icon: CheckCircle,
      color: 'var(--color-info, #3b82f6)',
      bgColor: 'var(--color-info-bg, rgba(59, 130, 246, 0.08))'
    },
    {
      key: 'received',
      label: t('widgets.po_status_received', { ns: 'dashboard', defaultValue: 'Reçus' }),
      count: data.by_status?.received || 0,
      amount: data.amounts?.received || 0,
      icon: Truck,
      color: 'var(--color-success, #10b981)',
      bgColor: 'var(--color-success-bg, rgba(16, 185, 129, 0.08))'
    },
    {
      key: 'cancelled',
      label: t('widgets.po_status_cancelled', { ns: 'dashboard', defaultValue: 'Annulés' }),
      count: data.by_status?.cancelled || 0,
      amount: data.amounts?.cancelled || 0,
      icon: XCircle,
      color: 'var(--color-error, #ef4444)',
      bgColor: 'var(--color-error-bg, rgba(239, 68, 68, 0.08))'
    }
  ];

  const totalCount = data.total || 0;
  const totalAmount = data.total_amount || 0;

  return (
    <div className="overview-widget">
      <div className="overview-header purple">
        <div className="header-left">
          <ShoppingCart size={18} className="header-icon" />
          <div className="header-info">
            <span className="header-count">{totalCount}</span>
            <span className="header-label">
              {t('widgets.po_total', { ns: 'dashboard', defaultValue: 'commandes' })}
            </span>
          </div>
        </div>
        <div className="header-amount">{formatCurrency(totalAmount)}</div>
      </div>

      <div className="status-grid">
        {statuses.map((status) => {
          const Icon = status.icon;
          return (
            <div key={status.key} className="status-card" style={{ backgroundColor: status.bgColor }}>
              <div className="status-header">
                <Icon size={14} style={{ color: status.color }} />
                <span className="status-label" style={{ color: status.color }}>{status.label}</span>
              </div>
              <div className="status-content">
                <span className="status-count" style={{ color: status.color }}>{status.count}</span>
                <span className="status-amount">{formatCurrency(status.amount)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default POOverviewWidget;
