import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Container, Card, CardContent,
  Stack, Chip, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Tabs, Tab, Button
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Science as LabIcon,
  LocalHospital as ConsultIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import FilterPanel from '../../../components/analytics/FilterPanel';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const formatCurrency = (val) => {
  if (!val && val !== 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
};

const HealthcareAnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [filters, setFilters] = useState({ start_date: null, end_date: null });
  const [tabValue, setTabValue] = useState(0);

  // Data states
  const [activityData, setActivityData] = useState(null);
  const [examTypesData, setExamTypesData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, [filters, period]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [activity, examTypes, revenue] = await Promise.all([
        healthcareAnalyticsAPI.getActivityIndicators({ ...filters, period }),
        healthcareAnalyticsAPI.getExamTypes({ ...filters, period }),
        healthcareAnalyticsAPI.getRevenue(filters)
      ]);
      setActivityData(activity);
      setExamTypesData(examTypes);
      setRevenueData(revenue);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Compute derived data
  const totalRevenue = activityData?.financial?.total_revenue || 0;
  const consultationRevenue = activityData?.financial?.consultation_revenue || 0;
  const labRevenue = activityData?.financial?.lab_revenue || 0;
  const numConsultations = activityData?.activity_volume?.consultations?.total || 0;
  const numLabOrders = activityData?.activity_volume?.medical_acts?.lab_orders || 0;
  const newPatients = activityData?.activity_volume?.new_patients?.total || 0;
  const avgWaitTime = activityData?.performance?.avg_wait_time_minutes || 0;
  const avgConsultDuration = activityData?.performance?.avg_consultation_duration_minutes || 0;

  // Top exams by count (most requested)
  const topExamsByCount = (examTypesData?.by_test_type || []).slice(0, 10);

  // Top exams by revenue
  const topExamsByRevenue = [...(examTypesData?.by_test_type || [])].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Revenue by module for pie
  const moduleData = (revenueData?.by_module || []).map(m => ({
    name: m.module === 'laboratory' ? 'Laboratoire' : 'Consultation',
    value: m.revenue,
    count: m.count
  }));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <AnalyticsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="700" color="primary.main">
                Analytique Sante
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Indicateurs cles pour la prise de decision
              </Typography>
            </Box>
          </Stack>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Periode</InputLabel>
            <Select value={period} label="Periode" onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value="day">Aujourd'hui</MenuItem>
              <MenuItem value="week">7 jours</MenuItem>
              <MenuItem value="month">30 jours</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Date Filters */}
        <FilterPanel filters={filters} onChange={setFilters} showDateRange={true} />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6} md={2}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <MoneyIcon sx={{ color: 'success.main', mb: 0.5 }} />
                    <Typography variant="h5" fontWeight="700" color="success.main">
                      {formatCurrency(totalRevenue)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Chiffre d'affaires</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <ConsultIcon sx={{ color: 'primary.main', mb: 0.5 }} />
                    <Typography variant="h5" fontWeight="700" color="primary.main">
                      {numConsultations}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Consultations</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <LabIcon sx={{ color: 'info.main', mb: 0.5 }} />
                    <Typography variant="h5" fontWeight="700" color="info.main">
                      {numLabOrders}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Examens labo</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <PeopleIcon sx={{ color: 'warning.main', mb: 0.5 }} />
                    <Typography variant="h5" fontWeight="700" color="warning.main">
                      {newPatients}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Nouveaux patients</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="700" color="text.primary">
                      {avgWaitTime > 0 ? `${Math.round(avgWaitTime)} min` : 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Attente moyenne</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="700" color="text.primary">
                      {avgConsultDuration > 0 ? `${Math.round(avgConsultDuration)} min` : 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Duree consultation</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Revenue breakdown + Timeline */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight="700" mb={2}>Repartition du CA</Typography>
                  {moduleData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={moduleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {moduleData.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => formatCurrency(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Pas de donnees</Typography>
                  )}
                  <Stack spacing={1} mt={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Consultations</Typography>
                      <Typography variant="body2" fontWeight="700">{formatCurrency(consultationRevenue)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Laboratoire</Typography>
                      <Typography variant="body2" fontWeight="700">{formatCurrency(labRevenue)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 1 }}>
                      <Typography variant="body2" fontWeight="700">Total</Typography>
                      <Typography variant="body2" fontWeight="700" color="success.main">{formatCurrency(totalRevenue)}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight="700" mb={2}>Evolution du CA</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={activityData?.financial?.revenue_timeline || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(val) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                      <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip labelFormatter={(val) => new Date(val).toLocaleDateString('fr-FR')} formatter={(val) => formatCurrency(val)} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Exam analytics */}
            <Paper sx={{ mb: 3 }}>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ px: 2, pt: 1 }}>
                <Tab label="Examens les plus demandes" />
                <Tab label="Examens les plus rentables" />
                <Tab label="Par categorie" />
              </Tabs>

              {tabValue === 0 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={topExamsByCount} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="test_name" type="category" width={150} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#2563eb" name="Nombre de demandes" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Examen</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>Demandes</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>Revenu</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>Revenu moyen</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {topExamsByCount.map((exam, idx) => (
                              <TableRow key={exam.test_name} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="600">{exam.test_name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{exam.test_code}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Chip label={exam.count} size="small" color="primary" />
                                </TableCell>
                                <TableCell align="right">{formatCurrency(exam.revenue)}</TableCell>
                                <TableCell align="right">{formatCurrency(exam.count > 0 ? exam.revenue / exam.count : 0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {tabValue === 1 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={topExamsByRevenue} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                          <YAxis dataKey="test_name" type="category" width={150} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(val) => formatCurrency(val)} />
                          <Bar dataKey="revenue" fill="#10b981" name="Revenu" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Examen</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>Revenu total</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>Nombre</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>Prix unitaire moy.</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {topExamsByRevenue.map((exam, idx) => (
                              <TableRow key={exam.test_name} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="600">{exam.test_name}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="700" color="success.main">
                                    {formatCurrency(exam.revenue)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">{exam.count}</TableCell>
                                <TableCell align="right">{formatCurrency(exam.count > 0 ? exam.revenue / exam.count : 0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {tabValue === 2 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={5}>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={examTypesData?.by_category || []}
                            dataKey="count"
                            nameKey="category"
                            cx="50%" cy="50%" outerRadius={100}
                            label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {(examTypesData?.by_category || []).map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val, name, props) => [val, props.payload.category]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                    <Grid item xs={12} md={7}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>Categorie</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>Examens</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>Revenu</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>% du total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(examTypesData?.by_category || []).map((cat, idx) => {
                              const totalCount = (examTypesData?.by_category || []).reduce((s, c) => s + c.count, 0);
                              return (
                                <TableRow key={cat.category} hover>
                                  <TableCell>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                                      <Typography variant="body2" fontWeight="600">{cat.category}</Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">{cat.count}</TableCell>
                                  <TableCell align="right">{formatCurrency(cat.revenue)}</TableCell>
                                  <TableCell align="right">
                                    <Chip label={`${totalCount > 0 ? Math.round(cat.count / totalCount * 100) : 0}%`} size="small" />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Paper>

            {/* Quick Navigation */}
            <Grid container spacing={2}>
              <Grid item xs={6} md={2.4}>
                <Button fullWidth variant="contained" endIcon={<ArrowIcon />} onClick={() => navigate('/healthcare/analytics/activity-indicators')}>
                  Indicateurs detailles
                </Button>
              </Grid>
              <Grid item xs={6} md={2.4}>
                <Button fullWidth variant="outlined" endIcon={<ArrowIcon />} onClick={() => navigate('/healthcare/analytics/exam-types')}>
                  Examens detailles
                </Button>
              </Grid>
              <Grid item xs={6} md={2.4}>
                <Button fullWidth variant="outlined" endIcon={<ArrowIcon />} onClick={() => navigate('/healthcare/analytics/demographics')}>
                  Demographiques
                </Button>
              </Grid>
              <Grid item xs={6} md={2.4}>
                <Button fullWidth variant="outlined" endIcon={<ArrowIcon />} onClick={() => navigate('/healthcare/analytics/revenue')}>
                  Revenus detailles
                </Button>
              </Grid>
              <Grid item xs={6} md={2.4}>
                <Button fullWidth variant="outlined" endIcon={<ArrowIcon />} onClick={() => navigate('/healthcare/analytics/services')}>
                  Analyse par service
                </Button>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default HealthcareAnalyticsDashboard;
