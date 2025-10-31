import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Target } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const FinancialSummaryWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('financial_summary', {
          period,
          compare: true
        });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error fetching financial summary:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="widget-loading">Chargement...</div>;
  }

  if (!data) {
    return <div className="widget-error">Erreur de chargement</div>;
  }

  const metrics = [
    {
      label: 'Revenus',
      value: data.revenue || 0,
      icon: DollarSign,
      color: '#10b981',
      change: data.comparison?.revenue_percent_change
    },
    {
      label: 'Dépenses',
      value: data.expenses || 0,
      icon: PiggyBank,
      color: '#ef4444',
      change: data.comparison?.expenses_change
    },
    {
      label: 'Profit Net',
      value: data.net_profit || 0,
      icon: Target,
      color: '#6366f1',
      change: data.comparison?.profit_percent_change
    },
    {
      label: 'Marge',
      value: `${(data.profit_margin || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: '#f59e0b',
      isPercentage: true
    }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="stats-grid">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const isPositive = metric.change > 0;
        const isNegative = metric.change < 0;

        return (
          <div key={index} className="stat-card">
            <div className="stat-label">{metric.label}</div>
            <div className="stat-value">
              {metric.isPercentage ? metric.value : formatCurrency(metric.value)}
            </div>
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

export default FinancialSummaryWidget;
