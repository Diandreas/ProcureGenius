import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Container, Paper, alpha } from '@mui/material';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import {
  Science as ScienceIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import StatCard from '../components/analytics/StatCard';
import DateRangeSelector from '../components/analytics/DateRangeSelector';
import healthcareAnalyticsAPI from '../services/healthcareAnalyticsAPI';
import inventoryAnalyticsAPI from '../services/inventoryAnalyticsAPI';
import dayjs from 'dayjs';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setContextualActions } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [healthcareStats, setHealthcareStats] = useState({});
  const [inventoryStats, setInventoryStats] = useState({});
  const [dateRange, setDateRange] = useState({
    start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD')
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  useEffect(() => {
    // Configure top nav bar actions
    if (setContextualActions) {
      setContextualActions({
        actions: [
          {
            component: (
              <DateRangeSelector
                startDate={dateRange.start_date}
                endDate={dateRange.end_date}
                onChange={handleDateRangeChange}
              />
            )
          }
        ]
      });
    }

    return () => {
      if (setContextualActions) {
        setContextualActions(null);
      }
    };
  }, [setContextualActions, dateRange]);

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [healthcareData, inventoryData] = await Promise.all([
        healthcareAnalyticsAPI.getDashboardStats(dateRange),
        inventoryAnalyticsAPI.getDashboardStats(dateRange)
      ]);
      setHealthcareStats(healthcareData);
      setInventoryStats(inventoryData);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box mb={5}>
          <Typography
            variant="h3"
            fontWeight="800"
            sx={{
              background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            {t('dashboard.title', 'Tableau de Bord')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vue d'ensemble de votre activité
          </Typography>
        </Box>

        {/* Healthcare Module */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            background: theme => `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.05)} 0%, ${alpha(theme.palette.error.light, 0.02)} 100%)`,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <ScienceIcon sx={{ fontSize: 32, color: 'error.main', mr: 1.5 }} />
            <Typography variant="h5" fontWeight="700" color="error.main">
              Module Santé & Laboratoire
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Examens Aujourd'hui"
                value={loading ? '...' : healthcareStats.exams_today || 0}
                icon={<ScheduleIcon />}
                color="#ef4444"
                onClick={() => navigate('/healthcare/laboratory')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Examens Cette Semaine"
                value={loading ? '...' : healthcareStats.exams_week || 0}
                icon={<TrendingUpIcon />}
                color="#f59e0b"
                onClick={() => navigate('/healthcare/laboratory')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Examens Ce Mois"
                value={loading ? '...' : healthcareStats.exams_month || 0}
                icon={<ScienceIcon />}
                color="#10b981"
                onClick={() => navigate('/healthcare/analytics')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Résultats en Attente"
                value={loading ? '...' : healthcareStats.pending_results || 0}
                icon={<WarningIcon />}
                color="#f59e0b"
                onClick={() => navigate('/healthcare/laboratory')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Examens Terminés (Mois)"
                value={loading ? '...' : healthcareStats.completed_month || 0}
                icon={<CheckCircleIcon />}
                color="#10b981"
                onClick={() => navigate('/healthcare/analytics')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Montant Moyen Examen"
                value={loading ? '...' : formatCurrency(healthcareStats.avg_exam_amount || 0)}
                icon={<MoneyIcon />}
                color="#2563eb"
                onClick={() => navigate('/healthcare/analytics')}
                loading={loading}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Inventory Module */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <InventoryIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1.5 }} />
            <Typography variant="h5" fontWeight="700" color="primary.main">
              Module Inventaire & Stock
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Produits Stock Bas"
                value={loading ? '...' : inventoryStats.low_stock_count || 0}
                icon={<WarningIcon />}
                color="#f59e0b"
                onClick={() => navigate('/inventory/analytics/reorder')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Produits à Commander"
                value={loading ? '...' : inventoryStats.reorder_count || 0}
                icon={<TrendingUpIcon />}
                color="#ef4444"
                onClick={() => navigate('/inventory/analytics/reorder')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Mouvements Aujourd'hui"
                value={loading ? '...' : inventoryStats.movements_today || 0}
                icon={<InventoryIcon />}
                color="#10b981"
                onClick={() => navigate('/inventory/analytics/movements')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Valeur Stock Total"
                value={loading ? '...' : formatCurrency(inventoryStats.inventory_value || 0)}
                icon={<MoneyIcon />}
                color="#2563eb"
                onClick={() => navigate('/inventory/analytics')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Produits Épuisés"
                value={loading ? '...' : inventoryStats.out_of_stock || 0}
                icon={<WarningIcon />}
                color="#ef4444"
                onClick={() => navigate('/inventory/analytics/at-risk')}
                loading={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Voir Toutes Stats Stock"
                value="→"
                icon={<InventoryIcon />}
                color="#8b5cf6"
                onClick={() => navigate('/inventory/analytics')}
                subtitle="Analyses détaillées"
                loading={loading}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Quick Actions Info */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            background: theme => alpha(theme.palette.info.main, 0.05),
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3
          }}
        >
          <Typography variant="body2" color="text.secondary" textAlign="center">
            💡 Cliquez sur une carte pour accéder aux analyses détaillées et aux filtres avancés
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard;
