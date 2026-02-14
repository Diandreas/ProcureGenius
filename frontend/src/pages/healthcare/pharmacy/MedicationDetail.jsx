import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Chip, Divider, Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert, useTheme, Tabs, LinearProgress, Avatar, Tooltip } from '@mui/material';
import { SafeTab } from '../../../components/safe';
import { alpha } from '@mui/material/styles';
import {
    ArrowBack as ArrowBackIcon,
    LocalPharmacy as PharmacyIcon,
    Inventory as InventoryIcon,
    AttachMoney as MoneyIcon,
    History as HistoryIcon,
    Info as InfoIcon,
    EventBusy as ExpiredIcon,
    Schedule as ScheduleIcon,
    AccessTime as TimeIcon,
    CalendarToday as CalendarIcon,
    Business as SupplierIcon,
    Warehouse as WarehouseIcon,
    Category as CategoryIcon,
    QrCode as BarcodeIcon,
    TrendingUp as TrendingIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import pharmacyAPI from '../../../services/pharmacyAPI';
import { formatDate as formatDisplayDate } from '../../../utils/formatters';

const MedicationDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();

    const [loading, setLoading] = useState(true);
    const [medication, setMedication] = useState(null);
    const [dispensingHistory, setDispensingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        fetchMedication();
        fetchDispensingHistory();
    }, [id]);

    const fetchMedication = async () => {
        setLoading(true);
        try {
            const data = await pharmacyAPI.getMedication(id);
            setMedication(data);
        } catch (error) {
            console.error('Error fetching medication:', error);
            enqueueSnackbar('Erreur lors du chargement du médicament', { variant: 'error' });
            navigate('/healthcare/pharmacy');
        } finally {
            setLoading(false);
        }
    };

    const fetchDispensingHistory = async () => {
        setLoadingHistory(true);
        try {
            const response = await pharmacyAPI.getDispensingList({ medication_id: id });
            setDispensingHistory(Array.isArray(response) ? response : response.results || []);
        } catch (error) {
            console.error('Error fetching dispensing history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    if (!medication) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Médicament introuvable</Alert>
            </Box>
        );
    }

    const isLow = medication.stock_quantity <= (medication.low_stock_threshold || 5) && medication.stock_quantity > 0;
    const isOut = medication.stock_quantity <= 0;
    const stockColor = medication.is_expired ? theme.palette.error.dark
        : isOut ? theme.palette.error.main
            : isLow ? theme.palette.warning.main
                : theme.palette.success.main;

    const stockStatusLabel = isOut ? 'Rupture de stock' : isLow ? 'Stock faible' : 'En stock';
    const stockStatusColor = isOut ? 'error' : isLow ? 'warning' : 'success';

    const getExpirationColor = () => {
        if (!medication.expiration_date) return theme.palette.text.secondary;
        if (medication.is_expired) return theme.palette.error.main;
        if (medication.days_until_expiration <= 30) return theme.palette.warning.main;
        return theme.palette.success.main;
    };

    const getExpirationLabel = () => {
        if (!medication.expiration_date) return 'Non définie';
        if (medication.is_expired) return `Périmé depuis ${Math.abs(medication.days_until_expiration)} jours`;
        if (medication.days_until_expiration <= 30) return `Expire dans ${medication.days_until_expiration} jours`;
        if (medication.days_until_expiration <= 90) return `Expire dans ${medication.days_until_expiration} jours`;
        return `Valide (${medication.days_until_expiration} jours restants)`;
    };

    // Info Card Component
    const InfoCard = ({ icon: Icon, iconColor, title, children, sx = {} }) => (
        <Card
            sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                ...sx,
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" gutterBottom fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}>
                    <Icon sx={{ color: iconColor || 'primary.main', fontSize: 22 }} />
                    {title}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                {children}
            </CardContent>
        </Card>
    );

    // Metric Box Component
    const MetricBox = ({ label, value, color, bgColor, icon: Icon }) => (
        <Box
            sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: bgColor || alpha(color || theme.palette.primary.main, 0.08),
                textAlign: 'center',
                border: '1px solid',
                borderColor: alpha(color || theme.palette.primary.main, 0.15),
            }}
        >
            {Icon && <Icon sx={{ fontSize: 24, color: color || 'primary.main', mb: 0.5 }} />}
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                {label}
            </Typography>
            <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                    mt: 0.5,
                    color: color || 'primary.main',
                    background: color ? undefined : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    backgroundClip: color ? undefined : 'text',
                    WebkitBackgroundClip: color ? undefined : 'text',
                    WebkitTextFillColor: color ? undefined : 'transparent',
                }}
            >
                {value}
            </Typography>
        </Box>
    );

    // Tab: Informations
    const InfoTab = () => (
        <Grid container spacing={3}>
            {/* Main Content */}
            <Grid item xs={12} md={8}>
                {/* General Info */}
                <InfoCard icon={InfoIcon} iconColor={theme.palette.primary.main} title="Informations Générales" sx={{ mb: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Nom du Médicament</Typography>
                                    <Typography variant="body1" fontWeight={700}>{medication.name}</Typography>
                                </Box>
                                {medication.reference && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Référence</Typography>
                                        <Typography variant="body1" fontFamily="monospace">{medication.reference}</Typography>
                                    </Box>
                                )}
                                {medication.barcode && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Code-barres</Typography>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <BarcodeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                            <Typography variant="body1" fontFamily="monospace">{medication.barcode}</Typography>
                                        </Stack>
                                    </Box>
                                )}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Unité de vente</Typography>
                                    <Typography variant="body1">{medication.sell_unit || '—'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Unité de base</Typography>
                                    <Typography variant="body1">{medication.base_unit || '—'}</Typography>
                                </Box>
                                {medication.conversion_factor > 1 && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Conversion</Typography>
                                        <Typography variant="body1">
                                            1 {medication.sell_unit} = {medication.conversion_factor} {medication.base_unit}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Grid>

                        {medication.description && (
                            <Grid item xs={12}>
                                <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.1)}` }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Description</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>{medication.description}</Typography>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </InfoCard>

                {/* Dates & Expiration Info */}
                <InfoCard icon={CalendarIcon} iconColor={theme.palette.info.main} title="Dates & Péremption" sx={{ mb: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricBox
                                label="Enregistré le"
                                value={formatDisplayDate(medication.created_at)}
                                color={theme.palette.info.main}
                                icon={CalendarIcon}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricBox
                                label="Durée en stock"
                                value={`${medication.days_since_creation}j`}
                                color={theme.palette.info.main}
                                icon={TimeIcon}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricBox
                                label="Date de péremption"
                                value={formatDisplayDate(medication.expiration_date)}
                                color={getExpirationColor()}
                                icon={ExpiredIcon}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricBox
                                label="Statut péremption"
                                value={medication.expiration_date
                                    ? (medication.is_expired ? `${Math.abs(medication.days_until_expiration)}j périmé` : `${medication.days_until_expiration}j restants`)
                                    : 'N/A'
                                }
                                color={getExpirationColor()}
                                icon={ScheduleIcon}
                            />
                        </Grid>
                    </Grid>

                    {/* Expiration Alert */}
                    {medication.expiration_date && (
                        <Box sx={{ mt: 2 }}>
                            {medication.is_expired ? (
                                <Alert severity="error" variant="filled" sx={{ borderRadius: 2 }}>
                                    Ce médicament est périmé depuis {Math.abs(medication.days_until_expiration)} jours.
                                    Il ne devrait plus être dispensé.
                                </Alert>
                            ) : medication.days_until_expiration <= 30 ? (
                                <Alert severity="warning" variant="filled" sx={{ borderRadius: 2 }}>
                                    Attention : ce médicament expire dans {medication.days_until_expiration} jours ({formatDisplayDate(medication.expiration_date)}).
                                </Alert>
                            ) : medication.days_until_expiration <= 90 ? (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>
                                    Ce médicament expire dans {medication.days_until_expiration} jours ({formatDisplayDate(medication.expiration_date)}).
                                </Alert>
                            ) : null}
                        </Box>
                    )}
                </InfoCard>

                {/* Stock Information */}
                <InfoCard icon={InventoryIcon} iconColor={stockColor} title="Informations de Stock">
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <MetricBox
                                label="Stock Actuel"
                                value={medication.stock_quantity || 0}
                                color={stockColor}
                                icon={InventoryIcon}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <MetricBox
                                label="Seuil d'Alerte"
                                value={medication.low_stock_threshold || 5}
                                color={theme.palette.warning.main}
                                icon={WarningIcon}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <MetricBox
                                label="Valeur du Stock"
                                value={formatCurrency((medication.stock_quantity || 0) * parseFloat(medication.price || 0))}
                                color={theme.palette.success.main}
                                icon={TrendingIcon}
                            />
                        </Grid>
                    </Grid>

                    {/* Stock Level Bar */}
                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Niveau de stock</Typography>
                            <Chip label={stockStatusLabel} color={stockStatusColor} size="small" sx={{ fontWeight: 700 }} />
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (medication.stock_quantity / ((medication.low_stock_threshold || 5) * 3)) * 100)}
                            sx={{
                                height: 10,
                                borderRadius: 5,
                                bgcolor: alpha(stockColor, 0.1),
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 5,
                                    background: `linear-gradient(90deg, ${stockColor}, ${alpha(stockColor, 0.7)})`,
                                }
                            }}
                        />
                    </Box>
                </InfoCard>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
                {/* Price Card */}
                <Card
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.main, 0.02)})`,
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        overflow: 'hidden',
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0, left: 0, right: 0,
                            height: 4,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                        }
                    }}
                >
                    <CardContent sx={{ p: 2.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Prix</Typography>
                        <Stack spacing={2}>
                            <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.1), textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>PRIX DE VENTE</Typography>
                                <Typography
                                    variant="h4"
                                    fontWeight={800}
                                    sx={{
                                        mt: 0.5,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    {formatCurrency(medication.price || 0)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    par {medication.sell_unit || 'unité'}
                                </Typography>
                            </Box>

                            {parseFloat(medication.cost_price || 0) > 0 && (
                                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(theme.palette.info.main, 0.08), textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>PRIX D'ACHAT</Typography>
                                    <Typography variant="h5" fontWeight={700} color="info.main" sx={{ mt: 0.5 }}>
                                        {formatCurrency(medication.cost_price || 0)}
                                    </Typography>
                                </Box>
                            )}

                            {parseFloat(medication.cost_price || 0) > 0 && (
                                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(theme.palette.success.main, 0.08), textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>MARGE</Typography>
                                    <Typography variant="h5" fontWeight={700} color="success.main" sx={{ mt: 0.5 }}>
                                        {formatCurrency(parseFloat(medication.price || 0) - parseFloat(medication.cost_price || 0))}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {/* Summary Card */}
                <Card
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <CardContent sx={{ p: 2.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Résumé</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <PharmacyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Type</Typography>
                                    <Typography variant="body2" fontWeight={600}>Médicament</Typography>
                                </Box>
                            </Box>
                            {medication.category_name && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <CategoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Catégorie</Typography>
                                        <Typography variant="body2" fontWeight={600}>{medication.category_name}</Typography>
                                    </Box>
                                </Box>
                            )}
                            {medication.supplier_name && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <SupplierIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Fournisseur</Typography>
                                        <Typography variant="body2" fontWeight={600}>{medication.supplier_name}</Typography>
                                    </Box>
                                </Box>
                            )}
                            {medication.warehouse_name && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <WarehouseIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Entrepôt</Typography>
                                        <Typography variant="body2" fontWeight={600}>{medication.warehouse_name}</Typography>
                                    </Box>
                                </Box>
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {/* Stock Settings Card */}
                <Card
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <CardContent sx={{ p: 2.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarningIcon sx={{ fontSize: 18 }} />
                            Paramètres de Stock
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={2}>
                            {/* Low Stock Threshold */}
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                                    Seuil d'Alerte
                                </Typography>
                                <Typography variant="h5" fontWeight={700} color="warning.main">
                                    {medication.low_stock_threshold || 10} {medication.base_unit || 'unités'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Alerte si stock ≤ cette valeur
                                </Typography>
                            </Box>

                            {/* Supply Lead Time */}
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                                    Délai d'Approvisionnement
                                </Typography>
                                <Typography variant="h5" fontWeight={700} color="info.main">
                                    {Math.round((medication.supply_lead_time_days || 90) / 30)} mois
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    ({medication.supply_lead_time_days || 90} jours)
                                </Typography>
                            </Box>

                            {/* Recommended Reorder Quantity */}
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                                    Quantité de Réapprovisionnement
                                </Typography>
                                <Typography variant="h5" fontWeight={700} color="success.main">
                                    {Math.max(0, ((medication.low_stock_threshold || 10) * 2) - (medication.stock_quantity || 0))} {medication.base_unit || 'unités'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Quantité recommandée à commander
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Expiration Status Card */}
                <Card
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        background: medication.is_expired
                            ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.12)}, ${alpha(theme.palette.error.main, 0.04)})`
                            : medication.days_until_expiration !== null && medication.days_until_expiration <= 30
                                ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.12)}, ${alpha(theme.palette.warning.main, 0.04)})`
                                : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)}, ${alpha(theme.palette.success.main, 0.02)})`,
                        border: `2px solid ${alpha(getExpirationColor(), 0.3)}`,
                    }}
                >
                    <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                        <ExpiredIcon sx={{ fontSize: 36, color: getExpirationColor(), mb: 1 }} />
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                            Statut Péremption
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ color: getExpirationColor() }}>
                            {getExpirationLabel()}
                        </Typography>
                        {medication.expiration_date && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {formatDisplayDate(medication.expiration_date)}
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                {/* System Info */}
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                            Informations Système
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={1.5}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Date de création</Typography>
                                <Typography variant="body2">{formatDisplayDate(medication.created_at)}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Durée de stockage</Typography>
                                <Typography variant="body2" fontWeight={600} color="primary">
                                    {medication.days_since_creation} jour{medication.days_since_creation !== 1 ? 's' : ''}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Dernière mise à jour</Typography>
                                <Typography variant="body2">{formatDisplayDate(medication.updated_at)}</Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );

    // Tab: Dispensing History
    const HistoryTab = () => (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" gutterBottom fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon sx={{ color: theme.palette.primary.main }} />
                    Historique des Dispensations
                </Typography>
                <Divider sx={{ my: 2 }} />

                {loadingHistory ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : dispensingHistory.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>N° Dispensation</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Statut</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dispensingHistory.map((dispensing) => (
                                    <TableRow
                                        key={dispensing.id}
                                        hover
                                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}
                                        onClick={() => navigate(`/healthcare/pharmacy/dispensings/${dispensing.id}`)}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                                                {dispensing.dispensing_number}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {formatDisplayDate(dispensing.dispensed_at)}
                                        </TableCell>
                                        <TableCell>
                                            {dispensing.patient_name || 'Vente Comptoir'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={dispensing.status_display || dispensing.status}
                                                size="small"
                                                color={dispensing.status === 'dispensed' ? 'success' : dispensing.status === 'cancelled' ? 'error' : 'default'}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography fontWeight={600}>
                                                {formatCurrency(dispensing.total_amount || 0)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                            Aucune dispensation enregistrée pour ce médicament
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/healthcare/pharmacy')}
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                    >
                        Retour
                    </Button>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                    <Avatar
                        variant="rounded"
                        sx={{
                            width: 56,
                            height: 56,
                            bgcolor: stockColor,
                            borderRadius: 2.5,
                            boxShadow: `0 6px 16px ${alpha(stockColor, 0.35)}`
                        }}
                    >
                        <PharmacyIcon sx={{ fontSize: 30 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            {medication.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Chip label={medication.reference} size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: 'monospace' }} />
                            <Chip label={stockStatusLabel} size="small" color={stockStatusColor} sx={{ fontWeight: 700 }} />
                            {medication.is_expired && (
                                <Chip label="PERIME" size="small" color="error" variant="filled" sx={{ fontWeight: 700 }} />
                            )}
                            {medication.days_until_expiration !== null && medication.days_until_expiration !== undefined && medication.days_until_expiration >= 0 && medication.days_until_expiration <= 30 && !medication.is_expired && (
                                <Chip label={`Expire dans ${medication.days_until_expiration}j`} size="small" color="warning" variant="filled" sx={{ fontWeight: 600 }} />
                            )}
                        </Stack>
                    </Box>
                </Stack>
            </Box>

            {/* Tabs */}
            <Paper
                elevation={0}
                sx={{
                    mb: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        px: 2,
                        '& .MuiTab-root': {
                            fontWeight: 600,
                            textTransform: 'none',
                            minHeight: 56,
                            fontSize: '0.9rem',
                        },
                    }}
                >
                    <SafeTab icon={<InfoIcon />} iconPosition="start" label="Informations" />
                    <SafeTab icon={<HistoryIcon />} iconPosition="start" label="Dispensations" />
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 0 && <InfoTab />}
                {activeTab === 1 && <HistoryTab />}
            </motion.div>
        </Box>
    );
};

export default MedicationDetail;
