import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  CircularProgress,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import { Save, Cancel, ArrowBack } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSourcingEvent,
  createSourcingEvent,
  updateSourcingEvent,
} from '../../store/slices/eSourcingSlice';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';

function SourcingEventForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const { currentEvent, loading } = useSelector((state) => state.eSourcing);
  const { suppliers } = useSelector((state) => state.suppliers);

  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    terms_and_conditions: '',
    submission_deadline: '',
    evaluation_deadline: '',
    estimated_budget: '',
    suppliers: [],
  });

  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSuppliers());
    if (isEditMode) {
      dispatch(fetchSourcingEvent(id));
    }
  }, [id, isEditMode, dispatch]);

  useEffect(() => {
    if (isEditMode && currentEvent) {
      setFormData({
        title: currentEvent.title || '',
        description: currentEvent.description || '',
        requirements: currentEvent.requirements || '',
        terms_and_conditions: currentEvent.terms_and_conditions || '',
        submission_deadline: currentEvent.submission_deadline
          ? currentEvent.submission_deadline.slice(0, 16)
          : '',
        evaluation_deadline: currentEvent.evaluation_deadline || '',
        estimated_budget: currentEvent.estimated_budget || '',
        suppliers: currentEvent.invitations?.map((inv) => inv.supplier) || [],
      });

      const selectedSups = currentEvent.invitations?.map((inv) => ({
        id: inv.supplier,
        name: inv.supplier_name,
      })) || [];
      setSelectedSuppliers(selectedSups);
    }
  }, [currentEvent, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSuppliersChange = (event, newValue) => {
    setSelectedSuppliers(newValue);
    setFormData((prev) => ({
      ...prev,
      suppliers: newValue.map((s) => s.id),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        estimated_budget: formData.estimated_budget || null,
        evaluation_deadline: formData.evaluation_deadline || null,
      };

      if (isEditMode) {
        await dispatch(updateSourcingEvent({ id, data: payload })).unwrap();
        enqueueSnackbar('Événement modifié avec succès', { variant: 'success' });
      } else {
        await dispatch(createSourcingEvent(payload)).unwrap();
        enqueueSnackbar('Événement créé avec succès', { variant: 'success' });
      }
      navigate('/e-sourcing/events');
    } catch (error) {
      enqueueSnackbar(
        error.message || "Erreur lors de l'enregistrement de l'événement",
        { variant: 'error' }
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditMode && loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/e-sourcing/events')}
        sx={{ mb: 2 }}
      >
        Retour à la liste
      </Button>

      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            {isEditMode ? 'Modifier' : 'Nouvel'} Événement de Sourcing
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {isEditMode
              ? "Modifiez les informations de l'événement"
              : 'Créez un nouvel événement RFQ pour demander des prix'}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Informations générales */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Informations générales
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Titre"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Demande de prix pour fournitures de bureau"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Décrivez l'objet de cet appel d'offres..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Exigences"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  placeholder="Listez les exigences spécifiques..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Termes et conditions"
                  name="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={handleChange}
                  placeholder="Indiquez les termes et conditions..."
                />
              </Grid>

              {/* Dates et budget */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Dates et budget
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="datetime-local"
                  label="Date limite de soumission"
                  name="submission_deadline"
                  value={formData.submission_deadline}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date limite d'évaluation"
                  name="evaluation_deadline"
                  value={formData.evaluation_deadline}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Budget estimé"
                  name="estimated_budget"
                  value={formData.estimated_budget}
                  onChange={handleChange}
                  InputProps={{
                    endAdornment: '$',
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              {/* Fournisseurs à inviter */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Fournisseurs à inviter
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={suppliers}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedSuppliers}
                  onChange={handleSuppliersChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sélectionner des fournisseurs"
                      placeholder="Rechercher..."
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => navigate('/e-sourcing/events')}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={submitting}
                  >
                    {submitting ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default SourcingEventForm;
