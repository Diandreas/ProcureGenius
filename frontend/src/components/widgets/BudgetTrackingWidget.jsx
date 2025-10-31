import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const BudgetTrackingWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('budget_tracking', { period });
        if (response.success) setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) return <div className="widget-loading">Chargement...</div>;
  if (!data) return <div className="widget-error">Erreur</div>;

  const utilizationPercent = ((data.spent / data.budget) * 100).toFixed(1);
  const isOverBudget = data.spent > data.budget;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Budget Utilisé</div>
        <div className="stat-value">{utilizationPercent}%</div>
        <div className={`stat-change ${isOverBudget ? 'negative' : 'positive'}`}>
          <span>{new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(data.spent)} / {new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(data.budget)}</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetTrackingWidget;
