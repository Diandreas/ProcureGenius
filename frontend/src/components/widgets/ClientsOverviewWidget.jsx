import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const ClientsOverviewWidget = ({ period }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('clients_overview', { period });
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

  const stats = [
    { label: t('widgets.clients_overview_metrics.total', { ns: 'dashboard', defaultValue: 'Total' }), value: data.total || 0 },
    { label: t('widgets.clients_overview_metrics.active', { ns: 'dashboard', defaultValue: 'Actifs' }), value: data.active || 0 },
    { label: t('widgets.clients_overview_metrics.new', { ns: 'dashboard', defaultValue: 'Nouveaux' }), value: data.new_in_period || 0 }
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, i) => (
        <div key={i} className="stat-card">
          <div className="stat-label">{stat.label}</div>
          <div className="stat-value">{stat.value}</div>
        </div>
      ))}
    </div>
  );
};

export default ClientsOverviewWidget;
