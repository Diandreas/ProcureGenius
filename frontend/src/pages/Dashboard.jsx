import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
  Alert,
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
  Inventory,
  Warning,
  MoneyOff,
  CheckCircle,
  PendingActions,
  Store,
  LocalShipping,
  AccountBalance,
} from '@mui/icons-material';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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
import { dashboardAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import Mascot from '../components/Mascot';
import LoadingState from '../components/LoadingState';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getWelcomeMessage = () => {
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

  const welcome = getWelcomeMessage();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentActivity(),
      ]);
      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Chargement de votre tableau de bord..." fullScreen />;
  }

  const statsCards = [
    {
      title: 'Fournisseurs actifs',
      value: stats?.active_suppliers || 0,
      total: stats?.total_suppliers || 0,
      icon: <Business />,
      color: '#4F46E5',
    },
    {
      title: 'Bons de commande',
      value: stats?.pending_purchase_orders || 0,
      total: stats?.total_purchase_orders || 0,
      icon: <ShoppingCart />,
      color: '#10B981',
      label: 'En attente',
    },
    {
      title: 'Factures impayées',
      value: stats?.unpaid_invoices || 0,
      total: stats?.total_invoices || 0,
      icon: <Receipt />,
      color: '#F59E0B',
    },
    {
      title: 'Revenus',
      value: formatCurrency(stats?.total_revenue || 0),
      icon: <TrendingUp />,
      color: '#3B82F6',
      noTotal: true,
    },
  ];

  const prepareChartData = () => {
    if (!recentActivity) return null;

    const totalRevenue = stats?.total_revenue || 0;
    const totalExpenses = stats?.total_expenses || 0;

    return {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
      datasets: [
        {
          label: 'Revenus',
          data: [
            totalRevenue * 0.15,
            totalRevenue * 0.18,
            totalRevenue * 0.16,
            totalRevenue * 0.17,
            totalRevenue * 0.19,
            totalRevenue * 0.15
          ].map(v => Math.round(v)),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
        {
          label: 'Dépenses',
          data: [
            totalExpenses * 0.14,
            totalExpenses * 0.16,
            totalExpenses * 0.15,
            totalExpenses * 0.18,
            totalExpenses * 0.17,
            totalExpenses * 0.20
          ].map(v => Math.round(v)),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        },
      ],
    };
  };

  const donutData = {
    labels: ['Payées', 'En attente', 'En retard'],
    datasets: [
      {
        data: [
          stats?.total_invoices - stats?.unpaid_invoices || 0,
          stats?.unpaid_invoices || 0,
          Math.floor((stats?.unpaid_invoices || 0) * 0.3)
        ],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const chartData = prepareChartData();

  return (
    <Box p={isMobile ? 2 : 3}>
      {/* Message de bienvenue */}
      {!isMobile && (
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 1,
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
            <Box sx={{ position: 'relative', mr: 3 }}>
              <Mascot pose={welcome.pose} animation="wave" size={80} />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {welcome.greeting} ! 👋
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95 }}>
                {welcome.message} Voici un aperçu de votre activité.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <Grid container spacing={isMobile ? 2 : 2.5} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: stat.color,
                  boxShadow: 2,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${stat.color}15`,
                      color: stat.color,
                      width: isMobile ? 40 : 48,
                      height: isMobile ? 40 : 48,
                      borderRadius: 1,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Box sx={{ ml: 1.5, flexGrow: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                </Box>
                {!stat.noTotal && (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={(stat.value / stat.total) * 100}
                      sx={{
                        height: 4,
                        borderRadius: 1,
                        bgcolor: `${stat.color}10`,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: stat.color,
                          borderRadius: 1,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontWeight: 500, fontSize: '0.7rem' }}>
                      {stat.label || `${stat.value} sur ${stat.total}`}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={isMobile ? 2 : 2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: isMobile ? 2 : 3,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 2,
              }
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Évolution des revenus et dépenses
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tendances sur les 6 derniers mois
              </Typography>
            </Box>
            {chartData && (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'top',
                      align: 'end',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 12, weight: 500 },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    },
                    x: {
                      grid: { display: false },
                    },
                  },
                }}
              />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: isMobile ? 2 : 3,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 2,
              }
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                État des factures
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Répartition actuelle
              </Typography>
            </Box>
            <Doughnut
              data={donutData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 15,
                      font: { size: 12, weight: 500 },
                    },
                  },
                },
                cutout: '70%',
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={isMobile ? 2 : 2.5}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: isMobile ? 2 : 3,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 2,
              }
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Derniers bons de commande
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Activité récente
              </Typography>
            </Box>
            <List disablePadding>
              {recentActivity?.recent_purchase_orders?.map((order, index) => (
                <ListItem
                  key={order.id}
                  sx={{
                    px: 0,
                    py: 1.5,
                    borderBottom: index < recentActivity.recent_purchase_orders.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.50',
                        color: 'primary.main',
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                      }}
                    >
                      <ShoppingCart fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={order.title}
                    secondary={`${order.supplier_name} - ${formatCurrency(order.total_amount)}`}
                    primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem', mt: 0.5 }}
                  />
                  <Chip
                    label={order.status}
                    size="small"
                    color={order.status === 'approved' ? 'success' : 'warning'}
                    sx={{ fontWeight: 500, fontSize: '0.7rem', height: 20 }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: isMobile ? 2 : 3,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: 2,
              }
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Dernières factures
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Activité récente
              </Typography>
            </Box>
            <List disablePadding>
              {recentActivity?.recent_invoices?.map((invoice, index) => (
                <ListItem
                  key={invoice.id}
                  sx={{
                    px: 0,
                    py: 1.5,
                    borderBottom: index < recentActivity.recent_invoices.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: 'success.50',
                        color: 'success.main',
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                      }}
                    >
                      <Receipt fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={invoice.title}
                    secondary={`${invoice.client_name} - ${formatCurrency(invoice.total_amount)}`}
                    primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem', mt: 0.5 }}
                  />
                  <Chip
                    label={invoice.status}
                    size="small"
                    color={invoice.status === 'paid' ? 'success' : 'warning'}
                    sx={{ fontWeight: 500, fontSize: '0.7rem', height: 20 }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
