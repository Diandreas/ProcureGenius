import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    CircularProgress,
    Alert,
    Divider,
    IconButton,
    Tooltip,
    Grid,
} from '@mui/material';
import {
    TrackChanges as FollowUpIcon,
    LocalHospital as CareIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MonitorHeart as VitalsIcon,
    MedicalInformation as ClinicalIcon,
} from '@mui/icons-material';
import patientAPI from '../../../../services/patientAPI';
import PatientFollowUpModal from './PatientFollowUpModal';
import AdministerCareModal from './AdministerCareModal';
import { formatDate } from '../../../../utils/formatters';

const canEditOrDelete = (createdAt) => {
    if (!createdAt) return false;
    return (Date.now() - new Date(createdAt).getTime()) < 30 * 60 * 1000;
};

const SERVICE_LABELS = {
    consultation: 'Consultation',
    laboratory: 'Laboratoire',
    pharmacy: 'Pharmacie',
    nursing_care: 'Soin infirmier',
    imaging: 'Imagerie',
    procedure: 'Procédure',
    vaccination: 'Vaccination',
    physiotherapy: 'Kinésithérapie',
    other: 'Autre',
};

// Formate une date ISO en "Vendredi 25 Février 2026"
const formatDayLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
};

// Extrait la date courte (YYYY-MM-DD) d'une valeur ISO
const toDay = (dateStr) => (dateStr ? dateStr.slice(0, 10) : null);

