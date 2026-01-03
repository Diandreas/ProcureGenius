import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as widgetsAPI from '../../services/widgetsAPI';
import useCurrency from '../../hooks/useCurrency';
import '../../styles/Widgets.css';

const TopClientsWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('top_clients', { period, limit: 5 });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) return <div className="widget-loading">{t('labels.loading')}</div>;
  if (!data) return <div className="widget-error">{t('messages.error')}</div>;

  // Tooltip personnalisé pour le graphique
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const client = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '13px' }}>{client.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {client.total_invoices} {t('widgets.invoices_label', { ns: 'dashboard', defaultValue: 'facture(s)' })}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#2563eb', marginTop: '4px' }}>
            {formatCurrency(client.total_revenue)}
          </div>
        </div>
      );
    }
    return null;
  };

  // Formateur pour l'axe Y (montants)
  const formatYAxis = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k€`;
    }
    return `${value}€`;
  };

  // Couleurs pour les barres (du plus foncé au plus clair)
  const barColors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

  return (
    <>
      {data.clients && data.clients.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data.clients}
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }} />
            <Bar
              dataKey="total_revenue"
              radius={[6, 6, 0, 0]}
            >
              {data.clients.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="widget-empty">
          <Award size={40} className="widget-empty-icon" />
          <div className="widget-empty-text">{t('widgets.top_clients_empty', { ns: 'dashboard', defaultValue: 'Aucun client' })}</div>
        </div>
      )}
    </>
  );
};

export default TopClientsWidget;
