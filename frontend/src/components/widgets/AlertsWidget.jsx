import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const AlertsWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('alerts_notifications', { period });
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

  const getAlertClass = (type) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      default: return 'info';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      default: return Info;
    }
  };

  return (
    <>
      {data.alerts && data.alerts.length > 0 ? (
        <>
          {data.alerts.slice(0, 5).map((alert, index) => {
            const Icon = getIcon(alert.type);
            return (
              <div key={index} className={`alert-item ${getAlertClass(alert.type)}`}>
                <Icon size={16} className="alert-icon" />
                <div className="alert-content">
                  <div className="alert-title">{alert.message}</div>
                  <div className="alert-message">{alert.module} ({alert.count})</div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="widget-empty">
          <CheckCircle size={40} className="widget-empty-icon" />
          <div className="widget-empty-text">{t('widgets.alerts_empty', { ns: 'dashboard', defaultValue: 'Aucune alerte' })}</div>
        </div>
      )}
    </>
  );
};

export default AlertsWidget;
