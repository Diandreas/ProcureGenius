import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Typography, Container, Paper, alpha, Tabs, Chip, Stack
} from '@mui/material';
import { SafeTab } from '../components/safe';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Science as ScienceIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  ArrowForward as ArrowForwardIcon,
  Dashboard as DashboardIcon,
  LocalShipping as ShippingIcon,
  Calculate as CalcIcon,
  ShowChart as ChartIcon,
  People as PeopleIcon,
  MedicalServices as MedicalIcon
} from '@mui/icons-material';
import StatCard from '../components/analytics/StatCard';
import DateRangeSelector from '../components/analytics/DateRangeSelector';
import BatchAlertCard from '../components/inventory/BatchAlertCard';
import healthcareAnalyticsAPI from '../services/healthcareAnalyticsAPI';
import inventoryAnalyticsAPI from '../services/inventoryAnalyticsAPI';
import api from '../services/api';
import dayjs from 'dayjs';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(value || 0);
};

// Quick link card to navigate to detailed pages
const QuickLink = ({ title, description, icon, color, to, navigate }) => (
  <Paper
    elevation={0}
    onClick={() => navigate(to)}
    sx={{
      p: 2, display: 'flex', alignItems: 'center', gap: 2,
      cursor: 'pointer', border: '1px solid', borderColor: 'divider', borderRadius: 2,
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: color, transform: 'translateY(-1px)',
        boxShadow: t => `0 4px 12px ${alpha(color, 0.15)}`
      }
    }}
  >
    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(color, 0.1) }}>
      {React.cloneElement(icon, { sx: { fontSize: 24, color } })}
    </Box>
    <Box flex={1}>
      <Typography variant="subtitle2" fontWeight="700">{title}</Typography>
      <Typography variant="caption" color="text.secondary">{description}</Typography>
    </Box>
    <ArrowForwardIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
  </Paper>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setContextualActions } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [healthcareStats, setHealthcareStats] = useState({});
  const [inventoryStats, setInventoryStats] = useState({});
  const [unifiedData, setUnifiedData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD')
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  useEffect(() => {
    if (setContextualActions) {
      setContextualActions({
        actions: [{
          component: (
            <DateRangeSelector
              startDate={dateRange.start_date}
              endDate={dateRange.end_date}
              onChange={handleDateRangeChange}
            />
          )
        }]
      });
    }
    return () => { if (setContextualActions) setContextualActions(null); };
  }, [setContextualActions, dateRange]);

  const handleDateRangeChange = (newRange) => setDateRange(newRange);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [healthcareData, inventoryData, unified] = await Promise.all([
        healthcareAnalyticsAPI.getDashboardStats(dateRange).catch(() => ({})),
        inventoryAnalyticsAPI.getDashboardStats(dateRange).catch(() => ({})),
        api.get(`/analytics/unified-dashboard/?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`)
          .then(r => r.data).catch(() => null)
      ]);
      setHealthcareStats(healthcareData);
      setInventoryStats(inventoryData);
      setUnifiedData(unified);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const overview = unifiedData?.overview || {};
  const stockData = unifiedData?.stock || {};
  const healthData = unifiedData?.healthcare || {};
  const financeData = unifiedData?.finance || {};

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box mb={4}>
          <Typography
            variant="h3" fontWeight="800"
            sx={{
              background: t => `linear-gradient(45deg, ${t.palette.primary.main}, ${t.palette.primary.light})`,
              backgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1
            }}
          >
            {t('dashboard.title', 'Tableau de Bord')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vue d'ensemble de votre activite
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
            <SafeTab
              icon={<DashboardIcon />}
              iconPosition="start"
              label="Vue d'ensemble"
              sx={{ minHeight: 48 }}
            />
            <SafeTab
              icon={<InventoryIcon />}
              iconPosition="start"
              label="Stock & Alertes"
              sx={{ minHeight: 48 }}
            />
            <SafeTab
              icon={<MedicalIcon />}
              iconPosition="start"
              label="Sante & Labo"
              sx={{ minHeight: 48 }}
            />
            <SafeTab
              icon={<MoneyIcon />}
              iconPosition="start"
              label="Finances"
              sx={{ minHeight: 48 }}
            />
          </Tabs>
        </Paper>

        {/* Tab 0: Overview */}
        {tabValue === 0 && (
          <>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Chiffre d'Affaires"
                  value={loading ? '...' : formatCurrency(overview.revenue_period)}
                  icon={<MoneyIcon />} color="#2563eb"
                  onClick={() => navigate('/healthcare/analytics/revenue')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Consultations Aujourd'hui"
                  value={loading ? '...' : overview.consultations_today || 0}
                  icon={<MedicalIcon />} color="#10b981"
                  onClick={() => navigate('/healthcare/analytics/activity-indicators')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Examens Aujourd'hui"
                  value={loading ? '...' : overview.exams_today || 0}
                  icon={<ScienceIcon />} color="#ef4444"
                  onClick={() => navigate('/healthcare/laboratory')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Stock Bas"
                  value={loading ? '...' : overview.low_stock_count || 0}
                  icon={<WarningIcon />} color="#f59e0b"
                  onClick={() => navigate('/inventory/analytics/reorder')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Lots Expirants"
                  value={loading ? '...' : overview.expiring_batches || 0}
                  icon={<ScheduleIcon />} color="#ef4444"
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Alertes Predictives"
                  value={loading ? '...' : overview.critical_alerts || 0}
                  icon={<ShippingIcon />} color="#8b5cf6"
                  onClick={() => navigate('/inventory/analytics/predictive-restock')}
                  loading={loading}
                  subtitle="Produits critiques/urgents"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Mouvements Aujourd'hui"
                  value={loading ? '...' : overview.movements_today || 0}
                  icon={<TrendingUpIcon />} color="#10b981"
                  onClick={() => navigate('/inventory/analytics/movements')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Indicateurs d'Activite"
                  value={<ArrowForwardIcon />}
                  icon={<AssessmentIcon />} color="#14b8a6"
                  onClick={() => navigate('/healthcare/analytics/activity-indicators')}
                  loading={loading}
                  subtitle="Voir les indicateurs detailles"
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* Tab 1: Stock & Alerts */}
        {tabValue === 1 && (
          <>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Produits Stock Bas"
                  value={loading ? '...' : inventoryStats.low_stock_count || 0}
                  icon={<WarningIcon />} color="#f59e0b"
                  onClick={() => navigate('/inventory/analytics/reorder')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Produits Epuises"
                  value={loading ? '...' : inventoryStats.out_of_stock || 0}
                  icon={<WarningIcon />} color="#ef4444"
                  onClick={() => navigate('/inventory/analytics/at-risk')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Lots Expirants"
                  value={loading ? '...' : stockData.expiring_batches || 0}
                  icon={<ScheduleIcon />} color="#ef4444"
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Valeur Stock"
                  value={loading ? '...' : formatCurrency(inventoryStats.inventory_value)}
                  icon={<MoneyIcon />} color="#2563eb"
                  onClick={() => navigate('/inventory/analytics')}
                  loading={loading}
                />
              </Grid>
            </Grid>

            {/* Batch alerts */}
            <Box mb={3}>
              <BatchAlertCard days={30} />
            </Box>

            {/* Quick links */}
            <Typography variant="h6" fontWeight="700" mb={2}>Analyses detaillees</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Analyse Wilson QEC" description="Quantite economique de commande"
                  icon={<CalcIcon />} color="#2563eb" to="/inventory/analytics/wilson-eoq" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Restockage Predictif" description="Anticipation des ruptures"
                  icon={<ShippingIcon />} color="#ef4444" to="/inventory/analytics/predictive-restock" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Statistiques Consommation" description="Tendances par produit"
                  icon={<ChartIcon />} color="#10b981" to="/inventory/analytics/consumption" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Reapprovisionnement" description="Produits a commander"
                  icon={<InventoryIcon />} color="#f59e0b" to="/inventory/analytics/reorder" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Risque Rupture Stock" description="Analyse des risques"
                  icon={<WarningIcon />} color="#ef4444" to="/inventory/analytics/stockout-risk" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Mouvements de Stock" description="Historique entrees/sorties"
                  icon={<TrendingUpIcon />} color="#8b5cf6" to="/inventory/analytics/movements" navigate={navigate}
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* Tab 2: Health & Lab */}
        {tabValue === 2 && (
          <>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Examens Aujourd'hui"
                  value={loading ? '...' : healthcareStats.exams_today || 0}
                  icon={<ScheduleIcon />} color="#ef4444"
                  onClick={() => navigate('/healthcare/laboratory')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Resultats en Attente"
                  value={loading ? '...' : healthcareStats.pending_results || 0}
                  icon={<WarningIcon />} color="#f59e0b"
                  onClick={() => navigate('/healthcare/laboratory')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Examens Ce Mois"
                  value={loading ? '...' : healthcareStats.exams_month || 0}
                  icon={<ScienceIcon />} color="#10b981"
                  onClick={() => navigate('/healthcare/analytics')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Examens Termines (Mois)"
                  value={loading ? '...' : healthcareStats.completed_month || 0}
                  icon={<CheckCircleIcon />} color="#10b981"
                  onClick={() => navigate('/healthcare/analytics')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Montant Moyen Examen"
                  value={loading ? '...' : formatCurrency(healthcareStats.avg_exam_amount)}
                  icon={<MoneyIcon />} color="#2563eb"
                  onClick={() => navigate('/healthcare/analytics')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Examens Semaine"
                  value={loading ? '...' : healthcareStats.exams_week || 0}
                  icon={<TrendingUpIcon />} color="#f59e0b"
                  onClick={() => navigate('/healthcare/laboratory')}
                  loading={loading}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" fontWeight="700" mb={2}>Analyses detaillees</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Indicateurs d'Activite" description="Consultations, patients, performance"
                  icon={<AssessmentIcon />} color="#14b8a6" to="/healthcare/analytics/activity-indicators" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Statut Examens" description="Par patient et par statut"
                  icon={<ScienceIcon />} color="#ef4444" to="/healthcare/analytics/exam-status" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Types d'Examens" description="Repartition par type"
                  icon={<ScienceIcon />} color="#f59e0b" to="/healthcare/analytics/exam-types" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Demographiques" description="Analyse patients"
                  icon={<PeopleIcon />} color="#8b5cf6" to="/healthcare/analytics/demographics" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Revenus Sante" description="Analyse financiere"
                  icon={<MoneyIcon />} color="#2563eb" to="/healthcare/analytics/revenue" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Revenus par Service" description="Detail par service"
                  icon={<MoneyIcon />} color="#10b981" to="/healthcare/analytics/services" navigate={navigate}
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* Tab 3: Finances */}
        {tabValue === 3 && (
          <>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Revenus Periode"
                  value={loading ? '...' : formatCurrency(financeData.revenue_period)}
                  icon={<MoneyIcon />} color="#2563eb"
                  onClick={() => navigate('/healthcare/analytics/revenue')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Valeur Stock Total"
                  value={loading ? '...' : formatCurrency(inventoryStats.inventory_value)}
                  icon={<InventoryIcon />} color="#10b981"
                  onClick={() => navigate('/inventory/analytics')}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Montant Moyen Examen"
                  value={loading ? '...' : formatCurrency(healthcareStats.avg_exam_amount)}
                  icon={<ScienceIcon />} color="#f59e0b"
                  onClick={() => navigate('/healthcare/analytics')}
                  loading={loading}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" fontWeight="700" mb={2}>Analyses financieres</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Revenus Detailles" description="Analyse revenus par periode"
                  icon={<MoneyIcon />} color="#2563eb" to="/healthcare/analytics/revenue" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Revenus par Service" description="Performance par service"
                  icon={<MoneyIcon />} color="#10b981" to="/healthcare/analytics/services" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Valeur Stock" description="Analyse de la valeur du stock"
                  icon={<InventoryIcon />} color="#8b5cf6" to="/inventory/analytics" navigate={navigate}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink
                  title="Indicateurs Complets" description="Tous les indicateurs en detail"
                  icon={<AssessmentIcon />} color="#14b8a6" to="/healthcare/analytics/activity-indicators" navigate={navigate}
                />
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Dashboard;
