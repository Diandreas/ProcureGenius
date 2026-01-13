import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Microscope, AlertCircle, Clock, DollarSign } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import * as widgetsAPI from '../../../services/widgetsAPI';
import useCurrency from '../../../hooks/useCurrency';
import '../../../styles/Widgets.css';

const LabOrdersStatusWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('lab_orders_status', {
          period,
          compare: true
        });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error fetching laboratory data:', error);
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

  const stats = data.laboratory || {};
  const byStatus = stats.by_status || {};

  const statusColors = {
    pending: '#f59e0b',
    sample_collected: '#3b82f6',
    in_progress: '#8b5cf6',
    completed: '#10b981',
    results_ready: '#06b6d4',
    results_delivered: '#22c55e'
  };

  const chartData = Object.entries(byStatus)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' '),
      value,
      color: statusColors[key] || '#94a3b8'
    }));

  return (
    <div className="widget-card lab-orders-status-widget">
      <div className="widget-header">
        <div className="widget-title">
          <Microscope className="widget-icon" />
          <h3>Laboratoire</h3>
        </div>
      </div>
      <div className="widget-content">
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Commandes Totales</span>
            <span className="stat-value">{stats.total_orders || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Revenus</span>
            <span className="stat-value">{formatCurrency(stats.revenue || 0)}</span>
            <DollarSign size={16} className="stat-icon" />
          </div>
        </div>

        {stats.critical_results > 0 && (
          <div className="alert-row alert-critical">
            <AlertCircle size={18} />
            <span><strong>{stats.critical_results}</strong> résultats critiques nécessitent attention</span>
          </div>
        )}

        {stats.avg_turnaround_hours && (
          <div className="info-row">
            <Clock size={16} />
            <span>Temps moyen de traitement: <strong>{stats.avg_turnaround_hours}h</strong></span>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="chart-section">
            <h4 className="section-title">Répartition par statut</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="status-breakdown">
          {byStatus.pending > 0 && (
            <div className="status-item">En attente: <strong>{byStatus.pending}</strong></div>
          )}
          {byStatus.in_progress > 0 && (
            <div className="status-item">En cours: <strong>{byStatus.in_progress}</strong></div>
          )}
          {byStatus.results_ready > 0 && (
            <div className="status-item">Prêts: <strong>{byStatus.results_ready}</strong></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabOrdersStatusWidget;
