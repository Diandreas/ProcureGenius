import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Container, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, TableSortLabel,
  TextField, InputAdornment, Stack, Chip, Divider, Card, CardContent
} from '@mui/material';
import { SafeTab } from '../../../components/safe';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search as SearchIcon,
  SwapVert as SwapIcon,
  AddCircleOutline as InIcon,
  RemoveCircleOutline as OutIcon,
  WarningAmber as WasteIcon,
  Balance as NetIcon,
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import FilterPanel from '../../../components/analytics/FilterPanel';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';
import { formatDate } from '../../../utils/formatters';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';
import BackButton from '../../../components/navigation/BackButton';

const KpiCard = ({ label, value, icon, color, subtitle }) => (
  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderTop: 3, borderTopColor: color, height: '100%' }}>
    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
        <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: `${color}18` }}>
          {React.cloneElement(icon, { sx: { fontSize: 22, color } })}
        </Box>
        <Typography variant="h4" fontWeight="800" color={color} lineHeight={1}>
          {value}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" fontWeight="700" display="block">
        {label}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.disabled" display="block" mt={0.25}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5, minWidth: 160 }}>
      <Typography variant="caption" fontWeight="700" display="block" mb={0.5}>
        {formatDate(label)}
      </Typography>
      {payload.map((p) => (
        <Box key={p.dataKey} display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography variant="caption">
            {p.name} : <strong>{new Intl.NumberFormat('fr-FR').format(Math.round(p.value))}</strong>
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

const MovementAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ start_date: null, end_date: null, movement_type: null, product_id: null });
  const [tabValue, setTabValue] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState('out');
  const [orderDir, setOrderDir] = useState('desc');

  useEffect(() => { fetchData(); }, [filters]);

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
    { value: 'reception', label: 'Entrées' },
    { value: 'sale', label: 'Sorties' },
    { value: 'adjustment', label: 'Ajustements' },
    { value: 'loss', label: 'Pertes' },
  ];

  const fmt = (val) => {
    if (val === null || val === undefined) return '0';
    return new Intl.NumberFormat('fr-FR').format(Math.round(val));
  };

  const filteredProducts = (data?.by_product || []).filter(p =>
    !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aVal = a[orderBy] || 0;
    const bVal = b[orderBy] || 0;
    return orderDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const paginatedProducts = sortedProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (field) => {
    if (orderBy === field) setOrderDir(orderDir === 'desc' ? 'asc' : 'desc');
    else { setOrderBy(field); setOrderDir('desc'); }
  };

  const net = data?.summary?.net_movement ?? 0;
  const netPositive = net >= 0;

  // Top 10 data for charts
  const top10Out = [...(data?.by_product || [])].sort((a, b) => (b.out || 0) - (a.out || 0)).slice(0, 10);
  const top10In = [...(data?.by_product || [])].sort((a, b) => (b.in || 0) - (a.in || 0)).slice(0, 10);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        <Breadcrumbs />

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
          <BackButton />
          <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', mr: 1 }}>
            <SwapIcon sx={{ fontSize: 28, color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="800" color="text.primary">
              Analyse des Mouvements de Stock
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Historique et tendances des entrées / sorties de produits
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          showDateRange={true}
          customFilters={[{
            field: 'movement_type',
            label: 'Type de Mouvement',
            type: 'select',
            options: movementTypeOptions,
          }]}
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6} sm={3}>
                <KpiCard
                  label="Total Entrées"
                  value={fmt(data?.summary?.total_in)}
                  icon={<InIcon />}
                  color="#10b981"
                  subtitle="Réceptions cumulées"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard
                  label="Total Sorties"
                  value={fmt(data?.summary?.total_out)}
                  icon={<OutIcon />}
                  color="#ef4444"
                  subtitle="Ventes & consommations"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard
                  label="Total Pertes"
                  value={fmt(data?.summary?.total_wastage)}
                  icon={<WasteIcon />}
                  color="#f59e0b"
                  subtitle="Expirations & casses"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard
                  label="Mouvement Net"
                  value={`${netPositive ? '+' : ''}${fmt(net)}`}
                  icon={<NetIcon />}
                  color={netPositive ? '#10b981' : '#ef4444'}
                  subtitle={netPositive ? 'Stock en hausse' : 'Stock en baisse'}
                />
              </Grid>
            </Grid>

            {/* Timeline Chart */}
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <TrendingUpIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight="700">Évolution dans le temps</Typography>
                {data?.timeline?.length > 0 && (
                  <Chip label={`${data.timeline.length} points`} size="small" variant="outlined" />
                )}
              </Stack>
              {(data?.timeline || []).length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">Aucune donnée de tendance disponible</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.timeline} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(v) => v === 'in' ? 'Entrées' : 'Sorties'} />
                    <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} fill="url(#gradIn)" name="in" dot={false} />
                    <Area type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={2} fill="url(#gradOut)" name="out" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Paper>

            {/* Tabs */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
              <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ px: 2, pt: 0.5 }}>
                  <SafeTab label="Top 10 par produit" />
                  <SafeTab label={`Classement complet (${filteredProducts.length})`} />
                </Tabs>
              </Box>

              {tabValue === 0 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {/* Top 10 Sorties */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" fontWeight="700" color="error.main" mb={1.5} display="flex" alignItems="center" gap={0.5}>
                        <OutIcon sx={{ fontSize: 16 }} /> Top 10 — Sorties par produit
                      </Typography>
                      {top10Out.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Typography color="text.secondary" variant="body2">Aucune donnée</Typography>
                        </Box>
                      ) : (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={top10Out} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmt} />
                            <YAxis dataKey="product_name" type="category" width={130} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(val) => [fmt(val), 'Sorties']} />
                            <Bar dataKey="out" name="Sorties" radius={[0, 3, 3, 0]}>
                              {top10Out.map((_, i) => (
                                <Cell key={i} fill={`rgba(239,68,68,${1 - i * 0.07})`} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </Grid>
                    {/* Top 10 Entrées */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" fontWeight="700" color="success.main" mb={1.5} display="flex" alignItems="center" gap={0.5}>
                        <InIcon sx={{ fontSize: 16 }} /> Top 10 — Entrées par produit
                      </Typography>
                      {top10In.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Typography color="text.secondary" variant="body2">Aucune donnée</Typography>
                        </Box>
                      ) : (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={top10In} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmt} />
                            <YAxis dataKey="product_name" type="category" width={130} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(val) => [fmt(val), 'Entrées']} />
                            <Bar dataKey="in" name="Entrées" radius={[0, 3, 3, 0]}>
                              {top10In.map((_, i) => (
                                <Cell key={i} fill={`rgba(16,185,129,${1 - i * 0.07})`} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
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
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
                    sx={{ mb: 2, minWidth: 280 }}
                  />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Produit</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel active={orderBy === 'in'} direction={orderBy === 'in' ? orderDir : 'desc'} onClick={() => handleSort('in')}>
                              Entrées
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel active={orderBy === 'out'} direction={orderBy === 'out' ? orderDir : 'desc'} onClick={() => handleSort('out')}>
                              Sorties
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel active={orderBy === 'adjustment'} direction={orderBy === 'adjustment' ? orderDir : 'desc'} onClick={() => handleSort('adjustment')}>
                              Ajust.
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel active={orderBy === 'wastage'} direction={orderBy === 'wastage' ? orderDir : 'desc'} onClick={() => handleSort('wastage')}>
                              Pertes
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <TableSortLabel active={orderBy === 'net'} direction={orderBy === 'net' ? orderDir : 'desc'} onClick={() => handleSort('net')}>
                              Net
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedProducts.map((p, idx) => (
                          <TableRow key={p.product_name} hover>
                            <TableCell>
                              <Typography variant="caption" color="text.disabled">{page * rowsPerPage + idx + 1}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="600">{p.product_name}</Typography>
                              {p.category && (
                                <Typography variant="caption" color="text.secondary">{p.category}</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={fmt(p.in)} size="small"
                                sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#10b98115', color: 'success.dark' }} />
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={fmt(p.out)} size="small"
                                sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#ef444415', color: 'error.dark' }} />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="text.secondary">{fmt(p.adjustment)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              {(p.wastage || 0) > 0 ? (
                                <Chip label={fmt(p.wastage)} size="small"
                                  sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#f59e0b15', color: 'warning.dark' }} />
                              ) : (
                                <Typography variant="body2" color="text.disabled">—</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="700"
                                color={(p.net || 0) > 0 ? 'success.main' : (p.net || 0) < 0 ? 'error.main' : 'text.secondary'}>
                                {(p.net || 0) > 0 ? '+' : ''}{fmt(p.net)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {paginatedProducts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                              <Typography color="text.secondary" variant="body2">Aucun mouvement trouvé</Typography>
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
                    labelRowsPerPage="Lignes par page :"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
                  />
                </Box>
              )}
            </Paper>

            {/* Légende */}
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, borderLeft: 3, borderLeftColor: 'info.main' }}>
              <Typography variant="caption" color="text.secondary" lineHeight={1.6}>
                <strong>Interprétation —</strong>{' '}
                <strong style={{ color: '#10b981' }}>Net (+)</strong> : plus d'entrées que de sorties, le stock augmente.{' '}
                <strong style={{ color: '#ef4444' }}>Net (−)</strong> : plus de sorties que d'entrées, le stock diminue.{' '}
                Les <strong>pertes</strong> peuvent signaler des problèmes de qualité, d'expiration ou de gestion.
              </Typography>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default MovementAnalytics;
