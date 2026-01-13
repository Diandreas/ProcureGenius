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
    IconButton,
    Paper,
    Avatar
} from '@mui/material';
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    AccessTime as WaitingIcon,
    CheckCircle as CompletedIcon,
    PlayArrow as InProgressIcon,
    LocalHospital as HospitalIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import patientAPI from '../../../services/patientAPI';

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
                {icon}
            </Avatar>
        </CardContent>
    </Card>
);

const ReceptionDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [visits, setVisits] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        waiting: 0,
        in_consultation: 0,
        completed: 0
    });

    useEffect(() => {
        fetchVisits();
        // Auto-refresh every minute
        const interval = setInterval(fetchVisits, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchVisits = async () => {
        setLoading(true);
        try {
            // Assuming getTodayVisits returns a list of visits directly or paginated
            const data = await patientAPI.getTodayVisits();
            const visitList = Array.isArray(data) ? data : (data.results || []);

            setVisits(visitList);

            // Calculate Stats
            const newStats = {
                total: visitList.length,
                waiting: visitList.filter(v => ['checked_in', 'triage', 'waiting_doctor'].includes(v.status)).length,
                in_consultation: visitList.filter(v => v.status === 'in_consultation').length,
                completed: visitList.filter(v => v.status === 'completed').length
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
            checked_in: { label: 'Enregistré', color: 'info' },
            triage: { label: 'Tri (Constantes)', color: 'warning' },
            waiting_doctor: { label: 'Attente Médecin', color: 'warning' },
            in_consultation: { label: 'En Consultation', color: 'primary' },
            completed: { label: 'Terminé', color: 'success' },
            cancelled: { label: 'Annulé', color: 'error' },
        };
        const config = statusConfig[status] || { label: status, color: 'default' };
        return <Chip label={config.label} color={config.color} size="small" variant="outlined" />;
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                    {t('reception.dashboard', 'Réception & Urgences')}
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
                        onClick={() => navigate('/healthcare/patients')} // Or direct check-in page
                        sx={{ borderRadius: 2 }}
                    >
                        {t('reception.new_checkin', 'Nouvelle Arrivée')}
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={t('reception.total_today', 'Total Aujourd\'hui')}
                        value={stats.total}
                        icon={<HospitalIcon />}
                        color="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={t('reception.waiting', 'En Salle d\'Attente')}
                        value={stats.waiting}
                        icon={<WaitingIcon />}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={t('reception.consulting', 'En Consultation')}
                        value={stats.in_consultation}
                        icon={<InProgressIcon />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={t('reception.completed', 'Terminés')}
                        value={stats.completed}
                        icon={<CompletedIcon />}
                        color="success"
                    />
                </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                File d'Attente et Visites en Cours
            </Typography>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Heure</TableCell>
                            <TableCell>Patient</TableCell>
                            <TableCell>Priorité</TableCell>
                            <TableCell>Motif / Plaintes</TableCell>
                            <TableCell>Statut</TableCell>
                            <TableCell>Médecin</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && visits.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">Chargement...</TableCell>
                            </TableRow>
                        ) : visits.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">Aucune visite enregistrée aujourd'hui.</TableCell>
                            </TableRow>
                        ) : (
                            visits.map((visit) => (
                                <TableRow key={visit.id} hover>
                                    <TableCell>
                                        {new Date(visit.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="subtitle2" fontWeight="600">{visit.patient_name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={visit.priority || 'Normale'}
                                            size="small"
                                            color={visit.priority === 'emergency' ? 'error' : visit.priority === 'high' ? 'warning' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>{visit.chief_complaint || '-'}</TableCell>
                                    <TableCell>{getStatusChip(visit.status)}</TableCell>
                                    <TableCell>{visit.doctor_name || '-'}</TableCell>
                                    <TableCell align="right">
                                        {/* Actions based on status */}
                                        {['checked_in'].includes(visit.status) && (
                                            <Button size="small" variant="text">Tri (Vitals)</Button>
                                        )}
                                        {['waiting_doctor'].includes(visit.status) && (
                                            <Button size="small" variant="contained" color="primary">Consulter</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ReceptionDashboard;
