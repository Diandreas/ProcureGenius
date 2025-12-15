import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, Clock, AlertCircle, FileEdit } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import useCurrency from '../../hooks/useCurrency';
import '../../styles/Widgets.css';

const InvoicesOverviewWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('invoices_overview', { period });
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
        <FileText size={24} className="widget-error-icon" />
        <span>{t('messages.error')}</span>
      </div>
    );
  }

  const statuses = [
    {
      key: 'draft',
      label: t('widgets.invoices_status_draft', { ns: 'dashboard', defaultValue: 'Brouillon' }),
      count: data.by_status?.draft || 0,
      amount: data.amounts?.draft || 0,
      icon: FileEdit,
      color: 'var(--color-text-secondary, #64748b)',
      bgColor: 'var(--color-bg-subtle, rgba(100, 116, 139, 0.08))'
    },
    {
      key: 'sent',
      label: t('widgets.invoices_status_sent', { ns: 'dashboard', defaultValue: 'Envoyées' }),
      count: data.by_status?.sent || 0,
      amount: data.amounts?.sent || 0,
      icon: Clock,
      color: 'var(--color-info, #3b82f6)',
      bgColor: 'var(--color-info-bg, rgba(59, 130, 246, 0.08))'
    },
    {
      key: 'paid',
      label: t('widgets.invoices_status_paid', { ns: 'dashboard', defaultValue: 'Payées' }),
      count: data.by_status?.paid || 0,
      amount: data.amounts?.paid || 0,
      icon: CheckCircle,
      color: 'var(--color-success, #10b981)',
      bgColor: 'var(--color-success-bg, rgba(16, 185, 129, 0.08))'
    },
    {
      key: 'overdue',
      label: t('widgets.invoices_status_overdue', { ns: 'dashboard', defaultValue: 'En retard' }),
      count: data.by_status?.overdue || 0,
      amount: data.amounts?.overdue || 0,
      icon: AlertCircle,
      color: 'var(--color-error, #ef4444)',
      bgColor: 'var(--color-error-bg, rgba(239, 68, 68, 0.08))'
    }
  ];

  const totalCount = data.total || 0;
  const totalAmount = data.total_amount || 0;

  return (
    <div className="overview-widget">
      <div className="overview-header blue">
        <div className="header-left">
          <FileText size={18} className="header-icon" />
          <div className="header-info">
            <span className="header-count">{totalCount}</span>
            <span className="header-label">
              {t('widgets.invoices_total', { ns: 'dashboard', defaultValue: 'factures' })}
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

export default InvoicesOverviewWidget;
