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
  MenuItem,
  Card,
  CardContent,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
  ButtonGroup,
} from '@mui/material';
import {
  Add,
  Remove,
  Info,
  Refresh,
  SwapVert,
  DeleteForever,
  Inventory as LotIcon,
  AddBox as NewLotIcon,
} from '@mui/icons-material';
import { productsAPI } from '../services/api';
import batchAPI from '../services/batchAPI';
import { formatDate } from '../utils/formatters';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

const generateBatchNumber = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LOT-${datePart}-${randomPart}`;
};

function StockMovementsTab({ productId, productType, isAdmin }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [movements, setMovements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [movementToCancel, setMovementToCancel] = useState(null);
  const [movementDirection, setMovementDirection] = useState('add'); // 'add' | 'remove'
  const [addMode, setAddMode] = useState('new'); // 'new' | 'existing'
  const [selectedExistingBatchId, setSelectedExistingBatchId] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { enqueueSnackbar } = useSnackbar();

  // Formulaire "Ajouter" — nouveau lot
  const [addForm, setAddForm] = useState({
    batch_number: '',
    lot_number: '',
    quantity: '',
    expiry_date: '',
    shelf_life_after_opening_days: '',
    notes: '',
  });

  // Formulaire "Retirer" — lot existant
  const [removeForm, setRemoveForm] = useState({
    batch_id: '',
    quantity: '',
    movement_type: 'adjustment',
    notes: '',
  });

  useEffect(() => {
    if (productType === 'physical') {
      fetchMovements();
      fetchBatches();
    }
  }, [productId, productType]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.stockMovements(productId);
      setMovements(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const data = await batchAPI.getProductBatches(productId);
      setBatches(data);
    } catch (err) {
      // silently ignore
    }
  };

  const openDialog = (direction) => {
    setMovementDirection(direction);
    if (direction === 'add') {
      setAddMode('new');
      setSelectedExistingBatchId('');
      setAddForm({
        batch_number: generateBatchNumber(),
        lot_number: '',
        quantity: '',
        expiry_date: '',
        shelf_life_after_opening_days: '',
        notes: '',
      });
    } else {
      const activeBatch = activeBatches[0];
      setRemoveForm({
        batch_id: activeBatch ? activeBatch.id : '',
        quantity: '',
        movement_type: 'adjustment',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleAddStock = async () => {
    const qty = parseInt(addForm.quantity);
    if (!qty || qty <= 0) {
      enqueueSnackbar('Quantité invalide', { variant: 'error' });
      return;
    }

    try {
      if (addMode === 'new') {
        if (!addForm.expiry_date) {
          enqueueSnackbar('La date de péremption est requise', { variant: 'error' });
          return;
        }
        await batchAPI.createBatch(productId, {
          batch_number: addForm.batch_number,
          lot_number: addForm.lot_number,
          quantity: qty,
          quantity_remaining: qty,
          expiry_date: addForm.expiry_date,
          shelf_life_after_opening_days: addForm.shelf_life_after_opening_days
            ? parseInt(addForm.shelf_life_after_opening_days) : null,
          notes: addForm.notes,
        });
        enqueueSnackbar('Nouveau lot créé et stock mis à jour', { variant: 'success' });
      } else {
        // Ajouter à un lot existant
        if (!selectedExistingBatchId) {
          enqueueSnackbar('Veuillez sélectionner un lot', { variant: 'error' });
          return;
        }
        await productsAPI.adjustStock(productId, {
          quantity: qty,
          notes: addForm.notes || 'Ajout de stock sur lot existant',
          movement_type: 'reception',
          batch_id: selectedExistingBatchId,
        });
        enqueueSnackbar('Stock ajouté au lot existant', { variant: 'success' });
      }
      
      setDialogOpen(false);
      fetchMovements();
      fetchBatches();
    } catch (err) {
      const detail = err?.response?.data;
      const msg = typeof detail === 'object' ? (detail.error || JSON.stringify(detail)) : (detail || 'Erreur');
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleRemoveStock = async () => {
    const qty = parseInt(removeForm.quantity);
    if (!qty || qty <= 0) {
      enqueueSnackbar('Quantité invalide', { variant: 'error' });
      return;
    }
    if (!removeForm.notes.trim()) {
      enqueueSnackbar('La justification est obligatoire', { variant: 'error' });
      return;
    }
    try {
      await productsAPI.adjustStock(productId, {
        quantity: -Math.abs(qty),
        notes: removeForm.notes,
        movement_type: removeForm.movement_type,
        batch_id: removeForm.batch_id || undefined,
      });
      enqueueSnackbar('Stock retiré avec succès', { variant: 'success' });
      setDialogOpen(false);
      fetchMovements();
      fetchBatches();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Erreur lors du retrait', { variant: 'error' });
    }
  };

  const handleCancelMovement = async () => {
    if (!movementToCancel) return;
    try {
      const response = await productsAPI.cancelMovement(movementToCancel.id);
      enqueueSnackbar(`Mouvement annulé. Nouveau stock: ${response.data.product_stock}`, { variant: 'success' });
      setCancelDialogOpen(false);
      setMovementToCancel(null);
      fetchMovements();
      fetchBatches();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || "Erreur lors de l'annulation", { variant: 'error' });
    }
  };

  const getMovementIcon = (movement) =>
    movement.is_entry ? <Add color="success" /> : <Remove color="error" />;

  const getMovementColor = (movement) => (movement.is_entry ? 'success' : 'error');

  const getMovementTypeColor = (type) => {
    const colors = {
      reception: 'primary',
      sale: 'warning',
      adjustment: 'info',
      return: 'success',
      loss: 'error',
      initial: 'default',
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
        <Alert
          severity="error"
          action={
            <IconButton size="small" onClick={fetchMovements}>
              <Refresh />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  const filterOptions = [
    { value: 'all', label: 'Tous les mouvements' },
    { value: 'reception', label: 'Réceptions' },
    { value: 'sale', label: 'Ventes' },
    { value: 'adjustment', label: 'Ajustements' },
    { value: 'return', label: 'Retours' },
    { value: 'loss', label: 'Pertes' },
    { value: 'initial', label: 'Stock initial' },
  ];

  const filteredMovements = movements.filter(
    (m) => filterType === 'all' || m.movement_type === filterType
  );

  const activeBatches = batches.filter(
    (b) => b.status === 'available' || b.status === 'opened'
  );

  const selectedBatch = activeBatches.find((b) => b.id === removeForm.batch_id);

  return (
    <Box>
      {/* Toolbar */}
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

        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          <TextField
            select
            size="small"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            SelectProps={{ native: true }}
            variant="outlined"
            sx={{ minWidth: 180 }}
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </TextField>

          <Button
            variant="contained"
            color="success"
            startIcon={<NewLotIcon />}
            onClick={() => openDialog('add')}
            size="medium"
          >
            Réception (nouveau lot)
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Remove />}
            onClick={() => openDialog('remove')}
            size="medium"
          >
            Retirer du stock
          </Button>
        </Box>
      </Box>

      {filteredMovements.length === 0 ? (
        <Box p={3}>
          <Alert severity="info">
            {filterType === 'all'
              ? 'Aucun mouvement de stock enregistré'
              : 'Aucun mouvement trouvé pour ce filtre'}
          </Alert>
        </Box>
      ) : isMobile ? (
        <Box>
          {filteredMovements.map((movement) => (
            <Card key={movement.id} sx={{ mb: 1.5, borderRadius: 2, boxShadow: 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
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

                  {movement.batch_number && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <LotIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="primary.main" fontWeight={600}>
                        {movement.batch_number}
                        {movement.batch_expiry && ` — exp. ${dayjs(movement.batch_expiry).format('DD/MM/YY')}`}
                      </Typography>
                    </Box>
                  )}

                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                      {getMovementIcon(movement)}
                      <Typography
                        variant="h6"
                        color={getMovementColor(movement)}
                        fontWeight="bold"
                        sx={{ fontSize: '1.1rem' }}
                      >
                        {movement.quantity > 0 ? '+' : ''}
                        {movement.quantity}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {movement.quantity_before} → <strong>{movement.quantity_after}</strong>
                    </Typography>
                  </Box>

                  {(movement.created_by_name || movement.notes) && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Stack spacing={0.5}>
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
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <LotIcon fontSize="small" />
                    Lot
                  </Box>
                </TableCell>
                <TableCell align="center">Mouvement</TableCell>
                <TableCell align="right">Avant</TableCell>
                <TableCell align="right">Après</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Notes</TableCell>
                {isAdmin && <TableCell align="center">Action</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMovements.map((movement) => (
                <TableRow key={movement.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(movement.created_at)}</TableCell>
                  <TableCell>
                    <Chip
                      label={movement.movement_type_display}
                      size="small"
                      color={getMovementTypeColor(movement.movement_type)}
                    />
                  </TableCell>
                  <TableCell>
                    {movement.batch_number ? (
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {movement.batch_number}
                        </Typography>
                        {movement.batch_expiry && (
                          <Typography variant="caption" color="text.secondary">
                            exp. {dayjs(movement.batch_expiry).format('DD/MM/YY')}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      {getMovementIcon(movement)}
                      <Typography
                        variant="body2"
                        color={getMovementColor(movement)}
                        fontWeight="bold"
                      >
                        {movement.quantity > 0 ? '+' : ''}
                        {movement.quantity}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{movement.quantity_before}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">{movement.quantity_after}</Typography>
                  </TableCell>
                  <TableCell>{movement.created_by_name || '—'}</TableCell>
                  <TableCell>
                    {movement.notes ? (
                      <Tooltip title={movement.notes}>
                        <IconButton size="small">
                          <Info fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="center">
                      <Tooltip title="Annuler ce mouvement (remet le stock)">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setMovementToCancel(movement);
                            setCancelDialogOpen(true);
                          }}
                        >
                          <DeleteForever fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── Dialog principal (Ajouter / Retirer) ─── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            {movementDirection === 'add' ? (
              <NewLotIcon color="success" />
            ) : (
              <Remove color="error" />
            )}
            <Typography variant="h6">
              {movementDirection === 'add' ? 'Réception — Nouveau lot' : 'Retirer du stock'}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {movementDirection === 'add' ? (
            /* ── Formulaire Ajout (Nouveau ou Existant) ── */
            <Box pt={1} display="flex" flexDirection="column" gap={2}>
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Identification du lot
                </Typography>
                <ButtonGroup fullWidth size="small">
                  <Button 
                    variant={addMode === 'new' ? 'contained' : 'outlined'}
                    onClick={() => setAddMode('new')}
                    startIcon={<NewLotIcon />}
                  >
                    Nouveau lot
                  </Button>
                  <Button 
                    variant={addMode === 'existing' ? 'contained' : 'outlined'}
                    onClick={() => setAddMode('existing')}
                    startIcon={<LotIcon />}
                    disabled={activeBatches.length === 0}
                  >
                    Lot existant
                  </Button>
                </ButtonGroup>
              </Box>

              {addMode === 'new' ? (
                /* Champs pour Nouveau Lot */
                <>
                  <Box display="flex" gap={2}>
                    <TextField
                      label="Numéro de lot interne"
                      value={addForm.batch_number}
                      onChange={(e) => setAddForm({ ...addForm, batch_number: e.target.value })}
                      fullWidth
                      required
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <Tooltip title="Régénérer">
                            <IconButton size="small" onClick={() => setAddForm({ ...addForm, batch_number: generateBatchNumber() })}>
                              <Refresh fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ),
                      }}
                    />
                    <TextField
                      label="Lot fournisseur (Optionnel)"
                      value={addForm.lot_number}
                      onChange={(e) => setAddForm({ ...addForm, lot_number: e.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Box>

                  <Box display="flex" gap={2}>
                    <TextField
                      label="Quantité reçue"
                      type="number"
                      value={addForm.quantity}
                      onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                      fullWidth
                      required
                      size="small"
                      inputProps={{ min: 1 }}
                    />
                    <TextField
                      label="Date de péremption"
                      type="date"
                      value={addForm.expiry_date}
                      onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })}
                      fullWidth
                      required
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>

                  <TextField
                    label="Durée après ouverture (jours)"
                    type="number"
                    value={addForm.shelf_life_after_opening_days}
                    onChange={(e) =>
                      setAddForm({ ...addForm, shelf_life_after_opening_days: e.target.value })
                    }
                    fullWidth
                    size="small"
                    helperText="Ex: 14 pour réactifs (optionnel)"
                  />
                </>
              ) : (
                /* Champs pour Lot Existant */
                <>
                  <TextField
                    select
                    label="Sélectionner le lot"
                    value={selectedExistingBatchId}
                    onChange={(e) => setSelectedExistingBatchId(e.target.value)}
                    fullWidth
                    size="small"
                    required
                  >
                    {activeBatches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.batch_number} (dispo: {b.quantity_remaining} — exp: {dayjs(b.expiry_date).format('DD/MM/YY')})
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Quantité à ajouter"
                    type="number"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                    fullWidth
                    required
                    size="small"
                    inputProps={{ min: 1 }}
                  />
                </>
              )}

              <TextField
                label="Notes / Justification"
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                multiline
                rows={2}
                fullWidth
                size="small"
                placeholder="Ex: Réception commande fournisseur #123..."
              />
            </Box>
          ) : (
            /* ── Formulaire Retirer ── */
            <Box pt={1} display="flex" flexDirection="column" gap={2}>
              {activeBatches.length === 0 ? (
                <Alert severity="warning">
                  Aucun lot actif pour ce produit. Le mouvement sera enregistré sans lot.
                </Alert>
              ) : (
                <TextField
                  select
                  label="Lot concerné"
                  value={removeForm.batch_id}
                  onChange={(e) => setRemoveForm({ ...removeForm, batch_id: e.target.value })}
                  fullWidth
                  size="small"
                  helperText={
                    selectedBatch
                      ? `Stock dispo dans ce lot : ${selectedBatch.quantity_remaining} — exp. ${dayjs(selectedBatch.expiry_date).format('DD/MM/YYYY')}`
                      : ''
                  }
                >
                  <MenuItem value="">
                    <em>Sans lot spécifique</em>
                  </MenuItem>
                  {activeBatches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {b.batch_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {b.quantity_remaining} disponibles — exp. {dayjs(b.expiry_date).format('DD/MM/YY')}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <Box display="flex" gap={2}>
                <TextField
                  select
                  label="Type de mouvement"
                  value={removeForm.movement_type}
                  onChange={(e) =>
                    setRemoveForm({ ...removeForm, movement_type: e.target.value })
                  }
                  fullWidth
                  size="small"
                >
                  <MenuItem value="adjustment">Ajustement manuel</MenuItem>
                  <MenuItem value="loss">Perte / Casse</MenuItem>
                  <MenuItem value="return">Retour fournisseur</MenuItem>
                </TextField>
                <TextField
                  label="Quantité à retirer"
                  type="number"
                  value={removeForm.quantity}
                  onChange={(e) => setRemoveForm({ ...removeForm, quantity: e.target.value })}
                  fullWidth
                  size="small"
                  inputProps={{ min: 1 }}
                  helperText={
                    selectedBatch && removeForm.quantity
                      ? parseInt(removeForm.quantity) > selectedBatch.quantity_remaining
                        ? '⚠ Dépasse le stock du lot'
                        : ''
                      : ''
                  }
                />
              </Box>

              <TextField
                label="Justification (obligatoire)"
                value={removeForm.notes}
                onChange={(e) => setRemoveForm({ ...removeForm, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
                required
                size="small"
                placeholder="Ex: inventaire, casse, péremption, retour fournisseur..."
                helperText="Obligatoire pour la traçabilité"
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          {movementDirection === 'add' ? (
            <Button
              onClick={handleAddStock}
              variant="contained"
              color="success"
              startIcon={addMode === 'new' ? <NewLotIcon /> : <LotIcon />}
              disabled={
                !addForm.quantity || 
                (addMode === 'new' && (!addForm.batch_number || !addForm.expiry_date)) ||
                (addMode === 'existing' && !selectedExistingBatchId)
              }
            >
              {addMode === 'new' ? 'Créer le lot' : 'Ajouter au lot'}
            </Button>
          ) : (
            <Button
              onClick={handleRemoveStock}
              variant="contained"
              color="error"
              startIcon={<Remove />}
              disabled={!removeForm.quantity || !removeForm.notes.trim()}
            >
              Retirer
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ─── Dialog d'annulation ─── */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setMovementToCancel(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Annuler le mouvement de stock</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <Alert severity="error">
              <strong>Attention !</strong> Cette action est irréversible. Le mouvement sera supprimé
              et le stock sera remis à son état antérieur.
            </Alert>
            {movementToCancel && (
              <Box mt={2}>
                <Typography variant="body2">
                  <strong>Type :</strong> {movementToCancel.movement_type_display}
                </Typography>
                <Typography variant="body2">
                  <strong>Quantité :</strong>{' '}
                  {movementToCancel.quantity > 0 ? '+' : ''}
                  {movementToCancel.quantity}
                </Typography>
                {movementToCancel.batch_number && (
                  <Typography variant="body2">
                    <strong>Lot :</strong> {movementToCancel.batch_number}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Date :</strong> {formatDate(movementToCancel.created_at)}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCancelDialogOpen(false);
              setMovementToCancel(null);
            }}
          >
            Fermer
          </Button>
          <Button onClick={handleCancelMovement} variant="contained" color="error">
            Confirmer l'annulation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StockMovementsTab;
