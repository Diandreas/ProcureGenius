import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Target, Percent } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import useCurrency from '../../hooks/useCurrency';
import '../../styles/Widgets.css';

const FinancialSummaryWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
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
    return <div className="widget-loading">{t('labels.loading')}</div>;
  }

  if (!data) {
    return <div className="widget-error">{t('messages.loadingError')}</div>;
  }

  const metrics = [
    {
      label: t('widgets.financial_summary_metrics.revenue', { ns: 'dashboard', defaultValue: 'Revenus' }),
      value: data.revenue || 0,
      change: data.comparison?.revenue_percent_change
    },
    {
      label: t('widgets.financial_summary_metrics.expenses', { ns: 'dashboard', defaultValue: 'Dépenses' }),
      value: data.expenses || 0,
      change: data.comparison?.expenses_change,
      isExpense: true
    },
    {
      label: t('widgets.financial_summary_metrics.net_profit', { ns: 'dashboard', defaultValue: 'Profit' }),
      value: data.net_profit || 0,
      change: data.comparison?.profit_percent_change
    },
    {
      label: t('widgets.financial_summary_metrics.margin', { ns: 'dashboard', defaultValue: 'Marge' }),
      value: `${(data.profit_margin || 0).toFixed(1)}%`,
      isPercentage: true
    }
  ];

  return (
    <div className="stats-grid">
      {metrics.map((metric, index) => {
        const isPositive = metric.change > 0;
        const isNegative = metric.change < 0;
        const showChange = metric.change !== undefined && metric.change !== null;

        return (
          <div key={index} className="stat-card">
            <div className="stat-label">{metric.label}</div>
            <div className="stat-value">
              {metric.isPercentage ? metric.value : formatCurrency(metric.value)}
            </div>
            {showChange && (
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
