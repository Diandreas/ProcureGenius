import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Typography, Container, Paper, alpha, Tabs, Tab, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress
} from '@mui/material';
import { SafeTab } from '../components/safe';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  MedicalServices as MedicalIcon,
  AccessTime as ClockIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import StatCard from '../components/analytics/StatCard';
import DateRangeSelector from '../components/analytics/DateRangeSelector';
import BatchAlertCard from '../components/inventory/BatchAlertCard';
import { LabOrdersStatusWidget, LabTurnaroundWidget } from '../components/widgets/healthcare';
import healthcareAnalyticsAPI from '../services/healthcareAnalyticsAPI';
import inventoryAnalyticsAPI from '../services/inventoryAnalyticsAPI';
import api from '../services/api';
import dayjs from 'dayjs';

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(value || 0);

const formatHours = (h) => {
  if (h === null || h === undefined) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
};

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const ACTIVITY_LABELS = {
  healthcare_consultation: 'Consultation',
  healthcare_laboratory: 'Laboratoire',
  healthcare_pharmacy: 'Médicaments',
  standard: 'Soins / Chirurgie / Hosp.',
};

const QuickLink = ({ title, description, icon, color, to, navigate }) => (
  <Paper
    elevation={0}
    onClick={() => navigate(to)}
    sx={{
      p: 2, display: 'flex', alignItems: 'center', gap: 2,
      cursor: 'pointer', border: '1px solid', borderColor: 'divider', borderRadius: 2,
      transition: 'all 0.2s ease',
      '&:hover': { borderColor: color, transform: 'translateY(-1px)', boxShadow: t => `0 4px 12px ${alpha(color, 0.15)}` }
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

const SectionTitle = ({ children }) => (
  <Typography variant="h6" fontWeight="700" mb={2} mt={1}>{children}</Typography>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabValue = parseInt(searchParams.get('tab') || '0', 10);
  const handleTabChange = (e, v) => setSearchParams({ tab: v });

  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [labServiceData, setLabServiceData] = useState(null);  // CA labo par catégorie
  const [labStageData, setLabStageData] = useState(null);
  const [demographicsData, setDemographicsData] = useState(null);
  const [inventoryStats, setInventoryStats] = useState({});
  const [unifiedData, setUnifiedData] = useState(null);

  const [dateRange, setDateRange] = useState({
    start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  });

  useEffect(() => { fetchStats(); }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [activity, revenue, labService, labStage, demographics, inventory, unified] = await Promise.all([
        healthcareAnalyticsAPI.getActivityIndicators(dateRange).catch(() => null),
        healthcareAnalyticsAPI.getEnhancedRevenue({ ...dateRange, period: 'month' }).catch(() => null),
        // Catégories labo uniquement (invoice_type=healthcare_laboratory)
        healthcareAnalyticsAPI.getServiceRevenue({ ...dateRange, invoice_type: 'healthcare_laboratory' }).catch(() => null),
        healthcareAnalyticsAPI.getLabStageTiming(dateRange).catch(() => null),
        healthcareAnalyticsAPI.getDemographics(dateRange).catch(() => null),
        inventoryAnalyticsAPI.getDashboardStats(dateRange).catch(() => ({})),
        api.get(`/analytics/unified-dashboard/?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`)
          .then(r => r.data).catch(() => null),
      ]);
      setActivityData(activity);
      setRevenueData(revenue);
      setLabServiceData(labService);
      setLabStageData(labStage);
      setDemographicsData(demographics);
      setInventoryStats(inventory);
      setUnifiedData(unified);
    } finally {
      setLoading(false);
    }
  };

  // Derived data
  const stockData = unifiedData?.stock || {};
  const financial = activityData?.financial || {};
  const actVol = activityData?.activity_volume || {};
  const perf = activityData?.performance || {};
  const patients = activityData?.patients || {};

  // Revenue by activity (from enhanced revenue)
  const byActivity = revenueData?.by_activity || [];

  // Catégories labo — déjà filtrées par invoice_type=healthcare_laboratory côté backend
  const labCategories = (labServiceData?.by_category || []);

  // Revenue timeline for chart
  const revenueTimeline = financial?.revenue_timeline || [];

  // Demographics charts
  const genderData = (demographicsData?.by_gender || []).map(item => ({
    name: item.gender === 'M' ? 'Homme' : item.gender === 'F' ? 'Femme' : 'Non spécifié',
    value: item.count,
  }));
  const ageData = (demographicsData?.by_age_group || []).map(item => ({
    name: item.age_group,
    count: item.count,
  }));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box mb={3} display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h3" fontWeight="800"
              sx={{ background: t => `linear-gradient(45deg, ${t.palette.primary.main}, ${t.palette.primary.light})`, backgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
              {t('dashboard.title', 'Tableau de Bord')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dateRange.start_date} → {dateRange.end_date}
            </Typography>
          </Box>
          <DateRangeSelector
            startDate={dateRange.start_date}
            endDate={dateRange.end_date}
            onChange={setDateRange}
          />
        </Box>

        {/* Tabs */}
        <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
            <SafeTab icon={<AssessmentIcon />} iconPosition="start" label="Activité" sx={{ minHeight: 48 }} />
            <SafeTab icon={<MoneyIcon />} iconPosition="start" label="Revenus" sx={{ minHeight: 48 }} />
            <SafeTab icon={<ScienceIcon />} iconPosition="start" label="Laboratoire" sx={{ minHeight: 48 }} />
            <SafeTab icon={<PeopleIcon />} iconPosition="start" label="Démographie" sx={{ minHeight: 48 }} />
            <SafeTab icon={<InventoryIcon />} iconPosition="start" label="Stock & Alertes" sx={{ minHeight: 48 }} />
          </Tabs>
        </Paper>

        {/* ── TAB 0 : ACTIVITÉ ── */}
        {tabValue === 0 && (
          <>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Chiffre d'Affaires" value={loading ? '...' : formatCurrency(financial.total_revenue)}
                  icon={<MoneyIcon />} color="#2563eb" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Consultations" value={loading ? '...' : actVol?.consultations?.total ?? 0}
                  icon={<MedicalIcon />} color="#10b981" loading={loading}
                  subtitle="Sur la période sélectionnée" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Patients (période)" value={loading ? '...' : patients.total ?? 0}
                  icon={<PeopleIcon />} color="#8b5cf6" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Nouveaux Patients" value={loading ? '...' : actVol?.new_patients?.total ?? 0}
                  icon={<HospitalIcon />} color="#14b8a6" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Coût Moyen / Patient" value={loading ? '...' : formatCurrency(financial.avg_cost_per_patient)}
                  icon={<MoneyIcon />} color="#f59e0b" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Temps d'Attente Moyen" value={loading ? '...' : `${Math.round(perf.avg_wait_time_minutes ?? 0)} min`}
                  icon={<ClockIcon />} color="#ef4444" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Durée Moy. Consultation" value={loading ? '...' : `${Math.round(perf.avg_consultation_duration_minutes ?? 0)} min`}
                  icon={<ScheduleIcon />} color="#ec4899" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Actes Médicaux" value={loading ? '...' : actVol?.medical_acts?.total ?? 0}
                  icon={<AssessmentIcon />} color="#6366f1" loading={loading}
                  subtitle="Consult. + Labo + Soins" />
              </Grid>
            </Grid>

            {/* Timeline CA */}
            {revenueTimeline.length > 0 && (
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                <SectionTitle>Évolution du Chiffre d'Affaires</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={revenueTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="CA" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            )}

            {/* Consultations timeline */}
            {(actVol?.consultations?.timeline || []).length > 0 && (
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <SectionTitle>Évolution des Consultations</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={actVol.consultations.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" name="Consultations" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            )}
          </>
        )}

        {/* ── TAB 1 : REVENUS ── */}
        {tabValue === 1 && (
          <>
            {/* KPI cards */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="CA Total (factures payées)"
                  value={loading ? '...' : formatCurrency(revenueData?.total_stats?.total_revenue)}
                  icon={<MoneyIcon />} color="#2563eb" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Factures Payées"
                  value={loading ? '...' : revenueData?.total_stats?.total_invoices ?? 0}
                  icon={<CheckCircleIcon />} color="#10b981" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Montant Moyen / Facture"
                  value={loading ? '...' : formatCurrency(revenueData?.total_stats?.avg_invoice_amount)}
                  icon={<AssessmentIcon />} color="#f59e0b" loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="CA Consultations"
                  value={loading ? '...' : formatCurrency(byActivity.find(a => a.activity_type === 'healthcare_consultation')?.revenue)}
                  icon={<MedicalIcon />} color="#8b5cf6" loading={loading} />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Revenue by activity - pie + table */}
              <Grid item xs={12} md={5}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                  <SectionTitle>CA par Activité</SectionTitle>
                  {loading ? <CircularProgress size={32} /> : byActivity.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={byActivity.map(a => ({ name: ACTIVITY_LABELS[a.activity_type] || a.activity_type, value: parseFloat(a.revenue || 0) }))}
                            cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}>
                            {byActivity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={v => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Activité</TableCell>
                              <TableCell align="right">CA</TableCell>
                              <TableCell align="right">Factures</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {byActivity.map((a, i) => (
                              <TableRow key={i}>
                                <TableCell>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                                    {ACTIVITY_LABELS[a.activity_type] || a.activity_type}
                                  </Box>
                                </TableCell>
                                <TableCell align="right">{formatCurrency(a.revenue)}</TableCell>
                                <TableCell align="right">{a.count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Typography color="text.secondary" variant="body2">Aucune donnée sur la période</Typography>
                  )}
                </Paper>
              </Grid>

              {/* Lab sub-categories */}
              <Grid item xs={12} md={7}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                  <SectionTitle>CA Laboratoire par Catégorie</SectionTitle>
                  {loading ? <CircularProgress size={32} /> : (
                    <>
                      <Box mb={2}>
                        <QuickLink title="Voir détail des revenus par service" description="Analyse complète par service/produit"
                          icon={<ChartIcon />} color="#2563eb" to="/healthcare/analytics/revenue" navigate={navigate} />
                      </Box>
                      {labCategories.length > 0 ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Catégorie</TableCell>
                                <TableCell align="right">CA</TableCell>
                                <TableCell align="right">Actes</TableCell>
                                <TableCell align="right">%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {labCategories.map((c, i) => {
                                const totalLab = labCategories.reduce((s, x) => s + parseFloat(x.revenue || 0), 0);
                                const pct = totalLab > 0 ? ((parseFloat(c.revenue || 0) / totalLab) * 100).toFixed(1) : '0';
                                return (
                                  <TableRow key={i}>
                                    <TableCell>{c.category_name}</TableCell>
                                    <TableCell align="right">{formatCurrency(c.revenue)}</TableCell>
                                    <TableCell align="right">{c.count}</TableCell>
                                    <TableCell align="right">
                                      <Box display="flex" alignItems="center" gap={1}>
                                        <LinearProgress variant="determinate" value={parseFloat(pct)} sx={{ width: 40, height: 6, borderRadius: 3 }} />
                                        {pct}%
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography color="text.secondary" variant="body2">
                          Aucune catégorie labo identifiée sur la période.
                          Vérifiez la nomenclature des catégories de produits.
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </>
        )}

        {/* ── TAB 2 : LABORATOIRE ── */}
        {tabValue === 2 && (
          <>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={6}>
                <LabOrdersStatusWidget dateRange={dateRange} />
              </Grid>
              <Grid item xs={12} md={6}>
                <LabTurnaroundWidget dateRange={dateRange} />
              </Grid>
            </Grid>

            {/* Stage timing */}
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
              <SectionTitle>Délais par Étape du Processus Labo</SectionTitle>
              {loading ? <CircularProgress size={32} /> : labStageData ? (
                <>
                  <Typography variant="caption" color="text.secondary" mb={2} display="block">
                    Basé sur {labStageData.total_orders} ordres labo — {labStageData.start_date} → {labStageData.end_date}
                  </Typography>
                  <Grid container spacing={2}>
                    {(labStageData.stages || []).map((stage, i) => (
                      <Grid item xs={12} sm={6} md={3} key={stage.key}>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: alpha(COLORS[i % COLORS.length], 0.12), color: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                            <ClockIcon sx={{ fontSize: 20 }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">{stage.label}</Typography>
                          <Typography variant="h5" fontWeight="700" color={COLORS[i % COLORS.length]}>
                            {formatHours(stage.avg_hours)}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">{stage.count} ordres</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : (
                <Typography color="text.secondary" variant="body2">Aucune donnée disponible</Typography>
              )}
            </Paper>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <QuickLink title="Statut des Examens par Patient" description="Détail par patient et statut"
                  icon={<ScienceIcon />} color="#ef4444" to="/healthcare/analytics/exam-status" navigate={navigate} />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink title="Types d'Examens" description="Répartition et fréquence"
                  icon={<AssessmentIcon />} color="#f59e0b" to="/healthcare/analytics/exam-types" navigate={navigate} />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink title="File d'Attente Labo (Temps Réel)" description="Gestion des prélèvements en cours"
                  icon={<ScheduleIcon />} color="#10b981" to="/healthcare/laboratory" navigate={navigate} />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink title="Analyse Prescripteurs" description="Revenus, commissions et quote-parts"
                  icon={<PeopleIcon />} color="#7c3aed" to="/healthcare/analytics/prescribers" navigate={navigate} />
              </Grid>
            </Grid>
          </>
        )}

        {/* ── TAB 3 : DÉMOGRAPHIE ── */}
        {tabValue === 3 && (
          <>
            <Grid container spacing={3}>
              {/* Gender */}
              <Grid item xs={12} md={5}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                  <SectionTitle>Répartition par Genre</SectionTitle>
                  {loading ? <CircularProgress size={32} /> : genderData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={genderData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" variant="body2">Aucune donnée</Typography>
                  )}
                </Paper>
              </Grid>

              {/* Age groups */}
              <Grid item xs={12} md={7}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                  <SectionTitle>Répartition par Tranche d'Âge</SectionTitle>
                  {loading ? <CircularProgress size={32} /> : ageData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={ageData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563eb" name="Patients" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" variant="body2">Aucune donnée</Typography>
                  )}
                </Paper>
              </Grid>

              {/* Demographic summary table */}
              {demographicsData?.by_gender?.length > 0 && (
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <SectionTitle>Détail Démographique</SectionTitle>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Genre</TableCell>
                            <TableCell align="right">Examens</TableCell>
                            <TableCell align="right">CA</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {demographicsData.by_gender.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell>{row.gender === 'M' ? 'Homme' : row.gender === 'F' ? 'Femme' : 'Non spécifié'}</TableCell>
                              <TableCell align="right">{row.count}</TableCell>
                              <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        )}

        {/* ── TAB 4 : STOCK & ALERTES ── */}
        {tabValue === 4 && (
          <>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Produits Stock Bas"
                  value={loading ? '...' : inventoryStats.low_stock_count || 0}
                  icon={<WarningIcon />} color="#f59e0b"
                  onClick={() => navigate('/inventory/analytics/reorder')} loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Produits Épuisés"
                  value={loading ? '...' : inventoryStats.out_of_stock || 0}
                  icon={<WarningIcon />} color="#ef4444"
                  onClick={() => navigate('/inventory/analytics/at-risk')} loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Lots Expirants"
                  value={loading ? '...' : stockData.expiring_batches || 0}
                  icon={<ScheduleIcon />} color="#ef4444"
                  onClick={() => navigate('/inventory/analytics/at-risk')} loading={loading} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Valeur Stock"
                  value={loading ? '...' : formatCurrency(inventoryStats.inventory_value)}
                  icon={<MoneyIcon />} color="#2563eb"
                  onClick={() => navigate('/inventory/analytics')} loading={loading} />
              </Grid>
            </Grid>

            <Box mb={3}>
              <BatchAlertCard days={30} />
            </Box>

            <SectionTitle>Analyses Détaillées Stock</SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <QuickLink title="Analyse Wilson QEC" description="Quantité économique de commande"
                  icon={<CalcIcon />} color="#2563eb" to="/inventory/analytics/wilson-eoq" navigate={navigate} />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink title="Restockage Prédictif" description="Anticipation des ruptures"
                  icon={<ShippingIcon />} color="#ef4444" to="/inventory/analytics/predictive-restock" navigate={navigate} />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink title="Statistiques Consommation" description="Tendances par produit"
                  icon={<ChartIcon />} color="#10b981" to="/inventory/analytics/consumption" navigate={navigate} />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink title="Réapprovisionnement" description="Produits à commander"
                  icon={<InventoryIcon />} color="#f59e0b" to="/inventory/analytics/reorder" navigate={navigate} />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink title="Risque Rupture Stock" description="Analyse des risques"
                  icon={<WarningIcon />} color="#ef4444" to="/inventory/analytics/stockout-risk" navigate={navigate} />
              </Grid>
              <Grid item xs={12} md={6}>
                <QuickLink title="Mouvements de Stock" description="Historique entrées/sorties"
                  icon={<TrendingUpIcon />} color="#8b5cf6" to="/inventory/analytics/movements" navigate={navigate} />
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Dashboard;
