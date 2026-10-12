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
    CircularProgress,
    InputAdornment,
    Collapse,
    Divider,
    useTheme,
} from '@mui/material';
import {
    Save,
    Cancel,
    Email,
    Phone,
    Business,
    ExpandMore,
    ExpandLess,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../../services/api';
import { offlineData } from '../../services/offline/entities';

// Codes stables (valeur envoyee au serveur) ; libelles traduits a l'affichage.
const PAYMENT_TERMS = [
    { value: 'CASH', labelKey: 'cash' },
    { value: 'NET 15', labelKey: 'net15' },
    { value: 'NET 30', labelKey: 'net30' },
    { value: 'NET 45', labelKey: 'net45' },
    { value: 'NET 60', labelKey: 'net60' },
    { value: '2/10 NET 30', labelKey: 'discount2_10Net30' },
];

function ClientForm() {
    const { t } = useTranslation(['clients', 'common']);
    const theme = useTheme();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [initialValues, setInitialValues] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        payment_terms: 'CASH',
        is_active: true,
    });

    const validationSchema = Yup.object({
        name: Yup.string().required(t('clients:form.validation.nameRequired')),
        email: Yup.string().email(t('clients:validation.emailInvalid')).nullable(),
        phone: Yup.string().nullable(),
        contact_person: Yup.string().nullable(),
        address: Yup.string().nullable(),
    });

    useEffect(() => {
        if (isEdit) fetchClient();
    }, [id]);

    const fetchClient = async () => {
        setLoading(true);
        try {
            const response = await offlineData.clients.get(id);
            const client = response.data;
            setInitialValues({ ...client });
            if (client.tax_id || client.payment_terms !== 'CASH') {
                setShowDetails(true);
            }
        } catch {
            enqueueSnackbar(t('clients:messages.loadClientError'), { variant: 'error' });
            navigate('/clients');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            const payload = {
                ...values,
                contact_person: values.contact_person || '',
                email: values.email || '',
                phone: values.phone || '',
                address: values.address || '',
                tax_id: values.tax_id || '',
            };
            if (isEdit) {
                await offlineData.clients.update(id, payload);
                enqueueSnackbar(t('clients:messages.updateSuccess'), { variant: 'success' });
            } else {
                await offlineData.clients.create(payload);
                enqueueSnackbar(t('clients:messages.createSuccess'), { variant: 'success' });
            }
            navigate('/clients');
        } catch {
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
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720, mx: 'auto' }}>
            <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
                <Typography variant="h5" fontWeight={700}>
                    {isEdit ? t('clients:editClient') : t('clients:form.newClient')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {isEdit ? t('clients:form.editSubtitle') : t('clients:form.newSubtitle')}
                </Typography>
            </Box>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                    <Form>
                        {/* Identité */}
                        <Card sx={{ mb: 2, borderRadius: 2 }}>
                            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                    <Business sx={{ color: 'primary.main', fontSize: 20 }} />
                                    <Typography variant="subtitle1" fontWeight={600}>{t('clients:form.identity')}</Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            name="name"
                                            label={t('clients:form.tradeName')}
                                            value={values.name}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.name && Boolean(errors.name)}
                                            helperText={touched.name && errors.name}
                                            required
                                            autoFocus
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            name="contact_person"
                                            label={t('clients:labels.contactPerson')}
                                            value={values.contact_person}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            name="phone"
                                            label={t('clients:labels.phone')}
                                            value={values.phone}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment>,
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
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
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment>,
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={2}
                                            name="address"
                                            label={t('clients:labels.address')}
                                            value={values.address}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Détails optionnels */}
                        <Card sx={{ mb: 3, borderRadius: 2 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: { xs: 2, md: 3 },
                                    py: 1.75,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    borderRadius: showDetails ? '8px 8px 0 0' : 2,
                                    transition: 'border-radius 0.2s',
                                }}
                                onClick={() => setShowDetails(v => !v)}
                            >
                                <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                                    {t('clients:form.additionalDetails')}
                                </Typography>
                                {showDetails ? <ExpandLess sx={{ color: 'text.secondary' }} /> : <ExpandMore sx={{ color: 'text.secondary' }} />}
                            </Box>
                            <Collapse in={showDetails}>
                                <Divider />
                                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                name="tax_id"
                                                label={t('clients:form.taxId')}
                                                value={values.tax_id}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                helperText={t('clients:form.taxIdHelp')}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth>
                                                <InputLabel>{t('clients:labels.paymentTerms')}</InputLabel>
                                                <Select
                                                    name="payment_terms"
                                                    value={values.payment_terms}
                                                    onChange={handleChange}
                                                    label={t('clients:labels.paymentTerms')}
                                                >
                                                    {PAYMENT_TERMS.map(term => (
                                                        <MenuItem key={term.value} value={term.value}>{t(`clients:form.paymentTermOptions.${term.labelKey}`)}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Collapse>
                        </Card>

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
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
                                startIcon={isSubmitting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <Save />}
                                disabled={isSubmitting}
                                sx={{ fontWeight: 600, px: 3 }}
                            >
                                {isSubmitting ? t('clients:form.saving') : (isEdit ? t('clients:actions.save') : t('clients:form.createClient'))}
                            </Button>
                        </Box>
                    </Form>
                )}
            </Formik>
        </Box>
    );
}

export default ClientForm;
