import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useCurrency from '../../hooks/useCurrency';

const MetricDetailModal = ({ metric, onClose, generateDetailedData }) => {
  const { format: formatCurrency } = useCurrency();

  if (!metric) return null;

  const formatYAxis = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
    return `${value}€`;
  };

  const detailedData = generateDetailedData(metric);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 70px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête du modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {React.createElement(metric.icon, { size: 28, style: { color: metric.color } })}
            <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px', fontWeight: 600 }}>
              {metric.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '4px 10px',
              lineHeight: 1,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#ef4444'}
            onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
          >
            ×
          </button>
        </div>

        {/* Valeur actuelle */}
        <div style={{
          background: `linear-gradient(135deg, ${metric.color}18 0%, ${metric.color}08 100%)`,
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          border: `2px solid ${metric.color}40`
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>
            Valeur actuelle
          </div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: metric.color, marginBottom: '12px' }}>
            {metric.isPercentage ? metric.value : formatCurrency(metric.value)}
          </div>
          {metric.change !== undefined && metric.change !== null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: metric.change > 0 ? '#10b98115' : '#ef444415',
              borderRadius: '8px',
              width: 'fit-content'
            }}>
              {metric.change > 0 ?
                <TrendingUp size={18} color="#10b981" /> :
                <TrendingDown size={18} color="#ef4444" />
              }
              <span style={{
                fontWeight: 600,
                color: metric.change > 0 ? '#10b981' : '#ef4444',
                fontSize: '15px'
              }}>
                {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
              </span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                vs période précédente
              </span>
            </div>
          )}
        </div>

        {/* Graphique détaillé */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '16px' }}>
            Évolution sur 30 jours
          </h3>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={detailedData}
                margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
              >
                <defs>
                  <linearGradient id={`gradient-${metric.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={metric.color} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  interval={4}
                />
                <YAxis
                  tickFormatter={(value) => {
                    if (metric.isPercentage) return `${value.toFixed(1)}%`;
                    return formatYAxis(value);
                  }}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{
                          backgroundColor: 'white',
                          padding: '12px 16px',
                          border: `2px solid ${metric.color}`,
                          borderRadius: '8px',
                          boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
                        }}>
                          <div style={{ fontWeight: 600, color: metric.color, marginBottom: '4px' }}>
                            {payload[0].payload.day}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 600 }}>
                            {metric.isPercentage
                              ? `${payload[0].value.toFixed(1)}%`
                              : formatCurrency(payload[0].value)
                            }
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={metric.color}
                  fill={`url(#gradient-${metric.label})`}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricDetailModal;
