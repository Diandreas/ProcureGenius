import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { ArrowBack, Checklist, QrCodeScanner, Search } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useTranslation, Trans } from 'react-i18next';
import { stockAPI, warehousesAPI } from '../../services/api';
import useCurrency from '../../hooks/useCurrency';
import CameraScanner from '../../components/stock/CameraScanner';

/**
 * Inventaire physique : on ouvre un inventaire (stock attendu figé), on compte produit par produit
 * — en cherchant, en scannant le code-barres ou l'étiquette — en plusieurs fois si besoin, puis on
 * applique : chaque écart devient un ajustement de stock tracé avec la référence de l'inventaire.
 */
export default function StockInventory() {
  const { id } = useParams();
  return id ? <InventorySessionView id={id} /> : <InventoryHome />;
}

function InventoryHome() {
  const { t, i18n } = useTranslation(['stock']);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [list, setList] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    stockAPI.inventories().then((r) => setList(r.data)).catch(() => setList([]));
    warehousesAPI.list().then((r) => setWarehouses(r.data.results || r.data)).catch(() => {});
  }, []);

  const draft = (list || []).find((s) => s.status === 'draft');

  const start = async () => {
    setStarting(true);
    try {
      const r = await stockAPI.startInventory(warehouse ? { warehouse_id: warehouse } : {});
      navigate(`/products/inventory/${r.data.id}`);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || t('stock:inventory.openError'), { variant: 'error' });
      setStarting(false);
    }
  };

  return (
    <Box p={{ xs: 0, sm: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton onClick={() => navigate('/products')}><ArrowBack /></IconButton>
        <Typography variant="h5" fontWeight={800}>{t('stock:inventory.title')}</Typography>
      </Stack>

      {draft ? (
        <Alert severity="info" sx={{ mb: 2 }} action={
          <Button color="inherit" onClick={() => navigate(`/products/inventory/${draft.id}`)}>{t('stock:inventory.continue')}</Button>}>
          <Trans t={t} i18nKey="stock:inventory.inProgress"
            values={{ reference: draft.reference, counted: draft.lines_counted, total: draft.lines_total }}
            components={{ strong: <strong /> }} />
        </Alert>
      ) : (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>{t('stock:inventory.countMyStock')}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('stock:inventory.countMyStockHelp')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              {warehouses.length > 0 && (
                <FormControl sx={{ minWidth: 240 }} size="small">
                  <InputLabel id="inv-depot">{t('stock:common.warehouse')}</InputLabel>
                  <Select labelId="inv-depot" label={t('stock:common.warehouse')} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                    <MenuItem value="">{t('stock:inventory.allStock')}</MenuItem>
                    {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              <Button variant="contained" size="large" startIcon={<Checklist />} onClick={start} disabled={starting}>
                {t('stock:inventory.start')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Typography variant="overline" color="text.secondary">{t('stock:inventory.history')}</Typography>
      {list === null ? <CircularProgress size={24} /> : list.length === 0 ? (
        <Typography color="text.secondary">{t('stock:inventory.empty')}</Typography>
      ) : (
        <Stack spacing={1}>
          {list.map((s) => (
            <Card key={s.id} sx={{ borderRadius: 2, cursor: 'pointer' }} onClick={() => navigate(`/products/inventory/${s.id}`)}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                  <Box>
                    <Typography fontWeight={700}>{s.reference}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(s.created_at).toLocaleDateString(i18n.language)} · {s.warehouse || t('stock:inventory.allStock')} · {t('stock:inventory.countedOf', { counted: s.lines_counted, total: s.lines_total })}
                    </Typography>
                  </Box>
                  <Chip size="small" label={s.status_display}
                    color={s.status === 'applied' ? 'success' : s.status === 'draft' ? 'warning' : 'default'} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function InventorySessionView({ id }) {
  const { t } = useTranslation(['stock']);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [inv, setInv] = useState(null);
  const [values, setValues] = useState({});
  const [search, setSearch] = useState('');
  const [show, setShow] = useState('all');
  const [scanOpen, setScanOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const inputs = useRef({});

  const load = useCallback(async () => {
    const r = await stockAPI.inventory(id);
    setInv(r.data);
    setValues(Object.fromEntries(r.data.lines.map((l) => [l.id, l.counted ?? ''])));
  }, [id]);
  useEffect(() => { load().catch(() => enqueueSnackbar(t('stock:inventory.notFound'), { variant: 'error' })); }, [load, enqueueSnackbar, t]);

  const editable = inv?.status === 'draft';
  const lines = inv?.lines || [];
  const counted = lines.filter((l) => values[l.id] !== '' && values[l.id] !== null && values[l.id] !== undefined);
  const ecarts = counted.filter((l) => Number(values[l.id]) !== l.expected);
  const valeur = ecarts.reduce((s, l) => s + (Number(values[l.id]) - l.expected) * Number(l.cost_price || 0), 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((l) => {
      if (q && !`${l.product} ${l.reference || ''} ${l.barcode || ''} ${l.batch_number || ''}`.toLowerCase().includes(q)) return false;
      const v = values[l.id];
      if (show === 'todo') return v === '' || v === null || v === undefined;
      if (show === 'diff') return v !== '' && v !== null && v !== undefined && Number(v) !== l.expected;
      return true;
    });
  }, [lines, values, search, show]);

  const save = async (line, raw) => {
    if (!editable) return;
    const before = line.counted ?? '';
    if (String(raw) === String(before)) return;
    try {
      const r = await stockAPI.count(id, [{ line_id: line.id, counted: raw === '' ? null : raw }]);
      if (r.data.errors?.length) {
        enqueueSnackbar(r.data.errors[0].error, { variant: 'warning' });
        return;
      }
      line.counted = raw === '' ? null : Number(raw);
    } catch {
      enqueueSnackbar(t('stock:inventory.countNotSaved'), { variant: 'error' });
    }
  };

  const onScan = async (code) => {
    setScanOpen(false);
    try {
      const r = await stockAPI.scan(code);
      const pid = r.data.product.id;
      const bid = r.data.batch?.id;
      const line = lines.find((l) => l.product_id === pid && (!bid || l.batch_id === bid)) || lines.find((l) => l.product_id === pid);
      if (!line) {
        enqueueSnackbar(t('stock:inventory.notInInventory', { name: r.data.product.name }), { variant: 'warning' });
        return;
      }
      setSearch('');
      setShow('all');
      setTimeout(() => {
        const el = inputs.current[line.id];
        if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); el.select?.(); }
      }, 100);
      enqueueSnackbar(t('stock:inventory.typeCountedQty', { name: r.data.product.name }), { variant: 'info' });
    } catch (e) {
      enqueueSnackbar(e.response?.status === 404 ? t('stock:common.unknownCode', { code }) : t('stock:common.readError'), { variant: 'warning' });
    }
  };

  const apply = async () => {
    setBusy(true);
    try {
      const r = await stockAPI.applyInventory(id);
      setReport(r.data.report);
      setInv(r.data.inventory);
      setConfirm(false);
      enqueueSnackbar(t('stock:inventory.applied'), { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || t('stock:inventory.applyError'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm(t('stock:inventory.cancelConfirm'))) return;
    await stockAPI.cancelInventory(id);
    navigate('/products/inventory');
  };

  if (!inv) return <Box textAlign="center" py={6}><CircularProgress /></Box>;
  const pct = lines.length ? Math.round((counted.length / lines.length) * 100) : 0;

  return (
    <Box p={{ xs: 0, sm: 1 }} pb={editable ? 10 : 2}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <IconButton onClick={() => navigate('/products/inventory')}><ArrowBack /></IconButton>
        <Box flex={1} minWidth={0}>
          <Typography variant="h6" fontWeight={800} noWrap>{inv.reference}</Typography>
          <Typography variant="caption" color="text.secondary">{inv.warehouse || t('stock:inventory.allStock')} · {inv.status_display}</Typography>
        </Box>
        {editable && <Button color="inherit" size="small" onClick={cancel}>{t('stock:common.cancel')}</Button>}
      </Stack>

      <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
      <Typography variant="body2" color="text.secondary" mb={2}>
        {t('stock:inventory.countedOf', { counted: counted.length, total: lines.length })} · {t('stock:inventory.diffCount', { count: ecarts.length })}{ecarts.length ? ` · ${format(valeur)}` : ''}
      </Typography>

      {report && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('stock:inventory.reportAdjusted', { count: report.adjusted.length })}, {t('stock:inventory.reportUnchanged', { count: report.unchanged })}, {t('stock:inventory.reportNotCounted', { count: report.not_counted })}.
          {' '}{t('stock:inventory.reportValue')} <strong>{format(report.value)}</strong>.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
        <TextField size="small" fullWidth placeholder={t('stock:inventory.searchPlaceholder')} value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
        {editable && (
          <Button variant="contained" startIcon={<QrCodeScanner />} onClick={() => setScanOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
            {t('stock:common.scan')}
          </Button>
        )}
      </Stack>
      <ToggleButtonGroup size="small" exclusive value={show} onChange={(_, v) => v && setShow(v)} sx={{ mb: 1.5 }}>
        <ToggleButton value="all">{t('stock:inventory.filterAll')}</ToggleButton>
        <ToggleButton value="todo">{t('stock:inventory.filterTodo')}</ToggleButton>
        <ToggleButton value="diff">{t('stock:inventory.filterDiff')}</ToggleButton>
      </ToggleButtonGroup>

      <Card sx={{ borderRadius: 3 }}>
        <Table size="small">
          {!isMobile && (
            <TableHead>
              <TableRow>
                <TableCell>{t('stock:common.product')}</TableCell>
                <TableCell align="right">{t('stock:inventory.expected')}</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>{t('stock:inventory.counted')}</TableCell>
                <TableCell align="right">{t('stock:inventory.difference')}</TableCell>
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {visible.map((l) => {
              const v = values[l.id];
              const has = v !== '' && v !== null && v !== undefined;
              const diff = has ? Number(v) - l.expected : null;
              return (
                <TableRow key={l.id}>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{l.product}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {l.reference}{l.batch_number ? ` · ${t('stock:common.batchInline', { batch: l.batch_number })}` : ''}{isMobile ? ` · ${t('stock:inventory.expectedInline', { qty: l.expected })}` : ''}
                    </Typography>
                  </TableCell>
                  {!isMobile && <TableCell align="right">{l.expected}</TableCell>}
                  <TableCell align="right" sx={{ width: isMobile ? 96 : 140 }}>
                    <TextField size="small" type="number" value={v ?? ''} disabled={!editable}
                      inputRef={(el) => { inputs.current[l.id] = el; }}
                      inputProps={{ min: 0, inputMode: 'numeric', style: { textAlign: 'right' }, 'aria-label': t('stock:inventory.countedQtyAria', { product: l.product }) }}
                      onChange={(e) => setValues((x) => ({ ...x, [l.id]: e.target.value }))}
                      onBlur={(e) => save(l, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
                  </TableCell>
                  <TableCell align="right" sx={{ pl: 0 }}>
                    {has && (diff === 0
                      ? <Chip size="small" label={t('stock:inventory.ok')} color="success" variant="outlined" />
                      : <Chip size="small" label={diff > 0 ? `+${diff}` : diff} color={diff > 0 ? 'info' : 'error'} />)}
                    {!editable && l.applied_delta != null && l.applied_delta !== 0 && (
                      <Tooltip title={t('stock:inventory.appliedTooltip')}>
                        <Typography variant="caption" display="block" color="text.secondary">{t('stock:inventory.appliedDelta', { delta: `${l.applied_delta > 0 ? '+' : ''}${l.applied_delta}` })}</Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {editable && (
        <Box sx={{ position: 'sticky', bottom: { xs: 76, sm: 12 }, mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button variant="contained" color="success" size="large" disabled={counted.length === 0} onClick={() => setConfirm(true)}>
            {t('stock:inventory.apply')}
          </Button>
        </Box>
      )}

      <CameraScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={onScan} title={t('stock:scan.scanProduct')} />

      <Dialog open={confirm} onClose={() => !busy && setConfirm(false)}>
        <DialogTitle>{t('stock:inventory.applyConfirmTitle')}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {t('stock:inventory.applyConfirmDiffs', { count: ecarts.length })}
            {ecarts.length ? <> ({t('stock:inventory.applyConfirmValue')} <strong>{format(valeur)}</strong>)</> : null}.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('stock:inventory.applyConfirmHelp', { count: lines.length - counted.length })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(false)} disabled={busy}>{t('stock:common.back')}</Button>
          <Button variant="contained" color="success" onClick={apply} disabled={busy}>{t('stock:inventory.applyShort')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
