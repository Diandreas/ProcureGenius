import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    TextField,
    Typography,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import {
    MonitorHeart as VitalsIcon,
    MedicalInformation as ClinicalIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import patientAPI from '../../../../services/patientAPI';

const EMPTY = {
    chief_complaint: '',
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    weight: '',
    blood_glucose: '',
    physical_examination: '',
    diagnosis: '',
    evolution: '',
    treatment: '',
    notes: '',
};

/**
 * Modal de suivi patient (Follow-up).
 *
 * Props :
 *   open        : bool
 *   onClose     : () => void
 *   onSaved     : (followUp) => void
 *   patientId   : string (UUID)
 *   patientName : string
 *   followUpId  : string (UUID) — si fourni, mode édition
 *   initialData : object — données pré-remplies (mode édition)
 */
const PatientFollowUpModal = ({ open, onClose, onSaved, patientId, patientName, followUpId = null, initialData = null }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const isEditing = !!followUpId;

    // Pré-remplir le formulaire en mode édition
    useEffect(() => {
        if (open && initialData) {
            setForm({
                chief_complaint: initialData.chief_complaint || '',
                temperature: initialData.temperature || '',
                blood_pressure_systolic: initialData.blood_pressure_systolic || '',
                blood_pressure_diastolic: initialData.blood_pressure_diastolic || '',
                heart_rate: initialData.heart_rate || '',
                oxygen_saturation: initialData.oxygen_saturation || '',
                respiratory_rate: initialData.respiratory_rate || '',
                weight: initialData.weight || '',
                blood_glucose: initialData.blood_glucose || '',
                physical_examination: initialData.physical_examination || '',
                diagnosis: initialData.diagnosis || '',
                evolution: initialData.evolution || '',
                treatment: initialData.treatment || '',
                notes: initialData.notes || '',
            });
        } else if (open && !initialData) {
            setForm(EMPTY);
        }
    }, [open, initialData]);

    const handleChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleClose = () => {
        setForm(EMPTY);
        onClose();
    };

    const handleSave = async () => {
        const payload = {};
        Object.entries(form).forEach(([k, v]) => {
            if (v !== '' && v !== null) payload[k] = v;
        });

        if (!payload.chief_complaint && !payload.diagnosis && !payload.evolution && !payload.treatment) {
            enqueueSnackbar('Veuillez remplir au moins un champ clinique', { variant: 'warning' });
            return;
        }

        setSaving(true);
        try {
            let result;
            if (isEditing) {
                result = await patientAPI.updateFollowUp(followUpId, payload);
                enqueueSnackbar('Suivi modifié', { variant: 'success' });
            } else {
                result = await patientAPI.createFollowUp(patientId, payload);
                enqueueSnackbar('Suivi enregistré', { variant: 'success' });
            }
            if (onSaved) onSaved(result);
            handleClose();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || "Erreur lors de l'enregistrement";
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                    {isEditing ? 'Modifier le Suivi' : 'Suivi Patient'}
                </Typography>
                {patientName && (
                    <Typography variant="body2" color="text.secondary">{patientName}</Typography>
                )}
            </DialogTitle>

            <DialogContent dividers sx={{ pt: 2 }}>
                {/* ── Plaintes du jour ──────────────────────────────────── */}
                <SectionTitle icon={<ClinicalIcon fontSize="small" />} label="Plaintes du jour" />
                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Motif de consultation, plaintes actuelles..."
                    value={form.chief_complaint}
                    onChange={handleChange('chief_complaint')}
                    sx={{ mb: 3 }}
                />

                {/* ── Paramètres Vitaux ─────────────────────────────────── */}
                <SectionTitle icon={<VitalsIcon fontSize="small" />} label="Paramètres Vitaux" />
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            fullWidth size="small" label="Tension Sys."
                            placeholder="120" type="number"
                            value={form.blood_pressure_systolic}
                            onChange={handleChange('blood_pressure_systolic')}
                            InputProps={{ endAdornment: <InputAdornment position="end">mmHg</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            fullWidth size="small" label="Tension Dia."
                            placeholder="80" type="number"
                            value={form.blood_pressure_diastolic}
                            onChange={handleChange('blood_pressure_diastolic')}
                            InputProps={{ endAdornment: <InputAdornment position="end">mmHg</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            fullWidth size="small" label="Température"
                            placeholder="37.0" type="number" inputProps={{ step: '0.1' }}
                            value={form.temperature}
                            onChange={handleChange('temperature')}
                            InputProps={{ endAdornment: <InputAdornment position="end">°C</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            fullWidth size="small" label="FC"
                            placeholder="75" type="number"
                            value={form.heart_rate}
                            onChange={handleChange('heart_rate')}
                            InputProps={{ endAdornment: <InputAdornment position="end">bpm</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            fullWidth size="small" label="SpO2"
                            placeholder="98" type="number"
                            value={form.oxygen_saturation}
                            onChange={handleChange('oxygen_saturation')}
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            fullWidth size="small" label="FR"
                            placeholder="16" type="number"
                            value={form.respiratory_rate}
                            onChange={handleChange('respiratory_rate')}
                            InputProps={{ endAdornment: <InputAdornment position="end">cyc/min</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            fullWidth size="small" label="Poids"
                            placeholder="70" type="number" inputProps={{ step: '0.1' }}
                            value={form.weight}
                            onChange={handleChange('weight')}
                            InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            fullWidth size="small" label="Glycémie"
                            placeholder="1.0" type="number" inputProps={{ step: '0.01' }}
                            value={form.blood_glucose}
                            onChange={handleChange('blood_glucose')}
                            InputProps={{ endAdornment: <InputAdornment position="end">mg/dL</InputAdornment> }}
                        />
                    </Grid>
                </Grid>

                {/* ── Examen physique ───────────────────────────────────── */}
                <SectionTitle icon={<ClinicalIcon fontSize="small" />} label="Examen Physique" />
                <TextField
                    fullWidth multiline rows={3}
                    placeholder="Résultats de l'examen clinique..."
                    value={form.physical_examination}
                    onChange={handleChange('physical_examination')}
                    sx={{ mb: 3 }}
                />

                {/* ── Diagnostic ────────────────────────────────────────── */}
                <SectionTitle icon={<ClinicalIcon fontSize="small" />} label="Diagnostic" />
                <TextField
                    fullWidth multiline rows={2}
                    placeholder="Diagnostic ou hypothèse diagnostique..."
                    value={form.diagnosis}
                    onChange={handleChange('diagnosis')}
                    sx={{ mb: 3 }}
                />

                {/* ── Évolution ─────────────────────────────────────────── */}
                <SectionTitle icon={<ClinicalIcon fontSize="small" />} label="Évolution" />
                <TextField
                    fullWidth multiline rows={2}
                    placeholder="Évolution par rapport à la dernière visite..."
                    value={form.evolution}
                    onChange={handleChange('evolution')}
                    sx={{ mb: 3 }}
                />

                {/* ── Traitement / Examens ──────────────────────────────── */}
                <SectionTitle icon={<ClinicalIcon fontSize="small" />} label="Traitement / Examens prescrits" />
                <TextField
                    fullWidth multiline rows={3}
                    placeholder="Traitement prescrit, examens demandés, conseils..."
                    value={form.treatment}
                    onChange={handleChange('treatment')}
                    sx={{ mb: 3 }}
                />

                {/* ── Notes ────────────────────────────────────────────── */}
                <TextField
                    fullWidth multiline rows={2} label="Notes complémentaires (optionnel)"
                    value={form.notes}
                    onChange={handleChange('notes')}
                />
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={handleClose} disabled={saving}>Annuler</Button>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Enregistrement...' : isEditing ? 'Modifier le suivi' : 'Enregistrer le suivi'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const SectionTitle = ({ icon, label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Typography variant="subtitle2" color="primary" fontWeight={700} textTransform="uppercase">
            {label}
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider', ml: 1 }} />
    </Box>
);

export default PatientFollowUpModal;
