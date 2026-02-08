import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Container, Card, CardContent,
  Stack, Chip, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, TextField, InputAdornment,
  Button, CircularProgress, Alert
} from '@mui/material';
import {
  MedicalServices as ServiceIcon,
  Search as SearchIcon,
  TrendingUp as TrendingIcon,
  Category as CategoryIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import FilterPanel from '../../../components/analytics/FilterPanel';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';
import { formatDate } from '../../../utils/formatters';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const formatCurrency = (val) => {
  if (!val && val !== 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
};

const ServiceRevenueAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Filters
  const [filters, setFilters] = useState({ start_date: null, end_date: null });
  const [period, setPeriod] = useState('month');
  const [categoryId, setCategoryId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedServiceName, setSelectedServiceName] = useState('');

  // Table
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState('revenue');
  const [orderDir, setOrderDir] = useState('desc');

  useEffect(() => {
    fetchData();
  }, [filters, period, categoryId, selectedServiceId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await healthcareAnalyticsAPI.getServiceRevenue({
        ...filters,
        period,
        category_id: categoryId || undefined,
        service_id: selectedServiceId || undefined
      });
      setData(result);
    } catch (error) {
      console.error('Error fetching service revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectService = (serviceId, serviceName) => {
    if (selectedServiceId === serviceId) {
      setSelectedServiceId('');
      setSelectedServiceName('');
    } else {
      setSelectedServiceId(serviceId);
      setSelectedServiceName(serviceName);
    }
  };

  const handleSelectCategory = (catId) => {
    setCategoryId(catId);
    setSelectedServiceId('');
    setSelectedServiceName('');
    setPage(0);
  };

  // Filter and sort services
  const filteredServices = (data?.by_service || []).filter(s =>
    !searchTerm || s.service_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedServices = [...filteredServices].sort((a, b) => {
    const aVal = a[orderBy] || 0;
    const bVal = b[orderBy] || 0;
    if (typeof aVal === 'string') return orderDir === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    return orderDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const paginatedServices = sortedServices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (field) => {
    if (orderBy === field) setOrderDir(orderDir === 'desc' ? 'asc' : 'desc');
    else { setOrderBy(field); setOrderDir('desc'); }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        <Breadcrumbs />
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button startIcon={<BackIcon />} onClick={() => navigate('/healthcare/analytics')}>
              Retour
            </Button>
            <ServiceIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="700" color="primary.main">
                Analyse par Service
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Apport financier de chaque service et categorie
              </Typography>
            </Box>
          </Stack>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Agregation</InputLabel>
            <Select value={period} label="Agregation" onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value="day">Jour</MenuItem>
              <MenuItem value="week">Semaine</MenuItem>
              <MenuItem value="month">Mois</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Date Filters */}
        <FilterPanel filters={filters} onChange={setFilters} showDateRange={true} />

        {/* Category Filter */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight="600" sx={{ mr: 1 }}>Categorie:</Typography>
          <Chip
            label="Toutes"
            variant={!categoryId ? 'filled' : 'outlined'}
            color={!categoryId ? 'primary' : 'default'}
            onClick={() => handleSelectCategory('')}
          />
          {(data?.filters?.categories || []).map(cat => (
            <Chip
              key={cat.id}
              label={cat.name}
              variant={categoryId === cat.id ? 'filled' : 'outlined'}
              color={categoryId === cat.id ? 'primary' : 'default'}
              onClick={() => handleSelectCategory(cat.id)}
            />
          ))}
        </Box>

        {/* Selected service indicator */}
        {selectedServiceName && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => { setSelectedServiceId(''); setSelectedServiceName(''); }}>
            Vue detaillee: <strong>{selectedServiceName}</strong> - Le graphique ci-dessous montre l'evolution de ce service
          </Alert>
        )}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="700" color="success.main">
                      {formatCurrency(data?.total_revenue || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Revenu total</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="700" color="primary.main">
                      {data?.total_transactions || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Transactions</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="700" color="info.main">
                      {(data?.by_service || []).length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Services actifs</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="700" color="warning.main">
                      {(data?.by_category || []).length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Categories</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Timeline Chart */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight="700" mb={2}>
                {selectedServiceName
                  ? `Evolution - ${selectedServiceName}`
                  : categoryId
                    ? `Evolution - ${(data?.filters?.categories || []).find(c => c.id === categoryId)?.name || 'Categorie'}`
                    : 'Evolution du revenu global'
                }
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.timeline || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth() + 1}`; }}
                  />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    labelFormatter={(val) => formatDate(val)}
                    formatter={(val, name) => [formatCurrency(val), name === 'revenue' ? 'Revenu' : 'Quantite']}
                  />
                  <Legend formatter={(v) => v === 'revenue' ? 'Revenu' : 'Quantite'} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>

            {/* Category breakdown + Top services */}
            <Grid container spacing={3} mb={3}>
              {/* Categories pie */}
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight="700" mb={2}>
                    <CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Repartition par categorie
                  </Typography>
                  {(data?.by_category || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={data?.by_category || []}
                          dataKey="revenue"
                          nameKey="category_name"
                          cx="50%" cy="50%" outerRadius={90}
                          label={({ category_name, revenue_percent }) => `${category_name} (${revenue_percent}%)`}
                        >
                          {(data?.by_category || []).map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => formatCurrency(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" py={4}>Pas de donnees</Typography>
                  )}
                  <TableContainer sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableBody>
                        {(data?.by_category || []).map((cat, idx) => (
                          <TableRow
                            key={cat.category_name}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleSelectCategory(cat.category_id || '')}
                          >
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                                <Typography variant="body2" fontWeight="600">{cat.category_name}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="700" color="success.main">
                                {formatCurrency(cat.revenue)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={`${cat.revenue_percent}%`} size="small" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Top services bar chart */}
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight="700" mb={2}>
                    <TrendingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Top Services par Revenu
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={(data?.by_service || []).slice(0, 15)}
                      layout="vertical"
                      onClick={(e) => {
                        if (e?.activePayload?.[0]?.payload) {
                          const p = e.activePayload[0].payload;
                          handleSelectService(p.service_id, p.service_name);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <YAxis dataKey="service_name" type="category" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => formatCurrency(val)} />
                      <Bar dataKey="revenue" fill="#2563eb" name="Revenu" cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Cliquez sur un service pour voir son evolution dans le temps
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Full services table */}
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="700">
                  Classement complet des services
                </Typography>
                <TextField
                  size="small"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                  }}
                  sx={{ minWidth: 250 }}
                />
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        <TableSortLabel active={orderBy === 'service_name'} direction={orderBy === 'service_name' ? orderDir : 'asc'} onClick={() => handleSort('service_name')}>
                          Service
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Categorie</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        <TableSortLabel active={orderBy === 'revenue'} direction={orderBy === 'revenue' ? orderDir : 'desc'} onClick={() => handleSort('revenue')}>
                          Revenu
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        <TableSortLabel active={orderBy === 'count'} direction={orderBy === 'count' ? orderDir : 'desc'} onClick={() => handleSort('count')}>
                          Quantite
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        <TableSortLabel active={orderBy === 'transactions'} direction={orderBy === 'transactions' ? orderDir : 'desc'} onClick={() => handleSort('transactions')}>
                          Transactions
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        <TableSortLabel active={orderBy === 'avg_price'} direction={orderBy === 'avg_price' ? orderDir : 'desc'} onClick={() => handleSort('avg_price')}>
                          Prix moyen
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>% du CA</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Detail</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedServices.map((s, idx) => (
                      <TableRow
                        key={s.service_id}
                        hover
                        selected={selectedServiceId === s.service_id}
                      >
                        <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">{s.service_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.product_type}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={s.category} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="700" color="success.main">
                            {formatCurrency(s.revenue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{s.count}</TableCell>
                        <TableCell align="right">{s.transactions}</TableCell>
                        <TableCell align="right">{formatCurrency(s.avg_price)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${s.revenue_percent}%`}
                            size="small"
                            color={s.revenue_percent > 10 ? 'success' : s.revenue_percent > 5 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant={selectedServiceId === s.service_id ? 'contained' : 'outlined'}
                            onClick={() => handleSelectService(s.service_id, s.service_name)}
                          >
                            {selectedServiceId === s.service_id ? 'Actif' : 'Voir'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedServices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography color="text.secondary" py={3}>Aucun service trouve</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredServices.length}
                page={page}
                onPageChange={(e, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              />
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ServiceRevenueAnalytics;
