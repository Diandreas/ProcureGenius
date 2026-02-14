import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    MenuItem,
    CircularProgress,
    Autocomplete
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import patientAPI from '../../../services/patientAPI';

const VisitForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patientId') || searchParams.get('patient');

    const [loading, setLoading] = useState(false);
    const [patient, setPatient] = useState(null);
    const [formData, setFormData] = useState({
        patient: patientId || '',
        visit_type: 'consultation',
        priority: 'routine',
        notes: ''
    });

    const visitTypes = [
        { value: 'consultation', label: 'Consultation Médicale' },
        { value: 'lab_results', label: 'Retrait Résultats Labo' },
        { value: 'follow_up_exam', label: 'Suivi après Examens' },
        { value: 'prescription_renewal', label: 'Renouvellement Ordonnance' },
        { value: 'laboratory', label: 'Examens Laboratoire' },
        { value: 'pharmacy', label: 'Dispensation Pharmacie' },
        { value: 'emergency', label: 'Urgence' },
        { value: 'follow_up', label: 'Consultation de Suivi' },
        { value: 'vaccination', label: 'Vaccination' },
        { value: 'imaging', label: 'Imagerie Médicale' },
        { value: 'administrative', label: 'Démarche Administrative' },
        { value: 'wound_care', label: 'Soins Infirmiers' },
        { value: 'physiotherapy', label: 'Kinésithérapie' },
        { value: 'other', label: 'Autre' }
    ];

    // Patient Search State
    const [patientOptions, setPatientOptions] = useState([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (!patientId) {
            searchPatients('');
        }
    }, [patientId]);

    const searchPatients = async (query) => {
        setSearching(true);
        try {
            const response = await patientAPI.getPatients({ search: query, page_size: 20 });
            setPatientOptions(response.results || []);
        } catch (error) {
            console.error('Error searching patients:', error);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (patientId) {
            fetchPatient();
        }
    }, [patientId]);

    const fetchPatient = async () => {
        try {
            const data = await patientAPI.getPatient(patientId);
            setPatient(data);
            setFormData(prev => ({ ...prev, patient: patientId }));
        } catch (error) {
            console.error('Error fetching patient:', error);
            enqueueSnackbar('Erreur lors du chargement du patient', { variant: 'error' });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Auto-generate chief_complaint from visit_type label
        const selectedType = visitTypes.find(vt => vt.value === formData.visit_type);
        const chiefComplaint = selectedType ? selectedType.label : formData.visit_type;

        try {
            await patientAPI.registerVisit({
                patient_id: formData.patient,
                visit_type: formData.visit_type,
                chief_complaint: chiefComplaint,
                priority: formData.priority,
                notes: formData.notes
            });
            enqueueSnackbar('Visite enregistrée avec succès', { variant: 'success' });

            if (patientId) {
                navigate(`/healthcare/patients/${patientId}`);
            } else {
                navigate('/healthcare/visits');
            }
        } catch (error) {
            console.error('Error registering visit:', error);
            enqueueSnackbar(error?.response?.data?.message || 'Erreur lors de l\'enregistrement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Nouvelle Visite
                </Typography>
                {patient && (
                    <Typography variant="body1" color="text.secondary">
                        Patient: {patient.name} ({patient.patient_number})
                    </Typography>
                )}
            </Box>

            <Card>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            {!patientId && (
                                <Grid item xs={12}>
                                    <Autocomplete
                                        options={patientOptions}
                                        getOptionLabel={(option) => `${option.name} (${option.patient_number})`}
                                        loading={searching}
                                        onInputChange={(e, value) => {
                                            setPatientSearch(value);
                                            searchPatients(value);
                                        }}
                                        onChange={(e, value) => {
                                            if (value) {
                                                setPatient(value);
                                                setFormData(prev => ({ ...prev, patient: value.id }));
                                            } else {
                                                setPatient(null);
                                                setFormData(prev => ({ ...prev, patient: '' }));
                                            }
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Rechercher un Patient"
                                                placeholder="Nom ou Numéro"
                                                required
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <React.Fragment>
                                                            {searching ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </React.Fragment>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    select
                                    required
                                    label="Type de Visite"
                                    name="visit_type"
                                    value={formData.visit_type}
                                    onChange={handleChange}
                                >
                                    {visitTypes.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    select
                                    required
                                    label="Priorité"
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                >
                                    <MenuItem value="routine">Normale</MenuItem>
                                    <MenuItem value="urgent">Urgente</MenuItem>
                                    <MenuItem value="emergency">Urgence</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Notes complémentaires"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    multiline
                                    rows={3}
                                    placeholder="Informations complémentaires (optionnel)"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate(-1)}
                                        disabled={loading}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={loading || !formData.patient}
                                    >
                                        {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default VisitForm;
