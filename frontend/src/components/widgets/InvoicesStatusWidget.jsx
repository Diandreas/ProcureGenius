import React, { useState, useEffect } from 'react';
import { PieChart } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const InvoicesStatusWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('invoices_status', { period });
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
  if (!data || !data.by_status) return <div className="chart-placeholder"><PieChart size={32} /><div>Aucune donnée</div></div>;

  const statuses = [
    { label: 'Brouillon', value: data.by_status.draft || 0 },
    { label: 'Envoyées', value: data.by_status.sent || 0 },
    { label: 'Payées', value: data.by_status.paid || 0 },
    { label: 'En retard', value: data.by_status.overdue || 0 },
  ];

  return (
    <div className="stats-grid">
      {statuses.map((status, i) => (
        <div key={i} className="stat-card">
          <div className="stat-label">{status.label}</div>
          <div className="stat-value">{status.value}</div>
        </div>
      ))}
    </div>
  );
};

export default InvoicesStatusWidget;
