import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Divider
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';

/**
 * Composant de création rapide générique
 * Utilisable pour créer des clients, fournisseurs, produits depuis n'importe quel formulaire
 */
const QuickCreateDialog = ({
  open,
  onClose,
  onSuccess,
  entityType, // 'client' | 'supplier' | 'product'
  fields, // Configuration des champs à afficher
  createFunction, // Fonction API pour créer l'entité
  title,
  contextData = {} // Données contextuelles (ex: fournisseur sélectionné pour un produit)
}) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [similarEntities, setSimilarEntities] = useState([]);

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setError(null);
    setSimilarEntities([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSimilarEntities([]);

    try {
      const dataToSend = { ...formData, ...contextData };
      const response = await createFunction(dataToSend);

      if (onSuccess) {
        onSuccess(response.data);
      }
      handleClose();
    } catch (err) {
      // 409 = entités similaires trouvées
      if (err.response?.status === 409 && err.response?.data?.error === 'similar_entities_found') {
        setSimilarEntities(err.response.data.similar_entities || []);
        setError(err.response.data.message || 'Des entités similaires ont été trouvées.');
      } else {
        const msg = err.response?.data?.error || err.response?.data?.detail || err.message || "Erreur lors de la création";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setError(null);
    setSimilarEntities([]);
    setLoading(false);
    onClose();
  };

  const handleForceCreate = async () => {
    setLoading(true);
    try {
      const dataToSend = { ...formData, ...contextData, force_create: true };
      const response = await createFunction(dataToSend);
      if (onSuccess) {
        onSuccess(response.data);
      }
      handleClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || "Erreur lors de la création forcée";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';

    if (field.type === 'select') {
      return (
        <TextField
          key={field.name}
          select
          fullWidth
          label={field.label}
          value={value}
          onChange={(e) => handleChange(field.name, e.target.value)}
          required={field.required}
          size="small"
          disabled={field.disabled}
        >
          {field.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        key={field.name}
        fullWidth
        label={field.label}
        value={value}
        onChange={(e) => handleChange(field.name, e.target.value)}
        type={field.type || 'text'}
        required={field.required}
        multiline={field.multiline}
        rows={field.rows || 1}
        size="small"
        disabled={field.disabled}
        helperText={field.helperText}
      />
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon color="primary" />
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Button onClick={handleClose} size="small" color="inherit">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {error && (
          <Alert severity={similarEntities.length > 0 ? "warning" : "error"} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {similarEntities.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Entités similaires trouvées :
            </Typography>
            {similarEntities.map((entity, index) => (
              <Alert key={index} severity="info" sx={{ mb: 1, py: 0.5 }}>
                <Typography variant="body2">
                  <strong>{entity.name || entity.company || entity.product_name}</strong>
                  {entity.email && ` - ${entity.email}`}
                  {entity.phone && ` - ${entity.phone}`}
                  {entity.similarity && ` (${Math.round(entity.similarity * 100)}% similaire)`}
                </Typography>
              </Alert>
            ))}
            <Typography variant="caption" color="text.secondary">
              Voulez-vous créer quand même ?
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          {fields.map((field) => (
            <Grid item xs={field.fullWidth ? 12 : 6} key={field.name}>
              {renderField(field)}
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>

        {similarEntities.length > 0 ? (
          <Button
            onClick={handleForceCreate}
            variant="contained"
            color="warning"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Créer quand même
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {loading ? 'Création...' : 'Créer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QuickCreateDialog;
