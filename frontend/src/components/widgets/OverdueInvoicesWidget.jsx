import React, { useState, useEffect } from 'react';
import { AlertOctagon } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const OverdueInvoicesWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('overdue_invoices', { period });
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
  if (!data || !data.invoices) return <div className="widget-empty"><AlertOctagon size={40} className="widget-empty-icon" /><div className="widget-empty-text">Aucune facture en retard</div></div>;

  return (
    <div className="widget-list">
      {data.invoices.slice(0, 5).map((invoice, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{invoice.invoice_number}</div>
            <div className="list-item-subtitle">{invoice.client_name} - {invoice.days_overdue} jours</div>
          </div>
          <div className="list-item-value">{new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(invoice.total_amount)}</div>
        </div>
      ))}
    </div>
  );
};

export default OverdueInvoicesWidget;
