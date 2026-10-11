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
      enqueueSnackbar(e.response?.data?.error || "Impossible d'ouvrir l'inventaire", { variant: 'error' });
      setStarting(false);
    }
  };

  return (
    <Box p={{ xs: 0, sm: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton onClick={() => navigate('/products')}><ArrowBack /></IconButton>
        <Typography variant="h5" fontWeight={800}>Inventaire</Typography>
      </Stack>

      {draft ? (
        <Alert severity="info" sx={{ mb: 2 }} action={
          <Button color="inherit" onClick={() => navigate(`/products/inventory/${draft.id}`)}>Continuer</Button>}>
          Inventaire <strong>{draft.reference}</strong> en cours : {draft.lines_counted}/{draft.lines_total} lignes comptées.
        </Alert>
      ) : (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Compter mon stock</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Comptez ce qui est réellement en rayon ou en réserve. Vous pouvez vous arrêter et reprendre plus tard ;
              rien ne change dans le stock tant que vous n'avez pas appliqué l'inventaire.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              {warehouses.length > 0 && (
                <FormControl sx={{ minWidth: 240 }} size="small">
                  <InputLabel id="inv-depot">Entrepôt</InputLabel>
                  <Select labelId="inv-depot" label="Entrepôt" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                    <MenuItem value="">Tout le stock</MenuItem>
                    {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              <Button variant="contained" size="large" startIcon={<Checklist />} onClick={start} disabled={starting}>
                Commencer un inventaire
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Typography variant="overline" color="text.secondary">Historique</Typography>
      {list === null ? <CircularProgress size={24} /> : list.length === 0 ? (
        <Typography color="text.secondary">Aucun inventaire pour l'instant.</Typography>
      ) : (
        <Stack spacing={1}>
          {list.map((s) => (
            <Card key={s.id} sx={{ borderRadius: 2, cursor: 'pointer' }} onClick={() => navigate(`/products/inventory/${s.id}`)}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                  <Box>
                    <Typography fontWeight={700}>{s.reference}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(s.created_at).toLocaleDateString('fr-FR')} · {s.warehouse || 'Tout le stock'} · {s.lines_counted}/{s.lines_total} comptées
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
  useEffect(() => { load().catch(() => enqueueSnackbar('Inventaire introuvable', { variant: 'error' })); }, [load, enqueueSnackbar]);

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
      enqueueSnackbar('Comptage non enregistré (connexion ?)', { variant: 'error' });
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
        enqueueSnackbar(`${r.data.product.name} n'est pas dans cet inventaire`, { variant: 'warning' });
        return;
      }
      setSearch('');
      setShow('all');
      setTimeout(() => {
        const el = inputs.current[line.id];
        if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); el.select?.(); }
      }, 100);
      enqueueSnackbar(`${r.data.product.name} — tapez la quantité comptée`, { variant: 'info' });
    } catch (e) {
      enqueueSnackbar(e.response?.status === 404 ? `Code inconnu : ${code}` : 'Lecture impossible', { variant: 'warning' });
    }
  };

  const apply = async () => {
    setBusy(true);
    try {
      const r = await stockAPI.applyInventory(id);
      setReport(r.data.report);
      setInv(r.data.inventory);
      setConfirm(false);
      enqueueSnackbar('Inventaire appliqué : le stock est à jour', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || "Échec de l'application", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Annuler cet inventaire ? Les comptages seront abandonnés, le stock ne change pas.')) return;
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
          <Typography variant="caption" color="text.secondary">{inv.warehouse || 'Tout le stock'} · {inv.status_display}</Typography>
        </Box>
        {editable && <Button color="inherit" size="small" onClick={cancel}>Annuler</Button>}
      </Stack>

      <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
      <Typography variant="body2" color="text.secondary" mb={2}>
        {counted.length}/{lines.length} comptées · {ecarts.length} écart(s){ecarts.length ? ` · ${format(valeur)}` : ''}
      </Typography>

      {report && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {report.adjusted.length} produit(s) ajusté(s), {report.unchanged} sans écart, {report.not_counted} non compté(s).
          Écart en valeur (prix d'achat) : <strong>{format(report.value)}</strong>.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
        <TextField size="small" fullWidth placeholder="Chercher un produit, une référence, un lot…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
        {editable && (
          <Button variant="contained" startIcon={<QrCodeScanner />} onClick={() => setScanOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
            Scanner
          </Button>
        )}
      </Stack>
      <ToggleButtonGroup size="small" exclusive value={show} onChange={(_, v) => v && setShow(v)} sx={{ mb: 1.5 }}>
        <ToggleButton value="all">Tout</ToggleButton>
        <ToggleButton value="todo">À compter</ToggleButton>
        <ToggleButton value="diff">Écarts</ToggleButton>
      </ToggleButtonGroup>

      <Card sx={{ borderRadius: 3 }}>
        <Table size="small">
          {!isMobile && (
            <TableHead>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell align="right">Attendu</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>Compté</TableCell>
                <TableCell align="right">Écart</TableCell>
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
                      {l.reference}{l.batch_number ? ` · lot ${l.batch_number}` : ''}{isMobile ? ` · attendu ${l.expected}` : ''}
                    </Typography>
                  </TableCell>
                  {!isMobile && <TableCell align="right">{l.expected}</TableCell>}
                  <TableCell align="right" sx={{ width: isMobile ? 96 : 140 }}>
                    <TextField size="small" type="number" value={v ?? ''} disabled={!editable}
                      inputRef={(el) => { inputs.current[l.id] = el; }}
                      inputProps={{ min: 0, inputMode: 'numeric', style: { textAlign: 'right' }, 'aria-label': `Quantité comptée ${l.product}` }}
                      onChange={(e) => setValues((x) => ({ ...x, [l.id]: e.target.value }))}
                      onBlur={(e) => save(l, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
                  </TableCell>
                  <TableCell align="right" sx={{ pl: 0 }}>
                    {has && (diff === 0
                      ? <Chip size="small" label="OK" color="success" variant="outlined" />
                      : <Chip size="small" label={diff > 0 ? `+${diff}` : diff} color={diff > 0 ? 'info' : 'error'} />)}
                    {!editable && l.applied_delta != null && l.applied_delta !== 0 && (
                      <Tooltip title="Écart réellement appliqué (stock au moment de l'application)">
                        <Typography variant="caption" display="block" color="text.secondary">appliqué {l.applied_delta > 0 ? '+' : ''}{l.applied_delta}</Typography>
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
            Appliquer l'inventaire
          </Button>
        </Box>
      )}

      <CameraScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={onScan} title="Scanner un produit" />

      <Dialog open={confirm} onClose={() => !busy && setConfirm(false)}>
        <DialogTitle>Appliquer l'inventaire ?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {ecarts.length} écart(s) seront enregistrés comme ajustements de stock
            {ecarts.length ? <> (valeur au prix d'achat : <strong>{format(valeur)}</strong>)</> : null}.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lines.length - counted.length} ligne(s) non comptée(s) resteront inchangées. Les ventes faites depuis le début
            du comptage sont prises en compte. Cette opération ne peut pas être annulée.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(false)} disabled={busy}>Retour</Button>
          <Button variant="contained" color="success" onClick={apply} disabled={busy}>Appliquer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
