import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    Alert,
    Avatar,
    FormControlLabel,
    Switch,
    Autocomplete,
    CircularProgress,
    LinearProgress,
    Stack,
    Divider,
    alpha,
} from '@mui/material';
import {
    Science as ScienceIcon,
    Warning as WarningIcon,
    CheckCircle as OkIcon,
    Error as ExpiredIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    LockOpen as OpenIcon,
    Opacity as OpacityIcon,
    Schedule as ScheduleIcon,
    Inventory as InventoryIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import batchAPI from '../../../services/batchAPI';
import { productsAPI } from '../../../services/api';

const StatCard = ({ title, value, icon, color }) => (
    <Card
        sx={{
            height: '100%',
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(color, 0.05)} 0%, ${alpha(color, 0.02)} 100%)`,
            border: `1px solid ${alpha(color, 0.15)}`,
            transition: 'all 0.3s ease',
            '&:hover': {
                boxShadow: `0 8px 24px ${alpha(color, 0.2)}`,
                transform: 'translateY(-4px)'
            }
        }}
    >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2.5, px: 3 }}>
            <Box>
                <Typography color="text.secondary" variant="subtitle2" gutterBottom fontWeight={500}>
                    {title}
                </Typography>
                <Typography variant="h3" fontWeight="bold" sx={{ color }}>
                    {value}
                </Typography>
            </Box>
            <Avatar sx={{ bgcolor: color, width: 64, height: 64, boxShadow: `0 4px 12px ${alpha(color, 0.3)}` }}>
                {icon}
            </Avatar>
        </CardContent>
    </Card>
);

const OpenedReagents = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ batches: [], total: 0, opened_count: 0, expired_count: 0, expiring_soon_count: 0 });
    const [showAll, setShowAll] = useState(false);

    // Open dialog
    const [openDialogVisible, setOpenDialogVisible] = useState(false);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productBatches, setProductBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(false);

    useEffect(() => {
        fetchData();
    }, [showAll]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await batchAPI.getOpenedReagents(showAll);
            setData(result);
        } catch (error) {
            console.error('Error fetching opened reagents:', error);
            enqueueSnackbar('Erreur lors du chargement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = async () => {
        setOpenDialogVisible(true);
        try {
            const res = await productsAPI.list({ product_type: 'physical' });
            const list = res.data?.results || res.data || [];
            setProducts(list);
        } catch (error) {
            console.error('Error fetching products:', error);
            enqueueSnackbar('Erreur lors du chargement des produits', { variant: 'error' });
        }
    };

    const handleProductSelect = async (product) => {
        setSelectedProduct(product);
        if (!product) {
            setProductBatches([]);
            return;
        }
        setLoadingBatches(true);
        try {
            const batches = await batchAPI.getProductBatches(product.id);
            // Only show available batches (not yet opened)
            const available = (Array.isArray(batches) ? batches : batches.results || [])
                .filter(b => b.status === 'available' && b.quantity_remaining > 0);
            setProductBatches(available);
        } catch (error) {
            console.error('Error fetching batches:', error);
            enqueueSnackbar('Erreur lors du chargement des lots', { variant: 'error' });
        } finally {
            setLoadingBatches(false);
        }
    };

    const handleOpenBatch = async (batchId) => {
        try {
            await batchAPI.openBatch(batchId);
            enqueueSnackbar('Lot marqué comme ouvert', { variant: 'success' });
            setOpenDialogVisible(false);
            setSelectedProduct(null);
            setProductBatches([]);
            fetchData();
        } catch (error) {
            const msg = error.response?.data?.error || 'Erreur lors de l\'ouverture';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    const getDaysProgress = (days, isExpired) => {
        if (isExpired || (days !== null && days <= 0)) {
            return { percent: 100, color: 'error', label: 'PÉRIMÉ' };
        }
        if (days === null) {
            return { percent: 0, color: 'default', label: '-' };
        }
        if (days <= 3) {
            return { percent: (1 - days / 14) * 100, color: 'error', label: `${days}j` };
        }
        if (days <= 7) {
            return { percent: (1 - days / 14) * 100, color: 'warning', label: `${days}j` };
        }
        if (days <= 14) {
            return { percent: (1 - days / 30) * 100, color: 'info', label: `${days}j` };
        }
        return { percent: (1 - Math.min(days, 60) / 60) * 100, color: 'success', label: `${days}j` };
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{
                background: theme => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                py: 4,
                px: 3,
                borderRadius: 3,
                mb: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <ScienceIcon sx={{ fontSize: 48 }} />
                            <Typography variant="h3" fontWeight={700}>
                                Réactifs & Lots
                            </Typography>
                        </Box>
                        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                            Gestion des réactifs ouverts et suivi des dates de péremption
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showAll}
                                    onChange={(e) => setShowAll(e.target.checked)}
                                    sx={{
                                        '& .MuiSwitch-thumb': { bgcolor: 'white' },
                                        '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.3)' }
                                    }}
                                />
                            }
                            label={<Typography variant="body2" fontWeight={500}>Tous les lots</Typography>}
                            sx={{ color: 'white', mr: 1 }}
                        />
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={fetchData}
                            variant="outlined"
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.5)',
                                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                            }}
                        >
                            Actualiser
                        </Button>
                        <Button
                            startIcon={<AddIcon />}
                            onClick={handleOpenDialog}
                            variant="contained"
                            sx={{
                                bgcolor: 'white',
                                color: 'primary.main',
                                fontWeight: 600,
                                '&:hover': { bgcolor: 'grey.100' }
                            }}
                        >
                            Ouvrir un réactif
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <StatCard title="Total lots" value={data.total} icon={<InventoryIcon sx={{ fontSize: 32 }} />} color="#1976d2" />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <StatCard title="Ouverts" value={data.opened_count} icon={<OpacityIcon sx={{ fontSize: 32 }} />} color="#2e7d32" />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <StatCard title="Expirent bientôt" value={data.expiring_soon_count} icon={<ScheduleIcon sx={{ fontSize: 32 }} />} color="#ed6c02" />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <StatCard title="Périmés" value={data.expired_count} icon={<ExpiredIcon sx={{ fontSize: 32 }} />} color="#d32f2f" />
                </Grid>
            </Grid>

            {/* Alerts */}
            {data.expired_count > 0 && (
                <Alert
                    severity="error"
                    icon={<ExpiredIcon />}
                    sx={{ mb: 2, borderRadius: 2, fontWeight: 500, fontSize: '1rem' }}
                >
                    <strong>{data.expired_count} lot(s) périmé(s)</strong> à retirer immédiatement du stock !
                </Alert>
            )}
            {data.expiring_soon_count > 0 && data.expired_count === 0 && (
                <Alert
                    severity="warning"
                    icon={<WarningIcon />}
                    sx={{ mb: 2, borderRadius: 2, fontWeight: 500, fontSize: '1rem' }}
                >
                    <strong>{data.expiring_soon_count} lot(s)</strong> expirent dans les 3 prochains jours. Vérifiez les stocks.
                </Alert>
            )}

            {/* Table */}
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Produit</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>N° Lot</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Ouvert le</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Péremption</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Validité restante</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Qté restante</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : data.batches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <ScienceIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary">
                                            {showAll ? 'Aucun lot disponible' : 'Aucun réactif ouvert'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            {showAll ? '' : 'Cliquez sur "Ouvrir un réactif" pour commencer le suivi'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.batches.map((batch) => {
                                    const progress = getDaysProgress(batch.days_until_expiry, batch.is_expired);
                                    return (
                                        <TableRow
                                            key={batch.id}
                                            hover
                                            sx={{
                                                bgcolor: batch.is_expired
                                                    ? alpha('#d32f2f', 0.08)
                                                    : batch.days_until_expiry !== null && batch.days_until_expiry <= 3
                                                    ? alpha('#ed6c02', 0.08)
                                                    : 'inherit',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: batch.is_expired
                                                        ? alpha('#d32f2f', 0.12)
                                                        : batch.days_until_expiry !== null && batch.days_until_expiry <= 3
                                                        ? alpha('#ed6c02', 0.12)
                                                        : alpha('#1976d2', 0.05)
                                                }
                                            }}
                                        >
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight={600}>{batch.product_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{batch.product_reference}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0.5}>
                                                    <Typography variant="body2" fontWeight={600}>{batch.batch_number}</Typography>
                                                    {batch.lot_number && (
                                                        <Chip label={`Lot: ${batch.lot_number}`} size="small" variant="outlined" sx={{ width: 'fit-content' }} />
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={batch.status === 'opened' ? <OpenIcon /> : <OkIcon />}
                                                    label={batch.status === 'opened' ? 'Ouvert' : batch.status === 'available' ? 'Disponible' : batch.status}
                                                    color={batch.status === 'opened' ? 'primary' : 'success'}
                                                    size="small"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatDateTime(batch.opened_at)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0.5}>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {formatDate(batch.effective_expiry)}
                                                    </Typography>
                                                    {batch.shelf_life_after_opening_days && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            ({batch.shelf_life_after_opening_days}j après ouverture)
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ minWidth: 200 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Chip
                                                            label={progress.label}
                                                            color={progress.color}
                                                            size="small"
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min(progress.percent, 100)}
                                                        color={progress.color}
                                                        sx={{
                                                            height: 8,
                                                            borderRadius: 4,
                                                            bgcolor: alpha(progress.color === 'error' ? '#d32f2f' : progress.color === 'warning' ? '#ed6c02' : '#1976d2', 0.1)
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="h6" fontWeight={700} color="primary">
                                                    {batch.quantity_remaining}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    / {batch.quantity} total
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Dialog: Ouvrir un réactif */}
            <Dialog
                open={openDialogVisible}
                onClose={() => {
                    setOpenDialogVisible(false);
                    setSelectedProduct(null);
                    setProductBatches([]);
                }}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
                            <OpenIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight={700}>Ouvrir un réactif</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Sélectionnez le lot à marquer comme ouvert
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Autocomplete
                        options={products}
                        getOptionLabel={(option) => `${option.name} (${option.reference})`}
                        value={selectedProduct}
                        onChange={(e, v) => handleProductSelect(v)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Rechercher un produit"
                                placeholder="Tapez pour rechercher..."
                                sx={{ mb: 3 }}
                            />
                        )}
                    />

                    {loadingBatches && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {selectedProduct && !loadingBatches && productBatches.length === 0 && (
                        <Alert severity="info" icon={<WarningIcon />} sx={{ borderRadius: 2 }}>
                            Aucun lot disponible (non ouvert) pour ce produit.
                        </Alert>
                    )}

                    {productBatches.length > 0 && (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>N° Lot</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Qté</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Péremption</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Durée après ouverture</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {productBatches.map((batch) => (
                                        <TableRow key={batch.id} hover>
                                            <TableCell><Typography fontWeight={600}>{batch.batch_number}</Typography></TableCell>
                                            <TableCell><Chip label={batch.quantity_remaining} color="primary" size="small" /></TableCell>
                                            <TableCell>{formatDate(batch.expiry_date)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={
                                                        batch.shelf_life_after_opening_days
                                                            ? `${batch.shelf_life_after_opening_days} jours`
                                                            : (selectedProduct?.default_shelf_life_after_opening
                                                                ? `${selectedProduct.default_shelf_life_after_opening} jours (défaut)`
                                                                : 'Non défini')
                                                    }
                                                    size="small"
                                                    variant="outlined"
                                                    color="info"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    startIcon={<OpenIcon />}
                                                    onClick={() => handleOpenBatch(batch.id)}
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    Ouvrir
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => {
                            setOpenDialogVisible(false);
                            setSelectedProduct(null);
                            setProductBatches([]);
                        }}
                        variant="outlined"
                    >
                        Fermer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OpenedReagents;
