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
import { productBatchesAPI, productsAPI, warehousesAPI } from '../services/api';
import { formatDate } from '../utils/formatters';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';

// Calcule le statut d'expiration et retourne un code stable + couleur
// (le libellé est traduit à l'affichage via expirationLabel)
function getExpirationStatus(date) {
  if (!date) return null;
  const expDate = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { key: 'expired', days: diffDays, color: 'error', icon: <ErrorOutline fontSize="small" /> };
  if (diffDays <= 7) return { key: 'expiresIn', days: diffDays, color: 'error', icon: <Warning fontSize="small" /> };
  if (diffDays <= 30) return { key: 'expiresIn', days: diffDays, color: 'warning', icon: <WarningAmber fontSize="small" /> };
  return { key: 'valid', days: diffDays, color: 'success', icon: <CheckCircle fontSize="small" /> };
}

const expirationLabel = (t, status) => t(`stock:batches.expiry.${status.key}`, { days: status.days });

function StockReceptionDialog({ open, batch, productId, onClose, onSuccess }) {
  const { t } = useTranslation(['stock']);
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
      enqueueSnackbar(t('stock:batches.quantityPositive'), { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await productsAPI.adjustStock(productId, {
        quantity: qty,
        movement_type: 'reception',
        reference_type: 'manual',
        notes: notes || t('stock:batches.receptionNote', { batch: batch?.batch_number }),
        batch_id: batch?.id,
      });
      enqueueSnackbar(t('stock:batches.received', { count: qty, batch: batch?.batch_number }), { variant: 'success' });
      onSuccess();
      onClose();
    } catch (err) {
      enqueueSnackbar(t('stock:batches.receptionError'), { variant: 'error' });
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
        <Typography variant="h6" fontWeight={700} mb={0.5}>{t('stock:batches.receptionTitle')}</Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          {t('stock:batches.batchPrefix')} <strong>{batch?.batch_number}</strong>
          {batch?.expiration_date && ` • ${t('stock:movements.batchExpiry', { date: formatDate(batch.expiration_date) })}`}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label={t('stock:batches.receivedQuantity')}
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ min: 1 }}
            InputProps={{ endAdornment: <InputAdornment position="end">{t('stock:batches.units')}</InputAdornment> }}
          />
          <TextField
            label={t('stock:movements.notesOptional')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end" mt={3}>
          <Button onClick={onClose} disabled={submitting}>{t('stock:common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !quantity}
            startIcon={submitting ? <CircularProgress size={16} /> : <LocalShipping />}
          >
            {t('stock:batches.receive')}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function CreateBatchPanel({ productId, onSuccess, onCancel }) {
  const { t } = useTranslation(['stock']);
  const [batchNumber, setBatchNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [supplierBatchRef, setSupplierBatchRef] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Générer un numéro de lot par défaut
  useEffect(() => {
    if (!batchNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      setBatchNumber(`LOT-${year}-${random}`);
    }
  }, []);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await warehousesAPI.list();
        setWarehouses(res.data.results || res.data);
      } catch (err) {
        console.error("Error fetching warehouses", err);
      }
    };
    fetchWarehouses();
  }, []);

  const handleCreate = async () => {
    if (!batchNumber.trim()) {
      enqueueSnackbar(t('stock:batches.batchNumberRequired'), { variant: 'error' });
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
        warehouse: warehouseId || null,
      });
      enqueueSnackbar(t('stock:batches.created'), { variant: 'success' });
      onSuccess();
    } catch (err) {
      enqueueSnackbar(t('stock:batches.createError'), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1.5px solid', borderColor: 'primary.main', borderRadius: 2, p: 2.5, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>{t('stock:batches.newBatch')}</Typography>
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            label={t('stock:batches.batchNumberRequiredLabel')}
            value={batchNumber}
            onChange={e => setBatchNumber(e.target.value)}
            fullWidth
            autoFocus
            size="small"
          />
          <TextField
            label={t('stock:batches.initialQuantity')}
            type="number"
            value={initialQuantity}
            onChange={e => setInitialQuantity(e.target.value)}
            fullWidth
            size="small"
            inputProps={{ min: 0 }}
          />
          <TextField
            label={t('stock:batches.expirationDate')}
            type="date"
            value={expirationDate}
            onChange={e => setExpirationDate(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('stock:batches.supplierBatchRef')}
            value={supplierBatchRef}
            onChange={e => setSupplierBatchRef(e.target.value)}
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>{t('stock:common.warehouse')}</InputLabel>
            <Select
              value={warehouseId}
              label={t('stock:common.warehouse')}
              onChange={e => setWarehouseId(e.target.value)}
            >
              <MenuItem value=""><em>{t('stock:batches.none')}</em></MenuItem>
              {warehouses.map(w => (
                <MenuItem key={w.id} value={w.id}>{w.name} ({w.code})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button onClick={onCancel} size="small">{t('stock:common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !batchNumber.trim()}
            size="small"
            startIcon={submitting ? <CircularProgress size={14} /> : <Add />}
          >
            {t('stock:batches.createBatch')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function ProductBatchesTab({ productId, onStockChange }) {
  const { t } = useTranslation(['stock']);
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
      setError(t('stock:batches.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (batch) => {
    try {
      await productBatchesAPI.update(batch.id, { is_active: !batch.is_active });
      enqueueSnackbar(batch.is_active ? t('stock:batches.deactivated') : t('stock:batches.activated'), { variant: 'success' });
      fetchBatches();
    } catch {
      enqueueSnackbar(t('stock:batches.updateError'), { variant: 'error' });
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
    const aIsExpired = aExp?.key === 'expired';
    const bIsExpired = bExp?.key === 'expired';
    if (aIsExpired && !bIsExpired) return 1;
    if (!aIsExpired && bIsExpired) return -1;
    if (a.expiration_date && b.expiration_date) return new Date(a.expiration_date) - new Date(b.expiration_date);
    return 0;
  });

  // Stats
  const expiredCount = batches.filter(b => {
    const s = getExpirationStatus(b.expiration_date);
    return s?.key === 'expired';
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
            <Typography variant="caption" color="text.secondary">{t('stock:batches.totalBatches')}</Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08), textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="success.main">{totalStock}</Typography>
            <Typography variant="caption" color="text.secondary">{t('stock:batches.inStock')}</Typography>
          </Box>
          {expiringCount > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} color="warning.main">{expiringCount}</Typography>
              <Typography variant="caption" color="text.secondary">{t('stock:batches.expiringSoon')}</Typography>
            </Box>
          )}
          {expiredCount > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08), textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} color="error">{expiredCount}</Typography>
              <Typography variant="caption" color="text.secondary">{t('stock:batches.expiredPlural')}</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Alertes */}
      {expiredCount > 0 && (
        <Alert severity="error" icon={<Block />} sx={{ mx: 2, mb: 1 }}>
          {t('stock:batches.expiredAlert', { count: expiredCount })}
        </Alert>
      )}
      {expiringCount > 0 && (
        <Alert severity="warning" icon={<Warning />} sx={{ mx: 2, mb: 1 }}>
          {t('stock:batches.expiringAlert', { count: expiringCount })}
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
          <ToggleButton value="all">{t('stock:batches.filters.all', { n: batches.length })}</ToggleButton>
          <ToggleButton value="active" sx={{ color: 'success.main' }}>{t('stock:batches.filters.active')}</ToggleButton>
          {expiringCount > 0 && <ToggleButton value="expiring" sx={{ color: 'warning.main' }}>{t('stock:batches.filters.expiring', { n: expiringCount })}</ToggleButton>}
          {expiredCount > 0 && <ToggleButton value="expired" sx={{ color: 'error.main' }}>{t('stock:batches.filters.expired', { n: expiredCount })}</ToggleButton>}
          <ToggleButton value="empty">{t('stock:batches.filters.empty')}</ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreateForm(v => !v)}
          size="small"
        >
          {t('stock:batches.newBatch')}
        </Button>
      </Box>

      {/* Formulaire de création inline */}
      {showCreateForm && (
        <Box sx={{ px: 2 }}>
          <CreateBatchPanel
            productId={productId}
            onSuccess={() => { fetchBatches(); setShowCreateForm(false); if (onStockChange) onStockChange(); }}
            onCancel={() => setShowCreateForm(false)}
          />
        </Box>
      )}

      {/* Liste des lots */}
      {sortedBatches.length === 0 ? (
        <Box p={3}>
          <Alert severity="info" icon={<Inventory2 />}>
            {batches.length === 0
              ? t('stock:batches.emptyAll')
              : t('stock:batches.emptyFiltered')}
          </Alert>
        </Box>
      ) : isMobile ? (
        <Box px={2} pb={2}>
          {sortedBatches.map(batch => {
            const expStatus = getExpirationStatus(batch.expiration_date);
            const isExpired = expStatus?.key === 'expired';
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
                      <Typography variant="subtitle2" fontWeight={700}>{t('stock:batches.batchTitle', { batch: batch.batch_number })}</Typography>
                      <Stack direction="row" spacing={1}>
                        {batch.supplier_batch_reference && (
                          <Typography variant="caption" color="text.secondary">{t('stock:batches.supplierRefShort', { ref: batch.supplier_batch_reference })}</Typography>
                        )}
                        {batch.warehouse_name && (
                          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>{t('stock:batches.location', { name: batch.warehouse_name })}</Typography>
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {expStatus && <Chip label={expirationLabel(t, expStatus)} size="small" color={expStatus.color} icon={expStatus.icon} />}
                      <Chip label={batch.is_active ? t('stock:batches.active') : t('stock:batches.inactive')} size="small" color={batch.is_active ? 'success' : 'default'} />
                    </Stack>
                  </Box>

                  <Box mb={1.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">{t('stock:batches.stock')}</Typography>
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
                    <Typography variant="caption" color="text.secondary">{t('stock:batches.expiresOn', { date: formatDate(batch.expiration_date) })}</Typography>
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
                        {t('stock:batches.receive')}
                      </Button>
                    )}
                    <Tooltip title={batch.is_active ? t('stock:batches.deactivate') : t('stock:batches.activate')}>
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
                <TableCell><strong>{t('stock:batches.columns.batchNumber')}</strong></TableCell>
                <TableCell><strong>{t('stock:common.warehouse')}</strong></TableCell>
                <TableCell><strong>{t('stock:batches.columns.currentStock')}</strong></TableCell>
                <TableCell><strong>{t('stock:batches.columns.usage')}</strong></TableCell>
                <TableCell><strong>{t('stock:batches.expirationDate')}</strong></TableCell>
                <TableCell><strong>{t('stock:batches.columns.expiryStatus')}</strong></TableCell>
                <TableCell><strong>{t('stock:batches.columns.supplierRef')}</strong></TableCell>
                <TableCell><strong>{t('stock:batches.columns.status')}</strong></TableCell>
                <TableCell align="center"><strong>{t('stock:batches.columns.actions')}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedBatches.map(batch => {
                const expStatus = getExpirationStatus(batch.expiration_date);
                const isExpired = expStatus?.key === 'expired';
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
                      <Typography variant="body2" color="primary.main" fontWeight={500}>{batch.warehouse_name || '—'}</Typography>
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
                      {batch.expiration_date ? formatDate(batch.expiration_date) : <Typography variant="caption" color="text.secondary">{t('stock:batches.noExpiryDate')}</Typography>}
                    </TableCell>
                    <TableCell>
                      {expStatus
                        ? <Chip label={expirationLabel(t, expStatus)} size="small" color={expStatus.color} icon={expStatus.icon} />
                        : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{batch.supplier_batch_reference || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={batch.is_active ? t('stock:batches.active') : t('stock:batches.inactive')} size="small" color={batch.is_active ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {!isExpired && batch.is_active && (
                          <Tooltip title={t('stock:batches.receiveTooltip')}>
                            <IconButton size="small" color="primary" onClick={() => setReceptionBatch(batch)}>
                              <LocalShipping fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={batch.is_active ? t('stock:batches.deactivateTooltip') : t('stock:batches.reactivateTooltip')}>
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
        onSuccess={() => { fetchBatches(); if (onStockChange) onStockChange(); }}
      />
    </Box>
  );
}

export default ProductBatchesTab;
