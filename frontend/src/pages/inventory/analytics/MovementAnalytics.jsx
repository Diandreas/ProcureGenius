import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Container, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, TextField, InputAdornment } from '@mui/material';
import { SafeTab } from '../../../components/safe';
import { TrendingUp as TrendingUpIcon, Search as SearchIcon } from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import FilterPanel from '../../../components/analytics/FilterPanel';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';
import { formatDate } from '../../../utils/formatters';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';
import BackButton from '../../../components/navigation/BackButton';

const MovementAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: null,
    end_date: null,
    movement_type: null,
    product_id: null
  });
  const [tabValue, setTabValue] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState('out');
  const [orderDir, setOrderDir] = useState('desc');

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getMovements(filters);
      setData(result);
    } catch (error) {
      console.error('Error fetching movements data:', error);
    } finally {
      setLoading(false);
    }
  };

  const movementTypeOptions = [
    { value: 'reception', label: 'Entrees' },
    { value: 'sale', label: 'Sorties' },
    { value: 'adjustment', label: 'Ajustements' },
    { value: 'loss', label: 'Pertes' }
  ];

  const formatNumber = (val) => {
    if (val === null || val === undefined) return '0';
    return new Intl.NumberFormat('fr-FR').format(Math.round(val));
  };

  // Sorting and filtering for product table
  const filteredProducts = (data?.by_product || []).filter(p =>
    !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aVal = a[orderBy] || 0;
    const bVal = b[orderBy] || 0;
    return orderDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const paginatedProducts = sortedProducts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleSort = (field) => {
    if (orderBy === field) {
      setOrderDir(orderDir === 'desc' ? 'asc' : 'desc');
    } else {
      setOrderBy(field);
      setOrderDir('desc');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        <Breadcrumbs />
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <BackButton />
          <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="primary.main">
              Analyse des Mouvements de Stock
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Historique et tendances des entrees/sorties
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          showDateRange={true}
          customFilters={[
            {
              field: 'movement_type',
              label: 'Type de Mouvement',
              type: 'select',
              options: movementTypeOptions
            }
          ]}
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'success.main' }}>
                  <Typography variant="h3" fontWeight="700" color="success.main">
                    {formatNumber(data?.summary?.total_in)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Entrees
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'error.main' }}>
                  <Typography variant="h3" fontWeight="700" color="error.main">
                    {formatNumber(data?.summary?.total_out)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Sorties
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'warning.main' }}>
                  <Typography variant="h3" fontWeight="700" color="warning.main">
                    {formatNumber(data?.summary?.total_wastage)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Pertes
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'primary.main' }}>
                  <Typography
                    variant="h3"
                    fontWeight="700"
                    color={data?.summary?.net_movement >= 0 ? 'success.main' : 'error.main'}
                  >
                    {data?.summary?.net_movement >= 0 ? '+' : ''}{formatNumber(data?.summary?.net_movement)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mouvement Net
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Timeline Chart - with both in and out curves */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight="700" mb={2}>
                Evolution des Mouvements
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data?.timeline || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(val) => formatDate(val)}
                    formatter={(value, name) => [
                      formatNumber(value),
                      name === 'in' ? 'Entrees' : 'Sorties'
                    ]}
                  />
                  <Legend formatter={(value) => value === 'in' ? 'Entrees' : 'Sorties'} />
                  <Line type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} name="in" dot={false} />
                  <Line type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={2} name="out" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>

            {/* Tabs for charts vs full table */}
            <Paper sx={{ mb: 3 }}>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ px: 2, pt: 1 }}>
                <SafeTab label="Graphiques Top 10" />
                <SafeTab label={`Classement complet (${filteredProducts.length})`} />
              </Tabs>

              {tabValue === 0 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight="700" mb={1}>
                        Top 10 Sorties par Produit
                      </Typography>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={(data?.by_product || []).sort((a, b) => b.out - a.out).slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="product_name" type="category" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(val) => formatNumber(val)} />
                          <Bar dataKey="out" fill="#ef4444" name="Sorties" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight="700" mb={1}>
                        Top 10 Entrees par Produit
                      </Typography>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={(data?.by_product || []).sort((a, b) => b.in - a.in).slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="product_name" type="category" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(val) => formatNumber(val)} />
                          <Bar dataKey="in" fill="#10b981" name="Entrees" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {tabValue === 1 && (
                <Box sx={{ p: 3 }}>
                  <TextField
                    size="small"
                    placeholder="Rechercher un produit..."
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setPage(0); }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                    }}
                    sx={{ mb: 2, minWidth: 300 }}
                  />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Produit</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={orderBy === 'in'}
                              direction={orderBy === 'in' ? orderDir : 'desc'}
                              onClick={() => handleSort('in')}
                            >
                              Entrees
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={orderBy === 'out'}
                              direction={orderBy === 'out' ? orderDir : 'desc'}
                              onClick={() => handleSort('out')}
                            >
                              Sorties
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={orderBy === 'adjustment'}
                              direction={orderBy === 'adjustment' ? orderDir : 'desc'}
                              onClick={() => handleSort('adjustment')}
                            >
                              Ajustements
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={orderBy === 'wastage'}
                              direction={orderBy === 'wastage' ? orderDir : 'desc'}
                              onClick={() => handleSort('wastage')}
                            >
                              Pertes
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={orderBy === 'net'}
                              direction={orderBy === 'net' ? orderDir : 'desc'}
                              onClick={() => handleSort('net')}
                            >
                              Net
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedProducts.map((p, idx) => (
                          <TableRow key={p.product_name} hover>
                            <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="500">
                                {p.product_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main" fontWeight="600">
                                {formatNumber(p.in)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="error.main" fontWeight="600">
                                {formatNumber(p.out)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{formatNumber(p.adjustment)}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="warning.main">
                                {formatNumber(p.wastage)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                fontWeight="700"
                                color={p.net > 0 ? 'success.main' : p.net < 0 ? 'error.main' : 'text.primary'}
                              >
                                {p.net > 0 ? '+' : ''}{formatNumber(p.net)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {paginatedProducts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography color="text.secondary" sx={{ py: 3 }}>
                                Aucun mouvement trouve
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={filteredProducts.length}
                    page={page}
                    onPageChange={(e, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Lignes par page:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                  />
                </Box>
              )}
            </Paper>

            {/* Info Box */}
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'info.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Interpretation:</strong>{' '}
                <strong>Net positif (+)</strong>: Plus d'entrees que de sorties, le stock augmente.{' '}
                <strong>Net negatif (-)</strong>: Plus de sorties que d'entrees, le stock diminue.{' '}
                Les <strong>pertes</strong> peuvent indiquer des problemes de qualite, d'expiration ou de gestion.
              </Typography>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default MovementAnalytics;
