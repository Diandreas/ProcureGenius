import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Divider,
    Stack,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    InputAdornment,
    MenuItem
} from '@mui/material';
import {
    Save as SaveIcon,
    CheckCircle as CompleteIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon,
    Print as PrintIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import consultationAPI from '../../../services/consultationAPI';
import patientAPI from '../../../services/patientAPI';
import pharmacyAPI from '../../../services/pharmacyAPI';

const ConsultationForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams(); // Consultation ID (if editing/continuing)
    const { enqueueSnackbar } = useSnackbar();

    const isNew = !id; // Actually, we might start "new" from waiting list, so ID might exist as a visit ID... 
    // Simplified: If ID exists, we are editing/viewing a consultation object.

    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [medications, setMedications] = useState([]);

    const [formData, setFormData] = useState({
        patient: null,
        consultation_date: new Date().toISOString().split('T')[0],
        chief_complaint: '',
        history_of_present_illness: '',
        physical_examination: '',
        diagnosis: '',
        treatment_plan: '',
        // Vitals
        temperature: '',
        blood_pressure: '',
        heart_rate: '',
        respiratory_rate: '',
        weight: '',
        height: '',
        bmi: '',
        // Prescription
        medications: [] // { medication, dosage, frequency, duration, instructions }
    });

    useEffect(() => {
        fetchOptions();
        if (id) fetchConsultation();
    }, [id]);

    const fetchOptions = async () => {
        try {
            const [patData, medData] = await Promise.all([
                patientAPI.getPatients({ page_size: 100 }),
                pharmacyAPI.getMedications({ page_size: 100 })
            ]);
            setPatients(patData.results || []);
            setMedications(medData.results || []);
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    };

    const fetchConsultation = async () => {
        try {
            setLoading(true);
            const data = await consultationAPI.getConsultation(id);
            setFormData(prev => ({
                ...prev,
                patient: { id: data.patient, name: data.patient_name }, // simplified
                chief_complaint: data.chief_complaint || '',
                history_of_present_illness: data.history_of_present_illness || '',
                physical_examination: data.physical_examination || '',
                diagnosis: data.diagnosis || '',
                treatment_plan: data.treatment_plan || '',
                temperature: data.temperature || '',
                blood_pressure: data.blood_pressure || '',
                heart_rate: data.heart_rate || '',
                respiratory_rate: data.respiratory_rate || '',
                weight: data.weight || '',
                height: data.height || '',
                bmi: data.bmi || ''
            }));
            // Fetch existing prescription if any? (Not implemented in initial scope, handled separately usually)
        } catch (error) {
            console.error('Error fetching consultation:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Prescription helpers
    const addMedication = () => {
        setFormData(prev => ({
            ...prev,
            medications: [...prev.medications, { medication: null, dosage: '', frequency: '', duration: '', instructions: '' }]
        }));
    };

    const removeMedication = (index) => {
        setFormData(prev => ({
            ...prev,
            medications: prev.medications.filter((_, i) => i !== index)
        }));
    };

    const handleMedicationChange = (index, field, value) => {
        const newMeds = [...formData.medications];
        newMeds[index][field] = value;
        setFormData(prev => ({ ...prev, medications: newMeds }));
    };

    const handleSubmit = async (status = 'in_consultation') => {
        if (!formData.patient && isNew) {
            enqueueSnackbar('Sélectionner un patient', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: formData.patient?.id,
                status: status, // in_consultation or completed
                ...formData,
                medications: undefined // Handled via separate Prescription API
            };

            let consultId = id;
            if (isNew) {
                const res = await consultationAPI.createConsultation(payload);
                consultId = res.id;
            } else {
                await consultationAPI.updateConsultation(id, payload);
            }

            // Create Prescription if items exist
            if (formData.medications.length > 0) {
                const prescriptionPayload = {
                    consultation_id: consultId,
                    items: formData.medications.map(m => ({
                        medication_id: m.medication.id,
                        dosage: m.dosage,
                        frequency: m.frequency,
                        duration: m.duration,
                        instructions: m.instructions
                    }))
                };
                await consultationAPI.createPrescription(prescriptionPayload);
            }

            enqueueSnackbar('Consultation enregistrée', { variant: 'success' });
            if (status === 'completed') {
                navigate('/healthcare/consultations');
            } else if (isNew) {
                navigate(`/healthcare/consultations/${consultId}/edit`); // Stay on page
            }
        } catch (error) {
            console.error('Error saving:', error);
            enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/consultations')}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Dossier Médical
                    </Typography>
                </Stack>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        onClick={() => handleSubmit('in_consultation')}
                        sx={{ mr: 1 }}
                        disabled={loading}
                    >
                        Enregistrer (Brouillon)
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<CompleteIcon />}
                        color="success"
                        onClick={() => handleSubmit('completed')}
                        disabled={loading}
                    >
                        Terminer & Prescrire
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Left Column: Vitals & History */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Patient</Typography>
                            {isNew ? (
                                <Autocomplete
                                    options={patients}
                                    getOptionLabel={(option) => option.name || ''}
                                    value={formData.patient}
                                    onChange={(e, v) => setFormData(prev => ({ ...prev, patient: v }))}
                                    renderInput={(params) => <TextField {...params} label="Rechercher Patient" />}
                                />
                            ) : (
                                <Typography variant="h5" color="primary">{formData.patient?.name}</Typography>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="error">Signes Vitaux</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Température (°C)"
                                        name="temperature"
                                        value={formData.temperature}
                                        onChange={handleInputChange}
                                        size="small"
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Tension Arterielle"
                                        name="blood_pressure"
                                        value={formData.blood_pressure}
                                        onChange={handleInputChange}
                                        placeholder="120/80"
                                        size="small"
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Pouls (bpm)"
                                        name="heart_rate"
                                        value={formData.heart_rate}
                                        onChange={handleInputChange}
                                        size="small"
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Poids (kg)"
                                        name="weight"
                                        value={formData.weight}
                                        onChange={handleInputChange}
                                        size="small"
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column: Clinical Notes & Prescription */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Notes Cliniques</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Motif de Consultation (Plaintes)"
                                        name="chief_complaint"
                                        value={formData.chief_complaint}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={2}
                                        fullWidth
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Examen Physique"
                                        name="physical_examination"
                                        value={formData.physical_examination}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={3}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Diagnostic"
                                        name="diagnosis"
                                        value={formData.diagnosis}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={2}
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">Ordonnance</Typography>
                                <Button startIcon={<AddIcon />} onClick={addMedication} size="small">
                                    Ajouter Médicament
                                </Button>
                            </Box>

                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell width="30%">Médicament</TableCell>
                                            <TableCell width="20%">Dosage</TableCell>
                                            <TableCell width="20%">Fréquence</TableCell>
                                            <TableCell width="20%">Durée</TableCell>
                                            <TableCell width="10%"></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.medications.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Autocomplete
                                                        options={medications}
                                                        getOptionLabel={(option) => option.name}
                                                        value={item.medication}
                                                        onChange={(e, v) => handleMedicationChange(index, 'medication', v)}
                                                        renderInput={(params) => <TextField {...params} variant="standard" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        value={item.dosage}
                                                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                                                        variant="standard"
                                                        placeholder="ex: 500mg"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        value={item.frequency}
                                                        onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                                                        variant="standard"
                                                        placeholder="ex: 2x/jour"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        value={item.duration}
                                                        onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                                                        variant="standard"
                                                        placeholder="ex: 5 jours"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton size="small" color="error" onClick={() => removeMedication(index)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ConsultationForm;
