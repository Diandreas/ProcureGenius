import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Paper,
    Avatar,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    AccessTime as WaitingIcon,
    CheckCircle as CompletedIcon,
    PlayArrow as InProgressIcon,
    LocalHospital as HospitalIcon,
    Done as DoneIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import patientAPI from '../../../services/patientAPI';
import TriageModal from './TriageModal';
import { useSnackbar } from 'notistack';
import { formatTime } from '../../../utils/formatters';

const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
                <Typography color="text.secondary" variant="subtitle2" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                    {value}
                </Typography>
            </Box>
            <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 56, height: 56 }}>
                <Box>{icon}</Box>
            </Avatar>
        </CardContent>
    </Card>
);

const VisitsDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [visits, setVisits] = useState([]);

    // Triage Modal State
    const [triageModalOpen, setTriageModalOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);

    const [stats, setStats] = useState({
        total: 0,
        waiting: 0,
        in_progress: 0,
        completed: 0
    });

    useEffect(() => {
        fetchVisits();
        const interval = setInterval(fetchVisits, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchVisits = async () => {
        setLoading(true);
        try {
            const data = await patientAPI.getTodayVisits();

            // API returns { total, waiting, in_consultation, at_lab, at_pharmacy, completed, cancelled, active_visits }
            const visitList = data.active_visits || [];
            setVisits(visitList);

            const newStats = {
                total: data.total || 0,
                waiting: data.waiting || 0,
                in_progress: (data.in_consultation || 0) + (data.at_lab || 0) + (data.at_pharmacy || 0),
                completed: data.completed || 0
            };
            setStats(newStats);

        } catch (error) {
            console.error('Error fetching visits:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusChip = (status) => {
        const statusConfig = {
            registered: { label: 'Enregistré', color: 'default' },
            checked_in: { label: 'Arrivé', color: 'info' },
            triage: { label: 'Tri (Constantes)', color: 'warning' },
            waiting_doctor: { label: 'Attente Médecin', color: 'warning' },
            in_consultation: { label: 'Chez le Médecin', color: 'primary' },
            waiting_lab: { label: 'Envoyé au Labo', color: 'secondary' },
            in_lab: { label: 'Au Labo', color: 'secondary' },
            waiting_results: { label: 'Attente Résultats', color: 'info' },
            waiting_pharmacy: { label: 'Envoyé Pharmacie', color: 'secondary' },
            at_pharmacy: { label: 'À la Pharmacie', color: 'secondary' },
            completed: { label: 'Terminé', color: 'success' },
            cancelled: { label: 'Annulé', color: 'error' },
            no_show: { label: 'Absent', color: 'error' },
        };
        const config = statusConfig[status] || { label: status, color: 'default' };
        return <Chip label={config.label} color={config.color} size="small" variant="outlined" />;
    };

    const handleOpenTriage = (visit) => {
        setSelectedVisit(visit);
        setTriageModalOpen(true);
    };

    const handleCompleteVisit = async (visit) => {
        try {
            await patientAPI.updateVisitStatus(visit.id, 'complete');
            enqueueSnackbar('Visite terminée', { variant: 'success' });
            fetchVisits();
        } catch (error) {
            console.error('Error completing visit:', error);
            enqueueSnackbar('Erreur lors de la clôture', { variant: 'error' });
        }
    };

    // Séparer visites actives et terminées
    const activeVisits = visits.filter(v => !['completed', 'cancelled', 'no_show'].includes(v.status));
    const completedVisits = visits.filter(v => ['completed', 'cancelled', 'no_show'].includes(v.status));

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                    {t('visits.dashboard', 'Visites du Jour')}
                </Typography>
                <Box>
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={fetchVisits}
                        sx={{ mr: 1 }}
                        variant="outlined"
                    >
                        Actualiser
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/healthcare/visits/new')}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('visits.new_checkin', 'Nouvelle Visite')}
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={t('visits.total_today', 'Total Aujourd\'hui')}
                        value={stats.total}
                        icon={<HospitalIcon />}
                        color="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={t('visits.waiting', 'En Attente')}
                        value={stats.waiting}
                        icon={<WaitingIcon />}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={t('visits.in_progress', 'En Cours')}
                        value={stats.in_progress}
                        icon={<InProgressIcon />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={t('visits.completed', 'Terminées')}
                        value={stats.completed}
                        icon={<CompletedIcon />}
                        color="success"
                    />
                </Grid>
            </Grid>

            {/* Visites Actives */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                Visites en cours ({activeVisits.length})
            </Typography>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, mb: 4 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Heure</TableCell>
                            <TableCell>Patient</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Priorité</TableCell>
                            <TableCell>Motif</TableCell>
                            <TableCell>Statut</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && activeVisits.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">Chargement...</TableCell>
                            </TableRow>
                        ) : activeVisits.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">Aucune visite active.</TableCell>
                            </TableRow>
                        ) : (
                            activeVisits.map((visit) => (
                                <TableRow key={visit.id} hover>
                                    <TableCell>{formatTime(visit.created_at)}</TableCell>
                                    <TableCell>
                                        <Typography variant="subtitle2" fontWeight="600">{visit.patient_name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={visit.visit_type || 'Visite'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={visit.priority === 'emergency' ? 'Urgence' : visit.priority === 'urgent' ? 'Urgent' : 'Normal'}
                                            size="small"
                                            color={visit.priority === 'emergency' ? 'error' : visit.priority === 'urgent' ? 'warning' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>{visit.chief_complaint || '-'}</TableCell>
                                    <TableCell>{getStatusChip(visit.status)}</TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                            {['checked_in', 'registered'].includes(visit.status) && (
                                                <Button size="small" variant="outlined" onClick={() => handleOpenTriage(visit)}>
                                                    Constantes
                                                </Button>
                                            )}
                                            {!['checked_in', 'registered', 'completed', 'cancelled'].includes(visit.status) && (
                                                <Tooltip title="Terminer la visite">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        onClick={() => handleCompleteVisit(visit)}
                                                        startIcon={<DoneIcon />}
                                                    >
                                                        Terminer
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Visites Terminées */}
            {completedVisits.length > 0 && (
                <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2, color: 'text.secondary' }}>
                        Terminées ({completedVisits.length})
                    </Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, opacity: 0.8 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Heure</TableCell>
                                    <TableCell>Patient</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Motif</TableCell>
                                    <TableCell>Statut</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {completedVisits.map((visit) => (
                                    <TableRow key={visit.id}>
                                        <TableCell>{formatTime(visit.created_at)}</TableCell>
                                        <TableCell>{visit.patient_name}</TableCell>
                                        <TableCell><Chip label={visit.visit_type || 'Visite'} size="small" variant="outlined" /></TableCell>
                                        <TableCell>{visit.chief_complaint || '-'}</TableCell>
                                        <TableCell>{getStatusChip(visit.status)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {/* Triage Modal */}
            {selectedVisit && (
                <TriageModal
                    open={triageModalOpen}
                    onClose={() => setTriageModalOpen(false)}
                    visit={selectedVisit}
                    onVitalsSaved={fetchVisits}
                />
            )}
        </Box>
    );
};

export default VisitsDashboard;
