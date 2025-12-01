import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const ClientsAtRiskWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('clients_at_risk', { period });
        if (response.success) setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) return <div className="widget-loading">{t('labels.loading')}</div>;
  if (!data || !data.clients) return <div className="widget-empty"><AlertCircle size={40} className="widget-empty-icon" /><div className="widget-empty-text">{t('widgets.clients_at_risk_empty', { ns: 'dashboard', defaultValue: 'Aucun client à risque' })}</div></div>;

  return (
    <>
      {data.clients.slice(0, 5).map((client, i) => (
        <div key={i} className="alert-item error">
          <AlertCircle size={16} className="alert-icon" />
          <div className="alert-content">
            <div className="alert-title">{client.name}</div>
            <div className="alert-message">{client.overdue_invoices} {t('widgets.overdue_invoices_label', { ns: 'dashboard', defaultValue: 'facture(s) en retard' })} - {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(client.overdue_amount)}</div>
          </div>
        </div>
      ))}
    </>
  );
};

export default ClientsAtRiskWidget;
