import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Card,
  CardContent,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  Delete,
  Refresh,
} from '@mui/icons-material';
import { productBatchesAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import { useSnackbar } from 'notistack';

function ProductBatchesTab({ productId }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [supplierBatchRef, setSupplierBatchRef] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchBatches();
  }, [productId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await productBatchesAPI.list({ product: productId });
      setBatches(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des lots');
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchNumber.trim()) {
      enqueueSnackbar('Le numéro de lot est requis', { variant: 'error' });
      return;
    }

    try {
      await productBatchesAPI.create({
        product: productId,
        batch_number: batchNumber,
        expiration_date: expirationDate || null,
        initial_quantity: initialQuantity ? parseInt(initialQuantity) : 0,
        supplier_batch_reference: supplierBatchRef,
      });

      enqueueSnackbar('Lot créé avec succès', { variant: 'success' });
      setCreateDialogOpen(false);
      resetForm();
      fetchBatches();
    } catch (err) {
      enqueueSnackbar('Erreur lors de la création du lot', { variant: 'error' });
    }
  };

  const resetForm = () => {
    setBatchNumber('');
    setExpirationDate('');
    setInitialQuantity('');
    setSupplierBatchRef('');
  };

  const getExpirationStatus = (date) => {
    if (!date) return null;
    const expDate = new Date(date);
    const now = new Date();
    const diffTime = expDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: 'Périmé', color: 'error' };
    if (diffDays <= 30) return { label: 'Expire bientôt', color: 'warning' };
    return { label: 'Valide', color: 'success' };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <IconButton size="small" onClick={fetchBatches}>
            <Refresh />
          </IconButton>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        p={2}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Lots du produit
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          size="medium"
          sx={{
            minWidth: { xs: '100%', sm: 'auto' },
            fontSize: { xs: '0.875rem', sm: '0.9375rem' }
          }}
        >
          Nouveau Lot
        </Button>
      </Box>

      {batches.length === 0 ? (
        <Box p={3}>
          <Alert severity="info">Aucun lot de stock enregistré pour ce produit</Alert>
        </Box>
      ) : isMobile ? (
        <Box>
          {batches.map((batch) => {
            const expStatus = getExpirationStatus(batch.expiration_date);
            return (
              <Card key={batch.id} sx={{ mb: 1.5, borderRadius: 2, boxShadow: 1 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={1.5}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Lot: {batch.batch_number}
                      </Typography>
                      <Chip
                        label={batch.is_active ? 'Actif' : 'Inactif'}
                        size="small"
                        color={batch.is_active ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Quantité: <strong>{batch.current_quantity} / {batch.initial_quantity}</strong>
                      </Typography>
                      {expStatus && (
                        <Chip
                          label={expStatus.label}
                          size="small"
                          color={expStatus.color}
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>

                    {(batch.expiration_date || batch.supplier_batch_reference) && (
                      <>
                        <Divider sx={{ my: 0.5 }} />
                        <Stack spacing={0.5}>
                          {batch.expiration_date && (
                            <Typography variant="caption" color="text.secondary">
                              Exp: {formatDate(batch.expiration_date)}
                            </Typography>
                          )}
                          {batch.supplier_batch_reference && (
                            <Typography variant="caption" color="text.secondary">
                              Ref Frs: {batch.supplier_batch_reference}
                            </Typography>
                          )}
                        </Stack>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Numéro de Lot</TableCell>
                <TableCell align="right">Quantité Actuelle</TableCell>
                <TableCell align="right">Qté Initiale</TableCell>
                <TableCell>Date d'expiration</TableCell>
                <TableCell>Statut exp.</TableCell>
                <TableCell>Ref Fournisseur</TableCell>
                <TableCell>Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.map((batch) => {
                const expStatus = getExpirationStatus(batch.expiration_date);
                return (
                  <TableRow key={batch.id} hover>
                    <TableCell fontWeight="bold">
                      {batch.batch_number}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color={batch.current_quantity === 0 ? 'error' : 'inherit'}>
                        {batch.current_quantity}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{batch.initial_quantity}</TableCell>
                    <TableCell>
                      {batch.expiration_date ? formatDate(batch.expiration_date) : '-'}
                    </TableCell>
                    <TableCell>
                      {expStatus ? (
                        <Chip
                          label={expStatus.label}
                          size="small"
                          color={expStatus.color}
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>{batch.supplier_batch_reference || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={batch.is_active ? 'Actif' : 'Inactif'}
                        size="small"
                        color={batch.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog Création de lot */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nouveau Lot</DialogTitle>
        <DialogContent>
          <Box pt={2} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Numéro de Lot"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Quantité Initiale"
              type="number"
              value={initialQuantity}
              onChange={(e) => setInitialQuantity(e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Date d'Expiration"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Référence Lot Fournisseur"
              value={supplierBatchRef}
              onChange={(e) => setSupplierBatchRef(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            resetForm();
          }}>
            Annuler
          </Button>
          <Button
            onClick={handleCreateBatch}
            variant="contained"
            color="primary"
            disabled={!batchNumber.trim()}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProductBatchesTab;
