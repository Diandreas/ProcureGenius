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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Add,
  Remove,
  Info,
  Refresh,
  Edit as EditIcon,
  SwapVert,
} from '@mui/icons-material';
import { productsAPI, productBatchesAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import { useSnackbar } from 'notistack';

function StockMovementsTab({ productId, productType }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [movementType, setMovementType] = useState('add'); // 'add' or 'remove'
  const [batches, setBatches] = useState([]);
  const [adjustBatchId, setAdjustBatchId] = useState('');
  const [isNewBatch, setIsNewBatch] = useState(false);
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchExpiration, setNewBatchExpiration] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (productType === 'physical') {
      fetchMovements();
      fetchBatches();
    }
  }, [productId, productType]);

  const fetchBatches = async () => {
    try {
      const response = await productBatchesAPI.list({ product: productId, is_active: true });
      setBatches(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching stock batches:', err);
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.stockMovements(productId);
      setMovements(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique');
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    const quantity = parseInt(adjustQuantity);

    if (isNaN(quantity) || quantity === 0) {
      enqueueSnackbar('Veuillez entrer une quantité valide', { variant: 'error' });
      return;
    }

    if (!adjustNotes.trim()) {
      enqueueSnackbar('Veuillez saisir une justification', { variant: 'error' });
      return;
    }

    try {
      // Appliquer le signe selon le type de mouvement
      const finalQuantity = movementType === 'remove' ? -Math.abs(quantity) : Math.abs(quantity);

      const payload = {
        quantity: finalQuantity,
        notes: adjustNotes,
      };

      if (isNewBatch && newBatchNumber) {
        // Obtenir la quantité pour le lot
        const batchQuantity = Math.max(0, finalQuantity);
        const batchPayload = {
          product: productId,
          batch_number: newBatchNumber,
          expiration_date: newBatchExpiration || null,
          initial_quantity: batchQuantity,
          current_quantity: batchQuantity // Sera mis à jour
        };
        const batchRes = await productBatchesAPI.create(batchPayload);
        payload.batch_id = batchRes.data.id;
      } else if (adjustBatchId) {
        payload.batch_id = adjustBatchId;
      }

      await productsAPI.adjustStock(productId, payload);

      const action = movementType === 'add' ? 'ajouté au' : 'retiré du';
      enqueueSnackbar(`Stock ${action} stock avec succès`, { variant: 'success' });
      setAdjustDialogOpen(false);
      setAdjustQuantity('');
      setAdjustNotes('');
      setAdjustBatchId('');
      setIsNewBatch(false);
      setNewBatchNumber('');
      setNewBatchExpiration('');
      setMovementType('add');
      fetchMovements();
      fetchBatches();
    } catch (err) {
      enqueueSnackbar('Erreur lors de l\'ajustement du stock', { variant: 'error' });
    }
  };

  const getMovementIcon = (movement) => {
    return movement.is_entry ? (
      <Add color="success" />
    ) : (
      <Remove color="error" />
    );
  };

  const getMovementColor = (movement) => {
    return movement.is_entry ? 'success' : 'error';
  };

  const getMovementTypeColor = (type) => {
    const colors = {
      'reception': 'primary',
      'sale': 'warning',
      'adjustment': 'info',
      'return': 'success',
      'initial': 'default',
    };
    return colors[type] || 'default';
  };

  if (productType !== 'physical') {
    return (
      <Box p={3}>
        <Alert severity="info">
          L'historique des mouvements de stock n'est disponible que pour les produits physiques.
        </Alert>
      </Box>
    );
  }

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
          <IconButton size="small" onClick={fetchMovements}>
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
          Historique des mouvements
        </Typography>
        <Button
          variant="contained"
          startIcon={<SwapVert />}
          onClick={() => setAdjustDialogOpen(true)}
          size="medium"
          sx={{
            minWidth: { xs: '100%', sm: 'auto' },
            fontSize: { xs: '0.875rem', sm: '0.9375rem' }
          }}
        >
          Mouvement de stock
        </Button>
      </Box>

      {movements.length === 0 ? (
        <Box p={3}>
          <Alert severity="info">Aucun mouvement de stock enregistré</Alert>
        </Box>
      ) : isMobile ? (
        // Vue mobile avec cartes
        <Box>
          {movements.map((movement) => (
            <Card key={movement.id} sx={{ mb: 1.5, borderRadius: 2, boxShadow: 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                  {/* Header: Date et Type */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {formatDate(movement.created_at)}
                    </Typography>
                    <Chip
                      label={movement.movement_type_display}
                      size="small"
                      color={getMovementTypeColor(movement.movement_type)}
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </Box>

                  {/* Mouvement principal */}
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                      {getMovementIcon(movement)}
                      <Typography
                        variant="h6"
                        color={getMovementColor(movement)}
                        fontWeight="bold"
                        sx={{ fontSize: '1.1rem' }}
                      >
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {movement.quantity_before} → <strong>{movement.quantity_after}</strong>
                      </Typography>
                    </Box>
                  </Box>

                  {/* Détails supplémentaires */}
                  {(movement.reference_type_display || movement.created_by_name || movement.notes) && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Stack spacing={0.5}>
                        {movement.reference_type_display && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              {movement.reference_type_display}
                              {movement.reference_number && `: ${movement.reference_number}`}
                            </Typography>
                          </Box>
                        )}
                        {movement.batch_number && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Lot: {movement.batch_number}
                          </Typography>
                        )}
                        {movement.created_by_name && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Par: {movement.created_by_name}
                          </Typography>
                        )}
                        {movement.notes && (
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                            "{movement.notes}"
                          </Typography>
                        )}
                      </Stack>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        // Vue desktop avec tableau
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Mouvement</TableCell>
                <TableCell align="right">Avant</TableCell>
                <TableCell align="right">Après</TableCell>
                <TableCell>Référence</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id} hover>
                  <TableCell>
                    {formatDate(movement.created_at)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={movement.movement_type_display}
                      size="small"
                      color={getMovementTypeColor(movement.movement_type)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      {getMovementIcon(movement)}
                      <Typography
                        variant="body2"
                        color={getMovementColor(movement)}
                        fontWeight="bold"
                      >
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{movement.quantity_before}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {movement.quantity_after}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {movement.reference_type_display && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {movement.reference_type_display}
                        </Typography>
                        {movement.reference_number && (
                          <Typography variant="body2">
                            {movement.reference_number}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {movement.batch_number && (
                      <Chip size="small" label={`Lot: ${movement.batch_number}`} variant="outlined" sx={{ mt: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    {movement.created_by_name || '-'}
                  </TableCell>
                  <TableCell>
                    {movement.notes ? (
                      <Tooltip title={movement.notes}>
                        <IconButton size="small">
                          <Info fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog d'ajustement de stock */}
      <Dialog
        open={adjustDialogOpen}
        onClose={() => {
          setAdjustDialogOpen(false);
          setAdjustQuantity('');
          setAdjustNotes('');
          setAdjustBatchId('');
          setMovementType('add');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <SwapVert color="primary" />
            <Typography variant="h6">Nouveau mouvement de stock</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box pt={2} display="flex" flexDirection="column" gap={2.5}>
            {/* Sélection du type de mouvement */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
                Type de mouvement
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant={movementType === 'add' ? 'contained' : 'outlined'}
                  color="success"
                  startIcon={<Add />}
                  onClick={() => setMovementType('add')}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Ajouter au stock
                </Button>
                <Button
                  variant={movementType === 'remove' ? 'contained' : 'outlined'}
                  color="error"
                  startIcon={<Remove />}
                  onClick={() => setMovementType('remove')}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Retirer du stock
                </Button>
              </Box>
            </Box>

            {/* Quantité */}
            <TextField
              label="Quantité"
              type="number"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
              placeholder="Ex: 10"
              fullWidth
              autoFocus
              required
              inputProps={{ min: 1 }}
              helperText={movementType === 'add' ? 'Quantité à ajouter' : 'Quantité à retirer'}
            />

            {/* Gestion des lots */}
            <Box sx={{ mt: 2, mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isNewBatch}
                    onChange={(e) => setIsNewBatch(e.target.checked)}
                    disabled={movementType === 'remove'}
                  />
                }
                label="Créer un nouveau lot"
              />
              
              {isNewBatch ? (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Numéro de lot"
                    value={newBatchNumber}
                    onChange={(e) => setNewBatchNumber(e.target.value)}
                    fullWidth
                    required={isNewBatch}
                    placeholder="Ex: LOT-2026-001"
                  />
                  <TextField
                    label="Date de péremption (optionnel)"
                    type="date"
                    value={newBatchExpiration}
                    onChange={(e) => setNewBatchExpiration(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              ) : (
                batches.length > 0 && (
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel id="batch-select-label">Lot existant (optionnel)</InputLabel>
                    <Select
                      labelId="batch-select-label"
                      value={adjustBatchId}
                      label="Lot existant (optionnel)"
                      onChange={(e) => setAdjustBatchId(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Aucun lot spécifié</em>
                      </MenuItem>
                      {batches.map((b) => (
                        <MenuItem key={b.id} value={b.id}>
                          {b.batch_number} (Stock: {b.current_quantity}) - {b.expiration_date ? `Exp: ${formatDate(b.expiration_date)}` : 'Pas d\'expiration'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )
              )}
            </Box>

            {/* Justification */}
            <TextField
              label="Justification"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              multiline
              rows={4}
              fullWidth
              required
              placeholder="Décrivez la raison de ce mouvement de stock (réception, inventaire, perte, retour client, etc.)"
              helperText="Ce champ est obligatoire pour la traçabilité"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setAdjustDialogOpen(false);
              setAdjustQuantity('');
              setAdjustNotes('');
              setAdjustBatchId('');
              setIsNewBatch(false);
              setNewBatchNumber('');
              setNewBatchExpiration('');
              setMovementType('add');
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleAdjustStock}
            variant="contained"
            disabled={!adjustQuantity || !adjustNotes.trim()}
            color={movementType === 'add' ? 'success' : 'error'}
            startIcon={movementType === 'add' ? <Add /> : <Remove />}
          >
            {movementType === 'add' ? 'Ajouter' : 'Retirer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StockMovementsTab;
