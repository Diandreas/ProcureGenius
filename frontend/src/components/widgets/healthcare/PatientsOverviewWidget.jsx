import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, Calendar, Activity } from 'lucide-react';
import * as widgetsAPI from '../../../services/widgetsAPI';
import '../../../styles/Widgets.css';

const PatientsOverviewWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('patients_overview', {
          period,
          compare: true
        });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error fetching patients data:', error);
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

  const stats = data.patients || {};

  return (
    <div className="widget-card patients-overview-widget">
      <div className="widget-header">
        <div className="widget-title">
          <Users className="widget-icon" />
          <h3>Patients</h3>
        </div>
      </div>
      <div className="widget-content">
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Total Patients</span>
            <span className="stat-value">{stats.patients_count || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Nouveaux</span>
            <span className="stat-value stat-positive">{stats.new_patients || 0}</span>
            <TrendingUp className="stat-trend-icon" size={16} />
          </div>
          <div className="stat-item">
            <span className="stat-label">Visites en cours</span>
            <span className="stat-value">{stats.total_visits || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Patients actifs</span>
            <span className="stat-value">{stats.active_patients || 0}</span>
          </div>
        </div>

        {stats.visits_by_status && (
          <div className="visits-status-section">
            <h4 className="section-title">État des visites</h4>
            <div className="status-pills">
              {stats.visits_by_status.waiting > 0 && (
                <div className="status-pill status-waiting">
                  <Calendar size={14} />
                  <span>En attente: {stats.visits_by_status.waiting}</span>
                </div>
              )}
              {stats.visits_by_status.in_consultation > 0 && (
                <div className="status-pill status-consultation">
                  <Activity size={14} />
                  <span>En consultation: {stats.visits_by_status.in_consultation}</span>
                </div>
              )}
              {stats.visits_by_status.at_lab > 0 && (
                <div className="status-pill status-lab">
                  <span>Au labo: {stats.visits_by_status.at_lab}</span>
                </div>
              )}
              {stats.visits_by_status.at_pharmacy > 0 && (
                <div className="status-pill status-pharmacy">
                  <span>À la pharmacie: {stats.visits_by_status.at_pharmacy}</span>
                </div>
              )}
              {stats.visits_by_status.completed > 0 && (
                <div className="status-pill status-completed">
                  <span>Complétées: {stats.visits_by_status.completed}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientsOverviewWidget;
