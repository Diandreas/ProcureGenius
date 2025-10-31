import React, { useState, useEffect } from 'react';
import { Bot, TrendingUp } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const AIUsageWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('ai_usage', { period, compare: true });
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

  const metrics = [
    { label: 'Conversations', value: data.total_conversations || 0, change: data.comparison?.conversations_change },
    { label: 'Messages', value: data.total_messages || 0, change: data.comparison?.messages_change },
  ];

  return (
    <div className="stats-grid">
      {metrics.map((metric, i) => {
        const isPositive = metric.change > 0;
        const isNegative = metric.change < 0;
        return (
          <div key={i} className="stat-card">
            <div className="stat-label">{metric.label}</div>
            <div className="stat-value">{metric.value}</div>
            {metric.change !== undefined && (
              <div className={`stat-change ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingUp size={12} style={{transform: 'rotate(180deg)'}} />}
                <span>{Math.abs(metric.change).toFixed(1)}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AIUsageWidget;
