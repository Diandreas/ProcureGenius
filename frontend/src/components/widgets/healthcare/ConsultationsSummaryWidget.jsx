import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, DollarSign, UserCheck, TrendingUp } from 'lucide-react';
import * as widgetsAPI from '../../../services/widgetsAPI';
import useCurrency from '../../../hooks/useCurrency';
import '../../../styles/Widgets.css';

const ConsultationsSummaryWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('consultations_summary', {
          period,
          compare: true
        });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error fetching consultations data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="widget-loading">{t('labels.loading')}</div>;
  }

  if (!data) {
    return <div className="widget-error">{t('messages.loadingError')}</div>;
  }

  const stats = data.consultations || {};

  return (
    <div className="widget-card consultations-summary-widget">
      <div className="widget-header">
        <div className="widget-title">
          <Activity className="widget-icon" />
          <h3>Consultations</h3>
        </div>
      </div>
      <div className="widget-content">
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Total Consultations</span>
            <span className="stat-value">{stats.total_consultations || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Revenus</span>
            <span className="stat-value">{formatCurrency(stats.revenue || 0)}</span>
            <DollarSign size={16} className="stat-icon" />
          </div>
          <div className="stat-item">
            <span className="stat-label">Taux de Follow-up</span>
            <span className="stat-value">{(stats.follow_up_rate || 0).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Moyenne/jour</span>
            <span className="stat-value">{(stats.avg_per_day || 0).toFixed(1)}</span>
          </div>
        </div>

        {stats.top_doctors && stats.top_doctors.length > 0 && (
          <div className="top-doctors-section">
            <h4 className="section-title">
              <UserCheck size={16} />
              Top Médecins
            </h4>
            <ul className="top-list">
              {stats.top_doctors.slice(0, 3).map((doc, idx) => (
                <li key={idx} className="top-list-item">
                  <span className="rank">#{idx + 1}</span>
                  <span className="name">
                    Dr {doc.doctor__first_name} {doc.doctor__last_name}
                  </span>
                  <span className="count">{doc.count} consultations</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationsSummaryWidget;
