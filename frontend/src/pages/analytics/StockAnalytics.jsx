import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack
} from '@mui/material';
import {
    WarningAmber as WarningIcon,
    TrendingUp as TrendingUpIcon,
    Inventory as InventoryIcon,
    ErrorOutline as DormantIcon,
    ShoppingCart as OrderIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

const StockAnalytics = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [period, setPeriod] = useState(30);

    useEffect(() => {
        fetchStats();
    }, [period]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await api.get('/analytics/api/stock/detailed/', {
                params: { days: period }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stock stats:', error);
            enqueueSnackbar('Erreur de chargement des statistiques', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!stats) {
        return (
            <Alert severity="error">Impossible de charger les statistiques</Alert>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                    Analytiques Stock Détaillées
                </Typography>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Période</InputLabel>
                    <Select
                        value={period}
                        label="Période"
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <MenuItem value={7}>7 jours</MenuItem>
                        <MenuItem value={30}>30 jours</MenuItem>
                        <MenuItem value={90}>90 jours</MenuItem>
                        <MenuItem value={180}>180 jours</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <Grid container spacing={3}>
                {/* Products to Order */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <OrderIcon color="error" />
                                <Typography variant="h6">
                                    Produits à Commander
                                </Typography>
                                <Chip
                                    label={`${stats.to_order_count} produits`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                />
                            </Stack>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Produit</TableCell>
                                            <TableCell align="right">Stock</TableCell>
                                            <TableCell align="right">Seuil</TableCell>
                                            <TableCell align="right">Manquant</TableCell>
                                            <TableCell align="right">Coût Est.</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats.to_order.slice(0, 10).map((product) => (
                                            <TableRow key={product.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {product.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {product.reference}
                                                        {product.supplier_name && ` • ${product.supplier_name}`}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        color={product.current_stock === 0 ? 'error' : 'warning.main'}
                                                        fontWeight="bold"
                                                    >
                                                        {product.stock_in_sell_units} {product.sell_unit}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        ({product.current_stock} {product.base_unit})
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {product.threshold}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={product.shortage}
                                                        size="small"
                                                        color="error"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {product.estimated_cost.toFixed(0)} FCFA
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {stats.to_order.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">
                                                    <Typography color="text.secondary">
                                                        Aucun produit à commander
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Risk Products */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <WarningIcon color="warning" />
                                <Typography variant="h6">
                                    Produits à Risque
                                </Typography>
                                <Chip
                                    label={`${stats.risk_products_count} produits`}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                Produits avec ruptures fréquentes (3+ dans les 90 derniers jours)
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Produit</TableCell>
                                            <TableCell align="right">Ruptures</TableCell>
                                            <TableCell align="right">Stock Actuel</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats.risk_products.map((product) => (
                                            <TableRow key={product.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {product.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {product.reference}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={`${product.loss_count}x`}
                                                        size="small"
                                                        color="error"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {product.stock_in_sell_units} {product.sell_unit}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {stats.risk_products.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center">
                                                    <Typography color="text.secondary">
                                                        Aucun produit à risque détecté
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Top Movers */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <TrendingUpIcon color="success" />
                                <Typography variant="h6">
                                    Top Produits Vendus
                                </Typography>
                            </Stack>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Produit</TableCell>
                                            <TableCell align="right">Vendu</TableCell>
                                            <TableCell align="right">Stock</TableCell>
                                            <TableCell align="right">Revenu</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats.top_movers.map((product, index) => (
                                            <TableRow key={product.id} hover>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Chip
                                                            label={`#${index + 1}`}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {product.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {product.reference}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                                        {product.total_sold_sell_units} {product.sell_unit}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        ({product.total_sold} base)
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {product.current_stock}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight="bold" color="success.main">
                                                        {product.revenue.toFixed(0)} FCFA
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {stats.top_movers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">
                                                    <Typography color="text.secondary">
                                                        Aucune vente sur la période
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Dormant Products */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <DormantIcon color="action" />
                                <Typography variant="h6">
                                    Produits Dormants
                                </Typography>
                                <Chip
                                    label={`${stats.dormant_count} produits`}
                                    size="small"
                                    variant="outlined"
                                />
                            </Stack>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="caption">
                                    Valeur immobilisée: <strong>{stats.dormant_value.toFixed(0)} FCFA</strong>
                                </Typography>
                            </Alert>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                Aucun mouvement depuis 90 jours
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Produit</TableCell>
                                            <TableCell align="right">Stock</TableCell>
                                            <TableCell align="right">Valeur</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats.dormant.map((product) => (
                                            <TableRow key={product.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {product.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {product.reference}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {product.stock_in_sell_units} {product.sell_unit}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        ({product.stock_quantity} base)
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" color="text.secondary">
                                                        {product.immobilized_value.toFixed(0)} FCFA
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {stats.dormant.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center">
                                                    <Typography color="text.secondary">
                                                        Aucun produit dormant
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default StockAnalytics;
