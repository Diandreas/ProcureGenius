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
    MenuItem,
    Checkbox,
    FormControlLabel,
    Chip,
    Tooltip
} from '@mui/material';
import {
    Save as SaveIcon,
    CheckCircle as CompleteIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon,
    Print as PrintIcon,
    WarningAmber as ExternalIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import consultationAPI from '../../../services/consultationAPI';
import patientAPI from '../../../services/patientAPI';
import pharmacyAPI from '../../../services/pharmacyAPI';
import ConsultationTimer from '../../../components/healthcare/ConsultationTimer';

const ConsultationForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams(); // Consultation ID (if editing/continuing)
    const [searchParams] = useSearchParams();
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
        blood_glucose: '',
        respiratory_rate: '',
        weight: '',
        height: '',
        bmi: '',
        // Timing
        started_at: null,
        ended_at: null,
        // Prescription
        medications: [] // { medication, dosage, frequency, duration, instructions }
    });

    useEffect(() => {
        const initializeForm = async () => {
            await fetchOptions();

            // If editing existing consultation
            if (id) {
                await fetchConsultation();
            }
            // If creating new consultation with preselected patient from URL
            else {
                const preselectedPatientId = searchParams.get('patientId');
                if (preselectedPatientId) {
                    try {
                        const patientData = await patientAPI.getPatient(preselectedPatientId);
                        setFormData(prev => ({
                            ...prev,
                            patient: { id: patientData.id, name: patientData.name }
                        }));
                    } catch (error) {
                        console.error('Error loading preselected patient:', error);
                    }
                }
            }
        };

        initializeForm();
    }, [id]);

    const fetchOptions = async () => {
        try {
            const [patData, medData] = await Promise.all([
                patientAPI.getPatients({ page_size: 100 }),
                pharmacyAPI.getMedications({ page_size: 100 })
            ]);
            setPatients(patData.results || []);

            // Process medications to ensure unique names for Autocomplete options
            // First, count occurrences of each name
            const nameCounts = {};
            medData.results?.forEach(med => {
                nameCounts[med.name] = (nameCounts[med.name] || 0) + 1;
            });

            // Then create unique names for duplicates
            const uniqueMeds = medData.results?.map(med => {
                if (nameCounts[med.name] > 1) {
                    // If there are duplicates, append the ID to make it unique
                    med.uniqueName = `${med.name} (${med.id})`;
                } else {
                    // If unique, keep the original name
                    med.uniqueName = med.name;
                }
                return med;
            }) || [];

            setMedications(uniqueMeds);
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    };

    const fetchConsultation = async () => {
        try {
            setLoading(true);
            const data = await consultationAPI.getConsultation(id);

            // Load prescription items if any
            let medicationsList = [];
            if (data.prescriptions && data.prescriptions.length > 0) {
                const prescription = data.prescriptions[0]; // Get first prescription
                medicationsList = prescription.items.map(item => ({
                    medication: item.medication ? { id: item.medication, name: item.medication_name } : null,
                    medication_name: item.medication_name || '',
                    dosage: item.dosage || '',
                    frequency: item.frequency || '',
                    duration: item.duration || '',
                    instructions: item.instructions || '',
                    quantity: item.quantity_prescribed || 1,
                    is_external: !item.medication // If no medication ID, it's external
                }));
            }

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
                blood_glucose: data.blood_glucose || '',
                respiratory_rate: data.respiratory_rate || '',
                weight: data.weight || '',
                height: data.height || '',
                bmi: data.bmi || '',
                started_at: data.started_at || null,
                ended_at: data.ended_at || null,
                medications: medicationsList
            }));
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

    const handlePatientSelect = (event, newPatient) => {
        setFormData(prev => ({ ...prev, patient: newPatient }));

        // Auto-start timer when patient is selected (only for new consultations)
        if (newPatient && isNew && !formData.started_at) {
            const now = new Date().toISOString();
            setFormData(prev => ({ ...prev, started_at: now }));
            enqueueSnackbar('⏱️ Timer démarré automatiquement', { variant: 'info' });
        }
    };

    // Prescription helpers
    const addMedication = () => {
        setFormData(prev => ({
            ...prev,
            medications: [...prev.medications, {
                medication: null,
                medication_name: '',
                is_external: false,
                dosage: '',
                frequency: '',
                duration: '',
                instructions: ''
            }]
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

    const handleTimerStart = (timestamp) => {
        setFormData(prev => ({ ...prev, started_at: timestamp }));
    };

    const handleTimerEnd = (timestamp) => {
        setFormData(prev => ({ ...prev, ended_at: timestamp }));
    };

    const handleSubmit = async (status = 'in_consultation') => {
        if (!formData.patient && isNew) {
            enqueueSnackbar('Sélectionner un patient', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            // Auto-stop timer if not already stopped when completing consultation
            let finalEndedAt = formData.ended_at;
            if (status === 'completed' && formData.started_at && !formData.ended_at) {
                finalEndedAt = new Date().toISOString();
                // Update local state for UI feedback
                setFormData(prev => ({ ...prev, ended_at: finalEndedAt }));
                enqueueSnackbar('⏱️ Timer arrêté automatiquement', { variant: 'info' });
            }

            // Clean payload - only send valid model fields
            const payload = {
                patient: formData.patient?.id,
                chief_complaint: formData.chief_complaint || '',
                history_of_present_illness: formData.history_of_present_illness || '',
                physical_examination: formData.physical_examination || '',
                diagnosis: formData.diagnosis || '',
                treatment_plan: formData.treatment_plan || '',
                temperature: formData.temperature || null,
                blood_glucose: formData.blood_glucose || null,
                respiratory_rate: formData.respiratory_rate || null,
                weight: formData.weight || null,
                height: formData.height || null,
                started_at: formData.started_at,
                ended_at: finalEndedAt
            };

            // Remove null/empty values (but keep started_at and ended_at even if undefined)
            Object.keys(payload).forEach(key => {
                // Skip timing fields - let backend handle them
                if (key === 'started_at' || key === 'ended_at') {
                    // Keep these fields if they have a value, delete if undefined
                    if (payload[key] === undefined) {
                        delete payload[key];
                    }
                } else if (payload[key] === null || payload[key] === '') {
                    delete payload[key];
                }
            });

            console.log('Final payload before sending:', payload);

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
                    patient_id: formData.patient?.id,
                    consultation_id: consultId,
                    items: formData.medications.map(m => ({
                        // External medication: send medication_name only
                        // Internal medication: send medication_id
                        ...(m.is_external ? {
                            medication_name: m.medication_name,
                            medication_id: null
                        } : {
                            medication_id: m.medication?.id,
                            medication_name: m.medication?.name
                        }),
                        dosage: m.dosage || '',
                        frequency: m.frequency || '',
                        duration: m.duration || '',
                        instructions: m.instructions || '',
                        quantity_prescribed: parseInt(m.quantity) || 1
                    }))
                };
                await consultationAPI.createPrescription(prescriptionPayload);
            }

            enqueueSnackbar('Consultation enregistrée', { variant: 'success' });
            if (status === 'completed') {
                // Redirect to detail page instead of list
                navigate(`/healthcare/consultations/${consultId}`);
            } else if (isNew) {
                navigate(`/healthcare/consultations/${consultId}/edit`); // Stay on page
            }
        } catch (error) {
            console.error('Error saving:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            const errorMsg = error.response?.data?.detail ||
                           error.response?.data?.message ||
                           JSON.stringify(error.response?.data) ||
                           'Erreur lors de l\'enregistrement';
            enqueueSnackbar(errorMsg, { variant: 'error' });
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
                                    onChange={handlePatientSelect}
                                    renderInput={(params) => <TextField {...params} label="Rechercher Patient" />}
                                />
                            ) : (
                                <Typography variant="h5" color="primary">{formData.patient?.name}</Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timer Component */}
                    <Box sx={{ mb: 3 }}>
                        <ConsultationTimer
                            onStart={handleTimerStart}
                            onEnd={handleTimerEnd}
                            initialStartTime={formData.started_at}
                            initialEndTime={formData.ended_at}
                        />
                    </Box>

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
                                        label="Glycémie (g/L)"
                                        name="blood_glucose"
                                        value={formData.blood_glucose}
                                        onChange={handleInputChange}
                                        size="small"
                                        type="number"
                                        inputProps={{ step: "0.01" }}
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
                                            <TableCell width="35%">Médicament</TableCell>
                                            <TableCell width="18%">Dosage</TableCell>
                                            <TableCell width="18%">Fréquence</TableCell>
                                            <TableCell width="18%">Durée</TableCell>
                                            <TableCell width="11%"></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.medications.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                size="small"
                                                                checked={item.is_external}
                                                                onChange={(e) => handleMedicationChange(index, 'is_external', e.target.checked)}
                                                            />
                                                        }
                                                        label={
                                                            <Tooltip title="Médicament non disponible dans l'inventaire">
                                                                <Chip
                                                                    label="Externe"
                                                                    size="small"
                                                                    icon={<ExternalIcon />}
                                                                    color={item.is_external ? "warning" : "default"}
                                                                    variant={item.is_external ? "filled" : "outlined"}
                                                                />
                                                            </Tooltip>
                                                        }
                                                        sx={{ mb: 1 }}
                                                    />
                                                    {item.is_external ? (
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            placeholder="Nom du médicament externe"
                                                            value={item.medication_name}
                                                            onChange={(e) => handleMedicationChange(index, 'medication_name', e.target.value)}
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        <ExternalIcon color="warning" fontSize="small" />
                                                                    </InputAdornment>
                                                                )
                                                            }}
                                                        />
                                                    ) : (
                                                        <Autocomplete
                                                            options={medications}
                                                            getOptionLabel={(option) => option.uniqueName || option.name}
                                                            value={item.medication}
                                                            onChange={(e, v) => handleMedicationChange(index, 'medication', v)}
                                                            renderInput={(params) => <TextField {...params} variant="standard" placeholder="Sélectionner..." />}
                                                        />
                                                    )}
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
