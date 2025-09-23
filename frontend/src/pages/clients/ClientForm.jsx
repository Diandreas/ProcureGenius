import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Alert,
    InputAdornment,
} from '@mui/material';
import {
    Save,
    Cancel,
    Person,
    AttachMoney,
    Email,
    Phone,
    Business,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { clientsAPI } from '../../services/api';

const validationSchema = Yup.object({
    name: Yup.string().required('Le nom est requis'),
    email: Yup.string().email('Email invalide').required('L\'email est requis'),
    phone: Yup.string().required('Le téléphone est requis'),
    contact_person: Yup.string().required('La personne de contact est requise'),
    billing_address: Yup.string().required('L\'adresse de facturation est requise'),
    payment_terms: Yup.string().required('Les conditions de paiement sont requises'),
    credit_limit: Yup.number().positive('La limite de crédit doit être positive').nullable(),
});

const PAYMENT_TERMS = [
    { value: 'NET 15', label: 'NET 15 - Paiement sous 15 jours' },
    { value: 'NET 30', label: 'NET 30 - Paiement sous 30 jours' },
    { value: 'NET 45', label: 'NET 45 - Paiement sous 45 jours' },
    { value: 'NET 60', label: 'NET 60 - Paiement sous 60 jours' },
    { value: 'CASH', label: 'CASH - Paiement comptant' },
    { value: '2/10 NET 30', label: '2/10 NET 30 - 2% escompte si payé sous 10 jours, sinon 30 jours' },
];

function ClientForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [initialValues, setInitialValues] = useState({
        name: '',
        legal_name: '',
        business_number: '',
        contact_person: '',
        email: '',
        phone: '',
        billing_address: '',
        payment_terms: 'NET 30',
        credit_limit: '',
        is_active: true,
    });

    useEffect(() => {
        if (isEdit) {
            fetchClient();
        }
    }, [id]);

    const fetchClient = async () => {
        setLoading(true);
        try {
            const response = await clientsAPI.get(id);
            const client = response.data;
            setInitialValues({
                ...client,
                credit_limit: client.credit_limit || '',
            });
        } catch (error) {
            enqueueSnackbar('Erreur lors du chargement du client', { variant: 'error' });
            navigate('/clients');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            // Clean up empty values
            const cleanedValues = {
                ...values,
                credit_limit: values.credit_limit ? parseFloat(values.credit_limit) : null,
                legal_name: values.legal_name || null,
                business_number: values.business_number || null,
            };

            if (isEdit) {
                await clientsAPI.update(id, cleanedValues);
                enqueueSnackbar('Client modifié avec succès', { variant: 'success' });
            } else {
                await clientsAPI.create(cleanedValues);
                enqueueSnackbar('Client créé avec succès', { variant: 'success' });
            }
            navigate('/clients');
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                {isEdit ? 'Modifier le client' : 'Nouveau client'}
            </Typography>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                    <Form>
                        <Grid container spacing={3}>
                            {/* Informations générales */}
                            <Grid item xs={12} md={8}>
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Business />
                                            Informations générales
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    name="name"
                                                    label="Nom du client"
                                                    value={values.name}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.name && Boolean(errors.name)}
                                                    helperText={touched.name && errors.name}
                                                    required
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="legal_name"
                                                    label="Nom légal (optionnel)"
                                                    value={values.legal_name}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.legal_name && Boolean(errors.legal_name)}
                                                    helperText={touched.legal_name && errors.legal_name}
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="business_number"
                                                    label="Numéro d'entreprise (optionnel)"
                                                    value={values.business_number}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.business_number && Boolean(errors.business_number)}
                                                    helperText={touched.business_number && errors.business_number}
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Contact */}
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Person />
                                            Informations de contact
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="contact_person"
                                                    label="Personne de contact"
                                                    value={values.contact_person}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.contact_person && Boolean(errors.contact_person)}
                                                    helperText={touched.contact_person && errors.contact_person}
                                                    required
                                                    InputProps={{
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <Person fontSize="small" />
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="email"
                                                    label="Email"
                                                    type="email"
                                                    value={values.email}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.email && Boolean(errors.email)}
                                                    helperText={touched.email && errors.email}
                                                    required
                                                    InputProps={{
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <Email fontSize="small" />
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="phone"
                                                    label="Téléphone"
                                                    value={values.phone}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.phone && Boolean(errors.phone)}
                                                    helperText={touched.phone && errors.phone}
                                                    required
                                                    InputProps={{
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <Phone fontSize="small" />
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    rows={3}
                                                    name="billing_address"
                                                    label="Adresse de facturation"
                                                    value={values.billing_address}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.billing_address && Boolean(errors.billing_address)}
                                                    helperText={touched.billing_address && errors.billing_address}
                                                    required
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Conditions commerciales */}
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <AttachMoney />
                                            Conditions commerciales
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <FormControl fullWidth required>
                                                    <InputLabel>Conditions de paiement</InputLabel>
                                                    <Select
                                                        name="payment_terms"
                                                        value={values.payment_terms}
                                                        onChange={handleChange}
                                                        label="Conditions de paiement"
                                                        error={touched.payment_terms && Boolean(errors.payment_terms)}
                                                    >
                                                        {PAYMENT_TERMS.map((term) => (
                                                            <MenuItem key={term.value} value={term.value}>
                                                                {term.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="credit_limit"
                                                    label="Limite de crédit (optionnel)"
                                                    type="number"
                                                    value={values.credit_limit}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.credit_limit && Boolean(errors.credit_limit)}
                                                    helperText={touched.credit_limit && errors.credit_limit}
                                                    InputProps={{
                                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                    }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Sidebar - Statut et options */}
                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Statut et options
                                        </Typography>

                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    name="is_active"
                                                    checked={values.is_active}
                                                    onChange={handleChange}
                                                />
                                            }
                                            label="Client actif"
                                            sx={{ mb: 2 }}
                                        />

                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Informations IA
                                            </Typography>
                                            <Typography variant="body2">
                                                Les scores de risque de paiement et les modèles de comportement
                                                seront automatiquement calculés par l'IA une fois le client créé
                                                et qu'il aura un historique de transactions.
                                            </Typography>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Actions */}
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Cancel />}
                                        onClick={() => navigate('/clients')}
                                        disabled={isSubmitting}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<Save />}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <CircularProgress size={24} /> : (isEdit ? 'Modifier' : 'Créer')}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Form>
                )}
            </Formik>
        </Box>
    );
}

export default ClientForm;
