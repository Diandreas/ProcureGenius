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
import { formatDate } from '../utils/formatters';
import useCurrency from '../hooks/useCurrency';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';

// Codes stables ; libellés traduits à l'affichage (stock:movements.lossReasons.*)
const LOSS_REASONS = ['damaged', 'expired', 'stolen', 'lost', 'quality_issue', 'other'];

function StockMovementsTab({ productId, productType }) {
  const { t } = useTranslation(['stock']);
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
      setError(t('stock:movements.loadError'));
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    const quantity = parseInt(adjustQuantity);

    if (isNaN(quantity) || quantity === 0) {
      enqueueSnackbar(t('stock:movements.invalidQuantityShort'), { variant: 'error' });
      return;
    }

    try {
      await productsAPI.adjustStock(productId, {
        quantity,
        notes: adjustNotes,
      });

      enqueueSnackbar(t('stock:movements.adjustedSuccess'), { variant: 'success' });
      setAdjustDialogOpen(false);
      setAdjustQuantity('');
      setAdjustNotes('');
      fetchMovements();
    } catch (err) {
      enqueueSnackbar(t('stock:movements.adjustError'), { variant: 'error' });
    }
  };

  const handleReportLoss = async () => {
    const quantity = parseInt(lossQuantity);

    if (isNaN(quantity) || quantity <= 0) {
      enqueueSnackbar(t('stock:movements.invalidQuantityShort'), { variant: 'error' });
      return;
    }

    if (!lossReason) {
      enqueueSnackbar(t('stock:movements.lossReasonRequired'), { variant: 'error' });
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
        t('stock:movements.lossReported', { value: formatCurrency(response.data.loss_value) }),
        { variant: 'warning' }
      );
      setLossDialogOpen(false);
      setLossQuantity('');
      setLossReason('');
      setLossDescription('');
      setLossNotes('');
      fetchMovements();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || t('stock:movements.lossError'), { variant: 'error' });
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
          {t('stock:movements.physicalOnly')}
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
        <Typography variant="h6">{t('stock:movements.historyFull')}</Typography>
        <ButtonGroup variant="contained">
          <Button startIcon={<EditIcon />} onClick={() => setAdjustDialogOpen(true)}>
            {t('stock:movements.adjust')}
          </Button>
          <Button startIcon={<ReportProblem />} color="error" onClick={() => setLossDialogOpen(true)}>
            {t('stock:movements.reportLossButton')}
          </Button>
        </ButtonGroup>
      </Box>

      {movements.length === 0 ? (
        <Box p={3}>
          <Alert severity="info">{t('stock:movements.empty')}</Alert>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('stock:movements.columns.date')}</TableCell>
                <TableCell>{t('stock:movements.columns.type')}</TableCell>
                <TableCell align="center">{t('stock:movements.columns.movement')}</TableCell>
                <TableCell align="right">{t('stock:movements.columns.before')}</TableCell>
                <TableCell align="right">{t('stock:movements.columns.after')}</TableCell>
                <TableCell>{t('stock:movements.columns.referenceReason')}</TableCell>
                <TableCell>{t('stock:movements.columns.user')}</TableCell>
                <TableCell>{t('stock:movements.columns.notes')}</TableCell>
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
                            {t('stock:movements.lossValue', { value: formatCurrency(movement.loss_value) })}
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
        <DialogTitle>{t('stock:movements.adjustTitle')}</DialogTitle>
        <DialogContent>
          <Box pt={1} display="flex" flexDirection="column" gap={2}>
            <Alert severity="info">
              {t('stock:movements.adjustHelp')}
            </Alert>
            <TextField
              label={t('stock:movements.quantity')}
              type="number"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
              placeholder={t('stock:movements.adjustPlaceholder')}
              fullWidth
              autoFocus
            />
            <TextField
              label={t('stock:movements.notesOptional')}
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder={t('stock:movements.adjustReasonPlaceholder')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialogOpen(false)}>{t('stock:common.cancel')}</Button>
          <Button onClick={handleAdjustStock} variant="contained" disabled={!adjustQuantity}>
            {t('stock:movements.adjust')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de déclaration de perte */}
      <Dialog open={lossDialogOpen} onClose={() => setLossDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('stock:movements.lossTitle')}</DialogTitle>
        <DialogContent>
          <Box pt={1} display="flex" flexDirection="column" gap={2}>
            <Alert severity="warning">
              {t('stock:movements.lossWarning')}
            </Alert>
            <TextField
              label={t('stock:movements.lossQuantity')}
              type="number"
              value={lossQuantity}
              onChange={(e) => setLossQuantity(e.target.value)}
              placeholder={t('stock:movements.lossQuantityPlaceholder')}
              fullWidth
              autoFocus
              required
            />
            <FormControl fullWidth required>
              <InputLabel>{t('stock:movements.lossReason')}</InputLabel>
              <Select
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                label={t('stock:movements.lossReason')}
              >
                {LOSS_REASONS.map((reason) => (
                  <MenuItem key={reason} value={reason}>
                    {t(`stock:movements.lossReasons.${reason}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('stock:movements.lossDescription')}
              value={lossDescription}
              onChange={(e) => setLossDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder={t('stock:movements.lossDescriptionPlaceholder')}
              required
            />
            <TextField
              label={t('stock:movements.additionalNotes')}
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLossDialogOpen(false)}>{t('stock:common.cancel')}</Button>
          <Button
            onClick={handleReportLoss}
            variant="contained"
            color="error"
            disabled={!lossQuantity || !lossReason || !lossDescription}
          >
            {t('stock:movements.reportLossSubmit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StockMovementsTab;
