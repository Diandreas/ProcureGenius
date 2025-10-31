import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const InvoicesOverviewWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('invoices_overview', { period });
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

  const stats = [
    { label: 'Total', value: data.total || 0, icon: FileText },
    { label: 'Payées', value: data.by_status?.paid || 0, icon: CheckCircle },
    { label: 'Envoyées', value: data.by_status?.sent || 0, icon: Clock },
    { label: 'En retard', value: data.by_status?.overdue || 0, icon: AlertCircle }
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, i) => (
        <div key={i} className="stat-card">
          <div className="stat-label">{stat.label}</div>
          <div className="stat-value">{stat.value}</div>
        </div>
      ))}
    </div>
  );
};

export default InvoicesOverviewWidget;
