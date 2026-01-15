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
    Autorenew as ProcessingIcon,
    CheckCircle as CompletedIcon,
    Error as UrgentIcon,
    CalendarToday,
    Person as PersonIcon,
    ArrowForward,
    Print as PrintIcon,
    Description as DescriptionIcon
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

    useEffect(() => {
        fetchOrders();
    }, [quickFilter, search]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let params = { search, page_size: 50 };

            // Map quickFilter to API params
            if (quickFilter === 'pending') params.status_in = 'pending,sample_collected,received';
            else if (quickFilter === 'processing') params.status = 'analyzing';
            else if (quickFilter === 'completed') params.status_in = 'results_entered,verified,results_delivered';
            else if (quickFilter === 'urgent') params.priority = 'urgent';

            const data = await laboratoryAPI.getOrders(params);
            setOrders(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
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
                params.status = 'pending,sample_collected,received';
            } else if (quickFilter === 'processing') {
                params.status = 'analyzing';
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
            received: 'info',
            analyzing: 'warning',
            results_entered: 'primary',
            verified: 'success',
            results_delivered: 'success',
            cancelled: 'error'
        };
        return colors[status] || 'default';
    };

    const LabOrderCard = ({ order, index }) => (
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
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 24px -10px ${alpha(theme.palette.primary.main, 0.2)}`,
                        borderColor: 'primary.main',
                        '& .action-icon': { transform: 'translateX(4px)' }
                    }
                }}
                onClick={() => navigate(`/healthcare/laboratory/${order.id}`)}
            >
                {/* Priority Stripe */}
                {order.priority === 'urgent' && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            width: 4,
                            background: theme.palette.error.main
                        }}
                    />
                )}

                <CardContent sx={{ p: 2, pl: order.priority === 'urgent' ? 3 : 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ letterSpacing: 0.5 }}>
                                {order.order_number}
                            </Typography>
                            <Typography variant="h6" fontWeight="700" sx={{ fontSize: '1.1rem', mt: 0.5 }}>
                                {order.patient_name}
                            </Typography>
                        </Box>
                        <Chip
                            label={order.status} // You might want to translate this
                            size="small"
                            color={getStatusColor(order.status)}
                            variant={['pending', 'sample_collected'].includes(order.status) ? 'outlined' : 'filled'}
                            sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
                        />
                    </Stack>

                    <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScienceIcon color="action" sx={{ fontSize: 18 }} />
                            <Typography variant="body2" color="text.primary">
                                {order.items_count || (order.items && order.items.length) || 0} Test(s)
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarToday color="action" sx={{ fontSize: 18 }} />
                            <Typography variant="body2" color="text.secondary">
                                {new Date(order.order_date).toLocaleDateString()}
                            </Typography>
                        </Box>

                    </Stack>

                    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tooltip title="Imprimer Fiche Paillasse">
                            <IconButton
                                size="small"
                                onClick={(e) => handlePrintBenchSheet(e, order.id)}
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                                }}
                            >
                                <PrintIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {order.priority === 'urgent' ? 'Urgent' : 'Normal'}
                            </Typography>
                            <ArrowForward className="action-icon" sx={{ fontSize: 18, color: 'primary.main', transition: 'transform 0.2s' }} />
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );

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
                    placeholder={t('common.search', 'Rechercher une commande, un patient...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                />
            </Paper>

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
