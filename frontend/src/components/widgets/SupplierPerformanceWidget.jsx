import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const SupplierPerformanceWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('supplier_performance', { period, limit: 5 });
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
  if (!data.suppliers || data.suppliers.length === 0) {
    return (
      <div className="widget-empty">
        <Award size={40} className="widget-empty-icon" />
        <div className="widget-empty-text">Aucun fournisseur</div>
      </div>
    );
  }

  return (
    <div className="widget-list">
      {data.suppliers.map((supplier, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">#{i + 1} {supplier.name}</div>
            <div className="list-item-subtitle">{supplier.total_orders} commande(s)</div>
          </div>
          <div className="list-item-value">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(supplier.total_amount)}</div>
        </div>
      ))}
    </div>
  );
};

export default SupplierPerformanceWidget;
