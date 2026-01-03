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
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../../services/api';

function ClientForm() {
    const { t } = useTranslation(['clients', 'common']);

    // Payment terms with translations
    const getPaymentTerms = () => [
        { value: 'NET 15', label: t('clients:paymentTerms.net15') },
        { value: 'NET 30', label: t('clients:paymentTerms.net30') },
        { value: 'NET 45', label: t('clients:paymentTerms.net45') },
        { value: 'NET 60', label: t('clients:paymentTerms.net60') },
        { value: 'CASH', label: t('clients:paymentTerms.cash') },
        { value: '2/10 NET 30', label: t('clients:paymentTerms.discount2_10Net30') },
    ];
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

    const validationSchema = Yup.object({
        name: Yup.string().required(t('clients:validation.nameRequired')),
        email: Yup.string().email(t('clients:validation.emailInvalid')).required(t('clients:validation.emailRequired')),
        phone: Yup.string().required(t('clients:validation.phoneRequired')),
        contact_person: Yup.string().required(t('clients:validation.contactPersonRequired')),
        billing_address: Yup.string().required(t('clients:validation.billingAddressRequired')),
        payment_terms: Yup.string().required(t('clients:validation.paymentTermsRequired')),
        credit_limit: Yup.number().positive(t('clients:validation.creditLimitPositive')).nullable(),
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
            enqueueSnackbar(t('clients:messages.loadClientError'), { variant: 'error' });
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
                enqueueSnackbar(t('clients:messages.updateSuccess'), { variant: 'success' });
            } else {
                await clientsAPI.create(cleanedValues);
                enqueueSnackbar(t('clients:messages.createSuccess'), { variant: 'success' });
            }
            navigate('/clients');
        } catch (error) {
            console.error('Error saving client:', error);
            enqueueSnackbar(t('clients:messages.saveError'), { variant: 'error' });
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
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            {/* Header - Caché sur mobile (géré par top navbar) */}
            <Box sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                    {isEdit ? t('clients:editClient') : t('clients:newClient')}
                </Typography>
            </Box>

            {/* Actions Mobile - Affiché uniquement sur mobile */}
            <Box sx={{ mb: 2, display: { xs: 'block', md: 'none' } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/clients')}
                        size="small"
                    >
                        {t('common:back')}
                    </Button>
                    <Typography variant="h6" noWrap sx={{ flex: 1, ml: 1 }}>
                        {isEdit ? t('clients:editClient') : t('clients:newClient')}
                    </Typography>
                </Stack>
            </Box>

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
                                            {t('clients:labels.generalInfo')}
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    name="name"
                                                    label={t('clients:labels.name')}
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
                                                    label={t('clients:labels.legalName')}
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
                                                    label={t('clients:labels.businessNumber')}
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
                                            {t('clients:labels.contactInfo')}
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    name="contact_person"
                                                    label={t('clients:labels.contactPerson')}
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
                                                    label={t('clients:labels.email')}
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
                                                    label={t('clients:labels.phone')}
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
                                                    label={t('clients:labels.billingAddress')}
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
                                            {t('clients:labels.commercialConditions')}
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <FormControl fullWidth required>
                                                    <InputLabel>{t('clients:labels.paymentTerms')}</InputLabel>
                                                    <Select
                                                        name="payment_terms"
                                                        value={values.payment_terms}
                                                        onChange={handleChange}
                                                        label={t('clients:labels.paymentTerms')}
                                                        error={touched.payment_terms && Boolean(errors.payment_terms)}
                                                    >
                                                        {getPaymentTerms().map((term) => (
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
                                                    label={t('clients:labels.creditLimit')}
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
                                            {t('clients:labels.statusAndOptions')}
                                        </Typography>

                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    name="is_active"
                                                    checked={values.is_active}
                                                    onChange={handleChange}
                                                />
                                            }
                                            label={t('clients:labels.activeClient')}
                                            sx={{ mb: 2 }}
                                        />

                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                {t('clients:labels.aiInfo')}
                                            </Typography>
                                            <Typography variant="body2">
                                                {t('clients:labels.aiInfoDescription')}
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
                                        {t('clients:actions.cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<Save />}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <CircularProgress size={24} /> : (isEdit ? t('clients:actions.modify') : t('clients:actions.create'))}
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
