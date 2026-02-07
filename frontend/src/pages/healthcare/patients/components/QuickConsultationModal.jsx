import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    Box,
    CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

// Initialize dayjs locale
dayjs.locale('fr');
import { MedicalServices as ConsultationIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import consultationAPI from '../../../../services/consultationAPI';

const QuickConsultationModal = ({ open, onClose, patientId, patientName, onSuccess }) => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        consultation_date: new Date().toISOString().split('T')[0],
        chief_complaint: '',
        temperature: '',
        blood_pressure: '',
        weight: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            consultation_date: date ? date.format('YYYY-MM-DD') : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.chief_complaint.trim()) {
            enqueueSnackbar('Le motif de consultation est requis', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: patientId,
                status: 'in_consultation',
                consultation_date: formData.consultation_date,
                chief_complaint: formData.chief_complaint,
                temperature: formData.temperature || null,
                blood_pressure: formData.blood_pressure || null,
                weight: formData.weight || null,
            };

            const response = await consultationAPI.createConsultation(payload);
            enqueueSnackbar('Consultation créée avec succès', { variant: 'success' });

            if (onSuccess) onSuccess();
            onClose();

            // Navigate to full consultation form to complete details
            navigate(`/healthcare/consultations/${response.id}/edit`);
        } catch (error) {
            console.error('Error creating consultation:', error);
            const errorMessage = error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'Erreur lors de la création';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                consultation_date: new Date().toISOString().split('T')[0],
                chief_complaint: '',
                temperature: '',
                blood_pressure: '',
                weight: ''
            });
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ConsultationIcon color="primary" />
                    <Typography variant="h6" component="span">
                        Nouvelle Consultation Rapide
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Patient: <strong>{patientName}</strong>
                </Typography>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                                <DatePicker
                                    label="Date de Consultation"
                                    value={formData.consultation_date ? dayjs(formData.consultation_date) : null}
                                    onChange={handleDateChange}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true,
                                            variant: 'outlined'
                                        }
                                    }}
                                    format="DD/MM/YYYY"
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                multiline
                                rows={3}
                                label="Motif de Consultation"
                                name="chief_complaint"
                                value={formData.chief_complaint}
                                onChange={handleChange}
                                placeholder="Ex: Fièvre, Maux de tête, Douleurs abdominales..."
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                                Signes Vitaux (Optionnel)
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Température (°C)"
                                name="temperature"
                                value={formData.temperature}
                                onChange={handleChange}
                                placeholder="37.5"
                                type="number"
                                inputProps={{ step: 0.1 }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="TA (mmHg)"
                                name="blood_pressure"
                                value={formData.blood_pressure}
                                onChange={handleChange}
                                placeholder="120/80"
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Poids (kg)"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                placeholder="70"
                                type="number"
                                inputProps={{ step: 0.1 }}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Cette consultation sera créée et vous serez redirigé vers le formulaire complet pour ajouter plus de détails.
                        </Typography>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleClose} disabled={loading}>
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <ConsultationIcon />}
                    >
                        {loading ? 'Création...' : 'Créer & Continuer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default QuickConsultationModal;
