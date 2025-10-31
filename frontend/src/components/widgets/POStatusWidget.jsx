import React, { useState, useEffect } from 'react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const POStatusWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('po_status', { period });
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
  if (!data || !data.by_status) return <div className="widget-error">Erreur</div>;

  const statuses = [
    { label: 'En attente', value: data.by_status.pending || 0 },
    { label: 'Approuvés', value: data.by_status.approved || 0 },
    { label: 'Reçus', value: data.by_status.received || 0 },
    { label: 'Annulés', value: data.by_status.cancelled || 0 },
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

export default POStatusWidget;
