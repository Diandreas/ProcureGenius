import React, { useState, useEffect } from 'react';
import {
  Box, Typography, ToggleButton, ToggleButtonGroup,
  CircularProgress, Alert, Divider,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../../services/api';

const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const KpiCard = ({ label, value, color }) => (
  <Box sx={{ textAlign: 'center', flex: 1 }}>
    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
    <Typography variant="body1" fontWeight={700} color={color} sx={{ fontSize: '1rem' }}>
      {fmt(value)}
    </Typography>
  </Box>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, fontSize: '0.75rem' }}>
      <Typography variant="caption" fontWeight={600}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} sx={{ color: p.fill }}>{p.name} : {fmt(p.value)}</Box>
      ))}
    </Box>
  );
};

const CashFlowWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [horizon, setHorizon] = useState('60');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/analytics/cashflow-widget/?horizon_days=${horizon}`);
        setData(res.data);
        setError(null);
      } catch {
        setError('Impossible de charger les données de trésorerie');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [horizon]);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%" gap={1}>
        <CircularProgress size={20} />
        <Typography variant="caption" color="text.secondary">Calcul en cours...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <Typography variant="caption" color="error">{error || 'Données indisponibles'}</Typography>
      </Box>
    );
  }

  const { summary, weeks = [], alerts = [] } = data;
  const net = summary.net_balance;
  const NetIcon = net > 0 ? TrendingUp : net < 0 ? TrendingDown : Minus;
  const netColor = net > 0 ? '#10b981' : net < 0 ? '#ef4444' : '#64748b';

  const chartData = weeks.slice(0, 8).map(w => ({
    name: w.period,
    Entrées: w.income,
    Sorties: w.expenses,
    net: w.net,
    status: w.status,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
      {/* Horizon toggle */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Moy. mensuelle : {fmt(summary.monthly_avg_revenue)}
        </Typography>
        <ToggleButtonGroup
          value={horizon}
          exclusive
          onChange={(_, v) => v && setHorizon(v)}
          size="small"
        >
          <ToggleButton value="30" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>30j</ToggleButton>
          <ToggleButton value="60" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>60j</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* KPIs */}
      <Box display="flex" gap={1} sx={{ bgcolor: 'grey.50', borderRadius: 1.5, p: 1 }}>
        <KpiCard label="Entrées prévues" value={summary.total_receivable} color="#10b981" />
        <Divider orientation="vertical" flexItem />
        <KpiCard label="Sorties engagées" value={summary.total_payable} color="#ef4444" />
        <Divider orientation="vertical" flexItem />
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block">Solde net</Typography>
          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
            <NetIcon size={14} color={netColor} />
            <Typography variant="body1" fontWeight={700} color={netColor} sx={{ fontSize: '1rem' }}>
              {fmt(net)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <Box sx={{ flex: 1, minHeight: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={8} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Bar dataKey="Entrées" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Sorties" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Alertes semaines négatives */}
      {alerts.slice(0, 2).map((a, i) => (
        <Alert key={i} severity="warning" sx={{ py: 0.25, px: 1, fontSize: '0.7rem', '& .MuiAlert-icon': { fontSize: 14 } }}>
          {a.message}
        </Alert>
      ))}
    </Box>
  );
};

export default CashFlowWidget;
