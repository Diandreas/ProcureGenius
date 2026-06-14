import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Alert, Divider, useTheme,
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
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import AccountingNav from './AccountingNav';

const KpiCard = ({ label, value, icon, color, subtitle, neu }) => (
  <Card
    elevation={0}
    sx={{
      border: 'none',
      borderTop: 3,
      borderTopColor: color,
      borderRadius: 3,
      height: '100%',
      bgcolor: 'background.paper',
      boxShadow: neu,
    }}
  >
    <CardContent sx={{ p: { xs: 1.75, sm: 2.5 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box minWidth={0}>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700} mt={0.5} color={color} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}18`, color, flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <Card elevation={3} sx={{ p: 1.5, minWidth: 180, bgcolor: 'background.paper' }}>
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const neu = getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft');
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0';

  useEffect(() => {
    accountingAPI.getDashboard()
      .then((r) => setData(r.data))
      .catch(() => setError('Erreur chargement du tableau de bord'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav title="Comptabilité" subtitle="Vos recettes et charges, en clair" />
      <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
    </Box>
  );

  if (error) return (
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav title="Comptabilité" subtitle="Vos recettes et charges, en clair" />
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

  const YearCard = ({ label, value, color, suffix }) => (
    <Box sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: 3, bgcolor: 'background.paper', boxShadow: neu }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700} color={color}>
        {value}
        {suffix && (
          <Typography component="span" variant="caption" ml={1} color="text.secondary">{suffix}</Typography>
        )}
      </Typography>
    </Box>
  );

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav title="Comptabilité" subtitle="Vos recettes et charges, en clair" />

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        Vos ventes (factures) et vos achats (bons de commande) sont enregistrés
        <strong> automatiquement</strong>. Il vous suffit d'ajouter vos autres charges
        (loyer, salaires, abonnements…) pour connaître votre <strong>bénéfice net</strong>.
      </Alert>

      {/* KPIs mois courant */}
      <Typography variant="overline" color="text.secondary">Mois en cours</Typography>
      <Grid container spacing={{ xs: 1.5, sm: 2 }} mt={0.5} mb={3}>
        <Grid item xs={6} md={3}>
          <KpiCard label="Recettes" value={format(parseFloat(m.revenue))} icon={<TrendingUp />} color="#10b981" neu={neu} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Charges" value={format(parseFloat(m.expenses))} icon={<TrendingDown />} color="#ef4444" neu={neu} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            label="Résultat net"
            value={format(Math.abs(parseFloat(m.result)))}
            icon={<AccountBalance />}
            color={isProfit ? '#10b981' : '#ef4444'}
            subtitle={isProfit ? 'Bénéfice' : 'Déficit'}
            neu={neu}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="En attente" value={data.pending_entries} icon={<PendingActions />} color="#f59e0b" subtitle="Brouillons à valider" neu={neu} />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* KPIs année */}
      <Typography variant="overline" color="text.secondary">Année en cours</Typography>
      <Grid container spacing={{ xs: 1.5, sm: 2 }} mt={0.5} mb={3}>
        <Grid item xs={12} sm={4}>
          <YearCard label="Total Recettes" value={format(parseFloat(y.revenue))} color="success.main" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <YearCard label="Total Charges" value={format(parseFloat(y.expenses))} color="error.main" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <YearCard
            label="Résultat Annuel"
            value={format(Math.abs(parseFloat(y.result)))}
            color={parseFloat(y.result) >= 0 ? 'success.main' : 'error.main'}
            suffix={parseFloat(y.result) >= 0 ? 'bénéfice' : 'déficit'}
          />
        </Grid>
      </Grid>

      {/* Graphe mensuel */}
      <Card elevation={0} sx={{ border: 'none', borderRadius: 3, bgcolor: 'background.paper', boxShadow: neu, p: { xs: 1.5, sm: 2 } }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
            <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={(v) => format(v)} width={70} />
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
