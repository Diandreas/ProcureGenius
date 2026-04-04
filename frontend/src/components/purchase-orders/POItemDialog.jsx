import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Grid,
} from '@mui/material';
import useCurrency from '../../hooks/useCurrency';
import PriceHistoryHint from '../common/PriceHistoryHint';

/**
 * Dialog simplifié pour ajouter/modifier une ligne de BdC fournisseur.
 * Saisie libre : description + référence + quantité + prix unitaire.
 * Aucun lien obligatoire avec le catalogue produits.
 * La normalisation vers le catalogue se fait à l'arrivage.
 */
function POItemDialog({ open, onClose, item, setItem, onConfirm, editingIndex, supplierId }) {
  const { format: formatCurrency } = useCurrency();

  const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  const isValid = item.description?.trim() && parseFloat(item.quantity) > 0 && parseFloat(item.unit_price) >= 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editingIndex >= 0 ? 'Modifier la ligne' : 'Ajouter une ligne'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Désignation / Description"
              value={item.description}
              onChange={(e) => setItem((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ex : Papier A4 80g/m², Cartouche HP 652, Prestation développement..."
              autoFocus
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Référence fournisseur"
              value={item.product_reference}
              onChange={(e) => setItem((prev) => ({ ...prev, product_reference: e.target.value }))}
              placeholder="Ex : REF-12345"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Quantité"
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
              label="Prix unitaire HT"
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
                <Typography variant="caption" color="text.secondary">Total ligne HT</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={!isValid}
        >
          {editingIndex >= 0 ? 'Modifier' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default POItemDialog;
