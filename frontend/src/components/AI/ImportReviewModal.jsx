import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Divider,
  Chip,
  Alert,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Edit,
  Close,
  Receipt,
  ShoppingCart,
  Business,
  Inventory,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { aiChatAPI } from '../../services/api';
import accountingAPI from '../../services/accountingAPI';
import { PAYMENT_METHODS } from '../../constants/paymentMethods';

const ENTITY_TYPE_ICONS = {
  expense: <Receipt />,
  invoice: <Receipt />,
  purchase_order: <ShoppingCart />,
  supplier: <Business />,
  product: <Inventory />,
};

function ImportReviewModal({ open, onClose, review, onApprove, onReject }) {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [modifiedData, setModifiedData] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (review) {
      setModifiedData(review.modified_data || review.extracted_data);
      setNotes(review.notes || '');
    }
  }, [review]);

  const handleFieldChange = (field, value) => {
    setModifiedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedFieldChange = (parentField, index, field, value) => {
    setModifiedData(prev => {
      const newData = { ...prev };
      if (!newData[parentField]) newData[parentField] = [];
      newData[parentField] = [...newData[parentField]];
      newData[parentField][index] = {
        ...newData[parentField][index],
        [field]: value
      };
      return newData;
    });
  };

  const handleSaveModifications = async () => {
    try {
      setSaving(true);
      await aiChatAPI.updateImportReview(review.id, {
        modified_data: modifiedData,
        notes: notes
      });
      enqueueSnackbar('Modifications sauvegardées', { variant: 'success' });
      onClose();
    } catch (error) {
      console.error('Error saving modifications:', error);
      enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderInvoiceFields = () => {
    if (!modifiedData) return null;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Numéro de facture"
            value={modifiedData.invoice_number || ''}
            onChange={(e) => handleFieldChange('invoice_number', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Date d'émission"
            type="date"
            value={modifiedData.issue_date || ''}
            onChange={(e) => handleFieldChange('issue_date', e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Client"
            value={modifiedData.client_name || ''}
            onChange={(e) => handleFieldChange('client_name', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email client"
            type="email"
            value={modifiedData.client_email || ''}
            onChange={(e) => handleFieldChange('client_email', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Montant total"
            type="number"
            value={modifiedData.total_amount || ''}
            onChange={(e) => handleFieldChange('total_amount', parseFloat(e.target.value) || 0)}
            size="small"
          />
        </Grid>
        {modifiedData.items && modifiedData.items.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Articles ({modifiedData.items.length})
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {modifiedData.items.map((item, idx) => (
                <Paper key={idx} sx={{ p: 1.5, mb: 1, bgcolor: isDark ? alpha(theme.palette.common.white, 0.03) : '#f8fafc' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Description"
                        value={item.description || ''}
                        onChange={(e) => handleNestedFieldChange('items', idx, 'description', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        label="Quantité"
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => handleNestedFieldChange('items', idx, 'quantity', parseFloat(e.target.value) || 0)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        label="Prix unitaire"
                        type="number"
                        value={item.unit_price || ''}
                        onChange={(e) => handleNestedFieldChange('items', idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderPurchaseOrderFields = () => {
    if (!modifiedData) return null;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Numéro de BC"
            value={modifiedData.po_number || ''}
            onChange={(e) => handleFieldChange('po_number', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Date de commande"
            type="date"
            value={modifiedData.order_date || ''}
            onChange={(e) => handleFieldChange('order_date', e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Fournisseur"
            value={modifiedData.supplier_name || ''}
            onChange={(e) => handleFieldChange('supplier_name', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email fournisseur"
            type="email"
            value={modifiedData.supplier_email || ''}
            onChange={(e) => handleFieldChange('supplier_email', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Téléphone"
            value={modifiedData.supplier_phone || ''}
            onChange={(e) => handleFieldChange('supplier_phone', e.target.value)}
            size="small"
          />
        </Grid>
      </Grid>
    );
  };

  // Dépense (reçu, ticket, facture fournisseur) : catégories avec le compte de charge du plan de l'organisation
  const [expenseCategories, setExpenseCategories] = useState([]);
  useEffect(() => {
    if (open && review?.entity_type === 'expense' && expenseCategories.length === 0) {
      accountingAPI.getExpenseCategories().then((r) => setExpenseCategories(r.data)).catch(() => {});
    }
  }, [open, review?.entity_type, expenseCategories.length]);

  const renderExpenseFields = () => {
    if (!modifiedData) return null;
    const paid = modifiedData.paid !== false;
    const method = modifiedData.payment_method && modifiedData.payment_method !== 'unknown' ? modifiedData.payment_method : 'cash';
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField fullWidth size="small" label="Libellé" value={modifiedData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Fournisseur" value={modifiedData.supplier_name || ''}
            onChange={(e) => handleFieldChange('supplier_name', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Date" type="date" InputLabelProps={{ shrink: true }}
            value={(modifiedData.date || '').slice(0, 10)} onChange={(e) => handleFieldChange('date', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Montant total (TTC)" type="number" value={modifiedData.total ?? ''}
            onChange={(e) => handleFieldChange('total', parseFloat(e.target.value) || 0)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="dont TVA récupérable" type="number" value={modifiedData.tax ?? ''}
            onChange={(e) => handleFieldChange('tax', parseFloat(e.target.value) || 0)} />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth size="small">
            <InputLabel>Catégorie</InputLabel>
            <Select label="Catégorie" value={modifiedData.category || 'exp_other'}
              onChange={(e) => handleFieldChange('category', e.target.value)}>
              {(expenseCategories.length ? expenseCategories : [{ value: modifiedData.category || 'exp_other', label: modifiedData.category || 'Autres dépenses' }])
                .map((c) => <MenuItem key={c.value} value={c.value}>{c.label}{c.account_code ? ` (${c.account_code})` : ''}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel control={<Switch checked={paid} onChange={(e) => handleFieldChange('paid', e.target.checked)} />}
            label={paid ? 'Déjà payée' : 'À payer'} />
        </Grid>
        {paid && (
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Payée par</InputLabel>
              <Select label="Payée par" value={method} onChange={(e) => handleFieldChange('payment_method', e.target.value)}>
                {PAYMENT_METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid item xs={12}>
          <Alert severity="info">
            En validant, la dépense est enregistrée avec la photo du reçu et l'écriture comptable est passée.
          </Alert>
        </Grid>
      </Grid>
    );
  };

  const renderFields = () => {
    if (!review) return null;

    switch (review.entity_type) {
      case 'expense':
        return renderExpenseFields();
      case 'invoice':
        return renderInvoiceFields();
      case 'purchase_order':
        return renderPurchaseOrderFields();
      default:
        return (
          <Alert severity="info">
            Édition des champs pour ce type d'entité sera disponible prochainement.
          </Alert>
        );
    }
  };

  if (!review) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? '#1e293b' : '#ffffff',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            {ENTITY_TYPE_ICONS[review.entity_type] || <Receipt />}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
              Révision d'import - {review.entity_type === 'expense' ? 'Dépense' : review.entity_type === 'invoice' ? 'Facture client' : review.entity_type === 'purchase_order' ? 'Bon de commande' : review.entity_type}
            </Typography>
            <Chip
              label={review.status === 'pending' ? 'En attente' : review.status === 'modified' ? 'Modifié' : review.status === 'approved' ? 'Approuvé' : 'Rejeté'}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          {renderFields()}
        </Box>

        <Divider sx={{ my: 3 }} />

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ajoutez des notes sur cet import..."
          size="small"
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Annuler
        </Button>
        {(review.status === 'pending' || review.status === 'modified') && (
          <Button
            onClick={handleSaveModifications}
            variant="outlined"
            startIcon={<Edit />}
            disabled={saving}
          >
            Sauvegarder modifications
          </Button>
        )}
        {review.status === 'pending' || review.status === 'modified' ? (
          <>
            <Button
              onClick={onReject}
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
            >
              Rejeter
            </Button>
            <Button
              onClick={onApprove}
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
            >
              Approuver et créer
            </Button>
          </>
        ) : (
          <Button onClick={onClose} variant="contained">
            Fermer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ImportReviewModal;

