import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const RevenueChartWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('revenue_chart', { period });
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

  if (loading) return <div className="widget-loading">Chargement...</div>;
  if (!data) return <div className="widget-error">Erreur</div>;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <>
      <div className="stats-grid" style={{ marginBottom: '12px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Revenus</div>
          <div className="stat-value">{formatCurrency(data.total_amount || 0)}</div>
          {data.comparison && (
            <div className={`stat-change ${data.comparison.amount_change >= 0 ? 'positive' : 'negative'}`}>
              <TrendingUp size={12} />
              <span>{Math.abs(data.comparison.amount_percent_change || 0).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="chart-placeholder">
        <BarChart3 size={32} />
        <div>Graphique à venir</div>
      </div>
    </>
  );
};

export default RevenueChartWidget;
