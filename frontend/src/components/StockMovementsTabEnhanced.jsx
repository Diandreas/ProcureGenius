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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ButtonGroup,
} from '@mui/material';
import {
  Add,
  Remove,
  Info,
  Refresh,
  Edit as EditIcon,
  ReportProblem,
} from '@mui/icons-material';
import { productsAPI } from '../services/api';
import { formatDate, formatCurrency } from '../utils/formatters';
import { useSnackbar } from 'notistack';

const LOSS_REASONS = [
  { value: 'damaged', label: 'Produit endommagé' },
  { value: 'expired', label: 'Produit périmé' },
  { value: 'stolen', label: 'Vol' },
  { value: 'lost', label: 'Perte/Égarement' },
  { value: 'quality_issue', label: 'Problème de qualité' },
  { value: 'other', label: 'Autre raison' },
];

function StockMovementsTab({ productId, productType }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [lossQuantity, setLossQuantity] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [lossDescription, setLossDescription] = useState('');
  const [lossNotes, setLossNotes] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (productType === 'physical') {
      fetchMovements();
    }
  }, [productId, productType]);

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
      enqueueSnackbar('Quantité invalide', { variant: 'error' });
      return;
    }

    try {
      await productsAPI.adjustStock(productId, {
        quantity,
        notes: adjustNotes,
      });

      enqueueSnackbar('Stock ajusté avec succès', { variant: 'success' });
      setAdjustDialogOpen(false);
      setAdjustQuantity('');
      setAdjustNotes('');
      fetchMovements();
    } catch (err) {
      enqueueSnackbar('Erreur lors de l\'ajustement du stock', { variant: 'error' });
    }
  };

  const handleReportLoss = async () => {
    const quantity = parseInt(lossQuantity);

    if (isNaN(quantity) || quantity <= 0) {
      enqueueSnackbar('Quantité invalide', { variant: 'error' });
      return;
    }

    if (!lossReason) {
      enqueueSnackbar('Raison de la perte requise', { variant: 'error' });
      return;
    }

    try {
      const response = await productsAPI.reportLoss(productId, {
        quantity,
        loss_reason: lossReason,
        loss_description: lossDescription,
        notes: lossNotes,
      });

      enqueueSnackbar(
        `Perte déclarée. Valeur: ${formatCurrency(response.data.loss_value)}`,
        { variant: 'warning' }
      );
      setLossDialogOpen(false);
      setLossQuantity('');
      setLossReason('');
      setLossDescription('');
      setLossNotes('');
      fetchMovements();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Erreur lors de la déclaration de perte', { variant: 'error' });
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
    if (movement.is_loss) return 'warning';
    return movement.is_entry ? 'success' : 'error';
  };

  const getMovementTypeColor = (type) => {
    const colors = {
      'reception': 'primary',
      'sale': 'warning',
      'adjustment': 'info',
      'return': 'success',
      'loss': 'error',
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} p={2}>
        <Typography variant="h6">Historique des mouvements de stock</Typography>
        <ButtonGroup variant="contained">
          <Button startIcon={<EditIcon />} onClick={() => setAdjustDialogOpen(true)}>
            Ajuster
          </Button>
          <Button startIcon={<ReportProblem />} color="error" onClick={() => setLossDialogOpen(true)}>
            Déclarer perte
          </Button>
        </ButtonGroup>
      </Box>

      {movements.length === 0 ? (
        <Box p={3}>
          <Alert severity="info">Aucun mouvement de stock enregistré</Alert>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Mouvement</TableCell>
                <TableCell align="right">Avant</TableCell>
                <TableCell align="right">Après</TableCell>
                <TableCell>Référence/Raison</TableCell>
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
                    {movement.is_loss ? (
                      <Box>
                        <Chip
                          label={movement.loss_reason_display}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                        {movement.loss_description && (
                          <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                            {movement.loss_description}
                          </Typography>
                        )}
                        {movement.loss_value > 0 && (
                          <Typography variant="caption" display="block" color="error.main">
                            Valeur: {formatCurrency(movement.loss_value)}
                          </Typography>
                        )}
                      </Box>
                    ) : movement.reference_type_display && (
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
      <Dialog open={adjustDialogOpen} onClose={() => setAdjustDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajuster le stock</DialogTitle>
        <DialogContent>
          <Box pt={1} display="flex" flexDirection="column" gap={2}>
            <Alert severity="info">
              Entrez une quantité positive pour ajouter du stock ou négative pour en retirer.
            </Alert>
            <TextField
              label="Quantité"
              type="number"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
              placeholder="Ex: +10 ou -5"
              fullWidth
              autoFocus
            />
            <TextField
              label="Notes (optionnel)"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder="Raison de l'ajustement..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleAdjustStock} variant="contained" disabled={!adjustQuantity}>
            Ajuster
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de déclaration de perte */}
      <Dialog open={lossDialogOpen} onClose={() => setLossDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Déclarer une perte de stock</DialogTitle>
        <DialogContent>
          <Box pt={1} display="flex" flexDirection="column" gap={2}>
            <Alert severity="warning">
              Cette action enregistrera une perte de stock avec traçabilité complète.
            </Alert>
            <TextField
              label="Quantité perdue"
              type="number"
              value={lossQuantity}
              onChange={(e) => setLossQuantity(e.target.value)}
              placeholder="Ex: 5"
              fullWidth
              autoFocus
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Raison de la perte</InputLabel>
              <Select
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                label="Raison de la perte"
              >
                {LOSS_REASONS.map((reason) => (
                  <MenuItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Description détaillée"
              value={lossDescription}
              onChange={(e) => setLossDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder="Décrivez les circonstances de la perte..."
              required
            />
            <TextField
              label="Notes additionnelles (optionnel)"
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLossDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleReportLoss}
            variant="contained"
            color="error"
            disabled={!lossQuantity || !lossReason || !lossDescription}
          >
            Déclarer la perte
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StockMovementsTab;
