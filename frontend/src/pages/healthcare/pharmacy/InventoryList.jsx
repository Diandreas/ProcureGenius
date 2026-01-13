import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Chip,
    IconButton,
    InputAdornment,
    Tooltip,
    Stack,
    useTheme,
    useMediaQuery,
    Button,
    alpha,
    LinearProgress,
    Paper
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    LocalPharmacy as PharmacyIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    CheckCircle as InStockIcon,
    AttachMoney as ValueIcon,
    Inventory as InventoryIcon,
    ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import pharmacyAPI from '../../../services/pharmacyAPI';
import LoadingState from '../../../components/LoadingState';

const InventoryList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [medications, setMedications] = useState([]);
    const [search, setSearch] = useState('');
    const [quickFilter, setQuickFilter] = useState('');

    useEffect(() => {
        fetchInventory();
    }, [search]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const data = await pharmacyAPI.getMedications({ search, page_size: 50 });
            setMedications(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickFilterClick = (filter) => {
        setQuickFilter(quickFilter === filter ? '' : filter);
    };

    // Derived Logic
    const filteredMedications = medications.filter(med => {
        if (!quickFilter) return true;
        if (quickFilter === 'low_stock') return med.current_stock <= (med.min_stock_level || 5) && med.current_stock > 0;
        if (quickFilter === 'out_of_stock') return med.current_stock <= 0;
        if (quickFilter === 'in_stock') return med.current_stock > (med.min_stock_level || 5);
        return true;
    });

    const totalItems = medications.length;
    const lowStockCount = medications.filter(m => m.current_stock <= (m.min_stock_level || 5) && m.current_stock > 0).length;
    const outStockCount = medications.filter(m => m.current_stock <= 0).length;
    const totalValue = medications.reduce((sum, m) => sum + (m.current_stock * m.unit_price), 0);

    const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(amount);

    const MedicationCard = ({ med, index }) => {
        const isLow = med.current_stock <= (med.min_stock_level || 5) && med.current_stock > 0;
        const isOut = med.current_stock <= 0;

        let statusColor = 'success';
        if (isLow) statusColor = 'warning';
        if (isOut) statusColor = 'error';

        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
            >
                <Card
                    sx={{
                        borderRadius: 3,
                        height: '100%',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        background: theme => `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 12px 24px -10px ${alpha(theme.palette[statusColor].main, 0.2)}`,
                            borderColor: `${statusColor}.main`,
                        }
                    }}
                // onClick={() => navigate(`/healthcare/pharmacy/medications/${med.id}`)} // Assuming detail page exists
                >
                    {/* Stock Level Indicator Bar */}
                    <Box sx={{ px: 2, pt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Stock Level</Typography>
                            <Typography variant="caption" fontWeight="bold" color={`${statusColor}.main`}>
                                {med.current_stock} / {med.min_stock_level || 5}
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (med.current_stock / (med.min_stock_level * 2 || 20)) * 100)}
                            color={statusColor}
                            sx={{ height: 6, borderRadius: 3, bgcolor: alpha(theme.palette[statusColor].main, 0.1) }}
                        />
                    </Box>

                    <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: `linear-gradient(135deg, ${alpha(theme.palette[statusColor].main, 0.2)}, ${alpha(theme.palette[statusColor].main, 0.1)})`,
                                    color: `${statusColor}.main`
                                }}
                            >
                                <PharmacyIcon />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle1" noWrap fontWeight="700">
                                    {med.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                    {med.description || 'No description'}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ bgcolor: alpha(theme.palette.background.default, 0.6), p: 1.5, borderRadius: 2 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Prix Unitaire</Typography>
                                <Typography variant="body2" fontWeight="600">
                                    {formatCurrency(med.unit_price)}
                                </Typography>
                            </Box>
                            {isOut ? (
                                <Chip label="RUPTURE" size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                            ) : isLow ? (
                                <Chip label="BAS" size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                            ) : (
                                <Chip label="EN STOCK" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    const StatCard = ({ title, count, subtitle, icon: Icon, color, filterKey, isActive }) => (
        <Card
            onClick={() => handleQuickFilterClick(filterKey)}
            sx={{
                cursor: 'pointer',
                borderRadius: 2.5,
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: isActive ? color : 'transparent',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: color,
                    boxShadow: `0 8px 20px ${alpha(color, 0.15)}`
                }
            }}
        >
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Icon sx={{ fontSize: 32, color: color, mb: 1 }} />
                <Typography variant="h4" fontWeight="700" color={color} sx={{ mb: 0.5 }}>
                    {count}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="600">
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ background: theme => `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`, backgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
                        {t('pharmacy.inventory', 'Pharmacie Stock')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Gestion des stocks et médicaments
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/healthcare/pharmacy/dispense/new')}
                    sx={{
                        borderRadius: 3,
                        px: 3,
                        py: 1.5,
                        background: theme => `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                        boxShadow: theme => `0 8px 20px -4px ${alpha(theme.palette.success.main, 0.5)}`,
                        '&:hover': { boxShadow: theme => `0 12px 24px -6px ${alpha(theme.palette.success.main, 0.6)}` }
                    }}
                >
                    {t('pharmacy.dispense', 'Nouvelle Dispensation')}
                </Button>
            </Stack>

            {/* Filters Grid */}
            <Grid container spacing={2} mb={4}>
                <Grid item xs={6} md={3}>
                    <StatCard title="Total Produits" count={totalItems} icon={InventoryIcon} color={theme.palette.primary.main} filterKey="" isActive={quickFilter === ''} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Stock Bas" count={lowStockCount} icon={WarningIcon} color={theme.palette.warning.main} filterKey="low_stock" isActive={quickFilter === 'low_stock'} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Rupture" count={outStockCount} icon={ErrorIcon} color={theme.palette.error.main} filterKey="out_of_stock" isActive={quickFilter === 'out_of_stock'} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Valeur Stock" count={formatCurrency(totalValue)} subtitle="Estimée" icon={ValueIcon} color={theme.palette.success.main} filterKey="" isActive={false} />
                </Grid>
            </Grid>

            {/* Search */}
            <Paper
                elevation={0}
                sx={{
                    p: 1,
                    mb: 4,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                }}
            >
                <InputAdornment position="start" sx={{ pl: 1 }}>
                    <SearchIcon color="action" />
                </InputAdornment>
                <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Rechercher un médicament..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                />
            </Paper>

            {/* List */}
            <Grid container spacing={2.5}>
                {loading ? (
                    <Grid item xs={12}><LoadingState /></Grid>
                ) : filteredMedications.length === 0 ? (
                    <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Typography variant="h6" color="text.secondary">Aucun médicament trouvé</Typography>
                        </Box>
                    </Grid>
                ) : (
                    filteredMedications.map((med, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={med.id}>
                            <MedicationCard med={med} index={index} />
                        </Grid>
                    ))
                )}
            </Grid>
        </Box>
    );
};

export default InventoryList;
