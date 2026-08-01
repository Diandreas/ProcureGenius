import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Grid, TextField, Typography, Chip, IconButton,
    InputAdornment, Tooltip, Stack, useTheme, useMediaQuery, Button, alpha,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
    Add as AddIcon, Search as SearchIcon, MedicalInformation as ImagingIcon,
    AccessTime as PendingIcon, AccessTime, Autorenew as ProcessingIcon,
    CheckCircle as CompletedIcon, Error as UrgentIcon, CalendarToday,
    Person as PersonIcon, ArrowForward, Print as PrintIcon,
    ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon, Today as TodayIcon,
    SwapHoriz as SubcontractedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';
import imagingAPI from '../../../services/imagingAPI';
import LoadingState from '../../../components/LoadingState';
import { formatDate as formatDisplayDate, formatTime } from '../../../utils/formatters';

dayjs.locale('fr');

const STATUS_COLORS = {
    prescribed: 'default',
    in_progress: 'warning',
    results_ready: 'success',
    results_delivered: 'success',
    cancelled: 'error',
};

const STATUS_LABELS = {
    prescribed: 'Prescrit',
    in_progress: 'En cours',
    results_ready: 'Résultats prêts',
    results_delivered: 'Résultats livrés',
    cancelled: 'Annulé',
};

