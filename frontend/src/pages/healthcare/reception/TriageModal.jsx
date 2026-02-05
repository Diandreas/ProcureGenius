import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    Typography,
    Box,
    InputAdornment
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import patientAPI from '../../../services/patientAPI';
import { useSnackbar } from 'notistack';

const TriageModal = ({ open, onClose, visit, onVitalsSaved }) => {
    const { t } = useTranslation();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);

    // Initialize with existing vitals if present, or defaults
    const [formData, setFormData] = useState({
        vitals_weight: visit?.vitals_weight || '',
        vitals_height: visit?.vitals_height || '',
        vitals_temperature: visit?.vitals_temperature || '',
        vitals_systolic: visit?.vitals_systolic || '',
        vitals_diastolic: visit?.vitals_diastolic || '',
        vitals_blood_glucose: visit?.vitals_blood_glucose || '',
        vitals_spo2: visit?.vitals_spo2 || '',
        notes: visit?.notes || '' // Allow updating notes during triage
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Update visit with new vitals and status
            const payload = {
                ...formData,
                status: 'waiting_doctor' // Move to next stage
            };

            await patientAPI.updateVisit(visit.id, payload);

            enqueueSnackbar('Vitals enregistrés avec succès', { variant: 'success' });
            onVitalsSaved(); // Callback to refresh dashboard
            onClose();
        } catch (error) {
            console.error('Error saving vitals:', error);
            enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Tri & Constantes - {visit?.patient_name}
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Mesures Physiologiques
                        </Typography>
                    </Grid>

                    {/* Weight & Height */}
                    <Grid item xs={6} md={3}>
                        <TextField
                            fullWidth
                            label="Poids"
                            name="vitals_weight"
                            type="number"
                            value={formData.vitals_weight}
                            onChange={handleChange}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField
                            fullWidth
                            label="Taille"
                            name="vitals_height"
                            type="number"
                            value={formData.vitals_height}
                            onChange={handleChange}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">cm</InputAdornment>,
                            }}
                        />
                    </Grid>

                    {/* Temp & Spo2 */}
                    <Grid item xs={6} md={3}>
                        <TextField
                            fullWidth
                            label="Température"
                            name="vitals_temperature"
                            type="number"
                            value={formData.vitals_temperature}
                            onChange={handleChange}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField
                            fullWidth
                            label="SpO2"
                            name="vitals_spo2"
                            type="number"
                            value={formData.vitals_spo2}
                            onChange={handleChange}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                        />
                    </Grid>

                    {/* BP & HR */}
                    <Grid item xs={6} md={4}>
                        <TextField
                            fullWidth
                            label="Tension Sys."
                            name="vitals_systolic"
                            type="number"
                            value={formData.vitals_systolic}
                            onChange={handleChange}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">mmHg</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <TextField
                            fullWidth
                            label="Tension Dia."
                            name="vitals_diastolic"
                            type="number"
                            value={formData.vitals_diastolic}
                            onChange={handleChange}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">mmHg</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Glycémie"
                            name="vitals_blood_glucose"
                            type="number"
                            inputProps={{ step: "0.01" }}
                            value={formData.vitals_blood_glucose}
                            onChange={handleChange}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">g/L</InputAdornment>,
                            }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                            Observations
                        </Typography>
                        <TextField
                            fullWidth
                            label="Notes additionnelles / Observations"
                            name="notes"
                            multiline
                            rows={3}
                            value={formData.notes}
                            onChange={handleChange}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Annuler
                </Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
                    {loading ? 'Enregistrement...' : 'Valider & Mettre en Attente'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TriageModal;
