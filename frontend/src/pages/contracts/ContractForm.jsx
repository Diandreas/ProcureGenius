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
import {
  fetchContract,
  createContract,
  updateContract,
} from '../../store/slices/contractsSlice';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';

function ContractForm() {
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
        enqueueSnackbar('Contrat modifié avec succès', { variant: 'success' });
      } else {
        await dispatch(createContract(payload)).unwrap();
        enqueueSnackbar('Contrat créé avec succès', { variant: 'success' });
      }
      navigate('/contracts');
    } catch (error) {
      enqueueSnackbar(
        error.message || 'Erreur lors de l\'enregistrement du contrat',
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
        onClick={() => navigate('/contracts')}
        sx={{ mb: 2 }}
      >
        Retour à la liste
      </Button>

      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            {isEditMode ? 'Modifier le contrat' : 'Nouveau contrat'}
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

              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  required
                  label="Titre du contrat"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Contrat de service annuel"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Type de contrat</InputLabel>
                  <Select
                    name="contract_type"
                    value={formData.contract_type}
                    onChange={handleChange}
                    label="Type de contrat"
                  >
                    <MenuItem value="purchase">Contrat d'achat</MenuItem>
                    <MenuItem value="service">Contrat de service</MenuItem>
                    <MenuItem value="maintenance">Contrat de maintenance</MenuItem>
                    <MenuItem value="lease">Contrat de location</MenuItem>
                    <MenuItem value="nda">Accord de confidentialité</MenuItem>
                    <MenuItem value="partnership">Accord de partenariat</MenuItem>
                    <MenuItem value="other">Autre</MenuItem>
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
                      label="Fournisseur"
                      required
                      placeholder="Sélectionner un fournisseur"
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
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Décrivez l'objet et la portée du contrat..."
                />
              </Grid>

              {/* Dates et montants */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Dates et montants
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Date de début"
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
                  label="Date de fin"
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
                  label="Valeur totale"
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
                  Termes et conditions
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Termes et conditions"
                  name="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={handleChange}
                  placeholder="Détaillez les termes et conditions..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Conditions de paiement"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleChange}
                  placeholder="Ex: Net 30 jours"
                />
              </Grid>

              {/* Options de renouvellement */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Renouvellement et alertes
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
                  label="Renouvellement automatique"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Jours de préavis pour renouvellement"
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
                  label="Alerte avant expiration (jours)"
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
                  label="Notes internes"
                  name="internal_notes"
                  value={formData.internal_notes}
                  onChange={handleChange}
                  placeholder="Notes privées (non visibles par le fournisseur)..."
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

export default ContractForm;
