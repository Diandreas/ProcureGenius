import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const OverduePOWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('overdue_po', { period });
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
  if (!data.purchase_orders || data.purchase_orders.length === 0) {
    return (
      <div className="widget-empty">
        <AlertTriangle size={40} className="widget-empty-icon" />
        <div className="widget-empty-text">Aucun bon de commande en retard</div>
      </div>
    );
  }

  return (
    <div className="widget-list">
      {data.purchase_orders.slice(0, 5).map((po, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{po.po_number}</div>
            <div className="list-item-subtitle">{po.supplier_name} - {po.days_overdue} jours</div>
          </div>
          <div className="list-item-value">{new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(po.total_amount)}</div>
        </div>
      ))}
    </div>
  );
};

export default OverduePOWidget;
