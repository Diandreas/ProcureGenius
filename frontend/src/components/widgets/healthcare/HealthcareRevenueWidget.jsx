import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Activity, Microscope, Pill } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import * as widgetsAPI from '../../../services/widgetsAPI';
import useCurrency from '../../../hooks/useCurrency';
import '../../../styles/Widgets.css';

const HealthcareRevenueWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('healthcare_revenue', {
          period,
          compare: true
        });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error fetching healthcare revenue data:', error);
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

  const consultationsRevenue = data.consultations?.revenue || 0;
  const labRevenue = data.laboratory?.revenue || 0;
  const pharmacyRevenue = data.pharmacy?.revenue || 0;

  const chartData = [
    { name: 'Consultations', value: consultationsRevenue, icon: Activity },
    { name: 'Laboratoire', value: labRevenue, icon: Microscope },
    { name: 'Pharmacie', value: pharmacyRevenue, icon: Pill },
  ].filter(item => item.value > 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];
  const total = consultationsRevenue + labRevenue + pharmacyRevenue;

  return (
    <div className="widget-card healthcare-revenue-widget">
      <div className="widget-header">
        <div className="widget-title">
          <DollarSign className="widget-icon" />
          <h3>Revenus Santé</h3>
        </div>
      </div>
      <div className="widget-content">
        <div className="total-revenue-display">
          <span className="label">Total</span>
          <span className="value">{formatCurrency(total)}</span>
        </div>

        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="revenue-breakdown">
              {chartData.map((item, index) => {
                const Icon = item.icon;
                const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : 0;
                return (
                  <div key={index} className="revenue-item" style={{ borderLeftColor: COLORS[index % COLORS.length] }}>
                    <div className="revenue-item-header">
                      <Icon size={16} />
                      <span className="revenue-item-name">{item.name}</span>
                    </div>
                    <div className="revenue-item-details">
                      <span className="revenue-item-value">{formatCurrency(item.value)}</span>
                      <span className="revenue-item-percentage">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="no-data-message">
            <p>Aucune donnée de revenus disponible pour cette période.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthcareRevenueWidget;
