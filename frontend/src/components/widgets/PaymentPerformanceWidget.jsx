import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const PaymentPerformanceWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('payment_performance', { period });
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
    { label: 'Délai Moyen', value: `${(data.average_payment_days || 0).toFixed(0)} j` },
    { label: 'Taux Paiement', value: `${(data.payment_rate || 0).toFixed(1)}%` },
  ];

  return (
    <div className="stats-grid">
      {metrics.map((metric, i) => (
        <div key={i} className="stat-card">
          <div className="stat-label">{metric.label}</div>
          <div className="stat-value">{metric.value}</div>
        </div>
      ))}
    </div>
  );
};

export default PaymentPerformanceWidget;
