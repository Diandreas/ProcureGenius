import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import useCurrency from '../../hooks/useCurrency';
import '../../styles/Widgets.css';

const CashFlowSummaryWidget = ({ period = 'last_30_days' }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await widgetsAPI.getWidgetData('cash_flow_summary', { period });
        if (response.success) {
          setData(response.data);
        } else {
          setError('Failed to load data');
        }
      } catch (err) {
        console.error('Error fetching cash flow:', err);
        setError(err.message || 'Error loading data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="widget-loading">{t('labels.loading')}</div>;
  }

  if (error) {
    return (
      <div className="widget-error">
        <Scale size={24} className="widget-error-icon" />
        <div className="widget-error-text">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-empty">
        <Scale size={40} className="widget-empty-icon" />
        <div className="widget-empty-text">
          {t('widgets.cash_flow_empty', { ns: 'dashboard', defaultValue: 'Aucune donnée' })}
        </div>
      </div>
    );
  }

  const receivable = data.receivable || 0;
  const payable = data.payable || 0;
  const balance = receivable - payable;
  const isPositive = balance >= 0;
  const total = receivable + payable;
  const receivablePercent = total > 0 ? (receivable / total) * 100 : 50;

  return (
    <div className="cashflow-widget">
      <div className="cashflow-header">
        <Scale size={16} className="cashflow-icon" />
        <span className="cashflow-title">
          {t('widgets.cash_flow_title', { ns: 'dashboard', defaultValue: 'Trésorerie' })}
        </span>
      </div>

      <div className="cashflow-amounts">
        <div className="cashflow-amount receivable">
          <ArrowDownCircle size={18} className="amount-icon" />
          <div className="amount-details">
            <span className="amount-label">
              {t('widgets.cash_flow_receivable', { ns: 'dashboard', defaultValue: 'À recevoir' })}
            </span>
            <span className="amount-value positive">{formatCurrency(receivable)}</span>
          </div>
        </div>

        <div className="cashflow-amount payable">
          <ArrowUpCircle size={18} className="amount-icon" />
          <div className="amount-details">
            <span className="amount-label">
              {t('widgets.cash_flow_payable', { ns: 'dashboard', defaultValue: 'À payer' })}
            </span>
            <span className="amount-value negative">{formatCurrency(payable)}</span>
          </div>
        </div>
      </div>

      <div className="cashflow-bar-container">
        <div className="cashflow-bar">
          <div className="cashflow-bar-receivable" style={{ width: `${receivablePercent}%` }} />
          <div className="cashflow-bar-payable" style={{ width: `${100 - receivablePercent}%` }} />
        </div>
      </div>

      <div className={`cashflow-balance ${isPositive ? 'positive' : 'negative'}`}>
        <span className="balance-label">
          {t('widgets.cash_flow_balance', { ns: 'dashboard', defaultValue: 'Balance nette' })}
        </span>
        <span className="balance-value">
          {isPositive ? '+' : ''}{formatCurrency(balance)}
        </span>
      </div>
    </div>
  );
};

export default CashFlowSummaryWidget;
