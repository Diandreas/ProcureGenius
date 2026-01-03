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
  CircularProgress,
  Divider,
  Stack,
  Autocomplete,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Save, Cancel, ArrowBack } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchContract,
  createContract,
  updateContract,
} from '../../store/slices/contractsSlice';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';

function ContractForm() {
  const { t } = useTranslation(['contracts', 'common']);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const { currentContract, loading } = useSelector((state) => state.contracts);
  const { suppliers } = useSelector((state) => state.suppliers);

  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    contract_type: 'purchase',
    supplier: null,
    description: '',
    terms_and_conditions: '',
    payment_terms: '',
    start_date: '',
    end_date: '',
    total_value: '',
    currency: 'CAD',
    auto_renewal: false,
    renewal_notice_days: 30,
    alert_days_before_expiry: 30,
    internal_notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSuppliers());
    if (isEditMode) {
      dispatch(fetchContract(id));
    }
  }, [id, isEditMode, dispatch]);

  useEffect(() => {
    if (isEditMode && currentContract) {
      setFormData({
        title: currentContract.title || '',
        contract_type: currentContract.contract_type || 'purchase',
        supplier: suppliers.find(s => s.id === currentContract.supplier) || null,
        description: currentContract.description || '',
        terms_and_conditions: currentContract.terms_and_conditions || '',
        payment_terms: currentContract.payment_terms || '',
        start_date: currentContract.start_date || '',
        end_date: currentContract.end_date || '',
        total_value: currentContract.total_value || '',
        currency: currentContract.currency || 'CAD',
        auto_renewal: currentContract.auto_renewal || false,
        renewal_notice_days: currentContract.renewal_notice_days || 30,
        alert_days_before_expiry: currentContract.alert_days_before_expiry || 30,
        internal_notes: currentContract.internal_notes || '',
      });
    }
  }, [currentContract, isEditMode, suppliers]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSupplierChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      supplier: newValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        supplier: formData.supplier?.id,
      };

      if (isEditMode) {
        await dispatch(updateContract({ id, data: payload })).unwrap();
        enqueueSnackbar(t('contracts:messages.updateSuccess'), { variant: 'success' });
      } else {
        await dispatch(createContract(payload)).unwrap();
        enqueueSnackbar(t('contracts:messages.createSuccess'), { variant: 'success' });
      }
      navigate('/contracts');
    } catch (error) {
      enqueueSnackbar(
        error.message || t('contracts:messages.updateError'),
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
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/contracts')}
          sx={{ mb: 2 }}
        >
          {t('common:back')}
        </Button>
      </Box>

      {/* Actions Mobile - Affiché uniquement sur mobile */}
      <Box sx={{ mb: 2, display: { xs: 'block', md: 'none' } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/contracts')}
            size="small"
          >
            {t('common:back')}
          </Button>
          <Typography variant="h6" noWrap sx={{ flex: 1, ml: 1 }}>
            {isEditMode ? t('contracts:form.title.edit') : t('contracts:form.title.new')}
          </Typography>
        </Stack>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
            {isEditMode ? t('contracts:form.title.edit') : t('contracts:form.title.new')}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Informations générales */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t('contracts:form.fields.generalInfo')}
                </Typography>
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  required
                  label={t('contracts:form.fields.contractTitle')}
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t('contracts:form.fields.descriptionPlaceholder')}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>{t('contracts:form.fields.contractType')}</InputLabel>
                  <Select
                    name="contract_type"
                    value={formData.contract_type}
                    onChange={handleChange}
                    label={t('contracts:form.fields.contractType')}
                  >
                    <MenuItem value="purchase">{t('contracts:form.fields.purchase_contract')}</MenuItem>
                    <MenuItem value="service">{t('contracts:form.fields.service_contract')}</MenuItem>
                    <MenuItem value="maintenance">{t('contracts:form.fields.maintenance_contract')}</MenuItem>
                    <MenuItem value="lease">{t('contracts:form.fields.lease_contract')}</MenuItem>
                    <MenuItem value="nda">{t('contracts:form.fields.nda_contract')}</MenuItem>
                    <MenuItem value="partnership">{t('contracts:form.fields.partnership_contract')}</MenuItem>
                    <MenuItem value="other">{t('contracts:form.fields.other_contract')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => option.name || ''}
                  value={formData.supplier}
                  onChange={handleSupplierChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('contracts:form.fields.supplier')}
                      required
                      placeholder={t('contracts:form.fields.selectSupplier')}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label={t('contracts:form.fields.description')}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('contracts:form.fields.descriptionPlaceholder')}
                />
              </Grid>

              {/* Dates et montants */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('contracts:form.fields.datesAndAmounts')}
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label={t('contracts:form.fields.startDate')}
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label={t('contracts:form.fields.endDate')}
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label={t('contracts:form.fields.totalValue')}
                  name="total_value"
                  value={formData.total_value}
                  onChange={handleChange}
                  InputProps={{ endAdornment: formData.currency }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              {/* Termes */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('contracts:form.fields.termsSection')}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label={t('contracts:form.fields.terms')}
                  name="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={handleChange}
                  placeholder={t('contracts:form.fields.termsPlaceholder')}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('contracts:form.fields.paymentTerms')}
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleChange}
                  placeholder={t('contracts:form.fields.paymentTermsPlaceholder')}
                />
              </Grid>

              {/* Options de renouvellement */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('contracts:form.fields.renewalAndAlerts')}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="auto_renewal"
                      checked={formData.auto_renewal}
                      onChange={handleChange}
                    />
                  }
                  label={t('contracts:form.fields.autoRenewal')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('contracts:form.fields.renewalNoticeDays')}
                  name="renewal_notice_days"
                  value={formData.renewal_notice_days}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('contracts:form.fields.alertDaysBeforeExpiry')}
                  name="alert_days_before_expiry"
                  value={formData.alert_days_before_expiry}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                />
              </Grid>

              {/* Notes internes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('contracts:form.fields.internalNotes')}
                  name="internal_notes"
                  value={formData.internal_notes}
                  onChange={handleChange}
                  placeholder={t('contracts:form.fields.notesPlaceholder')}
                />
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => navigate('/contracts')}
                  >
                    {t('common:cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={submitting}
                  >
                    {submitting ? t('common:saving') : t('common:save')}
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

export default ContractForm;
