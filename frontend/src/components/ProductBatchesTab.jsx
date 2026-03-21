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
  Button,
  TextField,
  Card,
  CardContent,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  alpha,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Refresh,
  Inventory2,
  Warning,
  CheckCircle,
  Block,
  LocalShipping,
  History,
  WarningAmber,
  ErrorOutline,
} from '@mui/icons-material';
import { productBatchesAPI, productsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import { useSnackbar } from 'notistack';

// Calcule le statut d'expiration et retourne label + couleur
function getExpirationStatus(date) {
  if (!date) return null;
  const expDate = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { label: 'Périmé', color: 'error', icon: <ErrorOutline fontSize="small" /> };
  if (diffDays <= 7) return { label: `Expire dans ${diffDays}j`, color: 'error', icon: <Warning fontSize="small" /> };
  if (diffDays <= 30) return { label: `Expire dans ${diffDays}j`, color: 'warning', icon: <WarningAmber fontSize="small" /> };
  return { label: 'Valide', color: 'success', icon: <CheckCircle fontSize="small" /> };
}

function StockReceptionDialog({ open, batch, productId, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (open) { setQuantity(''); setNotes(''); }
  }, [open]);

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      enqueueSnackbar('La quantité doit être supérieure à 0', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await productsAPI.adjustStock(productId, {
        quantity: qty,
        movement_type: 'reception',
        reference_type: 'manual',
        notes: notes || `Réception sur lot ${batch?.batch_number}`,
        batch: batch?.id,
      });
      enqueueSnackbar(`${qty} unités réceptionnées sur le lot ${batch?.batch_number}`, { variant: 'success' });
      onSuccess();
      onClose();
    } catch (err) {
      enqueueSnackbar('Erreur lors de la réception du stock', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed', inset: 0, zIndex: 1300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <Box
        sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 3, width: 400, maxWidth: '95vw', boxShadow: 8 }}
        onClick={e => e.stopPropagation()}
      >
        <Typography variant="h6" fontWeight={700} mb={0.5}>Réception de stock</Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Lot : <strong>{batch?.batch_number}</strong>
          {batch?.expiration_date && ` • Exp: ${formatDate(batch.expiration_date)}`}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Quantité réceptionnée"
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ min: 1 }}
            InputProps={{ endAdornment: <InputAdornment position="end">unités</InputAdornment> }}
          />
          <TextField
            label="Notes (optionnel)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end" mt={3}>
          <Button onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !quantity}
            startIcon={submitting ? <CircularProgress size={16} /> : <LocalShipping />}
          >
            Réceptionner
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function CreateBatchPanel({ productId, onSuccess, onCancel }) {
  const [batchNumber, setBatchNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [supplierBatchRef, setSupplierBatchRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleCreate = async () => {
    if (!batchNumber.trim()) {
      enqueueSnackbar('Le numéro de lot est requis', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await productBatchesAPI.create({
        product: productId,
        batch_number: batchNumber,
        expiration_date: expirationDate || null,
        initial_quantity: initialQuantity ? parseInt(initialQuantity) : 0,
        supplier_batch_reference: supplierBatchRef,
      });
      enqueueSnackbar('Lot créé avec succès', { variant: 'success' });
      onSuccess();
    } catch (err) {
      enqueueSnackbar('Erreur lors de la création du lot', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'primary.main', borderRadius: 2, p: 2.5, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Nouveau lot</Typography>
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label="Numéro de lot *"
            value={batchNumber}
            onChange={e => setBatchNumber(e.target.value)}
            fullWidth
            autoFocus
            size="small"
          />
          <TextField
            label="Quantité initiale"
            type="number"
            value={initialQuantity}
            onChange={e => setInitialQuantity(e.target.value)}
            fullWidth
            size="small"
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Date d'expiration"
            type="date"
            value={expirationDate}
            onChange={e => setExpirationDate(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Réf. lot fournisseur"
            value={supplierBatchRef}
            onChange={e => setSupplierBatchRef(e.target.value)}
            fullWidth
            size="small"
          />
        </Box>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button onClick={onCancel} size="small">Annuler</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !batchNumber.trim()}
            size="small"
            startIcon={submitting ? <CircularProgress size={14} /> : <Add />}
          >
            Créer le lot
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function ProductBatchesTab({ productId }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all'); // all | active | expiring | expired | empty
  const [receptionBatch, setReceptionBatch] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { fetchBatches(); }, [productId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await productBatchesAPI.list({ product: productId });
      setBatches(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des lots');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (batch) => {
    try {
      await productBatchesAPI.update(batch.id, { is_active: !batch.is_active });
      enqueueSnackbar(batch.is_active ? 'Lot désactivé' : 'Lot activé', { variant: 'success' });
      fetchBatches();
    } catch {
      enqueueSnackbar('Erreur lors de la mise à jour', { variant: 'error' });
    }
  };

  const filteredBatches = batches.filter(b => {
    const expStatus = getExpirationStatus(b.expiration_date);
    if (filter === 'active') return b.is_active && expStatus?.color !== 'error';
    if (filter === 'expiring') return expStatus?.color === 'warning';
    if (filter === 'expired') return expStatus?.color === 'error' && b.expiration_date;
    if (filter === 'empty') return b.current_quantity === 0;
    return true;
  });

  // Trier: périmés en dernier, puis par date d'expiration
  const sortedBatches = [...filteredBatches].sort((a, b) => {
    const aExp = getExpirationStatus(a.expiration_date);
    const bExp = getExpirationStatus(b.expiration_date);
    const aIsExpired = aExp?.label === 'Périmé';
    const bIsExpired = bExp?.label === 'Périmé';
    if (aIsExpired && !bIsExpired) return 1;
    if (!aIsExpired && bIsExpired) return -1;
    if (a.expiration_date && b.expiration_date) return new Date(a.expiration_date) - new Date(b.expiration_date);
    return 0;
  });

  // Stats
  const expiredCount = batches.filter(b => {
    const s = getExpirationStatus(b.expiration_date);
    return s?.label === 'Périmé';
  }).length;
  const expiringCount = batches.filter(b => {
    const s = getExpirationStatus(b.expiration_date);
    return s?.color === 'warning';
  }).length;
  const totalStock = batches.reduce((acc, b) => acc + (b.current_quantity || 0), 0);

  if (loading) return <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>;
  if (error) return (
    <Box p={3}>
      <Alert severity="error" action={<IconButton size="small" onClick={fetchBatches}><Refresh /></IconButton>}>{error}</Alert>
    </Box>
  );

  return (
    <Box>
      {/* Stats résumé */}
      {batches.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5, mb: 2, px: 2, pt: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08), textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="primary">{batches.length}</Typography>
            <Typography variant="caption" color="text.secondary">Lots total</Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08), textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="success.main">{totalStock}</Typography>
            <Typography variant="caption" color="text.secondary">En stock</Typography>
          </Box>
          {expiringCount > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} color="warning.main">{expiringCount}</Typography>
              <Typography variant="caption" color="text.secondary">Expirent bientôt</Typography>
            </Box>
          )}
          {expiredCount > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08), textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} color="error">{expiredCount}</Typography>
              <Typography variant="caption" color="text.secondary">Périmés</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Alertes */}
      {expiredCount > 0 && (
        <Alert severity="error" icon={<Block />} sx={{ mx: 2, mb: 1 }}>
          {expiredCount} lot(s) périmé(s) — vérifiez et retirez ces articles du stock actif.
        </Alert>
      )}
      {expiringCount > 0 && (
        <Alert severity="warning" icon={<Warning />} sx={{ mx: 2, mb: 1 }}>
          {expiringCount} lot(s) expirant dans moins de 30 jours.
        </Alert>
      )}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
          sx={{ flexWrap: 'wrap', gap: 0.5 }}
        >
          <ToggleButton value="all">Tous ({batches.length})</ToggleButton>
          <ToggleButton value="active" sx={{ color: 'success.main' }}>Actifs</ToggleButton>
          {expiringCount > 0 && <ToggleButton value="expiring" sx={{ color: 'warning.main' }}>Bientôt exp. ({expiringCount})</ToggleButton>}
          {expiredCount > 0 && <ToggleButton value="expired" sx={{ color: 'error.main' }}>Périmés ({expiredCount})</ToggleButton>}
          <ToggleButton value="empty">Épuisés</ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreateForm(v => !v)}
          size="small"
        >
          Nouveau lot
        </Button>
      </Box>

      {/* Formulaire de création inline */}
      {showCreateForm && (
        <Box sx={{ px: 2 }}>
          <CreateBatchPanel
            productId={productId}
            onSuccess={() => { fetchBatches(); setShowCreateForm(false); }}
            onCancel={() => setShowCreateForm(false)}
          />
        </Box>
      )}

      {/* Liste des lots */}
      {sortedBatches.length === 0 ? (
        <Box p={3}>
          <Alert severity="info" icon={<Inventory2 />}>
            {batches.length === 0
              ? 'Aucun lot enregistré — créez votre premier lot pour gérer le stock par lot.'
              : 'Aucun lot ne correspond au filtre sélectionné.'}
          </Alert>
        </Box>
      ) : isMobile ? (
        <Box px={2} pb={2}>
          {sortedBatches.map(batch => {
            const expStatus = getExpirationStatus(batch.expiration_date);
            const isExpired = expStatus?.label === 'Périmé';
            const pct = batch.initial_quantity > 0
              ? Math.round((batch.current_quantity / batch.initial_quantity) * 100)
              : 0;

            return (
              <Card
                key={batch.id}
                sx={{
                  mb: 1.5, borderRadius: 2,
                  border: '1px solid',
                  borderColor: isExpired ? 'error.light' : expStatus?.color === 'warning' ? 'warning.light' : 'divider',
                  opacity: isExpired ? 0.85 : 1,
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>Lot {batch.batch_number}</Typography>
                      {batch.supplier_batch_reference && (
                        <Typography variant="caption" color="text.secondary">Réf frs: {batch.supplier_batch_reference}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {expStatus && <Chip label={expStatus.label} size="small" color={expStatus.color} icon={expStatus.icon} />}
                      <Chip label={batch.is_active ? 'Actif' : 'Inactif'} size="small" color={batch.is_active ? 'success' : 'default'} />
                    </Stack>
                  </Box>

                  <Box mb={1.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Stock</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {batch.current_quantity} / {batch.initial_quantity}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      color={pct === 0 ? 'error' : pct < 25 ? 'warning' : 'primary'}
                      sx={{ borderRadius: 1, height: 6 }}
                    />
                  </Box>

                  {batch.expiration_date && (
                    <Typography variant="caption" color="text.secondary">Expire: {formatDate(batch.expiration_date)}</Typography>
                  )}

                  <Stack direction="row" spacing={1} mt={1.5}>
                    {!isExpired && batch.is_active && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<LocalShipping />}
                        onClick={() => setReceptionBatch(batch)}
                        sx={{ flex: 1, fontSize: '0.75rem' }}
                      >
                        Réceptionner
                      </Button>
                    )}
                    <Tooltip title={batch.is_active ? 'Désactiver' : 'Activer'}>
                      <IconButton size="small" onClick={() => handleDeactivate(batch)}>
                        {batch.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mx: 2, mb: 2, borderRadius: 2, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell><strong>Numéro de lot</strong></TableCell>
                <TableCell><strong>Stock actuel</strong></TableCell>
                <TableCell><strong>Utilisation</strong></TableCell>
                <TableCell><strong>Date d'expiration</strong></TableCell>
                <TableCell><strong>Statut exp.</strong></TableCell>
                <TableCell><strong>Réf. fournisseur</strong></TableCell>
                <TableCell><strong>Statut</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedBatches.map(batch => {
                const expStatus = getExpirationStatus(batch.expiration_date);
                const isExpired = expStatus?.label === 'Périmé';
                const pct = batch.initial_quantity > 0
                  ? Math.round((batch.current_quantity / batch.initial_quantity) * 100)
                  : 0;

                return (
                  <TableRow
                    key={batch.id}
                    hover
                    sx={{
                      bgcolor: isExpired ? alpha(theme.palette.error.main, 0.04) : 'inherit',
                      opacity: !batch.is_active ? 0.6 : 1,
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{batch.batch_number}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={batch.current_quantity === 0 ? 'error.main' : batch.current_quantity < 5 ? 'warning.main' : 'text.primary'}
                      >
                        {batch.current_quantity}
                        <Typography component="span" variant="caption" color="text.secondary"> / {batch.initial_quantity}</Typography>
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 100 }}>
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={pct === 0 ? 'error' : pct < 25 ? 'warning' : 'primary'}
                          sx={{ borderRadius: 1, height: 6, mb: 0.5 }}
                        />
                        <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {batch.expiration_date ? formatDate(batch.expiration_date) : <Typography variant="caption" color="text.secondary">Aucune</Typography>}
                    </TableCell>
                    <TableCell>
                      {expStatus
                        ? <Chip label={expStatus.label} size="small" color={expStatus.color} icon={expStatus.icon} />
                        : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{batch.supplier_batch_reference || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={batch.is_active ? 'Actif' : 'Inactif'} size="small" color={batch.is_active ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {!isExpired && batch.is_active && (
                          <Tooltip title="Réceptionner du stock sur ce lot">
                            <IconButton size="small" color="primary" onClick={() => setReceptionBatch(batch)}>
                              <LocalShipping fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={batch.is_active ? 'Désactiver ce lot' : 'Réactiver ce lot'}>
                          <IconButton size="small" color={batch.is_active ? 'error' : 'success'} onClick={() => handleDeactivate(batch)}>
                            {batch.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog réception stock */}
      <StockReceptionDialog
        open={!!receptionBatch}
        batch={receptionBatch}
        productId={productId}
        onClose={() => setReceptionBatch(null)}
        onSuccess={fetchBatches}
      />
    </Box>
  );
}

export default ProductBatchesTab;
