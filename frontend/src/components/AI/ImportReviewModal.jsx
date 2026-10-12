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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['aiChat', 'common']);
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
      enqueueSnackbar(t('aiChat:importReviewModal.saveSuccess'), { variant: 'success' });
      onClose();
    } catch (error) {
      console.error('Error saving modifications:', error);
      enqueueSnackbar(t('aiChat:importReviewModal.saveError'), { variant: 'error' });
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
            label={t('aiChat:importReviewModal.invoiceNumber')}
            value={modifiedData.invoice_number || ''}
            onChange={(e) => handleFieldChange('invoice_number', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('aiChat:importReviewModal.issueDate')}
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
            label={t('aiChat:importReviewModal.client')}
            value={modifiedData.client_name || ''}
            onChange={(e) => handleFieldChange('client_name', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('aiChat:importReviewModal.clientEmail')}
            type="email"
            value={modifiedData.client_email || ''}
            onChange={(e) => handleFieldChange('client_email', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('aiChat:importReviewModal.totalAmount')}
            type="number"
            value={modifiedData.total_amount || ''}
            onChange={(e) => handleFieldChange('total_amount', parseFloat(e.target.value) || 0)}
            size="small"
          />
        </Grid>
        {modifiedData.items && modifiedData.items.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              {t('aiChat:importReviewModal.itemsCount', { count: modifiedData.items.length })}
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {modifiedData.items.map((item, idx) => (
                <Paper key={idx} sx={{ p: 1.5, mb: 1, bgcolor: isDark ? alpha(theme.palette.common.white, 0.03) : '#f8fafc' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('common:labels.description')}
                        value={item.description || ''}
                        onChange={(e) => handleNestedFieldChange('items', idx, 'description', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        label={t('common:labels.quantity')}
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => handleNestedFieldChange('items', idx, 'quantity', parseFloat(e.target.value) || 0)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth
                        label={t('common:labels.unitPrice')}
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
            label={t('aiChat:importReviewModal.poNumber')}
            value={modifiedData.po_number || ''}
            onChange={(e) => handleFieldChange('po_number', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('aiChat:importReviewModal.orderDate')}
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
            label={t('aiChat:importReviewModal.supplier')}
            value={modifiedData.supplier_name || ''}
            onChange={(e) => handleFieldChange('supplier_name', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('aiChat:importReviewModal.supplierEmail')}
            type="email"
            value={modifiedData.supplier_email || ''}
            onChange={(e) => handleFieldChange('supplier_email', e.target.value)}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('common:labels.phone')}
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
          <TextField fullWidth size="small" label={t('aiChat:importReviewModal.label')} value={modifiedData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label={t('aiChat:importReviewModal.supplier')} value={modifiedData.supplier_name || ''}
            onChange={(e) => handleFieldChange('supplier_name', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label={t('common:labels.date')} type="date" InputLabelProps={{ shrink: true }}
            value={(modifiedData.date || '').slice(0, 10)} onChange={(e) => handleFieldChange('date', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label={t('aiChat:importReviewModal.totalInclTax')} type="number" value={modifiedData.total ?? ''}
            onChange={(e) => handleFieldChange('total', parseFloat(e.target.value) || 0)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label={t('aiChat:importReviewModal.recoverableVat')} type="number" value={modifiedData.tax ?? ''}
            onChange={(e) => handleFieldChange('tax', parseFloat(e.target.value) || 0)} />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('aiChat:importReviewModal.category')}</InputLabel>
            <Select label={t('aiChat:importReviewModal.category')} value={modifiedData.category || 'exp_other'}
              onChange={(e) => handleFieldChange('category', e.target.value)}>
              {(expenseCategories.length ? expenseCategories : [{ value: modifiedData.category || 'exp_other', label: modifiedData.category || t('aiChat:importReviewModal.otherExpenses') }])
                .map((c) => <MenuItem key={c.value} value={c.value}>{c.label}{c.account_code ? ` (${c.account_code})` : ''}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel control={<Switch checked={paid} onChange={(e) => handleFieldChange('paid', e.target.checked)} />}
            label={paid ? t('aiChat:importReviewModal.alreadyPaid') : t('aiChat:importReviewModal.toPay')} />
        </Grid>
        {paid && (
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('aiChat:importReviewModal.paidBy')}</InputLabel>
              <Select label={t('aiChat:importReviewModal.paidBy')} value={method} onChange={(e) => handleFieldChange('payment_method', e.target.value)}>
                {PAYMENT_METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid item xs={12}>
          <Alert severity="info">
            {t('aiChat:importReviewModal.expenseInfo')}
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
            {t('aiChat:importReviewModal.editingSoon')}
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
              {t('aiChat:importReviewModal.title', { type: ['expense', 'invoice', 'purchase_order'].includes(review.entity_type) ? t(`aiChat:importReviewModal.entityTypes.${review.entity_type}`) : review.entity_type })}
            </Typography>
            <Chip
              label={t(`aiChat:importReviewModal.status.${['pending', 'modified', 'approved'].includes(review.status) ? review.status : 'rejected'}`)}
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
          label={t('common:labels.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('aiChat:importReviewModal.notesPlaceholder')}
          size="small"
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          {t('common:buttons.cancel')}
        </Button>
        {(review.status === 'pending' || review.status === 'modified') && (
          <Button
            onClick={handleSaveModifications}
            variant="outlined"
            startIcon={<Edit />}
            disabled={saving}
          >
            {t('aiChat:importReviewModal.saveChanges')}
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
              {t('aiChat:importReviewModal.reject')}
            </Button>
            <Button
              onClick={onApprove}
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
            >
              {t('aiChat:importReviewModal.approveAndCreate')}
            </Button>
          </>
        ) : (
          <Button onClick={onClose} variant="contained">
            {t('common:buttons.close')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ImportReviewModal;

