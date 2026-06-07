import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  useMediaQuery,
  useTheme,
  Alert,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Business,
  ShoppingCart,
  Receipt,
  AttachMoney,
  People,
  GetApp,
  PictureAsPdf,
  TableChart,
  Refresh,
  Warning,
  CheckCircle,
  Inventory2,
  NotificationsActive,
  ErrorOutline,
} from '@mui/icons-material';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../services/analyticsAPI';
import { isNativePlatform } from '../utils/platform';
import { cacheOne, readOne, isOffline } from '../services/offline';
import useCurrency from '../hooks/useCurrency';
import Mascot from '../components/Mascot';
import LoadingState from '../components/LoadingState';
import SubscriptionStatus from '../components/SubscriptionStatus';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const PERIOD_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'last_7_days', label: '7 jours' },
  { value: 'last_30_days', label: '30 jours' },
  { value: 'last_90_days', label: '90 jours' },
  { value: 'this_month', label: 'Ce mois' },
  { value: 'this_year', label: 'Cette année' },
];

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function DashboardEnhanced() {
  const navigate = useNavigate();
  const { format: formatCurrency } = useCurrency();
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState('last_30_days');
  const [compare, setCompare] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [aiGreeting, setAiGreeting] = useState(null);
  const [customDateDialog, setCustomDateDialog] = useState(false);
  const [customDates, setCustomDates] = useState({
    start_date: '',
    end_date: '',
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getFallbackWelcome = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { greeting: 'Bonjour', message: 'Excellente journée à vous !', pose: 'excited' };
    } else if (hour >= 12 && hour < 18) {
      return { greeting: 'Bon après-midi', message: 'Continuez sur cette lancée !', pose: 'reading' };
    } else if (hour >= 18 && hour < 22) {
      return { greeting: 'Bonsoir', message: 'Bonne fin de journée !', pose: 'happy' };
    } else {
      return { greeting: 'Bonne nuit', message: 'Il se fait tard !', pose: 'thinking' };
    }
  };

  const welcome = getFallbackWelcome();

  useEffect(() => {
    fetchDashboardData();
    fetchAiGreeting();
  }, [period, compare]);

  const fetchAiGreeting = async () => {
    // Hors-ligne : on garde le message d'accueil local (fallback), pas d'appel.
    if (isNativePlatform() && isOffline()) return;
    try {
      // On utilise api.get car analyticsAPI n'a peut-être pas encore cette méthode
      const response = await analyticsAPI.getAiGreeting();
      if (response.data && response.data.success) {
        setAiGreeting(response.data);
      }
    } catch (error) {
      // Silencieux : le fallback local (welcome) est deja affiche.
    }
  };

  const fetchDashboardData = async () => {
    const native = isNativePlatform();
    // Cle de cache par periode (les chiffres different selon la periode choisie).
    const cacheId = `stats_${period}_${compare}`;

    try {
      setLoading(true);

      // Hors-ligne (natif) : on sert directement la derniere version en cache.
      if (native && isOffline()) {
        const cached = await readOne('dashboard', cacheId);
        if (cached) setStats(cached.data ?? cached);
        return;
      }

      const params = {
        period,
        compare: compare.toString(),
      };

      if (period === 'custom' && customDates.start_date && customDates.end_date) {
        params.start_date = customDates.start_date;
        params.end_date = customDates.end_date;
      }

      const response = await analyticsAPI.getStats(params);
      setStats(response.data.data);
      // Mise en cache pour consultation hors-ligne.
      if (native) cacheOne('dashboard', { id: cacheId, data: response.data.data });
    } catch (error) {
      // En natif, repli silencieux sur le cache (pas d'erreur bloquante offline).
      if (native) {
        const cached = await readOne('dashboard', cacheId);
        if (cached) { setStats(cached.data ?? cached); return; }
      }
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const handleCustomDateApply = () => {
    setPeriod('custom');
    setCustomDateDialog(false);
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      setAnchorEl(null);

      const params = {
        period,
        compare: compare.toString(),
      };

      if (period === 'custom' && customDates.start_date && customDates.end_date) {
        params.start_date = customDates.start_date;
        params.end_date = customDates.end_date;
      }

      const response = format === 'pdf'
        ? await analyticsAPI.exportPDF(params)
        : await analyticsAPI.exportExcel(params);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_stats.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting dashboard:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatComparison = (value, previousValue) => {
    if (!previousValue || previousValue === 0) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    const isPositive = change > 0;

    return {
      value: Math.abs(change).toFixed(1),
      isPositive,
      icon: isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />,
      color: isPositive ? '#10B981' : '#EF4444',
    };
  };

  if (loading) {
    // Loader inline (pas en plein écran) pour un chargement cohérent avec les
    // autres pages — évite l'overlay fixe qui « saute » vers le contenu.
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 3 }}>
        <LoadingState message="Chargement de votre tableau de bord..." />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box p={3}>
        <Alert severity="error">Impossible de charger les statistiques</Alert>
      </Box>
    );
  }

  const financialStats = stats.financial || {};
  const invoiceStats = stats.invoices || {};
  const poStats = stats.purchase_orders || {};
  const clientStats = stats.clients || {};
  const productStats = stats.products || {};

  const statsCards = [
    {
      title: 'Revenu Total',
      value: formatCurrency(financialStats.revenue || 0),
      previous: financialStats.comparison?.previous_revenue,
      icon: <AttachMoney />,
      color: '#10B981',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(financialStats.expenses || 0),
      previous: financialStats.comparison?.previous_expenses,
      icon: <ShoppingCart />,
      color: '#EF4444',
    },
    {
      title: 'Profit Net',
      value: formatCurrency(financialStats.net_profit || 0),
      previous: financialStats.comparison?.previous_profit,
      icon: <TrendingUp />,
      color: '#3B82F6',
    },
    {
      title: 'Factures Imp.',
      value: (invoiceStats.by_status?.overdue || 0) + (invoiceStats.by_status?.sent || 0),
      total: invoiceStats.total || 0,
      icon: <Receipt />,
      color: '#F59E0B',
    },
    {
      title: 'Commandes BC',
      value: poStats.period?.count || 0,
      total: poStats.total || 0,
      previous: poStats.comparison?.previous_count,
      icon: <Business />,
      color: '#8B5CF6',
    },
    {
      title: 'Nouv. Clients',
      value: clientStats.new_in_period || 0,
      previous: clientStats.comparison?.previous_new,
      icon: <People />,
      color: '#EC4899',
    },
  ];

  const prepareLineChartData = () => {
    const trends = stats.daily_trends || { dates: [], invoices: [], purchase_orders: [] };

    return {
      labels: trends.dates || [],
      datasets: [
        {
          label: 'Factures',
          data: trends.invoices || [],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Bons de commande',
          data: trends.purchase_orders || [],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
      ],
    };
  };

  const prepareDonutData = () => {
    return {
      labels: ['Payées', 'En attente', 'En retard'],
      datasets: [
        {
          data: [
            invoiceStats.paid_count || 0,
            invoiceStats.pending_count || 0,
            invoiceStats.overdue_count || 0,
          ],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
          borderWidth: 0,
        },
      ],
    };
  };

  const lineChartData = prepareLineChartData();
  const donutData = prepareDonutData();

  // Nettoyer le markdown du message IA (retire **, *, ##, etc.)
  const cleanAiMessage = (text) => text?.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/^#{1,3}\s+/gm, '').trim();

  // ── MOBILE UI ──────────────────────────────────────────────────────────────
  if (isMobile) {
    const mobileSection = currentTab;
    return (
      <Box sx={{
        bgcolor: 'background.default', minHeight: '100vh', pb: 14,
        overflowX: 'hidden',
        // Respecte l'encoche / status bar (Capacitor) : evite que le contenu
        // passe dessous.
        pt: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* Barre titre + periode (en flux normal : le header global de
            MainLayout est deja sticky, pas besoin d'une 2e barre collante qui
            chevauchait la barre d'onglets). */}
        <Box sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff',
          mx: 1.5, mt: 1.5,
          px: 2, py: 1.25,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              {welcome.greeting} 
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
              {aiGreeting ? cleanAiMessage(aiGreeting.greeting) : welcome.message}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <TextField
              select
              size="small"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              sx={{ width: 110, '& .MuiInputBase-root': { height: 32, fontSize: '0.75rem', borderRadius: 2 } }}
            >
              {PERIOD_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.8rem' }}>{o.label}</MenuItem>
              ))}
            </TextField>
            <IconButton size="small" onClick={fetchDashboardData} sx={{ border: '1px solid', borderColor: 'divider', width: 32, height: 32 }}>
              <Refresh sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Section tabs — barre neumorphique segmentee (tient sur la largeur).
            Onglet actif : icone + label en relief ; autres : icone seule. */}
        <Box sx={{ px: 1.5, py: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              p: 0.5,
              borderRadius: 3,
              bgcolor: '#e0e5ec',
              boxShadow: 'inset 3px 3px 7px #b8bec7, inset -3px -3px 7px #ffffff',
              width: '100%',
            }}
          >
            {[
              { label: 'Aperçu', icon: <TrendingUp sx={{ fontSize: 18 }} /> },
              { label: 'Factures', icon: <Receipt sx={{ fontSize: 18 }} /> },
              { label: 'Clients', icon: <People sx={{ fontSize: 18 }} /> },
              { label: 'Alertes', icon: <Warning sx={{ fontSize: 18 }} />, badge: stats.alerts?.length },
            ].map((s, i) => {
              const selected = mobileSection === i;
              return (
                <Box
                  key={i}
                  component="button"
                  type="button"
                  onClick={() => setCurrentTab(i)}
                  aria-label={s.label}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 0.5,
                    // L'onglet actif prend plus de place (pour son label), les
                    // autres se contentent de l'icone -> tout tient sans scroll.
                    flex: selected ? '1 1 auto' : '0 0 auto',
                    minWidth: selected ? 0 : 44,
                    px: selected ? 1.25 : 0, py: 0.9, borderRadius: 2.25,
                    whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'pointer',
                    border: 'none', fontFamily: 'inherit',
                    fontWeight: selected ? 700 : 500, fontSize: '0.8rem',
                    color: selected ? 'primary.main' : 'text.secondary',
                    bgcolor: selected ? '#e0e5ec' : 'transparent',
                    boxShadow: selected
                      ? '4px 4px 9px #b8bec7, -4px -4px 9px #ffffff'
                      : 'none',
                    transition: 'all 0.22s ease',
                    position: 'relative',
                  }}
                >
                  {s.icon}
                  {selected && (
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.label}
                    </Box>
                  )}
                  {s.badge > 0 && (
                    <Box sx={{ position: 'absolute', top: 2, right: selected ? 6 : 6, minWidth: 15, height: 15, px: 0.35, borderRadius: '8px', bgcolor: 'error.main', color: 'white', fontSize: '0.58rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.badge}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* ── Mobile Section 0: Aperçu ── */}
        {mobileSection === 0 && (
          <Box sx={{ px: 1.5 }}>
            {/* KPI 2 colonnes */}
            <Grid container spacing={1} sx={{ mb: 1.5 }}>
              {statsCards.map((stat, i) => (
                <Grid item xs={6} key={i}>
                  <Box sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    // Relief neumorphique + fin liseré d'accent à gauche.
                    boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff',
                    borderLeft: `3px solid ${stat.color}`,
                    p: 1.4,
                  }}>
                    <Box sx={{
                      width: 30, height: 30, borderRadius: 2,
                      bgcolor: `${stat.color}18`,
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.85,
                    }}>
                      {React.cloneElement(stat.icon, { sx: { fontSize: '0.95rem', color: stat.color } })}
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1, color: 'text.primary', mb: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {stat.title}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Graphique tendances */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff', p: 1.5, mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>Tendances</Typography>
              <Line data={lineChartData} options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top', align: 'end', labels: { boxWidth: 8, font: { size: 10 } } },
                  tooltip: { mode: 'index', intersect: false, padding: 6 },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, maxTicksLimit: 5 } },
                  x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 6 } },
                },
              }} />
            </Box>

            {/* Top clients mini */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff', p: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>Top clients</Typography>
              {(clientStats.top_clients || []).slice(0, 3).map((c, i, arr) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'primary.main', borderRadius: 1 }}>
                    {(c.name || '?')[0].toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, fontSize: '0.8rem' }}>{c.name}</Typography>
                  <Typography variant="caption" fontWeight={700} color="primary.main" noWrap>{formatCurrency(c.total_revenue || 0)}</Typography>
                </Box>
              ))}
              {(clientStats.top_clients || []).length === 0 && (
                <Typography variant="caption" color="text.secondary">Aucun client</Typography>
              )}
            </Box>
          </Box>
        )}

        {/* ── Mobile Section 1: Factures ── */}
        {mobileSection === 1 && (
          <Box sx={{ px: 1.5 }}>
            {/* Donut */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff', p: 1.5, mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>État des factures</Typography>
              <Box sx={{ height: 180, display: 'flex', justifyContent: 'center' }}>
                <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, cutout: '68%' }} />
              </Box>
            </Box>
            {/* Résumé */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff', p: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>Résumé</Typography>
              {[
                { label: 'Factures émises', value: invoiceStats.period?.count || 0, color: 'text.primary' },
                { label: 'Montant payé', value: formatCurrency(invoiceStats.period?.paid_amount || 0), color: 'success.main' },
                { label: 'En attente', value: formatCurrency(invoiceStats.period?.pending_amount || 0), color: 'warning.main' },
                { label: 'Taux de paiement', value: `${(invoiceStats.period?.payment_rate || 0).toFixed(1)}%`, color: 'info.main' },
              ].map((row, i, arr) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.875, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: row.color }}>{row.value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ── Mobile Section 2: Clients ── */}
        {mobileSection === 2 && (
          <Box sx={{ px: 1.5 }}>
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff', p: 1.5, mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>Top clients</Typography>
              {(clientStats.top_clients || []).length === 0
                ? <Typography variant="caption" color="text.secondary">Aucun client pour la période</Typography>
                : (clientStats.top_clients || []).map((c, i, arr) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Avatar sx={{ width: 34, height: 34, fontSize: '0.78rem', fontWeight: 700, bgcolor: 'primary.main', borderRadius: 1.5 }}>
                      {(c.name || '?')[0].toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 600 }} noWrap>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.total_invoices || 0} facture(s)</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: 'primary.main' }} noWrap>{formatCurrency(c.total_revenue || 0)}</Typography>
                  </Box>
                ))
              }
            </Box>
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff', p: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>Top fournisseurs</Typography>
              {(stats.suppliers?.top_suppliers || []).length === 0
                ? <Typography variant="caption" color="text.secondary">Aucun fournisseur pour la période</Typography>
                : (stats.suppliers?.top_suppliers || []).map((s, i, arr) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Avatar sx={{ width: 34, height: 34, fontSize: '0.78rem', fontWeight: 700, bgcolor: 'success.main', borderRadius: 1.5 }}>
                      {(s.name || '?')[0].toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 600 }} noWrap>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.total_orders || 0} BC</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: 'success.main' }} noWrap>{formatCurrency(s.total_amount || 0)}</Typography>
                  </Box>
                ))
              }
            </Box>
          </Box>
        )}

        {/* ── Mobile Section 3: Alertes ── */}
        {mobileSection === 3 && (
          <Box sx={{ px: 1.5 }}>
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff', p: 1.5, mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                <ErrorOutline color="error" sx={{ fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Alertes ({stats.alerts?.length || 0})</Typography>
              </Box>
              {(stats.alerts || []).length === 0
                ? <Box sx={{ py: 3, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 36, color: 'success.main', mb: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" display="block">Aucune alerte active</Typography>
                  </Box>
                : (stats.alerts || []).map((alert, i, arr) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, py: 1, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: alert.type === 'error' ? 'error.main' : 'warning.main', mt: 0.75, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.82rem' }}>{alert.message}</Typography>
                  </Box>
                ))
              }
            </Box>
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '5px 5px 12px #c5cad3, -5px -5px 12px #ffffff', p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                <Inventory2 color="info" sx={{ fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Stock</Typography>
              </Box>
              {[
                { label: 'Produits en rupture', value: productStats.stock?.out_of_stock || 0, color: 'error.main' },
                { label: 'Stock faible', value: productStats.stock?.low_stock || 0, color: 'warning.main' },
                { label: 'Valeur totale', value: formatCurrency(productStats.stock?.total_value || 0), color: 'info.main' },
              ].map((row, i, arr) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.875, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: row.color }}>{row.value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  // ── DESKTOP UI ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3, maxWidth: '100%', overflow: 'hidden' }}>
      {/* ── En-tête ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {welcome.greeting} 
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {aiGreeting ? cleanAiMessage(aiGreeting.greeting) : `${welcome.message} Voici un aperçu de votre activité.`}
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={0.75} flexShrink={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 2, p: 0.5, gap: 0.25 }}>
            {PERIOD_OPTIONS.map((option) => (
              <Box
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                sx={{
                  px: 1.5, py: 0.5, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  bgcolor: period === option.value ? 'background.paper' : 'transparent',
                  color: period === option.value ? 'primary.main' : 'text.secondary',
                  boxShadow: period === option.value ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {option.label}
              </Box>
            ))}
          </Box>
          <MuiTooltip title="Exporter">
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} disabled={exporting} sx={{ border: '1px solid', borderColor: 'divider' }}>
              {exporting ? <CircularProgress size={16} /> : <GetApp fontSize="small" />}
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Actualiser">
            <IconButton size="small" onClick={fetchDashboardData} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Refresh fontSize="small" />
            </IconButton>
          </MuiTooltip>
        </Stack>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleExport('pdf')}><PictureAsPdf sx={{ mr: 1 }} fontSize="small" />Exporter en PDF</MenuItem>
        <MenuItem onClick={() => handleExport('excel')}><TableChart sx={{ mr: 1 }} fontSize="small" />Exporter en Excel</MenuItem>
      </Menu>

      {/* Bandeau d'essai / alertes de quota (s'affiche seulement si pertinent) */}
      <SubscriptionStatus compact />

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Aperçu Général" />
          <Tab label="Facturation" />
          <Tab label="Performances" />
          <Tab label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Produits & Alertes
              {(stats.alerts?.length > 0) && (
                <Chip size="small" color="error" label={stats.alerts.length} sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-label': { px: 1, py: 0 } }} />
              )}
            </Box>
          } />
        </Tabs>
      </Box>

      {/* ── Tab 0 : Aperçu Général ── */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {statsCards.map((stat, index) => {
            const numericValue = typeof stat.value === 'string'
              ? parseFloat(stat.value.replace(/[^0-9.-]/g, '') || 0) : stat.value;
            const comparison = stat.previous !== undefined && stat.previous !== null
              ? formatComparison(numericValue, stat.previous) : null;
            return (
              <Grid item xs={6} sm={4} lg={2} key={index}>
                <Card elevation={0} sx={{
                  height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  borderLeft: `3px solid ${stat.color}`, bgcolor: 'background.paper',
                  transition: 'box-shadow 0.2s', '&:hover': { boxShadow: `0 4px 20px ${stat.color}22` },
                }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {React.cloneElement(stat.icon, { sx: { fontSize: '1.1rem', color: stat.color } })}
                      </Box>
                      {comparison && compare && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: comparison.color, fontSize: '0.68rem', fontWeight: 700 }}>
                          {comparison.icon}{comparison.value}%
                        </Box>
                      )}
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', lineHeight: 1.1, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', mb: 0.25 }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {stat.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Accès rapide : marges & bénéfice brut (calcul automatique) */}
        <Card
          elevation={0}
          onClick={() => navigate('/products/margins')}
          sx={{
            borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3, cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(99,102,241,0.06))',
            transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(16,185,129,0.18)' },
          }}
        >
          <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp sx={{ color: '#10b981' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Marges & bénéfice brut</Typography>
                <Typography variant="caption" color="text.secondary">
                  Calcul automatique : ventes − prix d'achat de vos produits
                </Typography>
              </Box>
            </Box>
            <Button size="small" variant="text">Consulter →</Button>
          </CardContent>
        </Card>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>Tendances quotidiennes</Typography>
                <Line data={lineChartData} options={{
                  responsive: true,
                  plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false, padding: 8 } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 11 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                  },
                }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>Facturation</Typography>
                {[
                  { label: 'Factures émises', value: invoiceStats.period?.count || 0, color: 'text.primary' },
                  { label: 'Montant payé', value: formatCurrency(invoiceStats.period?.paid_amount || 0), color: 'success.main' },
                  { label: 'En attente', value: formatCurrency(invoiceStats.period?.pending_amount || 0), color: 'warning.main' },
                  { label: 'Taux de paiement', value: `${(invoiceStats.period?.payment_rate || 0).toFixed(1)}%`, color: 'info.main' },
                ].map((row, i, arr) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                    <Typography variant="body2" fontWeight={700} color={row.color}>{row.value}</Typography>
                  </Box>
                ))}
                <Box sx={{ mt: 2.5, height: 140, display: 'flex', justifyContent: 'center' }}>
                  <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, cutout: '68%' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Top clients</Typography>
                {(clientStats.top_clients || []).length === 0
                  ? <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Aucun client pour la période</Typography>
                  : (clientStats.top_clients || []).map((client, i, arr) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.78rem', fontWeight: 700, bgcolor: 'primary.main', borderRadius: 1.5 }}>{(client.name || '?')[0].toUpperCase()}</Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={600} noWrap>{client.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{client.total_invoices || 0} facture(s)</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="primary.main" noWrap>{formatCurrency(client.total_revenue || 0)}</Typography>
                    </Box>
                  ))
                }
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Top fournisseurs</Typography>
                {(stats.suppliers?.top_suppliers || []).length === 0
                  ? <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Aucun fournisseur pour la période</Typography>
                  : (stats.suppliers?.top_suppliers || []).map((s, i, arr) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.78rem', fontWeight: 700, bgcolor: 'success.main', borderRadius: 1.5 }}>{(s.name || '?')[0].toUpperCase()}</Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={600} noWrap>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.total_orders || 0} BC</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="success.main" noWrap>{formatCurrency(s.total_amount || 0)}</Typography>
                    </Box>
                  ))
                }
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 1 : Facturation ── */}
      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>État des factures</Typography>
                <Box sx={{ height: 240, display: 'flex', justifyContent: 'center' }}>
                  <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }, cutout: '68%' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Résumé facturation</Typography>
                {[
                  { label: 'Total factures', value: invoiceStats.period?.count || 0, note: 'période sélectionnée' },
                  { label: 'Montant payé', value: formatCurrency(invoiceStats.period?.paid_amount || 0), color: 'success.main' },
                  { label: 'Montant en attente', value: formatCurrency(invoiceStats.period?.pending_amount || 0), color: 'warning.main' },
                  { label: 'Taux de paiement', value: `${(invoiceStats.period?.payment_rate || 0).toFixed(1)}%`, color: 'info.main' },
                ].map((row, i, arr) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2">{row.label}</Typography>
                      {row.note && <Typography variant="caption" color="text.secondary">{row.note}</Typography>}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} color={row.color || 'text.primary'}>{row.value}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 2 : Performances ── */}
      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Top 5 Clients</Typography>
                {(clientStats.top_clients || []).length === 0
                  ? <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Aucun client pour la période</Typography>
                  : (clientStats.top_clients || []).map((client, i, arr) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Avatar sx={{ width: 36, height: 36, fontSize: '0.8rem', fontWeight: 700, bgcolor: 'primary.main', borderRadius: 1.5 }}>{(client.name || '?')[0].toUpperCase()}</Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={600} noWrap>{client.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{client.total_invoices || 0} facture(s)</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="primary.main">{formatCurrency(client.total_revenue || 0)}</Typography>
                    </Box>
                  ))
                }
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Top 5 Fournisseurs</Typography>
                {(stats.suppliers?.top_suppliers || []).length === 0
                  ? <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Aucun fournisseur pour la période</Typography>
                  : (stats.suppliers?.top_suppliers || []).map((s, i, arr) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Avatar sx={{ width: 36, height: 36, fontSize: '0.8rem', fontWeight: 700, bgcolor: 'success.main', borderRadius: 1.5 }}>{(s.name || '?')[0].toUpperCase()}</Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={600} noWrap>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.total_orders || 0} BC</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="success.main">{formatCurrency(s.total_amount || 0)}</Typography>
                    </Box>
                  ))
                }
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 3 : Produits & Alertes ── */}
      <TabPanel value={currentTab} index={3}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <ErrorOutline color="error" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>Alertes ({stats.alerts?.length || 0})</Typography>
                </Box>
                {(stats.alerts || []).length === 0
                  ? <Box sx={{ py: 4, textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">Aucune alerte active</Typography>
                    </Box>
                  : (stats.alerts || []).map((alert, i, arr) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.25, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: alert.type === 'error' ? 'error.main' : 'warning.main', mt: 0.75, flexShrink: 0 }} />
                      <Typography variant="body2">{alert.message}</Typography>
                    </Box>
                  ))
                }
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Inventory2 color="info" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>Stock</Typography>
                </Box>
                {[
                  { label: 'Produits en rupture', value: productStats.stock?.out_of_stock || 0, color: 'error.main' },
                  { label: 'Stock faible', value: productStats.stock?.low_stock || 0, color: 'warning.main' },
                  { label: 'Valeur totale du stock', value: formatCurrency(productStats.stock?.total_value || 0), color: 'info.main' },
                ].map((row, i, arr) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color={row.color}>{row.value}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Dialog */}
      <Dialog open={customDateDialog} onClose={() => setCustomDateDialog(false)}>
        <DialogTitle>Sélectionner une période personnalisée</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2, minWidth: 300 }}>
            <TextField label="Date de début" type="date" value={customDates.start_date} onChange={(e) => setCustomDates({ ...customDates, start_date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="Date de fin" type="date" value={customDates.end_date} onChange={(e) => setCustomDates({ ...customDates, end_date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDateDialog(false)}>Annuler</Button>
          <Button onClick={handleCustomDateApply} variant="contained" disabled={!customDates.start_date || !customDates.end_date}>Appliquer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DashboardEnhanced;
