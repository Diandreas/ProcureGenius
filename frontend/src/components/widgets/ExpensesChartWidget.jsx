import React, { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import useCurrency from '../../hooks/useCurrency';
import '../../styles/Widgets.css';

const ExpensesChartWidget = ({ period = 'last_30_days' }) => {
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('expenses_chart', { period, compare: true });
        if (response.success) setData(response.data);
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

  const isPositive = data.comparison?.amount_change > 0;
  const isNegative = data.comparison?.amount_change < 0;

  return (
    <>
      <div className="stats-grid" style={{ marginBottom: '12px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Dépenses</div>
          <div className="stat-value">{formatCurrency(data.total_amount || 0)}</div>
          {data.comparison && (
            <div className={`stat-change ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(data.comparison.amount_percent_change || 0).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="chart-placeholder">
        <TrendingDown size={32} />
        <div>Graphique à venir</div>
      </div>
    </>
  );
};

export default ExpensesChartWidget;
