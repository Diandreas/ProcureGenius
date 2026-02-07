import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    CircularProgress,
    Autocomplete,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Paper,
    Divider
} from '@mui/material';
import { Receipt as PrescriptionIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import consultationAPI from '../../../../services/consultationAPI';
import pharmacyAPI from '../../../../services/pharmacyAPI';
import patientAPI from '../../../../services/patientAPI';
import { formatDate } from '../../../../utils/formatters';

const QuickPrescriptionModal = ({ open, onClose, patientId, patientName, onSuccess }) => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [consultations, setConsultations] = useState([]);
    const [medications, setMedications] = useState([]);

    const [formData, setFormData] = useState({
        consultation: null,
        createNewConsultation: false,
        chief_complaint: '',
        items: [] // { medication, dosage, frequency, duration, instructions }
    });

    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open, patientId]);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const [patientHistory, medData] = await Promise.all([
                patientAPI.getPatientHistory(patientId),
                pharmacyAPI.getMedications({ page_size: 1000 })
            ]);

            setConsultations(patientHistory.recent_consultations || []);
            setMedications(medData.results || medData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
        } finally {
            setLoadingData(false);
        }
    };

    const addMedication = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { medication: null, dosage: '', frequency: '', duration: '', instructions: '' }]
        }));
    };

    const removeMedication = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleMedicationChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.items.length === 0) {
            enqueueSnackbar('Veuillez ajouter au moins un médicament', { variant: 'warning' });
            return;
        }

        if (!formData.consultation && !formData.createNewConsultation) {
            enqueueSnackbar('Veuillez sélectionner une consultation ou créer une nouvelle', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            let consultationId = formData.consultation?.id;

            // Create new consultation if needed
            if (formData.createNewConsultation) {
                if (!formData.chief_complaint.trim()) {
                    enqueueSnackbar('Le motif de consultation est requis', { variant: 'warning' });
                    setLoading(false);
                    return;
                }

                const consultPayload = {
                    patient_id: patientId,
                    status: 'completed',
                    consultation_date: new Date().toISOString().split('T')[0],
                    chief_complaint: formData.chief_complaint,
                    diagnosis: 'Prescription directe'
                };

                const newConsult = await consultationAPI.createConsultation(consultPayload);
                consultationId = newConsult.id;
            }

            // Create prescription
            const prescriptionPayload = {
                consultation_id: consultationId,
                items: formData.items.map(item => ({
                    medication_id: item.medication.id,
                    dosage: item.dosage,
                    frequency: item.frequency,
                    duration: item.duration,
                    instructions: item.instructions || ''
                }))
            };

            const response = await consultationAPI.createPrescription(prescriptionPayload);
            enqueueSnackbar('Prescription créée avec succès', { variant: 'success' });

            if (onSuccess) onSuccess();
            onClose();

            // Navigate to consultation detail to view prescription
            navigate(`/healthcare/consultations/${consultationId}/edit`);
        } catch (error) {
            console.error('Error creating prescription:', error);
            const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Erreur lors de la création';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                consultation: null,
                createNewConsultation: false,
                chief_complaint: '',
                items: []
            });
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PrescriptionIcon color="success" />
                    <Typography variant="h6" component="span">
                        Nouvelle Prescription Rapide
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Patient: <strong>{patientName}</strong>
                </Typography>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        {!formData.createNewConsultation ? (
                            <>
                                <Grid item xs={12}>
                                    <Autocomplete
                                        options={consultations}
                                        getOptionLabel={(option) =>
                                            `${formatDate(option.consultation_date)} - ${option.chief_complaint}`
                                        }
                                        value={formData.consultation}
                                        onChange={(e, newValue) => setFormData(prev => ({ ...prev, consultation: newValue }))}
                                        loading={loadingData}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Consultation Associée"
                                                placeholder="Sélectionner une consultation récente..."
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button
                                        size="small"
                                        onClick={() => setFormData(prev => ({ ...prev, createNewConsultation: true, consultation: null }))}
                                    >
                                        Ou créer une nouvelle consultation rapide
                                    </Button>
                                </Grid>
                            </>
                        ) : (
                            <>
                                <Grid item xs={12}>
                                    <TextField
                                        required
                                        fullWidth
                                        label="Motif de Consultation"
                                        name="chief_complaint"
                                        value={formData.chief_complaint}
                                        onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
                                        placeholder="Ex: Douleurs, Fièvre..."
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button
                                        size="small"
                                        onClick={() => setFormData(prev => ({ ...prev, createNewConsultation: false, chief_complaint: '' }))}
                                    >
                                        Ou sélectionner une consultation existante
                                    </Button>
                                </Grid>
                            </>
                        )}

                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    Médicaments
                                </Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={addMedication}
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                >
                                    Ajouter
                                </Button>
                            </Box>
                        </Grid>

                        {formData.items.length > 0 && (
                            <Grid item xs={12}>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell width="25%">Médicament</TableCell>
                                                <TableCell width="15%">Posologie</TableCell>
                                                <TableCell width="15%">Fréquence</TableCell>
                                                <TableCell width="15%">Durée</TableCell>
                                                <TableCell width="25%">Instructions</TableCell>
                                                <TableCell width="5%"></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {formData.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Autocomplete
                                                            size="small"
                                                            options={medications}
                                                            getOptionLabel={(option) => option.name}
                                                            value={item.medication}
                                                            onChange={(e, value) => handleMedicationChange(index, 'medication', value)}
                                                            renderInput={(params) => <TextField {...params} placeholder="Sélectionner..." />}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            value={item.dosage}
                                                            onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                                                            placeholder="2 cp"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            value={item.frequency}
                                                            onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                                                            placeholder="3x/jour"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            value={item.duration}
                                                            onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                                                            placeholder="7 jours"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            value={item.instructions}
                                                            onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                                                            placeholder="Après repas"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton size="small" onClick={() => removeMedication(index)} color="error">
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                        )}
                    </Grid>

                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            La prescription sera créée et vous serez redirigé vers la consultation associée.
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
                        color="success"
                        disabled={loading || formData.items.length === 0}
                        startIcon={loading ? <CircularProgress size={20} /> : <PrescriptionIcon />}
                    >
                        {loading ? 'Création...' : 'Créer Prescription'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default QuickPrescriptionModal;
