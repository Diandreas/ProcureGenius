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
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Business,
  ShoppingCart,
  Receipt,
  AttachMoney,
  People,
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
import { useTranslation } from 'react-i18next';
import { analyticsAPI } from '../services/analyticsAPI';
import useCurrency from '../hooks/useCurrency';
import LoadingState from '../components/LoadingState';
import { getNeumorphicShadow } from '../styles/neumorphism/mixins';

import { useHeader } from '../contexts/HeaderContext';

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

function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { format: formatCurrency } = useCurrency();

  const PERIOD_OPTIONS = [
    { value: 'today', label: t('dashboard:periods.today') },
    { value: 'last_7_days', label: t('dashboard:periods.last_7_days') },
    { value: 'last_30_days', label: t('dashboard:periods.last_30_days') },
    { value: 'last_90_days', label: t('dashboard:periods.last_90_days') },
    { value: 'this_month', label: t('dashboard:periods.this_month') },
    { value: 'this_year', label: t('dashboard:periods.this_year') },
  ];

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('last_30_days');
  const [compare, setCompare] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { greeting: t('dashboard:welcome.morning.greeting'), message: t('dashboard:welcome.morning.message'), pose: 'excited' };
    } else if (hour >= 12 && hour < 18) {
      return { greeting: t('dashboard:welcome.afternoon.greeting'), message: t('dashboard:welcome.afternoon.message'), pose: 'reading' };
    } else if (hour >= 18 && hour < 22) {
      return { greeting: t('dashboard:welcome.evening.greeting'), message: t('dashboard:welcome.evening.message'), pose: 'happy' };
    } else {
      return { greeting: t('dashboard:welcome.night.greeting'), message: t('dashboard:welcome.night.message'), pose: 'thinking' };
    }
  };

  const { setHeaderConfig } = useHeader();

  const welcome = getWelcomeMessage();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = {
        period,
        compare: compare.toString(),
      };

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

  useEffect(() => {
    fetchDashboardData();
  }, [period, compare]);

  // Configure header via context
  useEffect(() => {
    setHeaderConfig({
      title: t('dashboard:title', 'Dashboard'),
      periodControls: {
        currentPeriod: period,
        onPeriodChange: handlePeriodChange,
        onRefresh: fetchDashboardData,
      }
    });
    // Clean up on unmount
    return () => setHeaderConfig(null);
  }, [period, t]);

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
    return <LoadingState message={t('dashboard:loading')} fullScreen />;
  }

  if (!stats) {
    return (
      <Box p={3}>
        <Alert severity="error">{t('dashboard:error')}</Alert>
      </Box>
    );
  }

  const financialStats = stats.financial || {};
  const invoiceStats = stats.invoices || {};

  const statsCards = [
    {
      title: t('dashboard:stats.totalRevenue'),
      value: formatCurrency(financialStats.total_revenue || 0),
      previous: financialStats.previous_revenue,
      icon: <AttachMoney />,
      color: '#10B981',
    },
    {
      title: t('dashboard:stats.expenses'),
      value: formatCurrency(financialStats.total_expenses || 0),
      previous: financialStats.previous_expenses,
      icon: <ShoppingCart />,
      color: '#EF4444',
    },
    {
      title: t('dashboard:widgets.financial_summary_metrics.net_profit'),
      value: formatCurrency(financialStats.net_profit || 0),
      previous: financialStats.previous_profit,
      icon: <TrendingUp />,
      color: '#3B82F6',
    },
    {
      title: t('dashboard:stats.unpaidInvoices'),
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
          label: t('dashboard:labels.invoices'),
          data: trends.invoices || [],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
        },
        {
          label: t('dashboard:library.modules.purchase_orders'),
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
    <Box p={isMobile ? 1.5 : 3} sx={{ pb: isMobile ? 10 : 3 }}>
      {/* Welcome Banner - Premium Look */}
      <Box sx={{ mb: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.2, sm: 4 },
            borderRadius: isMobile ? 3 : 4,
            background: mode => mode === 'dark' 
              ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
              : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              filter: 'blur(40px)',
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Typography sx={{ fontWeight: 800, mb: isMobile ? 0.3 : 1, fontSize: isMobile ? '1.1rem' : '2.125rem' }}>
              {welcome.greeting}, {stats.user_name || 'Utilisateur'} !
            </Typography>
            {!isMobile && (
              <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 600 }}>
                {welcome.message}
              </Typography>
            )}
          </motion.div>
        </Paper>
      </Box>

      {/* Stats Cards - Grid 2x2 on Mobile */}
      <Grid container spacing={isMobile ? 1.5 : 2.5} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => {
          const numericValue = typeof stat.value === 'string'
            ? parseFloat(stat.value.replace(/[^0-9.-]/g, '') || 0)
            : stat.value;
          const comparison = stat.previous !== undefined ? formatComparison(numericValue, stat.previous) : null;

          return (
            <Grid item xs={6} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  borderRadius: isMobile ? 2.5 : 3, 
                  border: 'none',
                  boxShadow: theme => getNeumorphicShadow(theme.palette.mode, isMobile ? 'soft' : 'medium'),
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  height: '100%',
                  bgcolor: 'background.paper',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                  } 
                }}
              >
                <CardContent sx={{ p: isMobile ? 1 : 2.5, '&:last-child': { pb: isMobile ? 1 : 2.5 } }}>
                  <Box sx={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', gap: isMobile ? 0.8 : 1.5, mb: 1, textAlign: isMobile ? 'left' : 'center' }}>
                    <Avatar 
                      sx={{ 
                        width: isMobile ? 36 : 48,
                        height: isMobile ? 36 : 48,
                        bgcolor: `${stat.color}15`, 
                        color: stat.color, 
                        boxShadow: theme => theme.palette.mode === 'dark'
                          ? '4px 4px 10px rgba(0,0,0,0.3), -2px -2px 10px rgba(255,255,255,0.05)'
                          : '4px 4px 10px rgba(0,0,0,0.1), -4px -4px 10px rgba(255,255,255,0.8)',
                      }}
                    >
                      {React.cloneElement(stat.icon, { fontSize: isMobile ? 'small' : 'medium' })}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: isMobile ? '0.65rem' : '0.75rem', opacity: 0.8, display: 'block' }}>
                        {stat.title}
                      </Typography>
                      <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 800 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {comparison && compare && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                      <Chip
                        icon={comparison.icon}
                        label={`${comparison.value}%`}
                        size="small"
                        sx={{ 
                          bgcolor: `${comparison.color}15`, 
                          color: comparison.color, 
                          fontWeight: 700, 
                          fontSize: '0.6rem', 
                          height: 20,
                          '& .MuiChip-icon': { fontSize: 12, ml: 0.5 }
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Graphique simplifié */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '4px', border: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: isMobile ? '1rem' : '1.25rem' }}>Tendances</Typography>
            <Box sx={{ height: isMobile ? 220 : 300, width: '100%' }}>
              <Line
                data={lineChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: 'top', 
                      align: 'end',
                      display: !isMobile, // Hide legend on mobile to save space
                    },
                    tooltip: { 
                      mode: 'index', 
                      intersect: false,
                      padding: 12,
                      bodySpacing: 8,
                    }
                  },
                  scales: {
                    y: { 
                      beginAtZero: true,
                      grid: { color: theme.palette.divider, drawBorder: false },
                      ticks: { fontSize: 10 }
                    },
                    x: { 
                      grid: { display: false },
                      ticks: { fontSize: 10 }
                    }
                  },
                  interaction: { mode: 'nearest', axis: 'x', intersect: false }
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Top Clients, Activité Récente et Alertes */}
      <Grid container spacing={isMobile ? 2 : 2.5}>
        {/* Top Clients */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: isMobile ? 2 : 3, 
              borderRadius: 3, 
              boxShadow: getNeumorphicShadow(theme.palette.mode, 'soft'),
              bgcolor: 'background.paper',
              height: '100%' 
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>{t('dashboard:labels.topClients')}</Typography>
            {stats.top_clients && stats.top_clients.length > 0 ? (
              <List disablePadding>
                {(stats.top_clients || []).slice(0, 5).map((client, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5, borderBottom: index < Math.min(4, (stats.top_clients?.length || 0) - 1) ? '1px solid' : 'none', borderColor: 'grey.100' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', borderRadius: '4px', width: 36, height: 36 }}>
                        <People fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={client.name}
                      secondary={`${client.invoice_count} facture(s)`}
                      primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                    <Typography variant="body1" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {formatCurrency(client.total_revenue)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">Aucune donnée disponible</Typography>
            )}
          </Paper>
        </Grid>

        {/* Activité Récente */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: isMobile ? 2 : 3, 
              borderRadius: 3, 
              boxShadow: getNeumorphicShadow(theme.palette.mode, 'soft'),
              bgcolor: 'background.paper',
              height: '100%' 
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>Activité Récente</Typography>
            {stats.recent_activity && stats.recent_activity.length > 0 ? (
              <List disablePadding>
                {stats.recent_activity.map((activity, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5, borderBottom: index < stats.recent_activity.length - 1 ? '1px solid' : 'none', borderColor: 'grey.100' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', borderRadius: '4px', width: 36, height: 36 }}>
                        <TrendingUp fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.description}
                      secondary={new Date(activity.date).toLocaleDateString()}
                      primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">Aucune activité récente</Typography>
            )}
          </Paper>
        </Grid>

        {/* Alertes */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: isMobile ? 2 : 3, 
              borderRadius: 3, 
              boxShadow: getNeumorphicShadow(theme.palette.mode, 'soft'),
              bgcolor: 'background.paper',
              height: '100%' 
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>Alertes</Typography>
            {stats.alerts && stats.alerts.length > 0 ? (
              <List disablePadding>
                {stats.alerts.map((alert, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5, borderBottom: index < stats.alerts.length - 1 ? '1px solid' : 'none', borderColor: 'grey.100' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: alert.type === 'warning' ? 'warning.light' : 'error.light', color: alert.type === 'warning' ? 'warning.main' : 'error.main', borderRadius: '4px', width: 36, height: 36 }}>
                        <TrendingDown fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={alert.message}
                      primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">Aucune alerte</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

    </Box>
  );
}

export default Dashboard;
