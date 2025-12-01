import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const ClientSegmentationWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('client_segmentation', { period });
        if (response.success) setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) return <div className="widget-loading">{t('labels.loading')}</div>;
  if (!data || !data.segments) return <div className="chart-placeholder"><PieChart size={32} /><div>{t('widgets.client_segmentation_empty', { ns: 'dashboard', defaultValue: 'Aucune donnée' })}</div></div>;

  return (
    <div className="stats-grid">
      {data.segments.map((seg, i) => (
        <div key={i} className="stat-card">
          <div className="stat-label">{seg.segment}</div>
          <div className="stat-value">{seg.count}</div>
        </div>
      ))}
    </div>
  );
};

export default ClientSegmentationWidget;
