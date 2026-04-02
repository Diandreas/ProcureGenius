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
import { analyticsAPI } from '../services/analyticsAPI';
import useCurrency from '../hooks/useCurrency';
import Mascot from '../components/Mascot';
import LoadingState from '../components/LoadingState';

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
    try {
      // On utilise api.get car analyticsAPI n'a peut-être pas encore cette méthode
      const response = await analyticsAPI.getAiGreeting();
      if (response.data && response.data.success) {
        setAiGreeting(response.data);
      }
    } catch (error) {
      console.error('Error fetching AI greeting:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
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
    return <LoadingState message="Chargement de votre tableau de bord..." fullScreen />;
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

  return (
    <Box p={isMobile ? 2 : 3}>
      {/* En-tête */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        {/* Greeting */}
        <Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            {welcome.greeting} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {aiGreeting ? aiGreeting.greeting : `${welcome.message} Voici un aperçu de votre activité.`}
          </Typography>
        </Box>

        {/* Controls */}
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
          {/* Period selector */}
          {isMobile ? (
            <TextField
              select
              size="small"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              sx={{ minWidth: 130, '& .MuiInputBase-root': { height: 36, fontSize: '0.875rem', bgcolor: 'background.paper', borderRadius: 2 } }}
            >
              {PERIOD_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.875rem' }}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'action.hover',
                borderRadius: 2,
                p: 0.5,
                gap: 0.25,
                flexWrap: 'wrap',
              }}
            >
              {PERIOD_OPTIONS.map((option) => (
                <Box
                  key={option.value}
                  onClick={() => handlePeriodChange(option.value)}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
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
          )}

          {/* Export icon button */}
          <MuiTooltip title="Exporter">
            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              disabled={exporting}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              {exporting ? <CircularProgress size={16} /> : <GetApp fontSize="small" />}
            </IconButton>
          </MuiTooltip>

          {/* Refresh */}
          <MuiTooltip title="Actualiser">
            <IconButton size="small" onClick={fetchDashboardData} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Refresh fontSize="small" />
            </IconButton>
          </MuiTooltip>
        </Stack>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleExport('pdf')}>
          <PictureAsPdf sx={{ mr: 1 }} fontSize="small" />
          Exporter en PDF
        </MenuItem>
        <MenuItem onClick={() => handleExport('excel')}>
          <TableChart sx={{ mr: 1 }} fontSize="small" />
          Exporter en Excel
        </MenuItem>
      </Menu>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)} 
          aria-label="dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Aperçu Général" />
          <Tab label="Facturation" />
          <Tab label="Performances" />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Produits & Alertes
                {(stats.alerts?.length > 0) && (
                  <Chip size="small" color="error" label={stats.alerts.length} sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-label': { px: 1, py: 0 } }} />
                )}
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* Tab 0: Aperçu Général */}
      <TabPanel value={currentTab} index={0}>
        {/* Stats Cards */}
        <Grid container spacing={isMobile ? 1.5 : 2.5} sx={{ mb: 3 }}>
          {statsCards.map((stat, index) => {
            const numericValue = typeof stat.value === 'string'
              ? parseFloat(stat.value.replace(/[^0-9.-]/g, '') || 0)
              : stat.value;
            const comparison = stat.previous !== undefined && stat.previous !== null ? formatComparison(numericValue, stat.previous) : null;

            return (
              <Grid item xs={6} sm={4} md={4} lg={2} key={index}>
                <Card sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: 'none',
                  background: theme.palette.mode === 'light'
                    ? `linear-gradient(135deg, #ffffff 0%, ${stat.color}08 100%)`
                    : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${stat.color}12 100%)`,
                  boxShadow: theme.palette.mode === 'light'
                    ? `0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px ${stat.color}20`
                    : `0 2px 12px rgba(0,0,0,0.25), 0 0 0 1px ${stat.color}25`,
                  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                  cursor: 'default',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: theme.palette.mode === 'light'
                      ? `0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px ${stat.color}40`
                      : `0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px ${stat.color}40`,
                  }
                }}>
                  <CardContent sx={{ p: isMobile ? 1.5 : 2.5, '&:last-child': { pb: isMobile ? 1.5 : 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{
                        width: isMobile ? 36 : 44,
                        height: isMobile ? 36 : 44,
                        borderRadius: 2.5,
                        bgcolor: `${stat.color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {React.cloneElement(stat.icon, { fontSize: isMobile ? 'small' : 'medium', style: { color: stat.color } })}
                      </Box>
                      {comparison && compare && (
                        <Box sx={{
                          display: 'flex', alignItems: 'center', gap: 0.25,
                          bgcolor: `${comparison.color}12`,
                          color: comparison.color,
                          borderRadius: 1.5, px: 0.75, py: 0.25,
                          fontSize: '0.65rem', fontWeight: 700,
                        }}>
                          {comparison.icon}
                          {comparison.value}%
                        </Box>
                      )}
                    </Box>
                    <MuiTooltip title={stat.value}>
                      <Typography sx={{
                        fontWeight: 700,
                        fontSize: isMobile ? '1rem' : '1.35rem',
                        lineHeight: 1.2,
                        color: 'text.primary',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        mb: 0.5,
                      }}>
                        {stat.value}
                      </Typography>
                    </MuiTooltip>
                    <Typography sx={{
                      fontSize: isMobile ? '0.65rem' : '0.72rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {stat.title}
                    </Typography>
                    {stat.total !== undefined && !isMobile && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.25, display: 'block' }}>
                        sur {stat.total} total
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Paper elevation={0} sx={{
          p: isMobile ? 2 : 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.mode === 'light' ? '#ffffff' : theme.palette.background.paper,
          boxShadow: theme.palette.mode === 'light' ? '0 2px 12px rgba(0,0,0,0.05)' : '0 2px 12px rgba(0,0,0,0.2)',
        }}>
          <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 700, mb: 2.5, color: 'text.primary' }}>Tendances quotidiennes</Typography>
          <Line data={lineChartData} options={{
            responsive: true,
            plugins: {
              legend: { position: 'top', align: 'end' },
              tooltip: { mode: 'index', intersect: false, padding: 10 },
            },
            scales: {
              y: { beginAtZero: true, grid: { color: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' } },
              x: { grid: { display: false } },
            },
          }} />
        </Paper>
      </TabPanel>

      {/* Tab 1: Facturation */}
      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={isMobile ? 1.5 : 2.5}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600, mb: 2 }}>État des factures</Typography>
              <Box sx={{ height: isMobile ? 200 : 'auto', display: 'flex', justifyContent: 'center' }}>
                <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600, mb: 2 }}>Résumé Facturation</Typography>
              <List disablePadding>
                <ListItem sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText primary="Total Factures" secondary="Période sélectionnée" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem' }} secondaryTypographyProps={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />
                  <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600 }}>{invoiceStats.period?.count || 0}</Typography>
                </ListItem>
                <ListItem sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText primary="Montant Payé" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />
                  <Typography variant={isMobile ? "subtitle1" : "h6"} color="success.main" sx={{ fontWeight: 600 }}>{formatCurrency(invoiceStats.period?.paid_amount || 0)}</Typography>
                </ListItem>
                <ListItem sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText primary="Montant en Attente" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />
                  <Typography variant={isMobile ? "subtitle1" : "h6"} color="warning.main" sx={{ fontWeight: 600 }}>{formatCurrency(invoiceStats.period?.pending_amount || 0)}</Typography>
                </ListItem>
                <ListItem sx={{ px: 0, py: 1.5 }}>
                  <ListItemText primary="Taux de paiement" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />
                  <Typography variant={isMobile ? "subtitle1" : "h6"} color="info.main" sx={{ fontWeight: 600 }}>{(invoiceStats.period?.payment_rate || 0).toFixed(1)}%</Typography>
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Performances */}
      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={isMobile ? 1.5 : 2.5}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600, mb: 2 }}>Top 5 Clients</Typography>
              <List disablePadding>
                {(clientStats.top_clients || []).map((client, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5, borderBottom: index < (clientStats.top_clients?.length || 0) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', borderRadius: 1, width: isMobile ? 36 : 40, height: isMobile ? 36 : 40 }}>
                        <People fontSize={isMobile ? "small" : "medium"} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={client.name} secondary={`${client.total_invoices || 0} facture(s)`} primaryTypographyProps={{ fontWeight: 500, fontSize: isMobile ? '0.9rem' : '1rem' }} secondaryTypographyProps={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />
                    <Typography variant={isMobile ? "subtitle1" : "h6"} color="primary" sx={{ fontWeight: 600 }}>
                      {formatCurrency(client.total_revenue || 0)}
                    </Typography>
                  </ListItem>
                ))}
                {(!clientStats.top_clients || clientStats.top_clients.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>Aucun client trouvé pour la période</Typography>
                )}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600, mb: 2 }}>Top 5 Fournisseurs</Typography>
              <List disablePadding>
                {(stats.suppliers?.top_suppliers || []).map((supplier, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5, borderBottom: index < (stats.suppliers?.top_suppliers?.length || 0) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', borderRadius: 1, width: isMobile ? 36 : 40, height: isMobile ? 36 : 40 }}>
                        <Business fontSize={isMobile ? "small" : "medium"} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={supplier.name} secondary={`${supplier.total_orders || 0} BC`} primaryTypographyProps={{ fontWeight: 500, fontSize: isMobile ? '0.9rem' : '1rem' }} secondaryTypographyProps={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />
                    <Typography variant={isMobile ? "subtitle1" : "h6"} color="success.main" sx={{ fontWeight: 600 }}>
                      {formatCurrency(supplier.total_amount || 0)}
                    </Typography>
                  </ListItem>
                ))}
                {(!stats.suppliers?.top_suppliers || stats.suppliers?.top_suppliers.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>Aucun fournisseur trouvé pour la période</Typography>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 3: Produits & Alertes */}
      <TabPanel value={currentTab} index={3}>
        <Grid container spacing={isMobile ? 1.5 : 2.5}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ErrorOutline color="error" sx={{ mr: 1 }} />
                <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600 }}>Alertes ({stats.alerts?.length || 0})</Typography>
              </Box>
              <List disablePadding>
                {(stats.alerts || []).map((alert, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5, borderBottom: index < (stats.alerts?.length || 0) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: alert.type === 'error' ? 'error.light' : 'warning.light', color: alert.type === 'error' ? 'error.main' : 'warning.main', borderRadius: 1, width: isMobile ? 36 : 40, height: isMobile ? 36 : 40 }}>
                        <NotificationsActive fontSize={isMobile ? "small" : "medium"} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={alert.message} primaryTypographyProps={{ fontWeight: 500, fontSize: isMobile ? '0.9rem' : '1rem' }} />
                  </ListItem>
                ))}
                {(!stats.alerts || stats.alerts.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>Aucune alerte pour l'instant.</Typography>
                )}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Inventory2 color="info" sx={{ mr: 1 }} />
                <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600 }}>Produits Physiques - Stock</Typography>
              </Box>
              <List disablePadding>
                <ListItem sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText primary="Produits en Rupture" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem', color: 'error.main', fontWeight: 500 }} />
                  <Typography variant={isMobile ? "subtitle1" : "h6"} color="error.main" sx={{ fontWeight: 600 }}>{productStats.stock?.out_of_stock || 0}</Typography>
                </ListItem>
                <ListItem sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText primary="Produits en Stock Faible" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem', color: 'warning.main', fontWeight: 500 }} />
                  <Typography variant={isMobile ? "subtitle1" : "h6"} color="warning.main" sx={{ fontWeight: 600 }}>{productStats.stock?.low_stock || 0}</Typography>
                </ListItem>
                <ListItem sx={{ px: 0, py: 1.5 }}>
                  <ListItemText primary="Valeur Totale du Stock" primaryTypographyProps={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />
                  <Typography variant={isMobile ? "subtitle1" : "h6"} color="info.main" sx={{ fontWeight: 600 }}>{formatCurrency(productStats.stock?.total_value || 0)}</Typography>
                </ListItem>
              </List>
            </Paper>
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
