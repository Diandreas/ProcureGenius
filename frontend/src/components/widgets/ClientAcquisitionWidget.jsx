import React, { useState, useEffect } from 'react';
import { UserPlus, TrendingUp } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const ClientAcquisitionWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('client_acquisition', { period, compare: true });
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

  const isPositive = data.comparison?.change > 0;
  const isNegative = data.comparison?.change < 0;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Nouveaux Clients</div>
        <div className="stat-value">{data.new_clients || 0}</div>
        {data.comparison && (
          <div className={`stat-change ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingUp size={12} style={{transform: 'rotate(180deg)'}} />}
            <span>{Math.abs(data.comparison.change || 0).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientAcquisitionWidget;
