import React, { useState, useEffect } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const StockMovementsWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('stock_movements', { period });
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
  if (!data || !data.movements) return <div className="widget-empty"><ArrowRightLeft size={40} className="widget-empty-icon" /><div className="widget-empty-text">Aucun mouvement</div></div>;

  return (
    <div className="widget-list">
      {data.movements.slice(0, 5).map((mov, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{mov.product_name}</div>
            <div className="list-item-subtitle">{mov.movement_type} - {new Date(mov.date).toLocaleDateString()}</div>
          </div>
          <div className="list-item-value">{mov.quantity > 0 ? '+' : ''}{mov.quantity}</div>
        </div>
      ))}
    </div>
  );
};

export default StockMovementsWidget;
