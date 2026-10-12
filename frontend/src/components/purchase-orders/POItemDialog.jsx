import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Grid,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useCurrency from '../../hooks/useCurrency';
import PriceHistoryHint from '../common/PriceHistoryHint';

/**
 * Dialog simplifié pour ajouter/modifier une ligne de BdC fournisseur.
 * Saisie libre : description + référence + quantité + prix unitaire.
 * Aucun lien obligatoire avec le catalogue produits.
 * La normalisation vers le catalogue se fait à l'arrivage.
 */
function POItemDialog({ open, onClose, item, setItem, onConfirm, editingIndex, supplierId }) {
  const { t } = useTranslation(['purchaseOrders', 'common']);
  const { format: formatCurrency } = useCurrency();

  const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  const isValid = item.description?.trim() && parseFloat(item.quantity) > 0 && parseFloat(item.unit_price) >= 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editingIndex >= 0 ? t('purchaseOrders:itemDialog.editTitle') : t('purchaseOrders:itemDialog.addTitle')}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label={t('purchaseOrders:itemDialog.description')}
              value={item.description}
              onChange={(e) => setItem((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('purchaseOrders:itemDialog.descriptionPlaceholder')}
              autoFocus
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('purchaseOrders:itemDialog.supplierReference')}
              value={item.product_reference}
              onChange={(e) => setItem((prev) => ({ ...prev, product_reference: e.target.value }))}
              placeholder={t('purchaseOrders:itemDialog.referencePlaceholder')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label={t('purchaseOrders:itemDialog.quantity')}
              type="number"
              value={item.quantity}
              onChange={(e) => setItem((prev) => ({ ...prev, quantity: e.target.value }))}
              inputProps={{ min: 1, step: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label={t('purchaseOrders:itemDialog.unitPrice')}
              type="number"
              value={item.unit_price}
              onChange={(e) => setItem((prev) => ({ ...prev, unit_price: e.target.value }))}
              inputProps={{ min: 0, step: 0.01 }}
            />
            <PriceHistoryHint
              supplierId={supplierId}
              descriptionKey={item.description}
              currentPrice={parseFloat(item.unit_price) || 0}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2, bgcolor: 'success.50', borderRadius: 2, border: '1px solid', borderColor: 'success.200' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="success.main" fontWeight={700}>
                  {formatCurrency(lineTotal)}
                </Typography>
                <Typography variant="caption" color="text.secondary">{t('purchaseOrders:itemDialog.lineTotal')}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('purchaseOrders:buttons.cancel')}</Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={!isValid}
        >
          {editingIndex >= 0 ? t('purchaseOrders:buttons.edit') : t('purchaseOrders:buttons.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default POItemDialog;
