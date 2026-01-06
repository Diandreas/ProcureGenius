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
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Alert,
    InputAdornment,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Save,
    Cancel,
    Person,
    AttachMoney,
    Email,
    Phone,
    Business,
    ArrowBack,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../../services/api';

function ClientForm() {
    const { t } = useTranslation(['clients', 'common']);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        payment_terms: 'CASH',
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
        <Box sx={{
            p: { xs: 0, sm: 2, md: 3 },
            bgcolor: 'background.default',
            minHeight: '100vh'
        }}>
            {/* Header - Caché sur mobile (géré par top navbar) */}
            <Box sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                    {isEdit ? t('clients:editClient') : t('clients:newClient')}
                </Typography>
            </Box>

            {/* Actions Mobile - Style mobile app compact (pas de bouton back, géré par top navbar) */}
            <Box sx={{
                mb: 1.5,
                display: { xs: 'flex', md: 'none' },
                justifyContent: 'flex-end',
                px: 2,
                py: 1
            }}>
                {/* Les actions sont gérées par le top navbar sur mobile */}
            </Box>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                    <Form>
                        <Box sx={{ px: isMobile ? 2 : 0 }}>
                            <Grid container spacing={isMobile ? 1.5 : 3}>
                                {/* Informations générales */}
                                <Grid item xs={12} md={8}>
                                    <Card sx={{
                                        mb: isMobile ? 1.5 : 3,
                                        borderRadius: isMobile ? 2.5 : 2,
                                        boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
                                        backdropFilter: isMobile ? 'blur(10px)' : 'none',
                                        border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                    }}>
                                        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                                            <Typography
                                                variant="h6"
                                                gutterBottom
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    fontSize: isMobile ? '1rem' : undefined,
                                                    mb: isMobile ? 1.5 : 2
                                                }}
                                            >
                                                <Business sx={{ fontSize: isMobile ? 20 : 24 }} />
                                                {t('clients:labels.generalInfo')}
                                            </Typography>

                                            <Grid container spacing={isMobile ? 1.5 : 2}>
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
                                <Card sx={{
                                    mb: isMobile ? 1.5 : 3,
                                    borderRadius: isMobile ? 2.5 : 2,
                                    boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
                                    backdropFilter: isMobile ? 'blur(10px)' : 'none',
                                    border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                }}>
                                    <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                                        <Typography
                                            variant="h6"
                                            gutterBottom
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                fontSize: isMobile ? '1rem' : undefined,
                                                mb: isMobile ? 1.5 : 2
                                            }}
                                        >
                                            <Person sx={{ fontSize: isMobile ? 20 : 24 }} />
                                            {t('clients:labels.contactInfo')}
                                        </Typography>

                                        <Grid container spacing={isMobile ? 1.5 : 2}>
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
                                <Card sx={{
                                    borderRadius: isMobile ? 2.5 : 2,
                                    boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
                                    backdropFilter: isMobile ? 'blur(10px)' : 'none',
                                    border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                }}>
                                    <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                                        <Typography
                                            variant="h6"
                                            gutterBottom
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                fontSize: isMobile ? '1rem' : undefined,
                                                mb: isMobile ? 1.5 : 2
                                            }}
                                        >
                                            <AttachMoney sx={{ fontSize: isMobile ? 20 : 24 }} />
                                            {t('clients:labels.commercialConditions')}
                                        </Typography>

                                        <Grid container spacing={isMobile ? 1.5 : 2}>
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
                                <Card sx={{
                                    borderRadius: isMobile ? 2.5 : 2,
                                    boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
                                    backdropFilter: isMobile ? 'blur(10px)' : 'none',
                                    border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                }}>
                                    <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                                        <Typography
                                            variant="h6"
                                            gutterBottom
                                            sx={{
                                                fontSize: isMobile ? '1rem' : undefined,
                                                mb: isMobile ? 1.5 : 2
                                            }}
                                        >
                                            {t('clients:labels.statusAndOptions')}
                                        </Typography>

                                        <Alert
                                            severity="info"
                                            sx={{
                                                mb: isMobile ? 1.5 : 2,
                                                borderRadius: isMobile ? 2 : 1,
                                                '& .MuiAlert-message': {
                                                    fontSize: isMobile ? '0.813rem' : undefined
                                                }
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                gutterBottom
                                                sx={{ fontSize: isMobile ? '0.875rem' : undefined, fontWeight: 600 }}
                                            >
                                                {t('clients:labels.autoStatusTitle')}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ fontSize: isMobile ? '0.75rem' : undefined, mb: 1 }}
                                            >
                                                {t('clients:labels.autoStatusDescription')}
                                            </Typography>
                                            {values.last_activity_date && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{ fontSize: isMobile ? '0.688rem' : undefined, display: 'block', mt: 0.5 }}
                                                >
                                                    {t('clients:labels.lastActivity')}: {new Date(values.last_activity_date).toLocaleDateString()}
                                                </Typography>
                                            )}
                                        </Alert>

                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    name="is_manually_active"
                                                    checked={values.is_manually_active || false}
                                                    onChange={handleChange}
                                                />
                                            }
                                            label={t('clients:labels.manualStatus')}
                                            sx={{
                                                mb: isMobile ? 1.5 : 2,
                                                '& .MuiTypography-root': {
                                                    fontSize: isMobile ? '0.875rem' : undefined
                                                }
                                            }}
                                        />

                                        {values.is_manually_active && (
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        name="is_active"
                                                        checked={values.is_active}
                                                        onChange={handleChange}
                                                    />
                                                }
                                                label={t('clients:labels.activeClient')}
                                                sx={{
                                                    mb: isMobile ? 1.5 : 2,
                                                    ml: 2,
                                                    '& .MuiTypography-root': {
                                                        fontSize: isMobile ? '0.875rem' : undefined
                                                    }
                                                }}
                                            />
                                        )}

                                        <Alert
                                            severity="info"
                                            sx={{
                                                mt: isMobile ? 1.5 : 2,
                                                borderRadius: isMobile ? 2 : 1,
                                                '& .MuiAlert-message': {
                                                    fontSize: isMobile ? '0.813rem' : undefined
                                                }
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                gutterBottom
                                                sx={{ fontSize: isMobile ? '0.875rem' : undefined }}
                                            >
                                                {t('clients:labels.aiInfo')}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ fontSize: isMobile ? '0.75rem' : undefined }}
                                            >
                                                {t('clients:labels.aiInfoDescription')}
                                            </Typography>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Actions - Style mobile app */}
                            <Grid item xs={12}>
                                <Box sx={{
                                    display: 'flex',
                                    gap: isMobile ? 1 : 2,
                                    justifyContent: 'flex-end',
                                    flexDirection: isMobile ? 'column-reverse' : 'row',
                                    px: isMobile ? 2 : 0,
                                    pb: isMobile ? 2 : 0
                                }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Cancel />}
                                        onClick={() => navigate('/clients')}
                                        disabled={isSubmitting}
                                        fullWidth={isMobile}
                                        sx={{
                                            borderRadius: isMobile ? 2 : undefined,
                                            py: isMobile ? 1.25 : undefined,
                                            fontSize: isMobile ? '0.875rem' : undefined
                                        }}
                                    >
                                        {t('clients:actions.cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={isSubmitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <Save />}
                                        disabled={isSubmitting}
                                        fullWidth={isMobile}
                                        sx={{
                                            borderRadius: isMobile ? 2 : undefined,
                                            py: isMobile ? 1.25 : undefined,
                                            fontSize: isMobile ? '0.875rem' : undefined,
                                            fontWeight: 600,
                                            boxShadow: isMobile ? 2 : undefined,
                                            '&:hover': {
                                                boxShadow: isMobile ? 4 : undefined,
                                                transform: isMobile ? 'translateY(-1px)' : 'none'
                                            },
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {isSubmitting ? t('common:labels.saving', 'Enregistrement...') : (isEdit ? t('clients:actions.modify') : t('clients:actions.create'))}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                        </Box>
                    </Form>
                )}
            </Formik>
        </Box>
    );
}

export default ClientForm;
