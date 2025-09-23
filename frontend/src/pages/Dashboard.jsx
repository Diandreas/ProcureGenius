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
} from '@mui/material';
import {
  TrendingUp,
  Business,
  ShoppingCart,
  Receipt,
  AttachMoney,
  Warning,
} from '@mui/icons-material';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { dashboardAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';

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
    return <LinearProgress />;
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

  // Préparer les données pour les graphiques basées sur les vraies données
  const prepareChartData = () => {
    if (!recentActivity) return null;

    // Pour la démo, on utilise des données simulées basées sur les stats réelles
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
          Math.floor((stats?.unpaid_invoices || 0) * 0.3) // Estimation des factures en retard
        ],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const chartData = prepareChartData();

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${stat.color}20`,
                      color: stat.color,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Box sx={{ ml: 2, flexGrow: 1 }}>
                    <Typography color="text.secondary" variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
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
                        height: 6,
                        borderRadius: 3,
                        bgcolor: `${stat.color}20`,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: stat.color,
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
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
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Évolution des revenus et dépenses
            </Typography>
            {chartData && (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                }}
              />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              État des factures
            </Typography>
            <Doughnut
              data={donutData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Derniers bons de commande
            </Typography>
            <List>
              {recentActivity?.recent_purchase_orders?.map((order) => (
                <ListItem key={order.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <ShoppingCart />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={order.title}
                    secondary={`${order.supplier_name} - ${formatCurrency(order.total_amount)}`}
                  />
                  <Chip
                    label={order.status}
                    size="small"
                    color={order.status === 'approved' ? 'success' : 'warning'}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Dernières factures
            </Typography>
            <List>
              {recentActivity?.recent_invoices?.map((invoice) => (
                <ListItem key={invoice.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'secondary.light' }}>
                      <Receipt />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={invoice.title}
                    secondary={`${invoice.client_name} - ${formatCurrency(invoice.total_amount)}`}
                  />
                  <Chip
                    label={invoice.status}
                    size="small"
                    color={invoice.status === 'paid' ? 'success' : 'warning'}
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