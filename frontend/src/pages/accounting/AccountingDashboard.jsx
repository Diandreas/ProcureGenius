import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Alert, Divider,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, AccountBalance, PendingActions,
} from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';

const KpiCard = ({ label, value, icon, color, subtitle }) => (
  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderTop: 3, borderTopColor: color, height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700} mt={0.5} color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}18`, color }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <Card elevation={3} sx={{ p: 1.5, minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {payload.map((p) => (
        <Box key={p.dataKey} display="flex" justifyContent="space-between" gap={2} mt={0.5}>
          <Typography variant="body2" color={p.color}>{p.name}</Typography>
          <Typography variant="body2" fontWeight={600}>{fmt(p.value)}</Typography>
        </Box>
      ))}
    </Card>
  );
};

export default function AccountingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { format } = useCurrency();

  useEffect(() => {
    accountingAPI.getDashboard()
      .then((r) => setData(r.data))
      .catch(() => setError('Erreur chargement du tableau de bord'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Box p={3}>
      <AccountingNav title="Comptabilité" subtitle="Gestion financière du centre de santé" />
      <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
    </Box>
  );

  if (error) return (
    <Box p={3}>
      <AccountingNav title="Comptabilité" subtitle="Gestion financière du centre de santé" />
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  const m = data.current_month;
  const y = data.current_year;
  const isProfit = parseFloat(m.result) >= 0;

  const chartData = (data.monthly_chart || []).map((row) => ({
    month: row.month.slice(0, 7),
    Recettes: parseFloat(row.revenue),
    Charges: parseFloat(row.expenses),
    Résultat: parseFloat(row.result),
  }));

  return (
    <Box p={3}>
      <AccountingNav title="Comptabilité" subtitle="Gestion financière du centre de santé" />

      {/* KPIs mois courant */}
      <Typography variant="overline" color="text.secondary">Mois en cours</Typography>
      <Grid container spacing={2} mt={0.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Recettes" value={format(parseFloat(m.revenue))} icon={<TrendingUp />} color="#10b981" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Charges" value={format(parseFloat(m.expenses))} icon={<TrendingDown />} color="#ef4444" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Résultat net"
            value={format(Math.abs(parseFloat(m.result)))}
            icon={<AccountBalance />}
            color={isProfit ? '#10b981' : '#ef4444'}
            subtitle={isProfit ? 'Bénéfice' : 'Déficit'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Écritures en attente" value={data.pending_entries} icon={<PendingActions />} color="#f59e0b" subtitle="Brouillons à valider" />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* KPIs année */}
      <Typography variant="overline" color="text.secondary">Année en cours</Typography>
      <Grid container spacing={2} mt={0.5} mb={3}>
        <Grid item xs={12} sm={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Total Recettes</Typography>
            <Typography variant="h6" color="success.main" fontWeight={700}>{format(parseFloat(y.revenue))}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Total Charges</Typography>
            <Typography variant="h6" color="error.main" fontWeight={700}>{format(parseFloat(y.expenses))}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Résultat Annuel</Typography>
            <Typography variant="h6" fontWeight={700} color={parseFloat(y.result) >= 0 ? 'success.main' : 'error.main'}>
              {format(Math.abs(parseFloat(y.result)))}
              <Typography component="span" variant="caption" ml={1} color="text.secondary">
                {parseFloat(y.result) >= 0 ? 'bénéfice' : 'déficit'}
              </Typography>
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Graphe mensuel */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>Évolution mensuelle — 12 derniers mois</Typography>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => format(v)} />
            <Tooltip content={<CustomTooltip fmt={format} />} />
            <Legend />
            <Area type="monotone" dataKey="Recettes" stroke="#10b981" fill="url(#gradRev)" strokeWidth={2} />
            <Area type="monotone" dataKey="Charges" stroke="#ef4444" fill="url(#gradExp)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </Box>
  );
}
