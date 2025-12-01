import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const GlobalPerformanceWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('global_performance', { period, compare: true });
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

  if (loading) return <div className="widget-loading">{t('labels.loading')}</div>;
  if (!data) return <div className="widget-error">{t('messages.error')}</div>;

  const metrics = [
    { label: t('widgets.global_performance_metrics.total_revenue', { ns: 'dashboard', defaultValue: 'CA Total' }), value: data.total_revenue || 0, change: data.comparison?.revenue_change },
    { label: t('widgets.global_performance_metrics.clients', { ns: 'dashboard', defaultValue: 'Clients' }), value: data.total_clients || 0, change: data.comparison?.clients_change },
  ];

  return (
    <div className="stats-grid">
      {metrics.map((metric, i) => {
        const isPositive = metric.change > 0;
        const isNegative = metric.change < 0;
        return (
          <div key={i} className="stat-card">
            <div className="stat-label">{metric.label}</div>
            <div className="stat-value">{new Intl.NumberFormat('fr-FR').format(metric.value)}</div>
            {metric.change !== undefined && (
              <div className={`stat-change ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`}>
                {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : null}
                <span>{Math.abs(metric.change).toFixed(1)}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GlobalPerformanceWidget;
