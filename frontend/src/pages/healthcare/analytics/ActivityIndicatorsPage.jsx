import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Container, Card, CardContent,
  Stack, Chip, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Divider, IconButton, Tooltip as MuiTooltip,
  LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowBack as BackIcon,
  AccessTime as WaitIcon,
  Timer as TimerIcon,
  LocalHospital as ConsultIcon,
  Science as LabIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  MedicalServices as MedicalIcon,
  Healing as CareIcon,
  Assessment as AssessmentIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import FilterPanel from '../../../components/analytics/FilterPanel';
import StatCard from '../../../components/analytics/StatCard';
import { LabTurnaroundWidget, LabOrdersStatusWidget } from '../../../components/widgets/healthcare';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import { formatDate } from '../../../utils/formatters';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const formatCurrency = (val) => {
  if (!val && val !== 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
};

const formatFullDate = (val) => formatDate(val);

const SectionHeader = ({ title, subtitle, icon: Icon }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, mt: 3 }}>
    <Box sx={{ 
      p: 1, 
      borderRadius: '12px', 
      bgcolor: 'primary.main', 
      color: 'white',
      display: 'flex',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
    }}>
      {Icon && <Icon sx={{ fontSize: 24 }} />}
    </Box>
    <Box>
      <Typography variant="h6" fontWeight="700">{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
  </Box>
);

const ActivityIndicatorsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');
  const [filters, setFilters] = useState({ start_date: null, end_date: null });
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await healthcareAnalyticsAPI.getActivityIndicators({ ...filters, period });
      setData(result);
    } catch (err) {
      console.error('Error fetching activity indicators:', err);
      setError('Erreur lors du chargement des indicateurs.');
    } finally {
      setLoading(false);
    }
  }, [filters, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract data
  const av = data?.activity_volume || {};
  const perf = data?.performance || {};
  const fin = data?.financial || {};

  const numConsultations = av.consultations?.total || 0;
  const consultTimeline = av.consultations?.timeline || [];
  const newPatients = av.new_patients?.total || 0;
  const patientsTimeline = av.new_patients?.timeline || [];
  const totalActs = av.medical_acts?.total || 0;
  const actsConsult = av.medical_acts?.consultations || 0;
  const actsLab = av.medical_acts?.lab_orders || 0;
  const actsCare = av.medical_acts?.nursing_care || 0;

  const avgWait = perf.avg_wait_time_minutes || 0;
  const avgDuration = perf.avg_consultation_duration_minutes || 0;
  const visitsTracked = perf.total_visits_tracked || 0;

  const totalRevenue = fin.total_revenue || 0;
  const consultRevenue = fin.consultation_revenue || 0;
  const labRevenue = fin.lab_revenue || 0;
  const avgConsultCost = fin.avg_consultation_cost || 0;
  const avgLabCost = fin.avg_lab_cost || 0;
  const avgCostPerAct = fin.avg_cost_per_act || 0;
  const revenueTimeline = fin.revenue_timeline || [];

  // Build combined timeline for consultations + patients
  const combinedActivityTimeline = (() => {
    const map = {};
    consultTimeline.forEach(item => {
      map[item.date] = { ...map[item.date], date: item.date, consultations: item.count };
    });
    patientsTimeline.forEach(item => {
      map[item.date] = { ...map[item.date], date: item.date, nouveaux_patients: item.count };
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Pie data for medical acts
  const actsBreakdown = [
    { name: 'Consultations', value: actsConsult, color: COLORS[0] },
    { name: 'Examens labo', value: actsLab, color: COLORS[1] },
    { name: 'Soins infirmiers', value: actsCare, color: COLORS[2] }
  ].filter(d => d.value > 0);

  // Revenue pie data
  const revenuePie = [
    { name: 'Consultations', value: consultRevenue, color: COLORS[0] },
    { name: 'Laboratoire', value: labRevenue, color: COLORS[1] }
  ].filter(d => d.value > 0);

  const periodLabel = period === 'day' ? "Aujourd'hui" : period === 'week' ? 'les 7 derniers jours' : 'les 30 derniers jours';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
      <Container maxWidth="xl">
        <Breadcrumbs />
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => navigate('/healthcare/analytics')} sx={{ bgcolor: 'action.hover' }}>
              <BackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight="700" color="primary.main">
                Indicateurs de Suivi d'Activite
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vue complète des performances de votre établissement
              </Typography>
            </Box>
          </Stack>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Période</InputLabel>
            <Select value={period} label="Période" onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value="day">Aujourd'hui</MenuItem>
              <MenuItem value="week">7 derniers jours</MenuItem>
              <MenuItem value="month">30 derniers jours</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Date Filters */}
        <FilterPanel filters={filters} onChange={setFilters} showDateRange={true} />

        {/* Period info */}
        {data && !loading && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }} icon={<InfoIcon />}>
            Période analysée : du <strong>{formatFullDate(data.start_date)}</strong> au <strong>{formatFullDate(data.end_date)}</strong>
          </Alert>
        )}

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Chargement des indicateurs...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {/* ========== SECTION 1: ACTIVITE ET VOLUME ========== */}
            <SectionHeader
              title="Indicateurs d'Activité et de Volume"
              subtitle="Suivi des volumes de consultations, patients et actes médicaux"
              icon={AssessmentIcon}
            />

            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Consultations"
                  value={numConsultations}
                  icon={<ConsultIcon />}
                  color="#2563eb"
                  subtitle={`Total sur la période`}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Nouveaux Patients"
                  value={newPatients}
                  icon={<PeopleIcon />}
                  color="#f59e0b"
                  subtitle="Première visite enregistrée"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Total Actes Médicaux"
                  value={totalActs}
                  icon={<MedicalIcon />}
                  color="#06b6d4"
                  subtitle={`${actsConsult} consult. | ${actsLab} labo | ${actsCare} soins`}
                />
              </Grid>
            </Grid>

            {/* Activity timeline chart */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, borderRadius: '16px', boxShadow: t => t.palette.mode === 'light' ? '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff' : '8px 8px 16px #0f1419, -8px -8px 16px #2d3340' }}>
                  <Typography variant="subtitle1" fontWeight="700" mb={2}>
                    Évolution quotidienne - Consultations & Patients
                  </Typography>
                  {combinedActivityTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={combinedActivityTimeline}>
                        <defs>
                          <linearGradient id="colorConsult" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#94a3b8', 0.1)} />
                        <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} labelFormatter={formatFullDate} />
                        <Legend iconType="circle" />
                        <Area type="monotone" dataKey="consultations" name="Consultations" stroke="#2563eb" fillOpacity={1} fill="url(#colorConsult)" strokeWidth={3} />
                        <Area type="monotone" dataKey="nouveaux_patients" name="Nouveaux patients" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPatients)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Aucune donnée disponible</Typography>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%', borderRadius: '16px', boxShadow: t => t.palette.mode === 'light' ? '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff' : '8px 8px 16px #0f1419, -8px -8px 16px #2d3340' }}>
                  <Typography variant="subtitle1" fontWeight="700" mb={2}>
                    Répartition des Actes
                  </Typography>
                  {actsBreakdown.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={actsBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                            {actsBreakdown.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <Stack spacing={1.5} mt={2}>
                        {actsBreakdown.map((item, idx) => (
                          <Box key={`act-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: item.color }} />
                              <Typography variant="body2" fontWeight="500">{item.name}</Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight="700">{item.value}</Typography>
                          </Box>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight="700">Total cumulé</Typography>
                          <Typography variant="body2" fontWeight="800" color="primary.main">{totalActs}</Typography>
                        </Box>
                      </Stack>
                    </>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Aucun acte enregistré</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* ========== SECTION 2: PERFORMANCE ET EFFICIENCE ========== */}
            <SectionHeader
              title="Performance et Efficience"
              subtitle="Mesure de la qualité et rapidité de prise en charge"
              icon={TimerIcon}
            />

            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={6}>
                <StatCard
                  title="Temps d'Attente Moyen"
                  value={avgWait > 0 ? `${Math.round(avgWait)} min` : '0 min'}
                  icon={<WaitIcon />}
                  color="#ef4444"
                  subtitle={`Basé sur ${visitsTracked} visites suivies`}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StatCard
                  title="Durée Moyenne Consultation"
                  value={avgDuration > 0 ? `${Math.round(avgDuration)} min` : '0 min'}
                  icon={<TimerIcon />}
                  color="#6366f1"
                  subtitle="Temps moyen effectif avec le médecin"
                />
              </Grid>
            </Grid>

            {/* ========== SECTION 2b: LABORATOIRE - DELAIS PAR TEST ========== */}
            <SectionHeader
              title="Laboratoire - Délais par Test"
              subtitle="Temps de traitement réel vs estimé pour chaque type d'examen"
              icon={LabIcon}
            />

            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={5}>
                <LabOrdersStatusWidget period={period === 'day' ? 'last_7_days' : period === 'week' ? 'last_7_days' : 'last_30_days'} />
              </Grid>
              <Grid item xs={12} md={7}>
                <LabTurnaroundWidget period={period === 'day' ? 'last_7_days' : period === 'week' ? 'last_7_days' : 'last_30_days'} />
              </Grid>
            </Grid>

            {/* ========== SECTION 3: INDICATEURS FINANCIERS ========== */}
            <SectionHeader
              title="Indicateurs Financiers"
              subtitle="Suivi du chiffre d'affaires et des coûts moyens"
              icon={MoneyIcon}
            />

            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Chiffre d'Affaires"
                  value={formatCurrency(totalRevenue)}
                  icon={<MoneyIcon />}
                  color="#10b981"
                  subtitle={`Consultations: ${formatCurrency(consultRevenue)} | Labo: ${formatCurrency(labRevenue)}`}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Coût Moyen / Consultation"
                  value={formatCurrency(avgConsultCost)}
                  icon={<ConsultIcon />}
                  color="#8b5cf6"
                  subtitle={`Coût moyen labo: ${formatCurrency(avgLabCost)}`}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <StatCard
                  title="Coût Moyen / Acte"
                  value={formatCurrency(avgCostPerAct)}
                  icon={<MedicalIcon />}
                  color="#ec4899"
                  subtitle="Moyenne globale (consultations + examens)"
                />
              </Grid>
            </Grid>

            {/* Revenue charts */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, borderRadius: '16px', boxShadow: t => t.palette.mode === 'light' ? '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff' : '8px 8px 16px #0f1419, -8px -8px 16px #2d3340' }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <TrendingUpIcon sx={{ color: 'success.main' }} />
                    <Typography variant="subtitle1" fontWeight="700">Évolution des Revenus</Typography>
                  </Stack>
                  {revenueTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={revenueTimeline}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#94a3b8', 0.1)} />
                        <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} labelFormatter={formatFullDate} formatter={(val) => [formatCurrency(val), 'Revenu']} />
                        <Area type="monotone" dataKey="revenue" name="Revenu" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Aucune donnée de revenu disponible</Typography>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%', borderRadius: '16px', boxShadow: t => t.palette.mode === 'light' ? '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff' : '8px 8px 16px #0f1419, -8px -8px 16px #2d3340' }}>
                  <Typography variant="subtitle1" fontWeight="700" mb={2}>Répartition par Module</Typography>
                  {revenuePie.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={revenuePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                            {revenuePie.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val) => formatCurrency(val)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <Stack spacing={2} mt={2}>
                        {revenuePie.map((item, idx) => (
                          <Box key={`rev-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: item.color, boxShadow: `0 2px 4px ${alpha(item.color, 0.4)}` }} />
                              <Typography variant="body2" fontWeight="500">{item.name}</Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight="700">{formatCurrency(item.value)}</Typography>
                          </Box>
                        ))}
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: '12px', bgcolor: alpha('#10b981', 0.05) }}>
                          <Typography variant="body2" fontWeight="700">Total CA</Typography>
                          <Typography variant="body2" fontWeight="800" color="success.main">{formatCurrency(totalRevenue)}</Typography>
                        </Box>
                      </Stack>
                    </>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Aucune donnée financière</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Summary Table */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', boxShadow: t => t.palette.mode === 'light' ? '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff' : '8px 8px 16px #0f1419, -8px -8px 16px #2d3340' }}>
              <Typography variant="subtitle1" fontWeight="700" mb={2}>Récapitulatif des Indicateurs</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>N°</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Indicateur</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Catégorie</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Valeur</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Détail</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { id: 1, color: 'primary', label: 'Consultations', cat: 'Volume', val: numConsultations, detail: `Sur ${periodLabel}` },
                      { id: 2, color: 'warning', label: 'Nouveaux Patients', cat: 'Volume', val: newPatients, detail: 'Première visite' },
                      { id: 3, color: 'info', label: 'Actes Médicaux', cat: 'Volume', val: totalActs, detail: `${actsConsult} consult | ${actsLab} labo` },
                      { id: 4, color: 'error', label: "Temps d'Attente", cat: 'Performance', val: `${Math.round(avgWait)} min`, detail: `Basé sur ${visitsTracked} visites` },
                      { id: 5, color: 'secondary', label: 'Durée Consultation', cat: 'Performance', val: `${Math.round(avgDuration)} min`, detail: 'Temps effectif' },
                      { id: 6, color: 'success', label: "Chiffre d'Affaires", cat: 'Financier', val: formatCurrency(totalRevenue), detail: `Consult: ${formatCurrency(consultRevenue)}` },
                      { id: 7, color: 'purple', label: 'Coût Moyen / Acte', cat: 'Financier', val: formatCurrency(avgCostPerAct), detail: 'Moyenne globale' },
                    ].map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell><Chip label={row.id} size="small" color={row.color === 'purple' ? 'default' : row.color} sx={row.color === 'purple' ? { bgcolor: '#8b5cf6', color: '#fff' } : {}} /></TableCell>
                        <TableCell><Typography variant="body2" fontWeight="600">{row.label}</Typography></TableCell>
                        <TableCell><Chip label={row.cat} size="small" variant="outlined" /></TableCell>
                        <TableCell align="right"><Typography fontWeight="700">{row.val}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{row.detail}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ActivityIndicatorsPage;
