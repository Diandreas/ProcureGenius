import React, { useState, useEffect } from 'react';
import { List, AlertCircle } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const RecentInvoicesWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await widgetsAPI.getWidgetData('recent_invoices', { period, limit: 5 });
        if (response.success) {
          setData(response.data);
        } else {
          setError('Failed to load data');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(error.response?.status === 500 
          ? 'Erreur serveur. Veuillez réessayer plus tard.' 
          : 'Erreur lors du chargement des données');
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) return <div className="widget-loading">Chargement...</div>;
  if (error) return <div className="widget-error"><AlertCircle size={20} className="widget-error-icon" /><div className="widget-error-text">{error}</div></div>;
  if (!data || !data.invoices || data.invoices.length === 0) return <div className="widget-empty"><List size={40} className="widget-empty-icon" /><div className="widget-empty-text">Aucune facture</div></div>;

  return (
    <div className="widget-list">
      {data.invoices.map((invoice, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{invoice.invoice_number}</div>
            <div className="list-item-subtitle">{invoice.client_name} - {new Date(invoice.created_at).toLocaleDateString()}</div>
          </div>
          <div className="list-item-value">{new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(invoice.total_amount)}</div>
        </div>
      ))}
    </div>
  );
};

export default RecentInvoicesWidget;
