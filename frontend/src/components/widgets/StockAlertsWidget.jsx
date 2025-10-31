import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const StockAlertsWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('stock_alerts', { period });
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
  if (!data || !data.low_stock_products) return <div className="widget-empty"><AlertTriangle size={40} className="widget-empty-icon" /><div className="widget-empty-text">Aucune alerte</div></div>;

  return (
    <>
      {data.low_stock_products.slice(0, 5).map((product, i) => (
        <div key={i} className="alert-item warning">
          <AlertTriangle size={16} className="alert-icon" />
          <div className="alert-content">
            <div className="alert-title">{product.name}</div>
            <div className="alert-message">Stock: {product.stock} (Min: {product.min_stock})</div>
          </div>
        </div>
      ))}
    </>
  );
};

export default StockAlertsWidget;
