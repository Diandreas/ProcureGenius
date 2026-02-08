import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Container, Card, CardContent,
  Stack, Chip, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Divider, IconButton, Tooltip as MuiTooltip,
  LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
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
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import { formatDate } from '../../../utils/formatters';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const formatCurrency = (val) => {
  if (!val && val !== 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
};

const formatFullDate = (val) => formatDate(val);

// Indicator card with number, title, value, subtitle, color
const IndicatorCard = ({ number, title, value, subtitle, icon: Icon, color = 'primary.main', extra }) => (
  <Card sx={{ height: '100%', borderLeft: 4, borderColor: color }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Chip label={`N\u00B0${number}`} size="small" sx={{ mb: 1, bgcolor: color, color: '#fff', fontWeight: 700 }} />
          <Typography variant="body2" color="text.secondary" fontWeight="600" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="800" sx={{ color }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
          {extra}
        </Box>
        {Icon && (
          <Box sx={{ bgcolor: `${typeof color === 'string' && color.includes('.') ? color.split('.')[0] : 'primary'}.50`, p: 1.5, borderRadius: 2 }}>
            <Icon sx={{ fontSize: 32, color }} />
          </Box>
        )}
      </Stack>
    </CardContent>
  </Card>
);

const SectionHeader = ({ title, subtitle, icon: Icon }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, mt: 3 }}>
    {Icon && <Icon sx={{ fontSize: 28, color: 'primary.main' }} />}
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

  // Build revenue timeline with consultation/lab split
  // (we only have combined, so use single line)

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
                Vue complete des performances de votre etablissement
              </Typography>
            </Box>
          </Stack>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Periode</InputLabel>
            <Select value={period} label="Periode" onChange={(e) => setPeriod(e.target.value)}>
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
          <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
            Periode analysee : du <strong>{formatFullDate(data.start_date)}</strong> au <strong>{formatFullDate(data.end_date)}</strong>
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
              title="Indicateurs d'Activite et de Volume"
              subtitle="Suivi des volumes de consultations, patients et actes medicaux"
              icon={AssessmentIcon}
            />

            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={4}>
                <IndicatorCard
                  number={1}
                  title="Consultations / Periode"
                  value={numConsultations}
                  subtitle={`Sur ${periodLabel}`}
                  icon={ConsultIcon}
                  color="primary.main"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <IndicatorCard
                  number={2}
                  title="Nouveaux Patients / Periode"
                  value={newPatients}
                  subtitle="Premiere visite dans la periode"
                  icon={PeopleIcon}
                  color="warning.main"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <IndicatorCard
                  number={3}
                  title="Actes Medicaux et Paramedicaux"
                  value={totalActs}
                  subtitle={`${actsConsult} consultations + ${actsLab} labos + ${actsCare} soins`}
                  icon={MedicalIcon}
                  color="info.main"
                />
              </Grid>
            </Grid>

            {/* Activity timeline chart */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="700" mb={2}>
                    Evolution quotidienne - Consultations & Nouveaux Patients
                  </Typography>
                  {combinedActivityTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={combinedActivityTimeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} />
                        <YAxis allowDecimals={false} />
                        <Tooltip labelFormatter={formatFullDate} />
                        <Legend />
                        <Area type="monotone" dataKey="consultations" name="Consultations" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="nouveaux_patients" name="Nouveaux patients" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Aucune donnee pour cette periode</Typography>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="700" mb={2}>
                    Repartition des Actes Medicaux
                  </Typography>
                  {actsBreakdown.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={actsBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                            {actsBreakdown.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <Stack spacing={1} mt={1}>
                        {actsBreakdown.map((item) => (
                          <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                              <Typography variant="body2">{item.name}</Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight="700">{item.value}</Typography>
                          </Box>
                        ))}
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight="700">Total</Typography>
                          <Typography variant="body2" fontWeight="700">{totalActs}</Typography>
                        </Box>
                      </Stack>
                    </>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Aucun acte</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* ========== SECTION 2: PERFORMANCE ET EFFICIENCE ========== */}
            <SectionHeader
              title="Indicateurs de Performance et d'Efficience"
              subtitle="Mesure de la qualite et rapidite de prise en charge"
              icon={TimerIcon}
            />

            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Chip label="N°4" size="small" sx={{ mb: 1, bgcolor: 'error.main', color: '#fff', fontWeight: 700 }} />
                        <Typography variant="body2" color="text.secondary" fontWeight="600" gutterBottom>
                          Temps d'Attente Moyen
                        </Typography>
                        <Typography variant="h3" fontWeight="800" color="error.main">
                          {avgWait > 0 ? `${Math.round(avgWait)} min` : '0 min'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Base sur {visitsTracked} visite{visitsTracked !== 1 ? 's' : ''} suivie{visitsTracked !== 1 ? 's' : ''}
                        </Typography>
                        {avgWait > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Objectif recommande : 15 min</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min((avgWait / 60) * 100, 100)}
                              color={avgWait <= 15 ? 'success' : avgWait <= 30 ? 'warning' : 'error'}
                              sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
                            />
                            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">0 min</Typography>
                              <Typography variant="caption" color="text.secondary">60 min</Typography>
                            </Stack>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ bgcolor: 'error.50', p: 1.5, borderRadius: 2 }}>
                        <WaitIcon sx={{ fontSize: 32, color: 'error.main' }} />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ borderLeft: 4, borderColor: 'secondary.main' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Chip label="N°5" size="small" sx={{ mb: 1, bgcolor: 'secondary.main', color: '#fff', fontWeight: 700 }} />
                        <Typography variant="body2" color="text.secondary" fontWeight="600" gutterBottom>
                          Duree Moyenne de Consultation
                        </Typography>
                        <Typography variant="h3" fontWeight="800" color="secondary.main">
                          {avgDuration > 0 ? `${Math.round(avgDuration)} min` : '0 min'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Duree entre debut et fin de consultation
                        </Typography>
                        {avgDuration > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Plage normale : 10-30 min</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min((avgDuration / 60) * 100, 100)}
                              color={avgDuration >= 10 && avgDuration <= 30 ? 'success' : 'warning'}
                              sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
                            />
                            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">0 min</Typography>
                              <Typography variant="caption" color="text.secondary">60 min</Typography>
                            </Stack>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ bgcolor: 'secondary.50', p: 1.5, borderRadius: 2 }}>
                        <TimerIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* ========== SECTION 3: INDICATEURS FINANCIERS ========== */}
            <SectionHeader
              title="Indicateurs Financiers"
              subtitle="Suivi du chiffre d'affaires et des couts moyens"
              icon={MoneyIcon}
            />

            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={4}>
                <IndicatorCard
                  number={6}
                  title="Chiffre d'Affaires"
                  value={formatCurrency(totalRevenue)}
                  subtitle={`Consultations: ${formatCurrency(consultRevenue)} | Labo: ${formatCurrency(labRevenue)}`}
                  icon={MoneyIcon}
                  color="success.main"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <IndicatorCard
                  number={7}
                  title="Cout Moyen par Consultation"
                  value={formatCurrency(avgConsultCost)}
                  subtitle={`Cout moyen labo: ${formatCurrency(avgLabCost)}`}
                  icon={ConsultIcon}
                  color="#8b5cf6"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderLeft: 4, borderColor: '#ec4899' }}>
                  <CardContent>
                    <Chip label="Synth." size="small" sx={{ mb: 1, bgcolor: '#ec4899', color: '#fff', fontWeight: 700 }} />
                    <Typography variant="body2" color="text.secondary" fontWeight="600" gutterBottom>
                      Cout Moyen par Acte
                    </Typography>
                    <Typography variant="h4" fontWeight="800" sx={{ color: '#ec4899' }}>
                      {formatCurrency(avgCostPerAct)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Moyenne globale (consultations + examens)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Revenue charts */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="700" mb={2}>
                    Evolution du Chiffre d'Affaires
                  </Typography>
                  {revenueTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={revenueTimeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(val) => formatDate(val)} />
                        <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip labelFormatter={formatFullDate} formatter={(val) => [formatCurrency(val), 'Revenu']} />
                        <Area type="monotone" dataKey="revenue" name="Revenu" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Aucune donnee de revenu</Typography>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="700" mb={2}>
                    Repartition du CA par Module
                  </Typography>
                  {revenuePie.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={revenuePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                            {revenuePie.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val) => formatCurrency(val)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <Stack spacing={1} mt={1}>
                        {revenuePie.map((item) => (
                          <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                              <Typography variant="body2">{item.name}</Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight="700">{formatCurrency(item.value)}</Typography>
                          </Box>
                        ))}
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight="700">Total CA</Typography>
                          <Typography variant="body2" fontWeight="700" color="success.main">{formatCurrency(totalRevenue)}</Typography>
                        </Box>
                      </Stack>
                    </>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Aucun revenu</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Summary table */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="700" mb={2}>
                Recapitulatif des Indicateurs
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>N°</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Indicateur</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Categorie</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Valeur</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Detail</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow hover>
                      <TableCell><Chip label="1" size="small" color="primary" /></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="600">Consultations / Periode</Typography></TableCell>
                      <TableCell><Chip label="Volume" size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography fontWeight="700">{numConsultations}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">Sur {periodLabel}</Typography></TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell><Chip label="2" size="small" color="warning" /></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="600">Nouveaux Patients</Typography></TableCell>
                      <TableCell><Chip label="Volume" size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography fontWeight="700">{newPatients}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">Premiere visite dans la periode</Typography></TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell><Chip label="3" size="small" color="info" /></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="600">Actes Medicaux</Typography></TableCell>
                      <TableCell><Chip label="Volume" size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography fontWeight="700">{totalActs}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{actsConsult} consult. + {actsLab} labos + {actsCare} soins</Typography></TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell><Chip label="4" size="small" color="error" /></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="600">Temps d'Attente Moyen</Typography></TableCell>
                      <TableCell><Chip label="Performance" size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography fontWeight="700">{avgWait > 0 ? `${Math.round(avgWait)} min` : '0 min'}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">Base sur {visitsTracked} visites</Typography></TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell><Chip label="5" size="small" color="secondary" /></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="600">Duree Moy. Consultation</Typography></TableCell>
                      <TableCell><Chip label="Performance" size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography fontWeight="700">{avgDuration > 0 ? `${Math.round(avgDuration)} min` : '0 min'}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">Debut a fin de consultation</Typography></TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell><Chip label="6" size="small" color="success" /></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="600">Chiffre d'Affaires</Typography></TableCell>
                      <TableCell><Chip label="Financier" size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography fontWeight="700" color="success.main">{formatCurrency(totalRevenue)}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">Consult: {formatCurrency(consultRevenue)} | Labo: {formatCurrency(labRevenue)}</Typography></TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell><Chip label="7" size="small" sx={{ bgcolor: '#8b5cf6', color: '#fff' }} /></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="600">Cout Moyen par Acte</Typography></TableCell>
                      <TableCell><Chip label="Financier" size="small" variant="outlined" /></TableCell>
                      <TableCell align="right"><Typography fontWeight="700">{formatCurrency(avgCostPerAct)}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">Consult: {formatCurrency(avgConsultCost)} | Labo: {formatCurrency(avgLabCost)}</Typography></TableCell>
                    </TableRow>
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
