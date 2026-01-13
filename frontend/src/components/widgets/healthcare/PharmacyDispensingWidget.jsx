import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill, DollarSign, TrendingUp, AlertTriangle, Package } from 'lucide-react';
import * as widgetsAPI from '../../../services/widgetsAPI';
import useCurrency from '../../../hooks/useCurrency';
import '../../../styles/Widgets.css';

const PharmacyDispensingWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try:
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('pharmacy_dispensing', {
          period,
          compare: true
        });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error fetching pharmacy data:', error);
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

  const stats = data.pharmacy || {};

  return (
    <div className="widget-card pharmacy-dispensing-widget">
      <div className="widget-header">
        <div className="widget-title">
          <Pill className="widget-icon" />
          <h3>Pharmacie</h3>
        </div>
      </div>
      <div className="widget-content">
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Dispensations</span>
            <span className="stat-value">{stats.total_dispensings || 0}</span>
            <Package size={16} className="stat-icon" />
          </div>
          <div className="stat-item">
            <span className="stat-label">Revenus</span>
            <span className="stat-value">{formatCurrency(stats.revenue || 0)}</span>
            <DollarSign size={16} className="stat-icon" />
          </div>
          <div className="stat-item">
            <span className="stat-label">Profit</span>
            <span className="stat-value stat-positive">{formatCurrency(stats.profit || 0)}</span>
            <TrendingUp size={16} className="stat-trend-icon" />
          </div>
          <div className="stat-item">
            <span className="stat-label">Marge Profit</span>
            <span className={`stat-value ${stats.profit_margin >= 20 ? 'stat-positive' : ''}`}>
              {(stats.profit_margin || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="stat-grid-2">
          <div className="stat-item">
            <span className="stat-label">Taux Remplissage Rx</span>
            <span className="stat-value">{(stats.prescription_fill_rate || 0).toFixed(1)}%</span>
          </div>
        </div>

        {stats.pending_prescriptions > 0 && (
          <div className="alert-row alert-warning">
            <AlertTriangle size={18} />
            <span><strong>{stats.pending_prescriptions}</strong> prescriptions en attente de dispensation</span>
          </div>
        )}

        {stats.top_medications && stats.top_medications.length > 0 && (
          <div className="top-medications-section">
            <h4 className="section-title">
              <Pill size={16} />
              Médicaments les plus dispensés
            </h4>
            <ul className="top-list">
              {stats.top_medications.slice(0, 5).map((med, idx) => (
                <li key={idx} className="top-list-item">
                  <span className="rank">#{idx + 1}</span>
                  <span className="name">{med.medication__name}</span>
                  <span className="count">{med.total_qty} unités</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyDispensingWidget;
