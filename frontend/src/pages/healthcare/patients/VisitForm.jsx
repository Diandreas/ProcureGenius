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
    const patientId = searchParams.get('patient');

    const [loading, setLoading] = useState(false);
    const [patient, setPatient] = useState(null);
    const [formData, setFormData] = useState({
        patient: patientId || '',
        reason: '',
        priority: 'routine',
        notes: ''
    });

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

        try {
            await patientAPI.registerVisit({
                patient_id: formData.patient,
                chief_complaint: formData.reason,
                priority: formData.priority,
                notes: formData.notes
            });
            enqueueSnackbar('Visite enregistrée avec succès', { variant: 'success' });
            navigate('/healthcare/reception');
        } catch (error) {
            console.error('Error registering visit:', error);
            if (error.response?.data) {
                console.error('Validation errors:', error.response.data);
            }
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
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Motif de la visite"
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    multiline
                                    rows={3}
                                />
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
                                    label="Notes additionnelles"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    multiline
                                    rows={2}
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

                                {!patientId && (
                                    <Card sx={{ mb: 3 }}>
                                        <CardContent>
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
                                        </CardContent>
                                    </Card>
                                )}

                                {patient && (
                                    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
                                        <Typography variant="h6" color="primary">
                                            Patient sélectionné:
                                        </Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {patient.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            ID: {patient.patient_number} | Tél: {patient.phone}
                                        </Typography>
                                    </Box>
                                )}
                            </Grid>
                        </Grid>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default VisitForm;
