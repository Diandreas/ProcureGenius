import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Target, Percent } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import * as widgetsAPI from '../../services/widgetsAPI';
import useCurrency from '../../hooks/useCurrency';
import '../../styles/Widgets.css';

const FinancialSummaryWidget = ({ period = 'last_30_days', onMetricClick }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { format: formatCurrency } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('financial_summary', {
          period,
          compare: true
        });
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Error fetching financial summary:', error);
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

  // Déterminer la couleur du profit selon s'il est positif ou négatif
  const profitValue = data.net_profit || 0;
  const profitColor = profitValue >= 0 ? '#10b981' : '#ef4444';

  // Déterminer la couleur de la marge selon sa valeur
  const marginValue = data.profit_margin || 0;
  const marginColor = marginValue >= 20 ? '#10b981' : marginValue >= 10 ? '#f59e0b' : marginValue >= 0 ? '#8b5cf6' : '#ef4444';

  const metrics = [
    {
      label: t('widgets.financial_summary_metrics.revenue', { ns: 'dashboard', defaultValue: 'Revenus' }),
      value: data.revenue || 0,
      change: data.comparison?.revenue_percent_change,
      color: '#2563eb',
      icon: DollarSign
    },
    {
      label: t('widgets.financial_summary_metrics.expenses', { ns: 'dashboard', defaultValue: 'Dépenses' }),
      value: data.expenses || 0,
      change: data.comparison?.expenses_change,
      isExpense: true,
      color: '#ef4444',
      icon: PiggyBank
    },
    {
      label: profitValue >= 0
        ? t('widgets.financial_summary_metrics.net_profit', { ns: 'dashboard', defaultValue: 'Profit Net' })
        : 'Perte Nette',
      value: profitValue,
      change: data.comparison?.profit_percent_change,
      color: profitColor,
      icon: Target,
      isNegative: profitValue < 0
    },
    {
      label: t('widgets.financial_summary_metrics.margin', { ns: 'dashboard', defaultValue: 'Marge' }),
      value: `${marginValue.toFixed(1)}%`,
      isPercentage: true,
      color: marginColor,
      icon: Percent
    }
  ];

  // Générer des données de tendance simulées pour le graphique d'évolution
  const generateTrendData = () => {
    const revenue = data.revenue || 0;
    const expenses = data.expenses || 0;
    const profit = data.net_profit || 0;

    const revenueChange = data.comparison?.revenue_percent_change || 0;
    const expensesChange = data.comparison?.expenses_change || 0;
    const profitChange = data.comparison?.profit_percent_change || 0;

    // Générer 7 points de données (dernière semaine ou période)
    return Array(7).fill(0).map((_, i) => {
      const progress = i / 6; // 0 à 1

      const prevRevenue = revenue / (1 + revenueChange / 100);
      const prevExpenses = expenses / (1 + expensesChange / 100);
      const prevProfit = profit / (1 + profitChange / 100);

      return {
        day: `J${i + 1}`,
        Revenus: prevRevenue + (revenue - prevRevenue) * progress,
        Dépenses: prevExpenses + (expenses - prevExpenses) * progress,
        Profit: prevProfit + (profit - prevProfit) * progress
      };
    });
  };

  // Données pour le graphique pie (composition)
  // Si on a une perte, on montre le ratio Dépenses vs Revenus
  const pieData = profitValue < 0
    ? [
        {
          name: t('widgets.financial_summary_metrics.expenses', { ns: 'dashboard', defaultValue: 'Dépenses' }),
          value: data.expenses || 0,
          color: '#ef4444'
        },
        {
          name: t('widgets.financial_summary_metrics.revenue', { ns: 'dashboard', defaultValue: 'Revenus' }),
          value: data.revenue || 0,
          color: '#2563eb'
        }
      ]
    : [
        {
          name: t('widgets.financial_summary_metrics.revenue', { ns: 'dashboard', defaultValue: 'Revenus' }),
          value: data.revenue || 0,
          color: '#2563eb'
        },
        {
          name: t('widgets.financial_summary_metrics.expenses', { ns: 'dashboard', defaultValue: 'Dépenses' }),
          value: data.expenses || 0,
          color: '#ef4444'
        }
      ];

  const trendData = generateTrendData();

  // Tooltip personnalisé pour les graphiques
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {label && <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '12px' }}>{label}</div>}
          {payload.map((entry, index) => (
            <div key={index} style={{ fontSize: '12px', color: entry.color, marginTop: '2px' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
    return `${value}€`;
  };

  // Générer des données sparkline pour chaque métrique
  const generateSparklineData = (currentValue, changePercent) => {
    if (changePercent === undefined || changePercent === null) {
      return Array(7).fill({ value: currentValue });
    }

    const previousValue = currentValue / (1 + changePercent / 100);
    const step = (currentValue - previousValue) / 6;

    return Array(7).fill(0).map((_, i) => ({
      value: previousValue + (step * i)
    }));
  };

  // Générer des données détaillées pour le modal (30 points)
  const generateDetailedData = (metric) => {
    const currentValue = metric.isPercentage ? parseFloat(metric.value) : metric.value;
    const changePercent = metric.change || 0;
    const previousValue = currentValue / (1 + changePercent / 100);
    const step = (currentValue - previousValue) / 29;

    return Array(30).fill(0).map((_, i) => ({
      day: `J${i + 1}`,
      value: previousValue + (step * i)
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Cartes de métriques en haut avec sparklines cliquables */}
      <div className="stats-grid" style={{ marginBottom: '8px' }}>
        {metrics.map((metric, index) => {
          const isPositive = metric.change > 0;
          const isNegative = metric.change < 0;
          const showChange = metric.change !== undefined && metric.change !== null;
          const Icon = metric.icon;
          const sparklineData = generateSparklineData(
            metric.isPercentage ? parseFloat(metric.value) : metric.value,
            metric.change
          );

          return (
            <div
              key={index}
              className="stat-card"
              onClick={() => onMetricClick && onMetricClick({ metric, generateDetailedData })}
              style={{
                background: `linear-gradient(135deg, ${metric.color}08 0%, ${metric.color}02 100%)`,
                border: `1px solid ${metric.color}20`,
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${metric.color}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Sparkline en arrière-plan */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '45px',
                opacity: 0.15,
                pointerEvents: 'none'
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Contenu de la carte */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Icon size={14} style={{ color: metric.color }} />
                  <div className="stat-label" style={{ fontSize: '11px', fontWeight: 500 }}>
                    {metric.label}
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: metric.color }}>
                  {metric.isPercentage ? metric.value : formatCurrency(metric.value)}
                </div>
                {showChange && (
                  <div className={`stat-change ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`} style={{ marginTop: '4px' }}>
                    {isPositive ? <TrendingUp size={11} /> : isNegative ? <TrendingDown size={11} /> : null}
                    <span style={{ fontSize: '11px' }}>{Math.abs(metric.change).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section avec 2 graphiques côte à côte */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
        {/* Graphique d'évolution (Area Chart) */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
            Évolution Financière
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={10} />
              <Area
                type="monotone"
                dataKey="Revenus"
                stackId="1"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="Profit"
                stackId="2"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique de composition (Pie Chart) */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
            Composition Revenus/Dépenses
          </div>
          {profitValue < 0 && (
            <div style={{
              fontSize: '10px',
              color: '#ef4444',
              marginBottom: '4px',
              fontWeight: 500
            }}>
              ⚠️ Situation déficitaire
            </div>
          )}
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                label={(entry) => {
                  const percent = ((entry.value / (data.revenue + data.expenses)) * 100).toFixed(0);
                  return `${percent}%`;
                }}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummaryWidget;
