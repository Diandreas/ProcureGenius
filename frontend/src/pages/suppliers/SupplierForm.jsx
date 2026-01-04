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
  Rating,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Save,
  Cancel,
  Business,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../../services/api';

function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['suppliers', 'common']);
  const isEdit = Boolean(id);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const validationSchema = Yup.object({
    name: Yup.string().required(t('suppliers:form.validation.nameRequired')),
    email: Yup.string().email(t('suppliers:form.validation.invalidEmail')).required(t('suppliers:form.validation.emailRequired')),
    phone: Yup.string(),
    contact_person: Yup.string(),
    address: Yup.string(),
    city: Yup.string(),
    province: Yup.string(),
    status: Yup.string().required(t('suppliers:form.validation.statusRequired')),
    rating: Yup.number().min(0).max(5),
  });

  const PROVINCES = [
    { value: 'QC', label: t('suppliers:provinces.QC') },
    { value: 'ON', label: t('suppliers:provinces.ON') },
    { value: 'BC', label: t('suppliers:provinces.BC') },
    { value: 'AB', label: t('suppliers:provinces.AB') },
    { value: 'MB', label: t('suppliers:provinces.MB') },
    { value: 'SK', label: t('suppliers:provinces.SK') },
    { value: 'NS', label: t('suppliers:provinces.NS') },
    { value: 'NB', label: t('suppliers:provinces.NB') },
    { value: 'NL', label: t('suppliers:provinces.NL') },
    { value: 'PE', label: t('suppliers:provinces.PE') },
    { value: 'NT', label: t('suppliers:provinces.NT') },
    { value: 'YT', label: t('suppliers:provinces.YT') },
    { value: 'NU', label: t('suppliers:provinces.NU') },
  ];

  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    status: 'pending',
    rating: 0,
    is_local: false,
    is_minority_owned: false,
    is_woman_owned: false,
    is_indigenous: false,
    category_ids: [],
  });

  useEffect(() => {
    if (isEdit) {
      fetchSupplier();
    }
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.get(id);
      const supplier = response.data;
      setInitialValues({
        ...supplier,
        category_ids: supplier.categories?.map(c => c.id) || [],
      });
    } catch (error) {
      enqueueSnackbar(t('suppliers:messages.loadingError'), { variant: 'error' });
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (isEdit) {
        await suppliersAPI.update(id, values);
        enqueueSnackbar(t('suppliers:messages.updateSuccess'), { variant: 'success' });
      } else {
        await suppliersAPI.create(values);
        enqueueSnackbar(t('suppliers:messages.createSuccess'), { variant: 'success' });
      }
      navigate('/suppliers');
    } catch (error) {
      enqueueSnackbar(t('suppliers:messages.saveError'), { variant: 'error' });
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
      <Box sx={{ mb: 2.5, display: { xs: 'none', md: 'block' } }}>
        <Typography variant="h4" sx={{
          fontSize: { xs: '1.75rem', md: '2.25rem' },
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          color: 'text.primary'
        }}>
          {isEdit ? t('suppliers:form.title.edit') : t('suppliers:form.title.new')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{
          fontSize: '0.875rem',
          mt: 0.5
        }}>
          {isEdit ? t('suppliers:form.subtitle.edit') : t('suppliers:form.subtitle.new')}
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
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setFieldValue }) => (
          <Form>
            <Box sx={{ px: isMobile ? 2 : 0 }}>
            <Grid container spacing={isMobile ? 1.5 : 3}>
              {/* Informations générales */}
              <Grid item xs={12} md={8}>
                <Card sx={{
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    borderColor: 'primary.main'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('suppliers:form.sections.generalInfo')}
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          name="name"
                          label={t('suppliers:form.fields.supplierName')}
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
                          name="contact_person"
                          label={t('suppliers:form.fields.contactPerson')}
                          value={values.contact_person}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.contact_person && Boolean(errors.contact_person)}
                          helperText={touched.contact_person && errors.contact_person}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                          <InputLabel>{t('suppliers:form.fields.status')}</InputLabel>
                          <Select
                            name="status"
                            value={values.status}
                            onChange={handleChange}
                            label={t('suppliers:form.fields.status')}
                          >
                            <MenuItem value="active">{t('suppliers:status.active')}</MenuItem>
                            <MenuItem value="pending">{t('suppliers:status.pending')}</MenuItem>
                            <MenuItem value="inactive">{t('suppliers:status.inactive')}</MenuItem>
                            <MenuItem value="blocked">{t('suppliers:status.blocked')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          name="email"
                          label={t('suppliers:form.fields.email')}
                          type="email"
                          value={values.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.email && Boolean(errors.email)}
                          helperText={touched.email && errors.email}
                          required
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          name="phone"
                          label={t('suppliers:form.fields.phone')}
                          value={values.phone}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.phone && Boolean(errors.phone)}
                          helperText={touched.phone && errors.phone}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          name="address"
                          label={t('suppliers:form.fields.address')}
                          value={values.address}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.address && Boolean(errors.address)}
                          helperText={touched.address && errors.address}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          name="city"
                          label={t('suppliers:form.fields.city')}
                          value={values.city}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.city && Boolean(errors.city)}
                          helperText={touched.city && errors.city}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>{t('suppliers:form.fields.province')}</InputLabel>
                          <Select
                            name="province"
                            value={values.province}
                            onChange={handleChange}
                            label={t('suppliers:form.fields.province')}
                          >
                            <MenuItem value="">{t('suppliers:form.fields.none')}</MenuItem>
                            {PROVINCES.map((prov) => (
                              <MenuItem key={prov.value} value={prov.value}>
                                {prov.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Évaluation et diversité */}
              <Grid item xs={12} md={4}>
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
                        fontSize: isMobile ? '1rem' : undefined,
                        mb: isMobile ? 1.5 : 2
                      }}
                    >
                      {t('suppliers:form.sections.rating')}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Rating
                        name="rating"
                        value={values.rating}
                        onChange={(e, newValue) => setFieldValue('rating', newValue)}
                        size={isMobile ? 'medium' : 'large'}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                      >
                        {values.rating} / 5
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

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
                      {t('suppliers:form.sections.diversity')}
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="is_local"
                          checked={values.is_local}
                          onChange={handleChange}
                          size={isMobile ? 'small' : 'medium'}
                        />
                      }
                      label={t('suppliers:labels.localSupplier')}
                      sx={{
                        '& .MuiTypography-root': {
                          fontSize: isMobile ? '0.875rem' : undefined
                        },
                        mb: isMobile ? 0.5 : 1
                      }}
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="is_minority_owned"
                          checked={values.is_minority_owned}
                          onChange={handleChange}
                          size={isMobile ? 'small' : 'medium'}
                        />
                      }
                      label={t('suppliers:labels.minorityOwned')}
                      sx={{
                        '& .MuiTypography-root': {
                          fontSize: isMobile ? '0.875rem' : undefined
                        },
                        mb: isMobile ? 0.5 : 1
                      }}
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="is_woman_owned"
                          checked={values.is_woman_owned}
                          onChange={handleChange}
                          size={isMobile ? 'small' : 'medium'}
                        />
                      }
                      label={t('suppliers:labels.womanOwned')}
                      sx={{
                        '& .MuiTypography-root': {
                          fontSize: isMobile ? '0.875rem' : undefined
                        },
                        mb: isMobile ? 0.5 : 1
                      }}
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="is_indigenous"
                          checked={values.is_indigenous}
                          onChange={handleChange}
                          size={isMobile ? 'small' : 'medium'}
                        />
                      }
                      label={t('suppliers:labels.indigenousOwned')}
                      sx={{
                        '& .MuiTypography-root': {
                          fontSize: isMobile ? '0.875rem' : undefined
                        }
                      }}
                    />
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
                  flexWrap: 'wrap',
                  px: isMobile ? 2 : 0,
                  pb: isMobile ? 2 : 0
                }}>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => navigate('/suppliers')}
                    disabled={isSubmitting}
                    fullWidth={isMobile}
                    sx={{
                      borderRadius: isMobile ? 2 : 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      px: isMobile ? 2 : 3,
                      py: isMobile ? 1.25 : 1,
                      fontSize: isMobile ? '0.875rem' : undefined,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: isMobile ? 'none' : 'scale(1.02)',
                        boxShadow: isMobile ? 2 : '0 2px 8px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    {t('suppliers:form.buttons.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isSubmitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <Save />}
                    disabled={isSubmitting}
                    fullWidth={isMobile}
                    sx={{
                      borderRadius: isMobile ? 2 : 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: isMobile ? 2 : 3,
                      py: isMobile ? 1.25 : 1,
                      fontSize: isMobile ? '0.875rem' : undefined,
                      boxShadow: isMobile ? 2 : undefined,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: isMobile ? 'translateY(-1px)' : 'scale(1.02)',
                        boxShadow: isMobile ? 4 : '0 4px 12px rgba(25, 118, 210, 0.3)'
                      }
                    }}
                  >
                    {isSubmitting ? t('common:labels.saving', 'Enregistrement...') : (isEdit ? t('suppliers:form.buttons.save') : t('suppliers:form.buttons.create'))}
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

export default SupplierForm;