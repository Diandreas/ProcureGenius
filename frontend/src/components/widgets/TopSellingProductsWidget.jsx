import React, { useState, useEffect } from 'react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const TopSellingProductsWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('top_selling_products', { period, limit: 5 });
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
  if (!data || !data.products) return <div className="widget-empty"><div className="widget-empty-text">Aucun produit</div></div>;

  return (
    <div className="widget-list">
      {data.products.map((product, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">#{i + 1} {product.name}</div>
            <div className="list-item-subtitle">{product.quantity_sold} vendus</div>
          </div>
          <div className="list-item-value">{new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(product.total_revenue)}</div>
        </div>
      ))}
    </div>
  );
};

export default TopSellingProductsWidget;