const PatientJournalTab = ({ patientId, patientName }) => {
    const [followUps, setFollowUps] = useState([]);
    const [careServices, setCareServices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Follow-up edit modal
    const [fuModal, setFuModal] = useState(false);
    const [editingFu, setEditingFu] = useState(null);

    // Care edit modal
    const [careModal, setCareModal] = useState(false);
    const [editingCare, setEditingCare] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fuData, careData] = await Promise.all([
                patientAPI.getFollowUps(patientId),
                patientAPI.getPatientCareHistory(patientId),
            ]);
            setFollowUps(Array.isArray(fuData) ? fuData : fuData.results || []);
            const rawCare = Array.isArray(careData) ? careData : careData.results || [];
            // On ne montre que les soins manuels (pas labo/pharma/consultation auto)
            setCareServices(rawCare.filter(c =>
                ['nursing_care', 'procedure', 'vaccination', 'imaging', 'physiotherapy', 'other'].includes(c.service_type)
            ));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patientId) fetchData();
    }, [patientId]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    // ── Regrouper par jour ─────────────────────────────────────────────────
    const days = {};

    followUps.forEach(fu => {
        const day = toDay(fu.follow_up_date || fu.created_at);
        if (!day) return;
        if (!days[day]) days[day] = { followUps: [], cares: [] };
        days[day].followUps.push(fu);
    });

    careServices.forEach(care => {
        const day = toDay(care.provided_at || care.created_at);
        if (!day) return;
        if (!days[day]) days[day] = { followUps: [], cares: [] };
        days[day].cares.push(care);
    });

    const sortedDays = Object.keys(days).sort((a, b) => b.localeCompare(a)); // Plus récent en premier

    const handleDeleteFu = async (fu) => {
        if (!window.confirm('Supprimer ce suivi ?')) return;
        try {
            await patientAPI.deleteFollowUp(fu.id);
            setFollowUps(prev => prev.filter(f => f.id !== fu.id));
        } catch (err) {
            alert(err.response?.data?.detail || 'Erreur lors de la suppression');
        }
    };

    const handleDeleteCare = async (care) => {
        if (!window.confirm(`Supprimer le soin "${care.service_name}" ?`)) return;
        try {
            await patientAPI.deleteCareService(care.id);
            setCareServices(prev => prev.filter(c => c.id !== care.id));
        } catch (err) {
            alert(err.response?.data?.detail || 'Erreur lors de la suppression');
        }
    };

    if (sortedDays.length === 0) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                Aucun suivi ni soin enregistré pour ce patient.
            </Alert>
        );
    }

    return (
        <Box>
            {sortedDays.map(day => (
                <Box key={day} sx={{ mb: 4 }}>
                    {/* ── En-tête du jour ─────────────────────────────── */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2, mb: 1.5,
                        position: 'sticky', top: 0, zIndex: 1,
                        bgcolor: 'background.default', py: 0.5,
                    }}>
                        <Box sx={{
                            width: 10, height: 10, borderRadius: '50%',
                            bgcolor: 'primary.main', flexShrink: 0,
                        }} />
                        <Typography variant="subtitle1" fontWeight={700} color="primary.main"
                            sx={{ textTransform: 'capitalize' }}>
                            {formatDayLabel(day)}
                        </Typography>
                        <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
                    </Box>

                    {/* ── Suivis du jour ──────────────────────────────── */}
                    {days[day].followUps.map(fu => (
                        <Paper
                            key={fu.id}
                            variant="outlined"
                            sx={{ mb: 1.5, borderLeft: 4, borderColor: 'secondary.main', p: 2 }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FollowUpIcon fontSize="small" color="secondary" />
                                    <Typography variant="subtitle2" fontWeight={700} color="secondary.main">
                                        Suivi infirmier / médical
                                    </Typography>
                                    {fu.provided_by_name && (
                                        <Typography variant="caption" color="text.secondary">
                                            — {fu.provided_by_name}
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                                        {fu.follow_up_date ? new Date(fu.follow_up_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </Typography>
                                    {canEditOrDelete(fu.created_at) && (
                                        <>
                                            <Tooltip title="Modifier">
                                                <IconButton size="small" color="primary" onClick={() => { setEditingFu(fu); setFuModal(true); }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Supprimer">
                                                <IconButton size="small" color="error" onClick={() => handleDeleteFu(fu)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    )}
                                </Box>
                            </Box>

                            {/* Vitaux */}
                            {(fu.blood_pressure || fu.temperature || fu.heart_rate || fu.oxygen_saturation || fu.weight) && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                                    <VitalsIcon fontSize="small" color="action" sx={{ mt: 0.2 }} />
                                    {fu.blood_pressure && <VitalBadge label="TA" value={`${fu.blood_pressure} mmHg`} />}
                                    {fu.temperature && <VitalBadge label="T°" value={`${fu.temperature} °C`} />}
                                    {fu.heart_rate && <VitalBadge label="FC" value={`${fu.heart_rate} bpm`} />}
                                    {fu.oxygen_saturation && <VitalBadge label="SpO2" value={`${fu.oxygen_saturation}%`} />}
                                    {fu.weight && <VitalBadge label="Poids" value={`${fu.weight} kg`} />}
                                    {fu.blood_glucose && <VitalBadge label="Glycémie" value={`${fu.blood_glucose} mg/dL`} />}
                                </Box>
                            )}

                            {/* Données cliniques */}
                            <Grid container spacing={1}>
                                {fu.chief_complaint && <ClinicalField label="Plaintes" value={fu.chief_complaint} />}
                                {fu.physical_examination && <ClinicalField label="Examen physique" value={fu.physical_examination} />}
                                {fu.diagnosis && <ClinicalField label="Diagnostic" value={fu.diagnosis} color="error.dark" />}
                                {fu.evolution && <ClinicalField label="Évolution" value={fu.evolution} />}
                                {fu.treatment && <ClinicalField label="Traitement" value={fu.treatment} color="success.dark" />}
                                {fu.notes && <ClinicalField label="Notes" value={fu.notes} />}
                            </Grid>
                        </Paper>
                    ))}

                    {/* ── Soins du jour ────────────────────────────────── */}
                    {days[day].cares.map(care => (
                        <Paper
                            key={care.id}
                            variant="outlined"
                            sx={{ mb: 1.5, borderLeft: 4, borderColor: 'info.main', p: 1.5 }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CareIcon fontSize="small" color="info" />
                                    <Chip
                                        label={SERVICE_LABELS[care.service_type] || care.service_type}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                    />
                                    <Typography variant="body2" fontWeight={600}>
                                        {care.service_name}
                                    </Typography>
                                    {care.quantity > 1 && (
                                        <Typography variant="caption" color="text.secondary">× {care.quantity}</Typography>
                                    )}
                                    {care.provided_by_name && (
                                        <Typography variant="caption" color="text.secondary">— {care.provided_by_name}</Typography>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                                        {care.provided_at ? new Date(care.provided_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </Typography>
                                    {canEditOrDelete(care.created_at) && (
                                        <>
                                            <Tooltip title="Modifier">
                                                <IconButton size="small" color="primary" onClick={() => { setEditingCare(care); setCareModal(true); }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Supprimer">
                                                <IconButton size="small" color="error" onClick={() => handleDeleteCare(care)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    )}
                                </Box>
                            </Box>
                            {care.notes && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, pl: 4 }}>
                                    {care.notes}
                                </Typography>
                            )}
                        </Paper>
                    ))}
                </Box>
            ))}

            {/* ── Modals édition ─────────────────────────────────────────── */}
            <PatientFollowUpModal
                open={fuModal}
                onClose={() => { setFuModal(false); setEditingFu(null); }}
                patientId={patientId}
                patientName={patientName}
                followUpId={editingFu?.id || null}
                initialData={editingFu}
                onSaved={(updated) => {
                    setFollowUps(prev => prev.map(f => f.id === updated.id ? updated : f));
                    setEditingFu(null);
                }}
            />

            <AdministerCareModal
                open={careModal}
                onClose={() => { setCareModal(false); setEditingCare(null); }}
                patientId={patientId}
                careId={editingCare?.id || null}
                initialData={editingCare}
                onSaved={fetchData}
            />
        </Box>
    );
};

// Petit badge vitaux
const VitalBadge = ({ label, value }) => (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
        <Typography variant="caption" fontWeight={600}>{value}</Typography>
    </Box>
);

// Ligne clinique
const ClinicalField = ({ label, value, color = 'text.primary' }) => (
    <Grid item xs={12} sm={6}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ minWidth: 110, flexShrink: 0 }}>
                {label} :
            </Typography>
            <Typography variant="caption" color={color} sx={{ whiteSpace: 'pre-line' }}>
                {value}
            </Typography>
        </Box>
    </Grid>
);

export default PatientJournalTab;
