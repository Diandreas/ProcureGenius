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
  DateRange,
  PictureAsPdf,
  TableChart,
  Refresh,
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

  const statsCards = [
    {
      title: 'Revenu Total',
      value: formatCurrency(financialStats.total_revenue || 0),
      previous: financialStats.previous_revenue,
      icon: <AttachMoney />,
      color: '#10B981',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(financialStats.total_expenses || 0),
      previous: financialStats.previous_expenses,
      icon: <ShoppingCart />,
      color: '#EF4444',
    },
    {
      title: 'Profit Net',
      value: formatCurrency(financialStats.net_profit || 0),
      previous: financialStats.previous_profit,
      icon: <TrendingUp />,
      color: '#3B82F6',
    },
    {
      title: 'Factures Impayées',
      value: invoiceStats.unpaid_count || 0,
      total: invoiceStats.total_count || 0,
      icon: <Receipt />,
      color: '#F59E0B',
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
          {/* Period selector — compact chip group */}
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
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} aria-label="dashboard tabs">
          <Tab label="Aperçu Général" />
          <Tab label="Facturation" />
          <Tab label="Performances" />
        </Tabs>
      </Box>

      {/* Tab 0: Aperçu Général */}
      <TabPanel value={currentTab} index={0}>
        {/* Stats Cards */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {statsCards.map((stat, index) => {
            const numericValue = typeof stat.value === 'string'
              ? parseFloat(stat.value.replace(/[^0-9.-]/g, '') || 0)
              : stat.value;
            const comparison = stat.previous !== undefined ? formatComparison(numericValue, stat.previous) : null;

            return (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', transition: 'all 0.2s', '&:hover': { borderColor: stat.color, boxShadow: 2, transform: 'translateY(-2px)' } }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                      <Avatar sx={{ bgcolor: `${stat.color}15`, color: stat.color, width: 48, height: 48, borderRadius: 1 }}>
                        {stat.icon}
                      </Avatar>
                      <Box sx={{ ml: 1.5, flexGrow: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                          {stat.title}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                          {stat.value}
                        </Typography>
                        {stat.total !== undefined && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            sur {stat.total} total
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {comparison && compare && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Chip
                          icon={comparison.icon}
                          label={`${comparison.value}%`}
                          size="small"
                          sx={{ bgcolor: `${comparison.color}15`, color: comparison.color, fontWeight: 600, fontSize: '0.7rem', height: 24 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontSize: '0.7rem' }}>
                          vs période précédente
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Tendances quotidiennes</Typography>
          <Line data={lineChartData} options={{ responsive: true, plugins: { legend: { position: 'top', align: 'end' } }, scales: { y: { beginAtZero: true } } }} />
        </Paper>
      </TabPanel>

      {/* Tab 1: Facturation */}
      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>État des factures</Typography>
              <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Résumé Facturation</Typography>
              <List disablePadding>
                <ListItem sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText primary="Total Factures" secondary="Période sélectionnée" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{invoiceStats.total_count || 0}</Typography>
                </ListItem>
                <ListItem sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText primary="Factures Payées" />
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>{invoiceStats.paid_count || 0}</Typography>
                </ListItem>
                <ListItem sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemText primary="Factures en Attente" />
                  <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>{invoiceStats.pending_count || 0}</Typography>
                </ListItem>
                <ListItem sx={{ px: 0, py: 1.5 }}>
                  <ListItemText primary="Factures en Retard" />
                  <Typography variant="h6" color="error.main" sx={{ fontWeight: 600 }}>{invoiceStats.overdue_count || 0}</Typography>
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Performances */}
      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Top 5 Clients</Typography>
              <List disablePadding>
                {(stats.top_clients || []).map((client, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5, borderBottom: index < (stats.top_clients?.length || 0) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', borderRadius: 1 }}>
                        <People />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={client.name} secondary={`${client.invoice_count} facture(s)`} primaryTypographyProps={{ fontWeight: 500 }} />
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                      {formatCurrency(client.total_revenue)}
                    </Typography>
                  </ListItem>
                ))}
                {(!stats.top_clients || stats.top_clients.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Aucun client trouvé</Typography>
                )}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Top 5 Fournisseurs</Typography>
              <List disablePadding>
                {(stats.top_suppliers || []).map((supplier, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5, borderBottom: index < (stats.top_suppliers?.length || 0) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', borderRadius: 1 }}>
                        <Business />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={supplier.name} secondary={`${supplier.purchase_order_count} BC`} primaryTypographyProps={{ fontWeight: 500 }} />
                    <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                      {formatCurrency(supplier.total_spent)}
                    </Typography>
                  </ListItem>
                ))}
                {(!stats.top_suppliers || stats.top_suppliers.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Aucun fournisseur trouvé</Typography>
                )}
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
