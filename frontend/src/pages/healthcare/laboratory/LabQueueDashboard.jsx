import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Chip,
    IconButton,
    Avatar,
    Tabs,
    Tab,
    LinearProgress,
    Tooltip,
    Badge,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    AccessTime as WaitingIcon,
    CheckCircle as CompletedIcon,
    PlayArrow as InProgressIcon,
    Science as LabIcon,
    List as ListIcon,
    MenuBook as CatalogIcon,
    Colorize as CollectIcon,
    Biotech as AnalyzeIcon,
    Send as DeliverIcon,
    Schedule as ClockIcon,
    Warning as WarningIcon,
    Person as PersonIcon,
    ArrowForward as ArrowIcon,
    LocalFireDepartment as FireIcon,
    Timer as TimerIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import { formatDate, formatTime } from '../../../utils/formatters';
import useAutoRefresh from '../../../hooks/useAutoRefresh';

// ── Helpers ──

const formatWaitTime = (minutes) => {
    if (!minutes || minutes <= 0) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}j ${remainHours}h` : `${days}j`;
};

const getWaitColor = (minutes) => {
    if (minutes < 30) return '#10b981';      // green
    if (minutes < 60) return '#f59e0b';      // amber
    if (minutes < 120) return '#ef4444';     // red
    return '#991b1b';                         // dark red
};

const getWaitBgColor = (minutes) => {
    if (minutes < 30) return '#ecfdf5';
    if (minutes < 60) return '#fffbeb';
    if (minutes < 120) return '#fef2f2';
    return '#fef2f2';
};

const getWaitSeverity = (minutes) => {
    if (minutes < 30) return 'normal';
    if (minutes < 60) return 'warning';
    return 'critical';
};

const priorityConfig = {
    routine: { label: 'Routine', color: 'default', icon: null },
    urgent: { label: 'Urgent', color: 'warning', icon: <WarningIcon fontSize="small" /> },
    stat: { label: 'STAT', color: 'error', icon: <FireIcon fontSize="small" /> },
};

const statusLabels = {
    pending: 'En attente',
    sample_collected: 'Prélevé',
    in_progress: 'En analyse',
    completed: 'Résultats saisis',
    results_ready: 'Validé',
};

const statusColors = {
    pending: 'warning',
    sample_collected: 'info',
    in_progress: 'info',
    completed: 'primary',
    results_ready: 'success',
};

// ── Stat Card ──

const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{
        height: '100%',
        borderRadius: 3,
        borderTop: 4,
        borderColor: `${color}.main`,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
    }}>
        <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 44, height: 44 }}>
                    {icon}
                </Avatar>
                <Typography variant="h3" fontWeight="800" color={`${color}.main`}>
                    {value}
                </Typography>
            </Box>
            <Typography color="text.secondary" variant="body2" fontWeight="600">
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
            )}
        </CardContent>
    </Card>
);

// ── Queue Order Card (single row in queue) ──

const QueueOrderCard = ({ order, position, onAction, actionLoading, onNavigate }) => {
    const waitMinutes = order.wait_minutes || 0;
    const waitColor = getWaitColor(waitMinutes);
    const waitBg = getWaitBgColor(waitMinutes);
    const severity = getWaitSeverity(waitMinutes);
    const pConfig = priorityConfig[order.priority] || priorityConfig.routine;

    const getActionButton = () => {
        switch (order.status) {
            case 'pending':
                return (
                    <Button
                        variant="contained"
                        size="small"
                        color="warning"
                        startIcon={<CollectIcon />}
                        onClick={(e) => { e.stopPropagation(); onAction(order.id, 'collect_sample'); }}
                        disabled={actionLoading === order.id}
                        sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                    >
                        Prélever
                    </Button>
                );
            case 'sample_collected':
                return (
                    <Button
                        variant="contained"
                        size="small"
                        color="info"
                        startIcon={<AnalyzeIcon />}
                        onClick={(e) => { e.stopPropagation(); onAction(order.id, 'start_processing'); }}
                        disabled={actionLoading === order.id}
                        sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                    >
                        Démarrer Analyse
                    </Button>
                );
            case 'in_progress':
            case 'completed':
                return (
                    <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        startIcon={<ArrowIcon />}
                        onClick={(e) => { e.stopPropagation(); onNavigate(order.id); }}
                        sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                    >
                        Saisir Résultats
                    </Button>
                );
            case 'results_ready':
                return (
                    <Button
                        variant="contained"
                        size="small"
                        color="success"
                        startIcon={<DeliverIcon />}
                        onClick={(e) => { e.stopPropagation(); onAction(order.id, 'deliver'); }}
                        disabled={actionLoading === order.id}
                        sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                    >
                        Remettre
                    </Button>
                );
            default:
                return null;
        }
    };

    return (
        <Card
            variant="outlined"
            onClick={() => onNavigate(order.id)}
            sx={{
                mb: 1.5,
                cursor: 'pointer',
                borderLeft: 4,
                borderLeftColor: waitColor,
                bgcolor: order.priority === 'stat' ? '#fef2f2' : order.priority === 'urgent' ? '#fffbeb' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                    boxShadow: 3,
                    transform: 'translateX(4px)',
                    borderLeftColor: waitColor,
                },
                ...(severity === 'critical' && {
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                        '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.2)' },
                        '50%': { boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.1)' },
                    }
                })
            }}
        >
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Position number */}
                    <Avatar
                        sx={{
                            width: 36, height: 36,
                            bgcolor: waitColor,
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 800
                        }}
                    >
                        {position}
                    </Avatar>

                    {/* Patient info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="700" noWrap>
                                {order.patient_name}
                            </Typography>
                            {pConfig.icon && (
                                <Chip
                                    icon={pConfig.icon}
                                    label={pConfig.label}
                                    size="small"
                                    color={pConfig.color}
                                    sx={{ fontWeight: 600, height: 22 }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.3 }}>
                            <Typography variant="caption" color="text.secondary">
                                {order.order_number}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {order.tests_count || 0} test(s)
                            </Typography>
                            {order.items?.slice(0, 3).map(item => (
                                <Chip
                                    key={item.id}
                                    label={item.lab_test_name || item.test_name}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            ))}
                            {(order.items?.length || 0) > 3 && (
                                <Typography variant="caption" color="text.secondary">
                                    +{order.items.length - 3}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Wait time */}
                    <Tooltip title={`Commande créée: ${order.order_date ? formatDate(order.order_date) + ' ' + formatTime(order.order_date) : '-'}`}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: waitBg,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            minWidth: 90,
                            justifyContent: 'center'
                        }}>
                            <TimerIcon sx={{ fontSize: 16, color: waitColor }} />
                            <Typography variant="body2" fontWeight="700" sx={{ color: waitColor }}>
                                {formatWaitTime(waitMinutes)}
                            </Typography>
                        </Box>
                    </Tooltip>

                    {/* Status chip */}
                    <Chip
                        label={statusLabels[order.status] || order.status}
                        size="small"
                        color={statusColors[order.status] || 'default'}
                        sx={{ fontWeight: 600, minWidth: 100 }}
                    />

                    {/* Action button */}
                    <Box sx={{ minWidth: 140, textAlign: 'right' }}>
                        {getActionButton()}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

// ── Main Dashboard ──

const LabQueueDashboard = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [inProgressOrders, setInProgressOrders] = useState([]);
    const [resultsOrders, setResultsOrders] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getTodayOrders();
            setStats(data);

            const allOrders = data.pending_orders || [];
            setPendingOrders(allOrders.filter(o => o.status === 'pending'));
            setInProgressOrders(allOrders.filter(o => ['sample_collected', 'in_progress'].includes(o.status)));
            setResultsOrders(allOrders.filter(o => ['completed', 'results_ready'].includes(o.status)));
        } catch (error) {
            console.error('Error fetching lab data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    // Auto-refresh when notification system detects new lab data
    useAutoRefresh('laboratory', fetchData);

    const handleAction = async (orderId, action) => {
        setActionLoading(orderId);
        try {
            await laboratoryAPI.updateStatus(orderId, { action });
            enqueueSnackbar('Statut mis à jour', { variant: 'success' });
            fetchData();
        } catch (error) {
            enqueueSnackbar('Erreur lors de la mise à jour', { variant: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleNavigate = (orderId) => {
        navigate(`/healthcare/laboratory/${orderId}`);
    };

    // Calculate avg wait for pending
    const avgWaitPending = pendingOrders.length > 0
        ? Math.round(pendingOrders.reduce((sum, o) => sum + (o.wait_minutes || 0), 0) / pendingOrders.length)
        : 0;

    const maxWait = pendingOrders.length > 0
        ? Math.max(...pendingOrders.map(o => o.wait_minutes || 0))
        : 0;

    const renderQueue = (orders, emptyMessage) => {
        if (orders.length === 0) {
            return (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <LabIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">{emptyMessage}</Typography>
                </Box>
            );
        }
        return orders.map((order, index) => (
            <QueueOrderCard
                key={order.id}
                order={order}
                position={index + 1}
                onAction={handleAction}
                actionLoading={actionLoading}
                onNavigate={handleNavigate}
            />
        ));
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                        Laboratoire
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        File d'attente et suivi des commandes
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<CatalogIcon />}
                        onClick={() => navigate('/healthcare/laboratory/catalog')}
                        sx={{ borderRadius: 2 }}
                    >
                        Catalogue
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<ListIcon />}
                        onClick={() => navigate('/healthcare/laboratory/orders')}
                        sx={{ borderRadius: 2 }}
                    >
                        Historique
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/healthcare/laboratory/new')}
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                    >
                        Nouvelle commande
                    </Button>
                    <IconButton onClick={fetchData} disabled={loading} color="primary">
                        <RefreshIcon />
                    </IconButton>
                </Box>
            </Box>

            {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <StatCard
                        title="En attente prélèvement"
                        value={stats?.pending || 0}
                        icon={<CollectIcon />}
                        color="warning"
                        subtitle={pendingOrders.length > 0 ? `Attente moy. ${formatWaitTime(avgWaitPending)}` : null}
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        title="En cours d'analyse"
                        value={(stats?.sample_collected || 0) + (stats?.in_progress || 0)}
                        icon={<AnalyzeIcon />}
                        color="info"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        title="Résultats à traiter"
                        value={(stats?.completed || 0) + (stats?.results_ready || 0)}
                        icon={<CompletedIcon />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        title="Total commandes actives"
                        value={stats?.total || 0}
                        icon={<LabIcon />}
                        color="primary"
                        subtitle={`${stats?.today_delivered || 0} remis aujourd'hui`}
                    />
                </Grid>
            </Grid>

            {/* Wait time alert */}
            {maxWait > 60 && (
                <Card sx={{ mb: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                    <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1, '&:last-child': { pb: 1.5 } }}>
                        <WarningIcon color="error" />
                        <Typography variant="body2" color="error.main" fontWeight="600">
                            Attention : {pendingOrders.filter(o => (o.wait_minutes || 0) > 60).length} commande(s) en attente depuis plus d'une heure.
                            Temps d'attente max : {formatWaitTime(maxWait)}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" fontWeight="600">TEMPS D'ATTENTE :</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#10b981' }} />
                    <Typography variant="caption" color="text.secondary">&lt; 30 min</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Typography variant="caption" color="text.secondary">30-60 min</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    <Typography variant="caption" color="text.secondary">&gt; 1h</Typography>
                </Box>
            </Box>

            {/* Tabs + Queue */}
            <Card sx={{ borderRadius: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={tabValue}
                        onChange={(e, v) => setTabValue(v)}
                        sx={{
                            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' }
                        }}
                    >
                        <Tab label={
                            <Badge badgeContent={pendingOrders.length} color="warning" max={99}>
                                <Box sx={{ pr: pendingOrders.length > 0 ? 2 : 0 }}>Prélèvements</Box>
                            </Badge>
                        } />
                        <Tab label={
                            <Badge badgeContent={inProgressOrders.length} color="info" max={99}>
                                <Box sx={{ pr: inProgressOrders.length > 0 ? 2 : 0 }}>En cours</Box>
                            </Badge>
                        } />
                        <Tab label={
                            <Badge badgeContent={resultsOrders.length} color="success" max={99}>
                                <Box sx={{ pr: resultsOrders.length > 0 ? 2 : 0 }}>Résultats</Box>
                            </Badge>
                        } />
                    </Tabs>
                </Box>

                <CardContent sx={{ px: 2, py: 2 }}>
                    {tabValue === 0 && (
                        <>
                            {pendingOrders.length > 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    {pendingOrders.length} patient(s) en attente de prélèvement
                                </Typography>
                            )}
                            {renderQueue(pendingOrders, 'Aucun prélèvement en attente')}
                        </>
                    )}
                    {tabValue === 1 && (
                        <>
                            {inProgressOrders.length > 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    {inProgressOrders.length} commande(s) en cours d'analyse
                                </Typography>
                            )}
                            {renderQueue(inProgressOrders, 'Aucune commande en cours d\'analyse')}
                        </>
                    )}
                    {tabValue === 2 && (
                        <>
                            {resultsOrders.length > 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    {resultsOrders.length} commande(s) avec résultats à traiter
                                </Typography>
                            )}
                            {renderQueue(resultsOrders, 'Aucun résultat en attente')}
                        </>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default LabQueueDashboard;
