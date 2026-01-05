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
import { suppliersAPI } from '../../services/api';

const validationSchema = Yup.object({
  name: Yup.string().required('Le nom est requis'),
  email: Yup.string().email('Email invalide').required('L\'email est requis'),
  phone: Yup.string(),
  contact_person: Yup.string(),
  address: Yup.string(),
  city: Yup.string(),
  province: Yup.string(),
  status: Yup.string().required('Le statut est requis'),
  rating: Yup.number().min(0).max(5),
});

const PROVINCES = [
  { value: 'QC', label: 'Québec' },
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'Colombie-Britannique' },
  { value: 'AB', label: 'Alberta' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NS', label: 'Nouvelle-Écosse' },
  { value: 'NB', label: 'Nouveau-Brunswick' },
  { value: 'NL', label: 'Terre-Neuve-et-Labrador' },
  { value: 'PE', label: 'Île-du-Prince-Édouard' },
  { value: 'NT', label: 'Territoires du Nord-Ouest' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NU', label: 'Nunavut' },
];

function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = Boolean(id);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
      enqueueSnackbar('Erreur lors du chargement du fournisseur', { variant: 'error' });
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (isEdit) {
        await suppliersAPI.update(id, values);
        enqueueSnackbar('Fournisseur modifié avec succès', { variant: 'success' });
      } else {
        await suppliersAPI.create(values);
        enqueueSnackbar('Fournisseur créé avec succès', { variant: 'success' });
      }
      navigate('/suppliers');
    } catch (error) {
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
    <Box p={isMobile ? 2 : 3}>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4" sx={{
          fontSize: { xs: '1.75rem', md: '2.25rem' },
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          color: 'text.primary'
        }}>
          {isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{
          fontSize: '0.875rem',
          mt: 0.5
        }}>
          {isEdit ? 'Modifiez les informations du fournisseur' : 'Ajoutez un nouveau fournisseur à votre système'}
        </Typography>
      </Box>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, setFieldValue }) => (
          <Form>
            <Grid container spacing={3}>
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
                      Informations générales
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          name="name"
                          label="Nom du fournisseur"
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
                          label="Personne contact"
                          value={values.contact_person}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.contact_person && Boolean(errors.contact_person)}
                          helperText={touched.contact_person && errors.contact_person}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Statut</InputLabel>
                          <Select
                            name="status"
                            value={values.status}
                            onChange={handleChange}
                            label="Statut"
                          >
                            <MenuItem value="active">Actif</MenuItem>
                            <MenuItem value="pending">En attente</MenuItem>
                            <MenuItem value="inactive">Inactif</MenuItem>
                            <MenuItem value="blocked">Bloqué</MenuItem>
                          </Select>
                        </FormControl>
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
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          name="address"
                          label="Adresse"
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
                          label="Ville"
                          value={values.city}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.city && Boolean(errors.city)}
                          helperText={touched.city && errors.city}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Province</InputLabel>
                          <Select
                            name="province"
                            value={values.province}
                            onChange={handleChange}
                            label="Province"
                          >
                            <MenuItem value="">Aucune</MenuItem>
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
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Évaluation
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Rating
                        name="rating"
                        value={values.rating}
                        onChange={(e, newValue) => setFieldValue('rating', newValue)}
                        size="large"
                      />
                      <Typography variant="body2" color="text.secondary">
                        {values.rating} / 5
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Diversité
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="is_local"
                          checked={values.is_local}
                          onChange={handleChange}
                        />
                      }
                      label="Fournisseur local"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="is_minority_owned"
                          checked={values.is_minority_owned}
                          onChange={handleChange}
                        />
                      }
                      label="Propriété minoritaire"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="is_woman_owned"
                          checked={values.is_woman_owned}
                          onChange={handleChange}
                        />
                      }
                      label="Propriété féminine"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          name="is_indigenous"
                          checked={values.is_indigenous}
                          onChange={handleChange}
                        />
                      }
                      label="Entreprise autochtone"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => navigate('/suppliers')}
                    disabled={isSubmitting}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 3,
                      py: 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={isSubmitting}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 3,
                      py: 1,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                      }
                    }}
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

export default SupplierForm;