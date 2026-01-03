import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
  if (!data) return <div className="widget-error">Erreur</div>;
  if (!data.products || data.products.length === 0) {
    return (
      <div className="widget-empty">
        <div className="widget-empty-icon">📦</div>
        <div className="widget-empty-text">Aucun produit vendu</div>
      </div>
    );
  }

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const product = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '13px' }}>{product.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {product.quantity_sold} vendus
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#10b981', marginTop: '4px' }}>
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(product.revenue || 0)}
          </div>
        </div>
      );
    }
    return null;
  };

  // Formateur pour l'axe Y
  const formatYAxis = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k€`;
    }
    return `${value}€`;
  };

  // Couleurs vertes pour les produits
  const barColors = ['#10b981', '#14b8a6', '#22c55e', '#4ade80', '#86efac'];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data.products}
        margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          tick={{ fontSize: 11, fill: '#666' }}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: '#666' }}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
        <Bar
          dataKey="revenue"
          radius={[6, 6, 0, 0]}
        >
          {data.products.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopSellingProductsWidget;
