import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Chip,
    InputAdornment,
    Stack,
    useTheme,
    useMediaQuery,
    Button,
    LinearProgress,
    Paper,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Collapse,
    IconButton,
    Tooltip,
    Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

// Initialize dayjs locale
dayjs.locale('fr');
import { alpha } from '@mui/material/styles';
import {
    Add as AddIcon,
    Search as SearchIcon,
    LocalPharmacy as PharmacyIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    CheckCircle as InStockIcon,
    AttachMoney as ValueIcon,
    Inventory as InventoryIcon,
    EventBusy as ExpiredIcon,
    Schedule as ScheduleIcon,
    FilterList as FilterListIcon,
    CalendarToday as CalendarIcon,
    Business as SupplierIcon,
    Warehouse as WarehouseIcon,
    Category as CategoryIcon,
    AccessTime as TimeIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import pharmacyAPI from '../../../services/pharmacyAPI';
import LoadingState from '../../../components/LoadingState';
import { formatDate } from '../../../utils/formatters';

const InventoryList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [medications, setMedications] = useState([]);
    const [search, setSearch] = useState('');
    const [quickFilter, setQuickFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Advanced filters
    const [expirationFilter, setExpirationFilter] = useState('');
    const [registeredAfter, setRegisteredAfter] = useState('');
    const [registeredBefore, setRegisteredBefore] = useState('');
    const [expirationAfter, setExpirationAfter] = useState('');
    const [expirationBefore, setExpirationBefore] = useState('');

    useEffect(() => {
        fetchInventory();
    }, [search]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const params = { search, page_size: 200 };
            const data = await pharmacyAPI.getMedications(params);
            setMedications(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickFilterClick = (filter) => {
        setQuickFilter(quickFilter === filter ? '' : filter);
        // Reset advanced filters when using quick filter
        if (filter !== quickFilter) {
            setExpirationFilter('');
        }
    };

    const clearAllFilters = () => {
        setQuickFilter('');
        setExpirationFilter('');
        setRegisteredAfter('');
        setRegisteredBefore('');
        setExpirationAfter('');
        setExpirationBefore('');
    };

    const hasActiveFilters = quickFilter || expirationFilter || registeredAfter || registeredBefore || expirationAfter || expirationBefore;

    // Derived Logic with all filters
    const filteredMedications = useMemo(() => {
        return medications.filter(med => {
            // Quick filter (stock status)
            if (quickFilter === 'low_stock') {
                if (!(med.stock_quantity <= (med.low_stock_threshold || 5) && med.stock_quantity > 0)) return false;
            }
            if (quickFilter === 'out_of_stock') {
                if (!(med.stock_quantity <= 0)) return false;
            }
            if (quickFilter === 'in_stock') {
                if (!(med.stock_quantity > (med.low_stock_threshold || 5))) return false;
            }
            if (quickFilter === 'expired') {
                if (!med.is_expired) return false;
            }
            if (quickFilter === 'expiring_soon') {
                if (med.days_until_expiration === null || med.days_until_expiration === undefined || med.days_until_expiration < 0 || med.days_until_expiration > 30) return false;
            }

            // Expiration dropdown filter
            if (expirationFilter === 'expired' && !med.is_expired) return false;
            if (expirationFilter === 'expiring_soon') {
                if (med.days_until_expiration === null || med.days_until_expiration === undefined || med.days_until_expiration < 0 || med.days_until_expiration > 30) return false;
            }
            if (expirationFilter === 'valid') {
                if (med.days_until_expiration === null || med.days_until_expiration === undefined || med.days_until_expiration < 0) return false;
            }
            if (expirationFilter === 'no_date' && med.expiration_date) return false;

            // Date range filters
            if (registeredAfter && med.created_at) {
                if (new Date(med.created_at) < new Date(registeredAfter)) return false;
            }
            if (registeredBefore && med.created_at) {
                if (new Date(med.created_at) > new Date(registeredBefore + 'T23:59:59')) return false;
            }
            if (expirationAfter && med.expiration_date) {
                if (new Date(med.expiration_date) < new Date(expirationAfter)) return false;
            }
            if (expirationBefore && med.expiration_date) {
                if (new Date(med.expiration_date) > new Date(expirationBefore)) return false;
            }

            return true;
        });
    }, [medications, quickFilter, expirationFilter, registeredAfter, registeredBefore, expirationAfter, expirationBefore]);

    // Stats
    const totalItems = medications.length;
    const inStockCount = medications.filter(m => m.stock_quantity > (m.low_stock_threshold || 5)).length;
    const lowStockCount = medications.filter(m => m.stock_quantity <= (m.low_stock_threshold || 5) && m.stock_quantity > 0).length;
    const outStockCount = medications.filter(m => m.stock_quantity <= 0).length;
    const expiredCount = medications.filter(m => m.is_expired).length;
    const expiringSoonCount = medications.filter(m => m.days_until_expiration !== null && m.days_until_expiration !== undefined && m.days_until_expiration >= 0 && m.days_until_expiration <= 30).length;
    const totalValue = medications.reduce((sum, m) => sum + ((m.stock_quantity || 0) * parseFloat(m.price || 0)), 0);

    const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);

    const getStockColor = (med) => {
        if (med.is_expired) return theme.palette.error.dark;
        if (med.stock_quantity <= 0) return theme.palette.error.main;
        if (med.stock_quantity <= (med.low_stock_threshold || 5)) return theme.palette.warning.main;
        return theme.palette.success.main;
    };

    const getExpirationChip = (med) => {
        if (!med.expiration_date) return null;
        if (med.is_expired) {
            return { label: `Périmé (${Math.abs(med.days_until_expiration)}j)`, color: 'error', variant: 'filled' };
        }
        if (med.days_until_expiration !== null && med.days_until_expiration <= 30) {
            return { label: `Expire dans ${med.days_until_expiration}j`, color: 'warning', variant: 'filled' };
        }
        if (med.days_until_expiration !== null && med.days_until_expiration <= 90) {
            return { label: `Expire dans ${med.days_until_expiration}j`, color: 'info', variant: 'outlined' };
        }
        return { label: formatDate(med.expiration_date), color: 'default', variant: 'outlined' };
    };

    const MedicationCard = ({ med, index }) => {
        const isLow = med.stock_quantity <= (med.low_stock_threshold || 5) && med.stock_quantity > 0;
        const isOut = med.stock_quantity <= 0;
        const stockColor = getStockColor(med);
        const expirationChip = getExpirationChip(med);

        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: index * 0.04, ease: [0.6, 0.05, 0.01, 0.9] }}
                whileHover={{ boxShadow: `0 20px 60px ${alpha(stockColor, 0.2)}` }}
                style={{ height: '100%' }}
            >
                <Card
                    onClick={() => navigate(`/healthcare/pharmacy/medications/${med.id}`)}
                    sx={{
                        cursor: 'pointer',
                        height: '100%',
                        borderRadius: 3,
                        background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(stockColor, 0.03)} 50%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                        boxShadow: `0 4px 20px ${alpha(stockColor, 0.08)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
                        backdropFilter: 'blur(20px)',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'box-shadow 0.3s ease',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 4,
                            background: med.is_expired
                                ? `repeating-linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.main} 8px, ${alpha(theme.palette.error.main, 0.3)} 8px, ${alpha(theme.palette.error.main, 0.3)} 16px)`
                                : `linear-gradient(90deg, ${stockColor}, ${alpha(stockColor, 0.5)})`,
                            borderRadius: '3px 3px 0 0',
                            boxShadow: `0 2px 8px ${alpha(stockColor, 0.3)}`
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: `radial-gradient(circle at top right, ${alpha(stockColor, 0.05)} 0%, transparent 70%)`,
                            pointerEvents: 'none'
                        }
                    }}
                >
                    <CardContent sx={{ p: 2 }}>
                        {/* Header: Avatar + Name */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                            <Avatar
                                variant="rounded"
                                sx={{
                                    width: isMobile ? 48 : 52,
                                    height: isMobile ? 48 : 52,
                                    bgcolor: stockColor,
                                    borderRadius: 2,
                                    boxShadow: `0 4px 12px ${alpha(stockColor, 0.3)}`
                                }}
                            >
                                <PharmacyIcon />
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 0.3,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        fontSize: isMobile ? '0.875rem' : '0.95rem',
                                    }}
                                >
                                    {med.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    {med.reference}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Price Section */}
                        <Box sx={{ mb: 1.5, py: 1, px: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.1rem',
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                {formatCurrency(med.price)}
                                <Typography component="span" variant="caption" sx={{ ml: 0.5, WebkitTextFillColor: theme.palette.text.secondary }}>
                                    / {med.sell_unit || 'unité'}
                                </Typography>
                            </Typography>
                        </Box>

                        {/* Info Stack */}
                        <Stack spacing={0.8} sx={{ mb: 1.5 }}>
                            {/* Stock Info */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <InventoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                    Stock: <strong style={{ color: stockColor }}>{med.stock_quantity}</strong> {med.base_unit || 'unités'}
                                </Typography>
                                {isOut ? (
                                    <Chip label="RUPTURE" size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                                ) : isLow ? (
                                    <Chip label="BAS" size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                                ) : (
                                    <Chip label="OK" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                                )}
                            </Box>

                            {/* Supplier */}
                            {med.supplier_name && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <SupplierIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {med.supplier_name}
                                    </Typography>
                                </Box>
                            )}

                            {/* Low Stock Threshold */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WarningIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    Seuil: <strong>{med.low_stock_threshold || 10}</strong> {med.base_unit || 'unités'}
                                </Typography>
                            </Box>

                            {/* Supply Lead Time */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    Délai: <strong>{Math.round((med.supply_lead_time_days || 90) / 30)}</strong> mois
                                </Typography>
                            </Box>

                            {/* Days since creation */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    Enregistré il y a <strong>{med.days_since_creation}</strong> jour{med.days_since_creation !== 1 ? 's' : ''}
                                </Typography>
                            </Box>

                            {/* Expiration */}
                            {expirationChip && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ExpiredIcon sx={{ fontSize: 16, color: med.is_expired ? 'error.main' : 'text.secondary' }} />
                                    <Chip
                                        label={expirationChip.label}
                                        color={expirationChip.color}
                                        variant={expirationChip.variant}
                                        size="small"
                                        sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                                    />
                                </Box>
                            )}
                        </Stack>

                        {/* Stock Level Bar */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                <Typography variant="caption" color="text.secondary">Niveau de stock</Typography>
                                <Typography variant="caption" fontWeight="bold" sx={{ color: stockColor }}>
                                    {med.stock_quantity} / {(med.low_stock_threshold || 5) * 2}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(100, (med.stock_quantity / ((med.low_stock_threshold || 5) * 2)) * 100)}
                                sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: alpha(stockColor, 0.1),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 3,
                                        background: `linear-gradient(90deg, ${stockColor}, ${alpha(stockColor, 0.7)})`,
                                    }
                                }}
                            />
                        </Box>
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    const StatCard = ({ title, count, subtitle, icon: Icon, color, filterKey, isActive }) => (
        <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                onClick={() => handleQuickFilterClick(filterKey)}
                sx={{
                    cursor: 'pointer',
                    borderRadius: 3,
                    height: '100%',
                    background: `linear-gradient(135deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.04)} 100%)`,
                    border: '2px solid',
                    borderColor: isActive ? color : 'transparent',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': isActive ? {
                        content: '""',
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: 3,
                        background: color,
                    } : {},
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        borderColor: color,
                        boxShadow: `0 8px 24px ${alpha(color, 0.2)}`
                    }
                }}
            >
                <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                    <Icon sx={{ fontSize: 30, color, mb: 0.5, opacity: 0.9 }} />
                    <Typography variant="h4" fontWeight="800" sx={{ color, mb: 0.3, fontSize: { xs: '1.5rem', md: '1.8rem' } }}>
                        {count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.8rem' }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                            {subtitle}
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={3}>
                <Box>
                    <Typography
                        variant="h4"
                        fontWeight="800"
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                        }}
                    >
                        <PharmacyIcon sx={{ color: theme.palette.success.main, fontSize: 36 }} />
                        {t('pharmacy.inventory', 'Pharmacie - Inventaire')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Gestion des stocks, péremptions et médicaments
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
                        fontWeight: 700,
                        background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                        boxShadow: `0 8px 20px -4px ${alpha(theme.palette.success.main, 0.5)}`,
                        '&:hover': { boxShadow: `0 12px 28px -6px ${alpha(theme.palette.success.main, 0.6)}` }
                    }}
                >
                    Nouvelle Dispensation
                </Button>
            </Stack>

            {/* Stat Cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={4} md={2}>
                    <StatCard title="Total" count={totalItems} icon={InventoryIcon} color={theme.palette.primary.main} filterKey="" isActive={quickFilter === ''} />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <StatCard title="En Stock" count={inStockCount} icon={InStockIcon} color={theme.palette.success.main} filterKey="in_stock" isActive={quickFilter === 'in_stock'} />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <StatCard title="Stock Bas" count={lowStockCount} icon={WarningIcon} color={theme.palette.warning.main} filterKey="low_stock" isActive={quickFilter === 'low_stock'} />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <StatCard title="Rupture" count={outStockCount} icon={ErrorIcon} color={theme.palette.error.main} filterKey="out_of_stock" isActive={quickFilter === 'out_of_stock'} />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <StatCard title="Périmés" count={expiredCount} icon={ExpiredIcon} color='#b71c1c' filterKey="expired" isActive={quickFilter === 'expired'} />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <StatCard title="Expire bientôt" count={expiringSoonCount} subtitle="< 30 jours" icon={ScheduleIcon} color={theme.palette.warning.dark} filterKey="expiring_soon" isActive={quickFilter === 'expiring_soon'} />
                </Grid>
            </Grid>

            {/* Search & Filters Bar */}
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <InputAdornment position="start" sx={{ pl: 1 }}>
                    <SearchIcon color="action" />
                </InputAdornment>
                <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Rechercher par nom, référence, code-barres..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                    sx={{ '& input': { fontSize: '0.95rem' } }}
                />
                <Tooltip title="Filtres avancés">
                    <IconButton
                        onClick={() => setShowFilters(!showFilters)}
                        sx={{
                            bgcolor: showFilters ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            color: showFilters ? 'primary.main' : 'text.secondary',
                        }}
                    >
                        <FilterListIcon />
                    </IconButton>
                </Tooltip>
                {hasActiveFilters && (
                    <Tooltip title="Effacer les filtres">
                        <IconButton onClick={clearAllFilters} color="error" size="small">
                            <ClearIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Paper>

            {/* Advanced Filters Panel */}
            <Collapse in={showFilters}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        mb: 3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilterListIcon fontSize="small" />
                        Filtres avancés
                    </Typography>
                    <Grid container spacing={2}>
                        {/* Expiration Status */}
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Statut péremption</InputLabel>
                                <Select
                                    value={expirationFilter}
                                    onChange={(e) => setExpirationFilter(e.target.value)}
                                    label="Statut péremption"
                                >
                                    <MenuItem value="">Tous</MenuItem>
                                    <MenuItem value="expired">Périmés</MenuItem>
                                    <MenuItem value="expiring_soon">Expire bientôt (&lt;30j)</MenuItem>
                                    <MenuItem value="valid">Valide</MenuItem>
                                    <MenuItem value="no_date">Sans date</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Registration Date Range */}
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                                <DatePicker
                                    label="Enregistré après"
                                    value={registeredAfter ? dayjs(registeredAfter) : null}
                                    onChange={(date) => setRegisteredAfter(date ? date.format('YYYY-MM-DD') : '')}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            variant: 'outlined'
                                        }
                                    }}
                                    format="DD/MM/YYYY"
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                                <DatePicker
                                    label="Enregistré avant"
                                    value={registeredBefore ? dayjs(registeredBefore) : null}
                                    onChange={(date) => setRegisteredBefore(date ? date.format('YYYY-MM-DD') : '')}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            variant: 'outlined'
                                        }
                                    }}
                                    format="DD/MM/YYYY"
                                />
                            </LocalizationProvider>
                        </Grid>

                        {/* Expiration Date Range */}
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                                <DatePicker
                                    label="Péremption après"
                                    value={expirationAfter ? dayjs(expirationAfter) : null}
                                    onChange={(date) => setExpirationAfter(date ? date.format('YYYY-MM-DD') : '')}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            variant: 'outlined'
                                        }
                                    }}
                                    format="DD/MM/YYYY"
                                />
                            </LocalizationProvider>
                        </Grid>
                    </Grid>
                </Paper>
            </Collapse>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                    {quickFilter && (
                        <Chip
                            label={quickFilter === 'in_stock' ? 'En stock' : quickFilter === 'low_stock' ? 'Stock bas' : quickFilter === 'out_of_stock' ? 'Rupture' : quickFilter === 'expired' ? 'Périmés' : 'Expire bientôt'}
                            onDelete={() => setQuickFilter('')}
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                    {expirationFilter && (
                        <Chip
                            label={`Péremption: ${expirationFilter === 'expired' ? 'Périmés' : expirationFilter === 'expiring_soon' ? 'Bientôt' : expirationFilter === 'valid' ? 'Valide' : 'Sans date'}`}
                            onDelete={() => setExpirationFilter('')}
                            color="secondary"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                    {registeredAfter && (
                        <Chip label={`Après: ${registeredAfter}`} onDelete={() => setRegisteredAfter('')} size="small" />
                    )}
                    {registeredBefore && (
                        <Chip label={`Avant: ${registeredBefore}`} onDelete={() => setRegisteredBefore('')} size="small" />
                    )}
                    {expirationAfter && (
                        <Chip label={`Exp. après: ${expirationAfter}`} onDelete={() => setExpirationAfter('')} size="small" />
                    )}
                    {expirationBefore && (
                        <Chip label={`Exp. avant: ${expirationBefore}`} onDelete={() => setExpirationBefore('')} size="small" />
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
                        {filteredMedications.length} résultat{filteredMedications.length !== 1 ? 's' : ''}
                    </Typography>
                </Stack>
            )}

            {/* Medications Grid */}
            <AnimatePresence mode="popLayout">
                <Grid container spacing={2.5}>
                    {loading ? (
                        <Grid item xs={12}><LoadingState /></Grid>
                    ) : filteredMedications.length === 0 ? (
                        <Grid item xs={12}>
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <PharmacyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Aucun médicament trouvé
                                </Typography>
                                <Typography variant="body2" color="text.disabled">
                                    {hasActiveFilters ? 'Essayez de modifier vos filtres' : 'Ajoutez des produits avec la catégorie "Médicaments"'}
                                </Typography>
                                {hasActiveFilters && (
                                    <Button onClick={clearAllFilters} sx={{ mt: 2 }} variant="outlined" size="small">
                                        Effacer les filtres
                                    </Button>
                                )}
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
            </AnimatePresence>

            {/* Footer Summary */}
            {!loading && filteredMedications.length > 0 && (
                <Paper
                    elevation={0}
                    sx={{
                        mt: 4,
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        <strong>{filteredMedications.length}</strong> médicament{filteredMedications.length !== 1 ? 's' : ''} affiché{filteredMedications.length !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Valeur totale du stock: <strong style={{ color: theme.palette.success.main }}>{formatCurrency(totalValue)}</strong>
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};

export default InventoryList;
