import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const TopClientsWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('top_clients', { period, limit: 5 });
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
      {data.clients && data.clients.length > 0 ? (
        <div className="widget-list">
          {data.clients.map((client, index) => (
            <div key={index} className="list-item">
              <div className="list-item-content">
                <div className="list-item-title">#{index + 1} {client.name}</div>
                <div className="list-item-subtitle">{client.total_invoices} facture(s)</div>
              </div>
              <div className="list-item-value">{formatCurrency(client.total_revenue)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="widget-empty">
          <Award size={40} className="widget-empty-icon" />
          <div className="widget-empty-text">Aucun client</div>
        </div>
      )}
    </>
  );
};

export default TopClientsWidget;
