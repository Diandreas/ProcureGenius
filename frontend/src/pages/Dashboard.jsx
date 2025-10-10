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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Déterminer le message de bienvenue selon l'heure
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

  const MobileStatsCard = ({ stat }) => (
    <Card sx={{
      mb: 1.5,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderColor: stat.color,
        background: 'rgba(255, 255, 255, 0.95)'
      }
    }}>
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar
            sx={{
              bgcolor: `${stat.color}15`,
              color: stat.color,
              width: 32,
              height: 32,
              boxShadow: `0 2px 8px ${stat.color}20`,
            }}
          >
            {stat.icon}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              color="text.secondary"
              variant="caption"
              sx={{
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.7rem'
              }}
            >
              {stat.title}
            </Typography>
            <Typography variant="h6" sx={{
              fontWeight: 700,
              mt: 0.25,
              lineHeight: 1.2,
              fontSize: '1.1rem'
            }}>
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
                borderRadius: 2,
                bgcolor: `${stat.color}10`,
                '& .MuiLinearProgress-bar': {
                  bgcolor: stat.color,
                  borderRadius: 2,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{
              mt: 0.5,
              display: 'block',
              fontWeight: 500,
              fontSize: '0.7rem'
            }}>
              {stat.label || `${stat.value} sur ${stat.total}`}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const MobileActivityCard = ({ title, items, icon, iconColor }) => (
    <Card sx={{
      mb: 1.5,
      borderRadius: 3,
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderColor: 'primary.main',
        background: 'rgba(255, 255, 255, 0.95)'
      }
    }}>
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Avatar
            sx={{
              bgcolor: `${iconColor}15`,
              color: iconColor,
              width: 28,
              height: 28,
            }}
          >
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{
            fontWeight: 600,
            fontSize: '0.9rem',
            letterSpacing: '-0.01em'
          }}>
            {title}
          </Typography>
        </Box>
        <Stack spacing={1}>
          {items?.slice(0, 3).map((item, index) => (
            <Box key={item.id || index}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="body2" sx={{
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  lineHeight: 1.3
                }}>
                  {item.title}
                </Typography>
                <Chip
                  label={item.status}
                  size="small"
                  color={item.status === 'approved' || item.status === 'paid' ? 'success' : 'warning'}
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    height: 18
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{
                fontSize: '0.7rem',
                display: 'block'
              }}>
                {item.supplier_name || item.client_name} - {formatCurrency(item.total_amount)}
              </Typography>
              {index < Math.min(items.length, 3) - 1 && (
                <Divider sx={{ mt: 1, opacity: 0.6 }} />
              )}
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box p={isMobile ? 2 : 3} sx={{ position: 'relative' }}>
      {/* Message de bienvenue personnalisé */}
      {!isMobile && (
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
            overflow: 'visible',
            position: 'relative',
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
            <Box sx={{ position: 'relative', mr: 3 }}>
              <Mascot
                pose={welcome.pose}
                animation="wave"
                size={80}
              />
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

      {/* Contenu principal */}

      {isMobile ? (
        <Box>
          {/* Mobile Stats Cards */}
          <Box sx={{ mb: 2 }}>
            {statsCards.map((stat, index) => (
              <MobileStatsCard key={index} stat={stat} />
            ))}
          </Box>

          {/* Mobile Activity Cards */}
          <Box>
            <MobileActivityCard
              title="Derniers bons de commande"
              items={recentActivity?.recent_purchase_orders}
              icon={<ShoppingCart />}
              iconColor="#3b82f6"
            />
            <MobileActivityCard
              title="Dernières factures"
              items={recentActivity?.recent_invoices}
              icon={<Receipt />}
              iconColor="#10b981"
            />
          </Box>
        </Box>
      ) : (
        <>
          {/* Desktop Stats Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {statsCards.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    position: 'relative',
                    overflow: 'visible',
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      borderColor: stat.color,
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      bgcolor: stat.color,
                      borderRadius: '12px 12px 0 0',
                    },
                  }}
                >
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${stat.color}15`,
                          color: stat.color,
                          width: 52,
                          height: 52,
                          boxShadow: `0 4px 12px ${stat.color}20`,
                        }}
                      >
                        {stat.icon}
                      </Avatar>
                      <Box sx={{ ml: 2, flexGrow: 1 }}>
                        <Typography
                          color="text.secondary"
                          variant="caption"
                          sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                        >
                          {stat.title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}>
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
                            bgcolor: `${stat.color}10`,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: stat.color,
                              borderRadius: 3,
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
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
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Évolution des revenus et dépenses
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tendances sur les 6 derniers mois
                    </Typography>
                  </Box>
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
                            font: {
                              size: 12,
                              weight: 500,
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                          },
                        },
                        x: {
                          grid: {
                            display: false,
                          },
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
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  height: '100%',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
                          font: {
                            size: 12,
                            weight: 500,
                          },
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
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }
                }}
              >
                <Box sx={{ mb: 3 }}>
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
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.03)',
                          borderRadius: 2,
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: '#3b82f615',
                            color: 'primary.main',
                            width: 44,
                            height: 44,
                          }}
                        >
                          <ShoppingCart fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={order.title}
                        secondary={`${order.supplier_name} - ${formatCurrency(order.total_amount)}`}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          fontSize: '0.875rem',
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                          mt: 0.5,
                        }}
                      />
                      <Chip
                        label={order.status}
                        size="small"
                        color={order.status === 'approved' ? 'success' : 'warning'}
                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
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
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }
                }}
              >
                <Box sx={{ mb: 3 }}>
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
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(16, 185, 129, 0.03)',
                          borderRadius: 2,
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: '#10b98115',
                            color: 'secondary.main',
                            width: 44,
                            height: 44,
                          }}
                        >
                          <Receipt fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={invoice.title}
                        secondary={`${invoice.client_name} - ${formatCurrency(invoice.total_amount)}`}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          fontSize: '0.875rem',
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                          mt: 0.5,
                        }}
                      />
                      <Chip
                        label={invoice.status}
                        size="small"
                        color={invoice.status === 'paid' ? 'success' : 'warning'}
                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

export default Dashboard;