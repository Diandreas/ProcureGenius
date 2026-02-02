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
    Avatar,
    useTheme,
    useMediaQuery,
    Button,
    Paper,
    alpha
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Science as ScienceIcon,
    AccessTime as PendingIcon,
    AccessTime,
    Autorenew as ProcessingIcon,
    CheckCircle as CompletedIcon,
    Error as UrgentIcon,
    CalendarToday,
    Person as PersonIcon,
    ArrowForward,
    Print as PrintIcon,
    Description as DescriptionIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Today as TodayIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';
import laboratoryAPI from '../../../services/laboratoryAPI';
import LoadingState from '../../../components/LoadingState';
import PrintModal from '../../../components/PrintModal';

const LabOrderList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [quickFilter, setQuickFilter] = useState('pending'); // Default to pending actions
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchOrders();
    }, [quickFilter, search, startDate, endDate]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let params = { search, page_size: 50 };

            // Date filters
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            // Map quickFilter to API params (only if no custom date range)
            if (!startDate && !endDate) {
                if (quickFilter === 'pending') params.status_in = 'pending,sample_collected';
                else if (quickFilter === 'processing') params.status = 'in_progress';
                else if (quickFilter === 'completed') params.status_in = 'completed,results_ready,results_delivered';
                else if (quickFilter === 'urgent') params.priority = 'urgent';
            }

            const data = await laboratoryAPI.getOrders(params);
            setOrders(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    // Date navigation helpers
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    const goToPreviousDay = () => {
        const currentDate = startDate ? new Date(startDate) : new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const newDate = formatDate(currentDate);
        setStartDate(newDate);
        setEndDate(newDate);
        setQuickFilter('');
    };

    const goToToday = () => {
        const today = formatDate(new Date());
        setStartDate(today);
        setEndDate(today);
        setQuickFilter('');
    };

    const goToNextDay = () => {
        const currentDate = startDate ? new Date(startDate) : new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        const newDate = formatDate(currentDate);
        setStartDate(newDate);
        setEndDate(newDate);
        setQuickFilter('');
    };

    const handleQuickFilterClick = (filter) => {
        setQuickFilter(filter === quickFilter ? '' : filter);
    };

    // Print Modal State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleOpenPrintModal = () => {
        setPrintModalOpen(true);
    };

    const handlePrintAction = async (action) => {
        setIsGenerating(true);
        try {
            // Build params based on current filter
            let params = {};
            if (quickFilter === 'pending') {
                params.status = 'pending,sample_collected';
            } else if (quickFilter === 'processing') {
                params.status = 'in_progress';
            } else if (quickFilter === 'urgent') {
                params.priority = 'urgent';
            }

            const blob = await laboratoryAPI.getBulkBenchSheetsPDF(params);

            // Format Filename
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const filename = `fiches-paillasse-${dateStr}.pdf`;

            if (action === 'download') {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
                enqueueSnackbar('Fichier téléchargé avec succès', { variant: 'success' });
            } else if (action === 'preview' || action === 'print') {
                const url = window.URL.createObjectURL(blob);
                const printWindow = window.open(url, '_blank');

                if (printWindow && action === 'print') {
                    printWindow.onload = () => {
                        printWindow.print();
                    };
                }
            }
            setPrintModalOpen(false);
        } catch (error) {
            console.error('Error generating bulk bench sheets:', error);
            enqueueSnackbar('Erreur lors de la génération des fiches', { variant: 'error' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrintBenchSheet = async (e, orderId) => {
        e.stopPropagation(); // Prevent card click navigation
        try {
            enqueueSnackbar('Génération de la fiche de paillasse...', { variant: 'info' });
            const blob = await laboratoryAPI.getBenchSheetPDF(orderId);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error printing bench sheet:', error);
            enqueueSnackbar('Erreur lors de la génération de la fiche', { variant: 'error' });
        }
    };

    // Stats (Mocked or calculated from current set if possible, ideally should be from API)
    // For now assuming the filter drives the view, so we don't have total counts for all tabs at once unless we fetch stats.
    // We will stick to the same pattern as ClientList where we trust the filter. 
    // To make stats cards look good, we might display "View Pending", "View Processing" labels rather than counts if we don't have them.
    // Or we fetch them separately. For this UI/UX refactor, I will simulate count display or just hide counts if not available,
    // but typically users want to see counts. I'll omit dynamic counts on cards for now to avoid extra API calls complexity,
    // and focus on the visual filter aspect.

    // Status Logic for UI
    const getStatusColor = (status) => {
        const colors = {
            pending: 'default',
            sample_collected: 'info',
            in_progress: 'warning',
            completed: 'primary',
            results_ready: 'success',
            results_delivered: 'success',
            cancelled: 'error'
        };
        return colors[status] || 'default';
    };

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'En attente',
            sample_collected: 'Échantillon prélevé',
            in_progress: 'En cours',
            completed: 'Terminé',
            results_ready: 'Résultats prêts',
            results_delivered: 'Résultats livrés',
            cancelled: 'Annulé'
        };
        return labels[status] || status;
    };

    const getSampleTypeColor = (sampleType) => {
        const colors = {
            blood: '#dc2626', // Rouge sang
            urine: '#f59e0b', // Jaune/Orange
            stool: '#92400e', // Marron
            serum: '#dc2626', // Rouge
            plasma: '#c026d3', // Violet
            other: '#6b7280' // Gris
        };
        return colors[sampleType] || colors.other;
    };

    const LabOrderCard = ({ order, index }) => {
        const testsToShow = order.items?.slice(0, 3) || [];
        const remainingTests = (order.items?.length || 0) - testsToShow.length;

        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                        border: '2px solid',
                        borderColor: order.priority === 'urgent' ? 'error.main' : 'divider',
                        boxShadow: order.priority === 'urgent' ? `0 0 0 1px ${alpha(theme.palette.error.main, 0.1)}` : 'none',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: order.priority === 'urgent'
                                ? `0 12px 24px -10px ${alpha(theme.palette.error.main, 0.4)}`
                                : `0 12px 24px -10px ${alpha(theme.palette.primary.main, 0.2)}`,
                            borderColor: order.priority === 'urgent' ? 'error.dark' : 'primary.main',
                            '& .action-icon': { transform: 'translateX(4px)' }
                        }
                    }}
                    onClick={() => navigate(`/healthcare/laboratory/${order.id}`)}
                >
                    {/* Priority Banner */}
                    {order.priority === 'urgent' && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 6,
                                background: theme => `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
                                boxShadow: `0 2px 8px ${alpha(theme.palette.error.main, 0.3)}`
                            }}
                        />
                    )}

                    <CardContent sx={{ p: 2.5, pt: order.priority === 'urgent' ? 3 : 2.5 }}>
                        {/* Header */}
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box sx={{ flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: 'primary.main',
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 1,
                                            fontWeight: 700,
                                            letterSpacing: 0.5,
                                            fontFamily: 'monospace'
                                        }}
                                    >
                                        {order.order_number}
                                    </Typography>
                                    {order.priority === 'urgent' && (
                                        <Chip
                                            icon={<UrgentIcon />}
                                            label="URGENT"
                                            size="small"
                                            color="error"
                                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                        />
                                    )}
                                </Stack>
                                <Typography variant="h6" fontWeight="700" sx={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PersonIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    {order.patient_name}
                                </Typography>
                            </Box>
                            <Chip
                                label={getStatusLabel(order.status)}
                                size="small"
                                color={getStatusColor(order.status)}
                                variant={['pending', 'sample_collected'].includes(order.status) ? 'outlined' : 'filled'}
                                sx={{
                                    height: 26,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    minWidth: 110,
                                    textAlign: 'center'
                                }}
                            />
                        </Stack>

                        {/* Tests List */}
                        <Box sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.03),
                            borderRadius: 2,
                            p: 1.5,
                            mb: 2,
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.1)
                        }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <ScienceIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight="700" color="primary">
                                    {order.items?.length || 0} Examen{(order.items?.length || 0) > 1 ? 's' : ''}
                                </Typography>
                            </Stack>

                            {testsToShow.length > 0 && (
                                <Stack spacing={0.5}>
                                    {testsToShow.map((item, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                py: 0.5
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    bgcolor: getSampleTypeColor(item.sample_type || 'other'),
                                                    boxShadow: `0 0 4px ${getSampleTypeColor(item.sample_type || 'other')}`
                                                }}
                                            />
                                            <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                {item.lab_test_name || item.name}
                                            </Typography>
                                        </Box>
                                    ))}
                                    {remainingTests > 0 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', pl: 2 }}>
                                            + {remainingTests} autre{remainingTests > 1 ? 's' : ''}
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Box>

                        {/* Footer Info */}
                        <Stack direction="row" spacing={2} mb={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary" fontWeight="600">
                                    {new Date(order.order_date).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary" fontWeight="600">
                                    {new Date(order.order_date).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Typography>
                            </Box>
                        </Stack>

                        {/* Actions */}
                        <Box sx={{
                            pt: 2,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Stack direction="row" spacing={1}>
                                <Tooltip title="Imprimer Fiche Paillasse">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handlePrintBenchSheet(e, order.id)}
                                        sx={{
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            color: 'primary.main',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                transform: 'scale(1.05)'
                                            }
                                        }}
                                    >
                                        <PrintIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Voir Résultats">
                                    <IconButton
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(theme.palette.success.main, 0.08),
                                            color: 'success.main',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.success.main, 0.15),
                                                transform: 'scale(1.05)'
                                            }
                                        }}
                                    >
                                        <DescriptionIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" color="primary.main" fontWeight="700">
                                    Voir détails
                                </Typography>
                                <ArrowForward
                                    className="action-icon"
                                    sx={{ fontSize: 18, color: 'primary.main', transition: 'transform 0.2s' }}
                                />
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    const StatCard = ({ title, icon: Icon, color, filterKey, isActive }) => (
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
            <CardContent sx={{ p: 2, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', height: '100%' }}>
                <Icon sx={{ fontSize: 28, color: color, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="700" color={color}>
                    {title}
                </Typography>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ background: theme => `linear-gradient(45deg, ${theme.palette.error.main}, ${theme.palette.error.light})`, backgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
                        {t('laboratory.title', 'Lab Orders')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Gestion des analyses et résultats
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        size="large"
                        startIcon={<DescriptionIcon />}
                        onClick={handleOpenPrintModal}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            py: 1.5,
                            borderColor: 'error.main',
                            color: 'error.main',
                            '&:hover': {
                                borderColor: 'error.dark',
                                bgcolor: alpha(theme.palette.error.main, 0.08)
                            }
                        }}
                    >
                        Fiches Groupées
                    </Button>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/healthcare/laboratory/new')}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            py: 1.5,
                            background: theme => `linear-gradient(45deg, ${theme.palette.error.main}, ${theme.palette.error.light})`,
                            boxShadow: theme => `0 8px 20px -4px ${alpha(theme.palette.error.main, 0.5)}`,
                            '&:hover': { boxShadow: theme => `0 12px 24px -6px ${alpha(theme.palette.error.main, 0.6)}` }
                        }}
                    >
                        {t('laboratory.new_order', 'Nouvelle Commande')}
                    </Button>
                </Stack>
            </Stack>

            {/* Filters Grid */}
            <Grid container spacing={2} mb={4}>
                <Grid item xs={6} md={3}>
                    <StatCard title="En Attente" icon={PendingIcon} color={theme.palette.text.secondary} filterKey="pending" isActive={quickFilter === 'pending'} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="En Cours" icon={ProcessingIcon} color={theme.palette.warning.main} filterKey="processing" isActive={quickFilter === 'processing'} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Terminé" icon={CompletedIcon} color={theme.palette.success.main} filterKey="completed" isActive={quickFilter === 'completed'} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Urgent" icon={UrgentIcon} color={theme.palette.error.main} filterKey="urgent" isActive={quickFilter === 'urgent'} />
                </Grid>
            </Grid>

            {/* Search and Date Filters */}
            <Card sx={{ mb: 3, borderRadius: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder={t('common.search', 'Rechercher une commande, un patient...')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                size={isMobile ? 'small' : 'medium'}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Date de début"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setQuickFilter(''); // Reset quick filter when using custom dates
                                }}
                                size={isMobile ? 'small' : 'medium'}
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Date de fin"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setQuickFilter(''); // Reset quick filter when using custom dates
                                }}
                                size={isMobile ? 'small' : 'medium'}
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ArrowBackIcon />}
                                onClick={goToPreviousDay}
                            >
                                Jour Précédent
                            </Button>
                            <Button
                                size="small"
                                variant={startDate === formatDate(new Date()) && endDate === formatDate(new Date()) ? 'contained' : 'outlined'}
                                startIcon={<TodayIcon />}
                                onClick={goToToday}
                            >
                                Aujourd'hui
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                endIcon={<ArrowForwardIcon />}
                                onClick={goToNextDay}
                            >
                                Jour Suivant
                            </Button>
                        </Stack>
                        {(startDate || endDate) && (
                            <Chip
                                label={`Période: ${startDate || '...'} → ${endDate || '...'}`}
                                onDelete={() => {
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                color="primary"
                                size="small"
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* List */}
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
                            <LabOrderCard order={order} index={index} />
                        </Grid>
                    ))
                )}
            </Grid>
            {/* Print Modal */}
            <PrintModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title="Imprimer Fiches Groupées"
                helpText="Générez un PDF contenant les fiches de paillasse pour toutes les commandes filtrées."
                loading={isGenerating}
                onPreview={() => handlePrintAction('preview')}
                onPrint={() => handlePrintAction('print')}
                onDownload={() => handlePrintAction('download')}
            />
        </Box>
    );
};

export default LabOrderList;
