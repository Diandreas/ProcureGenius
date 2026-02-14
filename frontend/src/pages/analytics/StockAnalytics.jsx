import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
    CircularProgress, Alert, FormControl, InputLabel, Select,
    MenuItem, Stack, TextField, InputAdornment, TablePagination,
    TableSortLabel, Tabs
} from '@mui/material';
import { SafeTab } from '../../components/safe';
import {
    Inventory as InventoryIcon,
    TrendingUp as TrendingUpIcon,
    Search as SearchIcon,
    AccountBalance as ValueIcon,
    Category as CategoryIcon
} from '@mui/icons-material';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useSnackbar } from 'notistack';
import inventoryAnalyticsAPI from '../../services/inventoryAnalyticsAPI';
import Breadcrumbs from '../../components/navigation/Breadcrumbs';
import BackButton from '../../components/navigation/BackButton';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const formatCurrency = (val) => {
    if (!val && val !== 0) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
};

const StockAnalytics = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [tabValue, setTabValue] = useState(0);

    // Filters
    const [categoryId, setCategoryId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('stock_value');

    // Table pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [tableOrderBy, setTableOrderBy] = useState('stock_value_cost');
    const [tableOrderDir, setTableOrderDir] = useState('desc');

    useEffect(() => {
        fetchData();
    }, [categoryId, warehouseId, sortBy]);

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => fetchData(), 400);
        return () => clearTimeout(timeout);
    }, [search]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await inventoryAnalyticsAPI.getStockValue({
                category_id: categoryId || undefined,
                warehouse_id: warehouseId || undefined,
                search: search || undefined,
                sort_by: sortBy,
            });
            setData(result);
        } catch (error) {
            console.error('Error fetching stock value:', error);
            enqueueSnackbar('Erreur de chargement des donnees', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleTableSort = (field) => {
        if (tableOrderBy === field) {
            setTableOrderDir(tableOrderDir === 'desc' ? 'asc' : 'desc');
        } else {
            setTableOrderBy(field);
            setTableOrderDir('desc');
        }
    };

    const sortedProducts = [...(data?.products || [])].sort((a, b) => {
        const aVal = a[tableOrderBy] || 0;
        const bVal = b[tableOrderBy] || 0;
        if (typeof aVal === 'string') return tableOrderDir === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        return tableOrderDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const paginatedProducts = sortedProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (loading && !data) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!data) {
        return <Alert severity="error">Impossible de charger les statistiques</Alert>;
    }

    const summary = data.summary || {};

    return (
        <Box sx={{ p: 3 }}>
            <Breadcrumbs />
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <BackButton />
                    <ValueIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="700">
                            Valeur du Stock
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Analyse financiere de votre inventaire
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Rechercher un produit..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Categorie</InputLabel>
                                <Select value={categoryId} label="Categorie" onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}>
                                    <MenuItem value="">Toutes</MenuItem>
                                    {(data?.filters?.categories || []).map(c => (
                                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Entrepot</InputLabel>
                                <Select value={warehouseId} label="Entrepot" onChange={(e) => { setWarehouseId(e.target.value); setPage(0); }}>
                                    <MenuItem value="">Tous</MenuItem>
                                    {(data?.filters?.warehouses || []).map(w => (
                                        <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Trier par</InputLabel>
                                <Select value={sortBy} label="Trier par" onChange={(e) => setSortBy(e.target.value)}>
                                    <MenuItem value="stock_value">Valeur du stock</MenuItem>
                                    <MenuItem value="quantity">Quantite</MenuItem>
                                    <MenuItem value="margin">Marge</MenuItem>
                                    <MenuItem value="name">Nom</MenuItem>
                                    <MenuItem value="price">Prix de vente</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} md={2.4}>
                    <Card sx={{ textAlign: 'center' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h5" fontWeight="700" color="primary.main">
                                {summary.total_products}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Produits</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2.4}>
                    <Card sx={{ textAlign: 'center' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h5" fontWeight="700" color="info.main">
                                {formatCurrency(summary.total_cost_value)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Valeur au cout</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2.4}>
                    <Card sx={{ textAlign: 'center' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h5" fontWeight="700" color="success.main">
                                {formatCurrency(summary.total_sell_value)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Valeur de vente</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2.4}>
                    <Card sx={{ textAlign: 'center' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h5" fontWeight="700" color="warning.main">
                                {formatCurrency(summary.total_potential_margin)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Marge potentielle</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={2.4}>
                    <Card sx={{ textAlign: 'center' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h5" fontWeight="700" color="error.main">
                                {summary.zero_stock_count}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Ruptures de stock</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ px: 2, pt: 1 }}>
                    <SafeTab label="Par categorie" icon={<CategoryIcon />} iconPosition="start" />
                    <SafeTab label="Top valeur" icon={<ValueIcon />} iconPosition="start" />
                    <SafeTab label={`Tous les produits (${sortedProducts.length})`} icon={<InventoryIcon />} iconPosition="start" />
                </Tabs>

                {/* By Category Tab */}
                {tabValue === 0 && (
                    <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={5}>
                                <Typography variant="subtitle1" fontWeight="700" mb={1}>
                                    Repartition par categorie
                                </Typography>
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={data?.by_category || []}
                                            dataKey="cost_value"
                                            nameKey="category_name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={120}
                                            label={({ category_name, percent }) => `${category_name} (${(percent * 100).toFixed(0)}%)`}
                                        >
                                            {(data?.by_category || []).map((_, idx) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val) => formatCurrency(val)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Grid>
                            <Grid item xs={12} md={7}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Categorie</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Produits</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Quantite</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Valeur (cout)</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Valeur (vente)</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Marge %</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(data?.by_category || []).map((cat, idx) => (
                                                <TableRow key={cat.category_name} hover>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                                                            <Typography variant="body2" fontWeight="600">{cat.category_name}</Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="right">{cat.product_count}</TableCell>
                                                    <TableCell align="right">{cat.total_quantity}</TableCell>
                                                    <TableCell align="right">{formatCurrency(cat.cost_value)}</TableCell>
                                                    <TableCell align="right">{formatCurrency(cat.sell_value)}</TableCell>
                                                    <TableCell align="right">
                                                        <Chip
                                                            label={`${cat.margin_percent}%`}
                                                            size="small"
                                                            color={cat.margin_percent > 30 ? 'success' : cat.margin_percent > 10 ? 'warning' : 'default'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* Top Value / Top Margin Tab */}
                {tabValue === 1 && (
                    <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" fontWeight="700" mb={1}>
                                    Top 10 - Plus grande valeur en stock
                                </Typography>
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={data?.top_valuable || []} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(val) => formatCurrency(val)} />
                                        <Bar dataKey="stock_value_cost" fill="#2563eb" name="Valeur" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" fontWeight="700" mb={1}>
                                    Top 10 - Meilleure marge potentielle
                                </Typography>
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={data?.top_margin || []} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(val) => formatCurrency(val)} />
                                        <Bar dataKey="margin" fill="#10b981" name="Marge" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* All Products Tab */}
                {tabValue === 2 && (
                    <Box sx={{ p: 3 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>
                                            <TableSortLabel
                                                active={tableOrderBy === 'name'}
                                                direction={tableOrderBy === 'name' ? tableOrderDir : 'asc'}
                                                onClick={() => handleTableSort('name')}
                                            >Produit</TableSortLabel>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Categorie</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                            <TableSortLabel
                                                active={tableOrderBy === 'stock_quantity'}
                                                direction={tableOrderBy === 'stock_quantity' ? tableOrderDir : 'desc'}
                                                onClick={() => handleTableSort('stock_quantity')}
                                            >Stock</TableSortLabel>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                            <TableSortLabel
                                                active={tableOrderBy === 'cost_price'}
                                                direction={tableOrderBy === 'cost_price' ? tableOrderDir : 'desc'}
                                                onClick={() => handleTableSort('cost_price')}
                                            >Prix achat</TableSortLabel>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                            <TableSortLabel
                                                active={tableOrderBy === 'sell_price'}
                                                direction={tableOrderBy === 'sell_price' ? tableOrderDir : 'desc'}
                                                onClick={() => handleTableSort('sell_price')}
                                            >Prix vente</TableSortLabel>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                            <TableSortLabel
                                                active={tableOrderBy === 'stock_value_cost'}
                                                direction={tableOrderBy === 'stock_value_cost' ? tableOrderDir : 'desc'}
                                                onClick={() => handleTableSort('stock_value_cost')}
                                            >Valeur stock</TableSortLabel>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                            <TableSortLabel
                                                active={tableOrderBy === 'margin'}
                                                direction={tableOrderBy === 'margin' ? tableOrderDir : 'desc'}
                                                onClick={() => handleTableSort('margin')}
                                            >Marge</TableSortLabel>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Marge %</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedProducts.map((p, idx) => (
                                        <TableRow key={p.id} hover>
                                            <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="600">{p.name}</Typography>
                                                {p.reference && <Typography variant="caption" color="text.secondary">{p.reference}</Typography>}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">{p.category}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography
                                                    variant="body2"
                                                    fontWeight="600"
                                                    color={p.is_out_of_stock ? 'error.main' : p.is_low_stock ? 'warning.main' : 'text.primary'}
                                                >
                                                    {p.stock_quantity}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(p.cost_price)}</TableCell>
                                            <TableCell align="right">{formatCurrency(p.sell_price)}</TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="700">
                                                    {formatCurrency(p.stock_value_cost)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="600" color={p.margin >= 0 ? 'success.main' : 'error.main'}>
                                                    {formatCurrency(p.margin)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Chip
                                                    label={`${p.margin_percent}%`}
                                                    size="small"
                                                    color={p.margin_percent > 30 ? 'success' : p.margin_percent > 10 ? 'warning' : 'default'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={sortedProducts.length}
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
        </Box>
    );
};

export default StockAnalytics;
