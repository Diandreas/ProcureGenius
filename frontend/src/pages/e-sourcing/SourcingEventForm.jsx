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
import { useTranslation } from 'react-i18next';

function SourcingEventForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['eSourcing', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        enqueueSnackbar(t('eSourcing:messages.updateSuccess'), { variant: 'success' });
      } else {
        await dispatch(createSourcingEvent(payload)).unwrap();
        enqueueSnackbar(t('eSourcing:messages.createSuccess'), { variant: 'success' });
      }
      navigate('/e-sourcing/events');
    } catch (error) {
      enqueueSnackbar(
        error.message || (isEditMode ? t('eSourcing:messages.updateError') : t('eSourcing:messages.createError')),
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
    <Box sx={{
      p: { xs: 0, sm: 2, md: 3 },
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/e-sourcing/events')}
          sx={{ mb: 2 }}
        >
          {t('common:backToList')}
        </Button>
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
      <Box sx={{ px: isMobile ? 2 : 0 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
            {isEditMode ? t('eSourcing:form.title.edit') : t('eSourcing:form.title.new')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ display: { xs: 'none', md: 'block' } }}>
            {isEditMode
              ? t('eSourcing:form.editDescription')
              : t('eSourcing:form.createDescription')}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Informations générales */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t('eSourcing:form.sections.general')}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label={t('eSourcing:form.fields.eventTitle')}
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t('eSourcing:form.placeholders.title')}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label={t('eSourcing:labels.description')}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('eSourcing:form.placeholders.description')}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('eSourcing:labels.requirements')}
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  placeholder={t('eSourcing:form.placeholders.requirements')}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('eSourcing:labels.termsAndConditions')}
                  name="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={handleChange}
                  placeholder={t('eSourcing:form.placeholders.termsAndConditions')}
                />
              </Grid>

              {/* Dates et budget */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('eSourcing:form.sections.datesAndBudget')}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="datetime-local"
                  label={t('eSourcing:labels.submissionDeadline')}
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
                  label={t('eSourcing:labels.evaluationDeadline')}
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
                  label={t('eSourcing:labels.estimatedBudget')}
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
                  {t('eSourcing:form.sections.suppliers')}
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
                      label={t('eSourcing:form.fields.selectSuppliers')}
                      placeholder={t('eSourcing:form.placeholders.searchSuppliers')}
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
                    {t('common:cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={submitting}
                  >
                    {submitting ? t('common:buttons.saving') : t('common:save')}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
      </Box>
    </Box>
  );
}

export default SourcingEventForm;
