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
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        {isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
      </Typography>

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
                <Card>
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
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => navigate('/suppliers')}
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

export default SupplierForm;