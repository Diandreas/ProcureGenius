import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, Clock, AlertCircle, FileEdit } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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

  // Préparer les données pour le donut chart
  const chartData = statuses
    .filter(s => s.count > 0) // Ne montrer que les statuts avec des données
    .map(s => ({
      name: s.label,
      value: s.count,
      amount: s.amount,
      color: s.color
    }));

  // Tooltip personnalisé pour le donut
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '13px', color: item.color }}>
            {item.name}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {item.value} {t('widgets.invoices_label', { ns: 'dashboard', defaultValue: 'facture(s)' })}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>
            {formatCurrency(item.amount)}
          </div>
        </div>
      );
    }
    return null;
  };

  // Label personnalisé pour afficher le pourcentage
  const renderLabel = (entry) => {
    const percent = ((entry.value / totalCount) * 100).toFixed(0);
    return `${percent}%`;
  };

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

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={renderLabel}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="status-grid" style={{ marginTop: '10px' }}>
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
