import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, AlertTriangle, BarChart3, CheckCircle } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import useCurrency from '../../hooks/useCurrency';
import '../../styles/Widgets.css';

const ParetoClientsWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await widgetsAPI.getWidgetData('pareto_clients', { period });
        if (response.success) {
          setData(response.data);
        } else {
          setError('Failed to load data');
        }
      } catch (err) {
        console.error('Error fetching pareto clients:', err);
        setError(err.message || 'Error loading data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="widget-loading">{t('labels.loading')}</div>;
  }

  if (error) {
    return (
      <div className="widget-error">
        <TrendingUp size={24} className="widget-error-icon" />
        <div className="widget-error-text">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-empty">
        <Users size={40} className="widget-empty-icon" />
        <div className="widget-empty-text">
          {t('widgets.pareto_clients_empty', { ns: 'dashboard', defaultValue: 'Aucune donnée Pareto' })}
        </div>
      </div>
    );
  }

  const topPercent = data.top_clients_percent || 20;
  const revenuePercent = data.revenue_percent || 80;
  const topClientsCount = data.top_clients_count || 0;
  const totalClients = data.total_clients || 0;
  const topRevenue = data.top_revenue || 0;
  const totalRevenue = data.total_revenue || 0;

  const getColor = (percent) => {
    if (percent <= 15) return 'var(--color-error, #ef4444)';
    if (percent <= 25) return 'var(--color-warning, #f59e0b)';
    if (percent <= 40) return 'var(--color-success, #10b981)';
    return 'var(--color-info, #6366f1)';
  };

  const barColor = getColor(topPercent);

  return (
    <div className="pareto-widget">
      <div className="pareto-header">
        <div className="pareto-title">
          {t('widgets.pareto_title', { ns: 'dashboard', defaultValue: 'Analyse Pareto' })}
        </div>
        <div className="pareto-subtitle">
          {t('widgets.pareto_subtitle', { ns: 'dashboard', defaultValue: 'Concentration CA' })}
        </div>
      </div>

      <div className="pareto-main-stat">
        <div className="pareto-percentage">
          <span className="pareto-value" style={{ color: barColor }}>
            {topPercent.toFixed(0)}%
          </span>
          <span className="pareto-label">
            {t('widgets.pareto_clients_label', { ns: 'dashboard', defaultValue: 'clients' })}
          </span>
        </div>
        <div className="pareto-arrow">→</div>
        <div className="pareto-percentage">
          <span className="pareto-value" style={{ color: 'var(--color-success, #10b981)' }}>
            {revenuePercent.toFixed(0)}%
          </span>
          <span className="pareto-label">
            {t('widgets.pareto_revenue_label', { ns: 'dashboard', defaultValue: 'du CA' })}
          </span>
        </div>
      </div>

      <div className="pareto-bar-container">
        <div className="pareto-bar-background">
          <div className="pareto-bar-fill" style={{ width: `${topPercent}%`, backgroundColor: barColor }} />
        </div>
        <div className="pareto-bar-labels">
          <span>{topClientsCount}/{totalClients}</span>
          <span>{formatCurrency(topRevenue)}/{formatCurrency(totalRevenue)}</span>
        </div>
      </div>

      <div className="pareto-insight" style={{ color: barColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {topPercent <= 20 ? (
          <>
            <AlertTriangle size={16} />
            <span>Forte concentration</span>
          </>
        ) : topPercent <= 35 ? (
          <>
            <BarChart3 size={16} />
            <span>Distribution normale</span>
          </>
        ) : (
          <>
            <CheckCircle size={16} />
            <span>Portefeuille diversifié</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ParetoClientsWidget;
