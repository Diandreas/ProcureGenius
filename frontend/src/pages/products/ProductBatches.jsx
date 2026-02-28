import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid,
  IconButton, Tooltip, Alert, CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  LockOpen as OpenIcon,
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  DeleteForever as DeleteIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import batchAPI from '../../services/batchAPI';
import api from '../../services/api';

const statusColors = {
  available: 'success',
  opened: 'info',
  expired: 'error',
  depleted: 'default',
};

const statusLabels = {
  available: 'Disponible',
  opened: 'Ouvert',
  expired: 'Perime',
  depleted: 'Epuise',
};

const ProductBatches = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, batch: null });
  const [formData, setFormData] = useState({
    batch_number: '',
    lot_number: '',
    quantity: '',
    expiry_date: '',
    shelf_life_after_opening_days: '',
    notes: ''
  });

  useEffect(() => {
    if (product && !formData.shelf_life_after_opening_days) {
      setFormData(prev => ({
        ...prev,
        shelf_life_after_opening_days: product.default_shelf_life_after_opening || ''
      }));
    }
  }, [product]);

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchData, productData] = await Promise.all([
        batchAPI.getProductBatches(productId),
        api.get(`/products/${productId}/`).then(r => r.data)
      ]);
      setBatches(batchData);
      setProduct(productData);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBatchNumber = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LOT-${datePart}-${randomPart}`;
  };

  const handleOpenNewBatchDialog = () => {
    const autoNumber = generateBatchNumber();
    setFormData(prev => ({ ...prev, batch_number: autoNumber }));
    setOpenDialog(true);
  };

  const handleCreate = async () => {
    try {
      await batchAPI.createBatch(productId, {
        batch_number: formData.batch_number,
        lot_number: formData.lot_number || '',
        quantity: parseInt(formData.quantity),
        quantity_remaining: parseInt(formData.quantity),
        expiry_date: formData.expiry_date,
        shelf_life_after_opening_days: formData.shelf_life_after_opening_days
          ? parseInt(formData.shelf_life_after_opening_days) : null,
        notes: formData.notes || '',
      });
      setOpenDialog(false);
      setFormData({ batch_number: '', lot_number: '', quantity: '', expiry_date: '', shelf_life_after_opening_days: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating batch:', error);
    }
  };

  const handleOpenBatch = async (batchId) => {
    try {
      await batchAPI.openBatch(batchId);
      fetchData();
    } catch (error) {
      console.error('Error opening batch:', error);
    }
  };

  const handleDeleteBatch = async () => {
    const batch = deleteDialog.batch;
    if (!batch) return;
    try {
      await batchAPI.deleteBatch(batch.id);
      setDeleteDialog({ open: false, batch: null });
      fetchData();
    } catch (error) {
      const msg = error?.response?.data?.error || 'Erreur lors de la suppression';
      alert(msg);
    }
  };

  const canDelete = (batch) => {
    if (!batch.received_at) return false;
    const elapsed = (Date.now() - new Date(batch.received_at).getTime()) / 1000;
    return elapsed <= 1800; // 30 minutes
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight="700">
            Lots - {product?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestion des lots et traçabilite
          </Typography>
        </Box>
        <Box flexGrow={1} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewBatchDialog}>
          Nouveau Lot
        </Button>
      </Box>

      {batches.some(b => b.is_expired) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Attention : certains lots sont perimes !
        </Alert>
      )}

      {batches.some(b => b.days_until_expiry <= 7 && b.days_until_expiry > 0) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Des lots expirent dans moins de 7 jours.
        </Alert>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lot / Fournisseur</TableCell>
              <TableCell>Qté initiale</TableCell>
              <TableCell>Qté restante</TableCell>
              <TableCell>Péremption</TableCell>
              <TableCell>Péremption effective</TableCell>
              <TableCell>Jours restants</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Reçu le</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={4}>Aucun lot enregistre</Typography>
                </TableCell>
              </TableRow>
            ) : (
              batches.map(batch => (
                <TableRow key={batch.id} sx={batch.is_expired ? { bgcolor: 'error.50' } : {}}>
                  <TableCell>
                    <Typography fontWeight="600">{batch.batch_number}</Typography>
                    {batch.lot_number && (
                      <Typography variant="caption" color="text.secondary">{batch.lot_number}</Typography>
                    )}
                  </TableCell>
                  <TableCell>{batch.quantity}</TableCell>
                  <TableCell>
                    <Typography fontWeight="600" color={batch.quantity_remaining <= 0 ? 'error' : 'inherit'}>
                      {batch.quantity_remaining}
                    </Typography>
                  </TableCell>
                  <TableCell>{dayjs(batch.expiry_date).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    {dayjs(batch.effective_expiry).format('DD/MM/YYYY')}
                    {batch.opened_at && batch.effective_expiry !== batch.expiry_date && (
                      <Tooltip title="Reduite apres ouverture">
                        <WarningIcon sx={{ fontSize: 16, ml: 0.5, color: 'warning.main' }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography
                      fontWeight="600"
                      color={
                        batch.days_until_expiry <= 0 ? 'error.main' :
                        batch.days_until_expiry <= 7 ? 'warning.main' :
                        'success.main'
                      }
                    >
                      {batch.days_until_expiry} j
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[batch.status] || batch.status}
                      color={statusColors[batch.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {batch.received_at ? dayjs(batch.received_at).format('DD/MM/YY HH:mm') : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {batch.status === 'available' && (
                      <Tooltip title="Marquer comme ouvert">
                        <IconButton size="small" onClick={() => handleOpenBatch(batch.id)} color="primary">
                          <OpenIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete(batch) && (
                      <Tooltip title="Supprimer ce lot (< 30 min)">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, batch })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau Lot</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Numero de lot" required
                value={formData.batch_number}
                onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Lot fournisseur"
                value={formData.lot_number}
                onChange={e => setFormData({ ...formData, lot_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Quantite" type="number" required
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Date de peremption" type="date" required
                InputLabelProps={{ shrink: true }}
                value={formData.expiry_date}
                onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Duree apres ouverture (jours)" type="number"
                helperText="Ex: 14 pour reactifs"
                value={formData.shelf_life_after_opening_days}
                onChange={e => setFormData({ ...formData, shelf_life_after_opening_days: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Notes" multiline rows={2}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.batch_number || !formData.quantity || !formData.expiry_date}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog suppression lot */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, batch: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer le lot</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 1 }}>
            Cette action est irréversible. Le stock sera remis à son état avant la réception.
          </Alert>
          {deleteDialog.batch && (
            <Typography variant="body2">
              Lot : <strong>{deleteDialog.batch.batch_number}</strong><br />
              Quantité initiale : <strong>{deleteDialog.batch.quantity}</strong><br />
              Reçu le : <strong>{dayjs(deleteDialog.batch.received_at).format('DD/MM/YYYY HH:mm')}</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, batch: null })}>Annuler</Button>
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteBatch}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProductBatches;
