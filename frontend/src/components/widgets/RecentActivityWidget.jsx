import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const RecentActivityWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('recent_activity', { period });
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

  if (loading) return <div className="widget-loading">Chargement...</div>;
  if (!data || !data.activities) return <div className="widget-empty"><Activity size={40} className="widget-empty-icon" /><div className="widget-empty-text">Aucune activité</div></div>;

  return (
    <div className="widget-list">
      {data.activities.slice(0, 10).map((activity, index) => (
        <div key={index} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{activity.action}</div>
            <div className="list-item-subtitle">{activity.module} - {new Date(activity.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivityWidget;
