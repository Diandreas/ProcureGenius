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
    Divider,
    Stack
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import patientAPI from '../../../services/patientAPI';

const PatientForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();

    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        date_of_birth: '',
        gender: 'M',
        phone: '',
        email: '',
        address: '',
        blood_type: '',
        allergies: '',
        chronic_conditions: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
    });

    useEffect(() => {
        if (isEdit) {
            fetchPatient();
        }
    }, [id]);

    const fetchPatient = async () => {
        try {
            setLoading(true);
            const data = await patientAPI.getPatient(id);
            setFormData({
                name: data.name || '',
                date_of_birth: data.date_of_birth || '',
                gender: data.gender || 'M',
                phone: data.phone || '',
                email: data.email || '',
                address: data.address || '',
                blood_type: data.blood_type || '',
                allergies: data.allergies || '',
                chronic_conditions: data.chronic_conditions || '',
                emergency_contact_name: data.emergency_contact_name || '',
                emergency_contact_phone: data.emergency_contact_phone || '',
            });
        } catch (error) {
            console.error('Error fetching patient:', error);
            enqueueSnackbar(t('common.error'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.name || !formData.date_of_birth) {
            enqueueSnackbar(t('validation.required_fields'), { variant: 'warning' });
            return;
        }

        // NOUVEAU: Validation téléphone obligatoire pour les patients
        if (!formData.phone || !formData.phone.trim()) {
            enqueueSnackbar('Le numéro de téléphone est obligatoire pour les patients', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            if (isEdit) {
                await patientAPI.updatePatient(id, formData);
                enqueueSnackbar(t('patients.update_success', 'Patient mis à jour avec succès'), { variant: 'success' });
                navigate('/healthcare/patients');
            } else {
                const response = await patientAPI.createPatient(formData);
                enqueueSnackbar(t('patients.create_success', 'Patient créé avec succès'), { variant: 'success' });
                // Redirect to patient detail page after creation
                navigate(`/healthcare/patients/${response.id}`);
            }
        } catch (error) {
            console.error('Error saving patient:', error);
            // Show more specific error message if available
            const errorMessage = error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || t('common.error_saving');
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/patients')}>
                        {t('common.back', 'Retour')}
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        {isEdit ? t('patients.edit', 'Modifier Patient') : t('patients.new', 'Nouveau Patient')}
                    </Typography>
                </Stack>
                <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                >
                    {t('common.save', 'Enregistrer')}
                </Button>
            </Box>

            <Card sx={{ borderRadius: 3, mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" gutterBottom color="primary">Information Personnelle</Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label={t('patients.full_name', 'Nom complet')}
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                type="date"
                                label={t('patients.dob', 'Date de Naissance')}
                                name="date_of_birth"
                                value={formData.date_of_birth}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label={t('patients.gender', 'Sexe')}
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                            >
                                <MenuItem value="M">Masculin</MenuItem>
                                <MenuItem value="F">Féminin</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>

                    <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 4 }}>Coordonnées</Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                required
                                label={t('patients.phone', 'Téléphone')}
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                helperText="Obligatoire pour les patients"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('patients.email', 'Email')}
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={t('patients.address', 'Adresse')}
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                multiline
                                rows={2}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 4 }}>Information Médicale (Optionnel)</Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                select
                                fullWidth
                                label={t('patients.blood_type', 'Groupe Sanguin')}
                                name="blood_type"
                                value={formData.blood_type}
                                onChange={handleChange}
                            >
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth
                                label={t('patients.allergies', 'Allergies Connues')}
                                name="allergies"
                                value={formData.allergies}
                                onChange={handleChange}
                                placeholder="Ex: Pénicilline, Arachides..."
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={t('patients.chronic', 'Conditions Chroniques / Antécédents')}
                                name="chronic_conditions"
                                value={formData.chronic_conditions}
                                onChange={handleChange}
                                multiline
                                rows={2}
                                placeholder="Ex: Diabète, Hypertension..."
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};

export default PatientForm;
