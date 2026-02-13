import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Chip,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import {
    Warning as WarningIcon,
    Favorite as HeartIcon,
    Science as LabIcon,
    MedicalServices as ConsultIcon,
    LocalPharmacy as RxIcon,
    CalendarToday as CalendarIcon
} from '@mui/icons-material';
import patientAPI from '../../../../services/patientAPI';
import { formatDate } from '../../../../utils/formatters';

const MedicalSummaryTab = ({ patientId, patient }) => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        fetchSummary();
    }, [patientId]);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const data = await patientAPI.getMedicalSummary(patientId);
            setSummary(data);
        } catch (error) {
            console.error('Error fetching medical summary:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!summary) {
        return <Typography color="text.secondary">Impossible de charger le résumé médical.</Typography>;
    }

    return (
        <Grid container spacing={2}>
            {/* Alertes Médicales */}
            <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%', borderColor: 'error.light' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <WarningIcon color="error" fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                                Alertes Médicales
                            </Typography>
                        </Box>
                        <Grid container spacing={1}>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Groupe Sanguin</Typography>
                                <Typography variant="h6" fontWeight="bold">
                                    {summary.alerts?.blood_type || 'N/A'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Allergies</Typography>
                                <Typography variant="body2" color="error.main">
                                    {summary.alerts?.allergies || 'Aucune connue'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Conditions Chroniques</Typography>
                                <Typography variant="body2">
                                    {summary.alerts?.chronic_conditions || 'Aucune'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>

            {/* Derniers Paramètres Vitaux */}
            <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <HeartIcon color="error" fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                Derniers Paramètres Vitaux
                            </Typography>
                        </Box>
                        {summary.latest_vitals ? (
                            <Grid container spacing={1}>
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">Tension</Typography>
                                    <Typography variant="body1" fontWeight="600">
                                        {summary.latest_vitals.systolic && summary.latest_vitals.diastolic
                                            ? `${summary.latest_vitals.systolic}/${summary.latest_vitals.diastolic} mmHg`
                                            : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">Température</Typography>
                                    <Typography variant="body1" fontWeight="600">
                                        {summary.latest_vitals.temperature ? `${summary.latest_vitals.temperature}°C` : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">FC</Typography>
                                    <Typography variant="body1" fontWeight="600">
                                        {summary.latest_vitals.heart_rate ? `${summary.latest_vitals.heart_rate} pls/min` : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">SpO2</Typography>
                                    <Typography variant="body1" fontWeight="600">
                                        {summary.latest_vitals.spo2 ? `${summary.latest_vitals.spo2}%` : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">FR</Typography>
                                    <Typography variant="body1" fontWeight="600">
                                        {summary.latest_vitals.respiratory_rate ? `${summary.latest_vitals.respiratory_rate} c/min` : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">Glycémie</Typography>
                                    <Typography variant="body1" fontWeight="600">
                                        {summary.latest_vitals.blood_glucose ? `${summary.latest_vitals.blood_glucose} g/L` : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">Poids</Typography>
                                    <Typography variant="body1" fontWeight="600">
                                        {summary.latest_vitals.weight ? `${summary.latest_vitals.weight} kg` : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="text.secondary">Date</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {summary.latest_vitals.date ? formatDate(summary.latest_vitals.date) : '-'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        ) : (
                            <Typography color="text.secondary">Aucune donnée disponible</Typography>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Statistiques */}
            <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CalendarIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold">Statistiques</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Consultations</Typography>
                                <Typography variant="body2" fontWeight="600">{summary.statistics?.total_consultations || 0}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Examens Labo</Typography>
                                <Typography variant="body2" fontWeight="600">{summary.statistics?.total_lab_orders || 0}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Visites</Typography>
                                <Typography variant="body2" fontWeight="600">{summary.statistics?.total_visits || 0}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Dernière visite</Typography>
                                <Typography variant="body2" fontWeight="500">
                                    {summary.statistics?.last_visit_date ? formatDate(summary.statistics.last_visit_date) : 'Jamais'}
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            {/* Traitements en cours */}
            <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <RxIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold">Ordonnances Récentes</Typography>
                        </Box>
                        {summary.active_prescriptions?.length > 0 ? (
                            <List dense disablePadding>
                                {summary.active_prescriptions.map((rx, idx) => (
                                    <Box key={idx} sx={{ mb: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {rx.date ? formatDate(rx.date) : ''}
                                        </Typography>
                                        {rx.items?.map((item, i) => (
                                            <ListItem key={i} disablePadding sx={{ pl: 0 }}>
                                                <ListItemText
                                                    primary={item.medication_name}
                                                    secondary={`${item.dosage || ''} ${item.frequency || ''} ${item.duration || ''}`}
                                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                                    secondaryTypographyProps={{ variant: 'caption' }}
                                                />
                                            </ListItem>
                                        ))}
                                        {idx < summary.active_prescriptions.length - 1 && <Divider sx={{ mt: 1 }} />}
                                    </Box>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Aucune ordonnance récente</Typography>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Résultats Labo Anormaux */}
            <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <LabIcon color="warning" fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold">Résultats Anormaux Récents</Typography>
                        </Box>
                        {summary.abnormal_results?.length > 0 ? (
                            <List dense disablePadding>
                                {summary.abnormal_results.map((result, idx) => (
                                    <ListItem key={idx} disablePadding sx={{ mb: 1 }}>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="body2" fontWeight="500">{result.test_name}</Typography>
                                                    {result.is_critical && <Chip label="Critique" size="small" color="error" />}
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption">
                                                    Résultat: <strong>{result.result_value}</strong> (Réf: {result.reference_range || 'N/A'})
                                                    {result.date && ` - ${formatDate(result.date)}`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Aucun résultat anormal récent</Typography>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Dernière Consultation */}
            {summary.last_consultation && (
                <Grid item xs={12}>
                    <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'primary.main' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <ConsultIcon color="primary" fontSize="small" />
                                <Typography variant="subtitle1" fontWeight="bold">Dernière Consultation</Typography>
                                <Chip
                                    label={summary.last_consultation.status_display}
                                    size="small"
                                    color={summary.last_consultation.status === 'completed' ? 'success' : 'warning'}
                                    variant="outlined"
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                    {formatDate(summary.last_consultation.date)}
                                </Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary">Médecin</Typography>
                                    <Typography variant="body2" fontWeight="500">
                                        Dr. {summary.last_consultation.doctor_name || '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="caption" color="text.secondary">Motif</Typography>
                                    <Typography variant="body2">{summary.last_consultation.chief_complaint || '-'}</Typography>
                                </Grid>
                                <Grid item xs={12} md={5}>
                                    <Typography variant="caption" color="text.secondary">Diagnostic</Typography>
                                    <Typography variant="body2" fontWeight="600" color="error.main">
                                        {summary.last_consultation.diagnosis || '-'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            )}
        </Grid>
    );
};

export default MedicalSummaryTab;
