import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const MarginAnalysisWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('margin_analysis', { period });
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
  if (!data.by_category || data.by_category.length === 0) {
    return (
      <div className="widget-empty">
        <BarChart3 size={40} className="widget-empty-icon" />
        <div className="widget-empty-text">Aucune analyse de marge disponible</div>
      </div>
    );
  }

  return (
    <div className="widget-list">
      {data.by_category.map((cat, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{cat.category}</div>
            <div className="list-item-subtitle">Marge: {cat.margin_percent}%</div>
          </div>
          <div className="list-item-value">{new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(cat.total_margin)}</div>
        </div>
      ))}
    </div>
  );
};

export default MarginAnalysisWidget;