const ImagingOrderList = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [quickFilter, setQuickFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quickFilter, search, startDate, endDate]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let params = { search, page_size: 50 };
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            if (!startDate && !endDate) {
                if (quickFilter === 'prescribed') params.status = 'prescribed';
                else if (quickFilter === 'processing') params.status = 'in_progress';
                else if (quickFilter === 'completed') params.status_in = 'results_ready,results_delivered';
                else if (quickFilter === 'urgent') params.priority = 'urgent';
                else if (quickFilter === 'subcontracted') params.is_subcontracted = 'true';
            }

            const data = await imagingAPI.getOrders(params);
            setOrders(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching imaging orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => date.toISOString().split('T')[0];

    const goToPreviousDay = () => {
        const d = startDate ? new Date(startDate) : new Date();
        d.setDate(d.getDate() - 1);
        setStartDate(formatDate(d)); setEndDate(formatDate(d)); setQuickFilter('');
    };
    const goToToday = () => {
        const t = formatDate(new Date());
        setStartDate(t); setEndDate(t); setQuickFilter('');
    };
    const goToNextDay = () => {
        const d = startDate ? new Date(startDate) : new Date();
        d.setDate(d.getDate() + 1);
        setStartDate(formatDate(d)); setEndDate(formatDate(d)); setQuickFilter('');
    };

    const handleQuickFilterClick = (filter) => setQuickFilter(filter === quickFilter ? '' : filter);

    const handlePrintReport = async (e, orderId) => {
        e.stopPropagation();
        try {
            enqueueSnackbar('Génération du rapport...', { variant: 'info' });
            const blob = await imagingAPI.getResultsPDF(orderId);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error printing imaging report:', error);
            enqueueSnackbar('Erreur lors de la génération du rapport', { variant: 'error' });
        }
    };

    const ImagingOrderCard = ({ order, index }) => {
        const examsToShow = order.items?.slice(0, 3) || [];
        const remaining = (order.items?.length || 0) - examsToShow.length;

        return (
            <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                <Card
                    sx={{
                        borderRadius: 3, height: '100%', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        background: theme => `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                        border: '2px solid',
                        borderColor: order.priority === 'urgent' ? 'error.main' : order.is_subcontracted ? 'secondary.main' : 'divider',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 24px -10px ${alpha(theme.palette.primary.main, 0.2)}`, borderColor: 'primary.main' },
                    }}
                    onClick={() => navigate(`/healthcare/imaging/${order.id}`)}
                >
                    {(order.priority === 'urgent' || order.is_subcontracted) && (
                        <Box sx={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                            background: theme => order.priority === 'urgent'
                                ? `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                                : `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                        }} />
                    )}
                    <CardContent sx={{ p: 2.5, pt: order.priority === 'urgent' ? 3 : 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box sx={{ flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                    <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', px: 1, py: 0.25, borderRadius: 1, fontWeight: 700, fontFamily: 'monospace' }}>
                                        {order.order_number}
                                    </Typography>
                                    {order.priority === 'urgent' && (
                                        <Chip icon={<UrgentIcon />} label="URGENT" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                                    )}
                                    {order.is_subcontracted && (
                                        <Chip label={`↗ ${order.subcontractor_name || 'Sous-traité'}`} size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                                    )}
                                </Stack>
                                <Typography variant="h6" fontWeight="700" sx={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PersonIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    {order.patient_name}
                                </Typography>
                            </Box>
                            <Chip label={STATUS_LABELS[order.status] || order.status} size="small" color={STATUS_COLORS[order.status] || 'default'}
                                variant={order.status === 'prescribed' ? 'outlined' : 'filled'} sx={{ height: 26, fontWeight: 600, minWidth: 110, textAlign: 'center' }} />
                        </Stack>

                        <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 2, p: 1.5, mb: 2, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <ImagingIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight="700" color="primary">
                                    {order.exams_count || 0} Examen{(order.exams_count || 0) > 1 ? 's' : ''}
                                </Typography>
                            </Stack>
                            {examsToShow.length > 0 && (
                                <Stack spacing={0.5}>
                                    {examsToShow.map((item, idx) => (
                                        <Typography key={idx} variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500, display: 'block' }}>
                                            • {item.exam_type_detail?.name || item.exam_type_name}
                                        </Typography>
                                    ))}
                                    {remaining > 0 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', pl: 1 }}>
                                            + {remaining} autre{remaining > 1 ? 's' : ''}
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Box>

                        <Stack direction="row" spacing={2} mb={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary" fontWeight="600">{formatDisplayDate(order.order_date)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary" fontWeight="600">{formatTime(order.order_date)}</Typography>
                            </Box>
                        </Stack>

                        <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Tooltip title="Imprimer le rapport">
                                <IconButton size="small" onClick={(e) => handlePrintReport(e, order.id)}
                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}>
                                    <PrintIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" color="primary.main" fontWeight="700">Voir détails</Typography>
                                <ArrowForward sx={{ fontSize: 18, color: 'primary.main' }} />
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    const StatCard = ({ title, icon: Icon, color, filterKey, isActive }) => (
        <Card onClick={() => handleQuickFilterClick(filterKey)} sx={{
            cursor: 'pointer', borderRadius: 2.5, height: '100%',
            background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
            border: '1.5px solid', borderColor: isActive ? color : 'transparent',
            '&:hover': { transform: 'translateY(-2px)', borderColor: color },
        }}>
            <CardContent sx={{ p: 2, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', height: '100%' }}>
                <Icon sx={{ fontSize: 28, color, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="700" color={color}>{title}</Typography>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', bgcolor: 'background.default' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 0.5 }}>Imagerie</Typography>
                    <Typography variant="body1" color="text.secondary">Commandes et rapports d'imagerie médicale</Typography>
                </Box>
                <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => navigate('/healthcare/imaging/new')}
                    sx={{ borderRadius: 3, px: 3, py: 1.5 }}>
                    Nouvelle Commande
                </Button>
            </Stack>

            <Grid container spacing={2} mb={4}>
                <Grid item xs={6} md={2.4}>
                    <StatCard title="Prescrit" icon={PendingIcon} color={theme.palette.text.secondary} filterKey="prescribed" isActive={quickFilter === 'prescribed'} />
                </Grid>
                <Grid item xs={6} md={2.4}>
                    <StatCard title="En Cours" icon={ProcessingIcon} color={theme.palette.warning.main} filterKey="processing" isActive={quickFilter === 'processing'} />
                </Grid>
                <Grid item xs={6} md={2.4}>
                    <StatCard title="Terminé" icon={CompletedIcon} color={theme.palette.success.main} filterKey="completed" isActive={quickFilter === 'completed'} />
                </Grid>
                <Grid item xs={6} md={2.4}>
                    <StatCard title="Urgent" icon={UrgentIcon} color={theme.palette.error.main} filterKey="urgent" isActive={quickFilter === 'urgent'} />
                </Grid>
                <Grid item xs={6} md={2.4}>
                    <StatCard title="Sous-traités" icon={SubcontractedIcon} color={theme.palette.secondary.main} filterKey="subcontracted" isActive={quickFilter === 'subcontracted'} />
                </Grid>
            </Grid>

            <Card sx={{ mb: 3, borderRadius: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth placeholder="Rechercher une commande, un patient..." value={search} onChange={(e) => setSearch(e.target.value)}
                                size={isMobile ? 'small' : 'medium'}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                                <DatePicker label="Date de début" value={startDate ? dayjs(startDate) : null}
                                    onChange={(date) => { setStartDate(date ? date.format('YYYY-MM-DD') : ''); setQuickFilter(''); }}
                                    slotProps={{ textField: { fullWidth: true, size: isMobile ? 'small' : 'medium' } }} format="DD/MM/YYYY" />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                                <DatePicker label="Date de fin" value={endDate ? dayjs(endDate) : null}
                                    onChange={(date) => { setEndDate(date ? date.format('YYYY-MM-DD') : ''); setQuickFilter(''); }}
                                    slotProps={{ textField: { fullWidth: true, size: isMobile ? 'small' : 'medium' } }} format="DD/MM/YYYY" />
                            </LocalizationProvider>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Stack direction="row" spacing={1}>
                            <Button size="small" variant="outlined" startIcon={<ArrowBackIcon />} onClick={goToPreviousDay}>Jour Précédent</Button>
                            <Button size="small" variant={startDate === formatDate(new Date()) && endDate === formatDate(new Date()) ? 'contained' : 'outlined'} startIcon={<TodayIcon />} onClick={goToToday}>Aujourd'hui</Button>
                            <Button size="small" variant="outlined" endIcon={<ArrowForwardIcon />} onClick={goToNextDay}>Jour Suivant</Button>
                        </Stack>
                        {(startDate || endDate) && (
                            <Chip label={`Période: ${startDate || '...'} → ${endDate || '...'}`} onDelete={() => { setStartDate(''); setEndDate(''); }} color="primary" size="small" />
                        )}
                    </Box>
                </CardContent>
            </Card>

            <Grid container spacing={2.5}>
                {loading ? (
                    <Grid item xs={12}><LoadingState /></Grid>
                ) : orders.length === 0 ? (
                    <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Typography variant="h6" color="text.secondary">Aucune commande trouvée</Typography>
                        </Box>
                    </Grid>
                ) : (
                    orders.map((order, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                            <ImagingOrderCard order={order} index={index} />
                        </Grid>
                    ))
                )}
            </Grid>
        </Box>
    );
};

export default ImagingOrderList;
