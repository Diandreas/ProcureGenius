import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const category = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '13px' }}>{category.category_name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Marge: {category.average_margin_percent?.toFixed(1) || 0}%
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#8b5cf6', marginTop: '4px' }}>
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(category.average_margin || 0)}
          </div>
        </div>
      );
    }
    return null;
  };

  // Fonction pour déterminer la couleur selon le pourcentage de marge
  const getMarginColor = (marginPercent) => {
    if (marginPercent >= 30) return '#10b981'; // Vert foncé - Excellente marge
    if (marginPercent >= 20) return '#22c55e'; // Vert - Bonne marge
    if (marginPercent >= 10) return '#f59e0b'; // Orange - Marge moyenne
    return '#ef4444'; // Rouge - Faible marge
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data.by_category}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#666' }}
          tickFormatter={(value) => `${value}%`}
        />
        <YAxis
          type="category"
          dataKey="category_name"
          tick={{ fontSize: 11, fill: '#666' }}
          width={90}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
        <Bar
          dataKey="average_margin_percent"
          radius={[0, 6, 6, 0]}
        >
          {data.by_category.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getMarginColor(entry.average_margin_percent || 0)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MarginAnalysisWidget;
