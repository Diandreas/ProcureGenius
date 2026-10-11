import React, { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, TextField, Typography, Autocomplete,
} from '@mui/material';
import { ArrowBack, QrCodeScanner, Inventory2, LocalPrintshop, AddBox, Link as LinkIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { stockAPI, productsAPI } from '../../services/api';
import useCurrency from '../../hooks/useCurrency';
import CameraScanner from '../../components/stock/CameraScanner';

/**
 * Scanner : pointe la caméra sur un code-barres ou une étiquette, et retrouve le produit (stock,
 * prix, lot, péremption) avec les actions utiles. Un code inconnu peut être associé à un produit.
 * Une douchette USB fonctionne aussi : elle « tape » le code dans le champ.
 */
export default function StockScan() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
  const [open, setOpen] = useState(true);
  const [manual, setManual] = useState('');
  const [result, setResult] = useState(null);
  const [unknown, setUnknown] = useState(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [target, setTarget] = useState(null);

  const lookup = async (code) => {
    setOpen(false);
    setResult(null);
    setUnknown(null);
    try {
      const r = await stockAPI.scan(code);
      setResult(r.data);
    } catch (e) {
      if (e.response?.status === 404) setUnknown(code);
      else enqueueSnackbar('Lecture impossible', { variant: 'error' });
    }
  };

  const searchProducts = async (q) => {
    if (q.length < 2) return;
    const r = await productsAPI.list({ search: q, page_size: 20 });
    setOptions(r.data.results || r.data);
  };

  const link = async () => {
    try {
      await stockAPI.assignBarcode(target.id, unknown);
      enqueueSnackbar(`Code associé à ${target.name}`, { variant: 'success' });
      setLinkOpen(false);
      lookup(unknown);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Association impossible', { variant: 'error' });
    }
  };

  const p = result?.product;
  return (
    <Box p={{ xs: 0, sm: 1 }} maxWidth={640}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton onClick={() => navigate('/products')}><ArrowBack /></IconButton>
        <Typography variant="h5" fontWeight={800} flex={1}>Scanner</Typography>
        <Button variant="contained" startIcon={<QrCodeScanner />} onClick={() => setOpen(true)}>Scanner</Button>
      </Stack>

      <TextField fullWidth size="small" label="Ou tapez / douchette : code-barres, référence, lot"
        value={manual} onChange={(e) => setManual(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && manual.trim()) { lookup(manual.trim()); setManual(''); } }}
        sx={{ mb: 2 }} />

      {unknown && (
        <Alert severity="warning" action={<Button color="inherit" startIcon={<LinkIcon />} onClick={() => setLinkOpen(true)}>Associer</Button>}>
          Code <strong>{unknown}</strong> inconnu. Associez-le à un produit pour le retrouver au prochain scan.
        </Alert>
      )}

      {p && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800}>{p.name}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {p.reference}{p.barcode ? ` · ${p.barcode}` : ''}{p.category ? ` · ${p.category}` : ''}
            </Typography>
            <Stack direction="row" spacing={1} my={1.5} flexWrap="wrap" useFlexGap>
              <Chip label={`Stock : ${p.stock}`} color={p.stock <= 0 ? 'error' : p.is_low_stock ? 'warning' : 'success'} />
              <Chip label={`Prix : ${format(parseFloat(p.price))}`} variant="outlined" />
              {result.batch && (
                <Chip label={`Lot ${result.batch.batch_number} : ${result.batch.quantity}${result.batch.expiration_date ? ` · exp. ${new Date(result.batch.expiration_date).toLocaleDateString('fr-FR')}` : ''}`}
                  color={result.batch.is_expired ? 'error' : 'default'} />
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" startIcon={<Inventory2 />} onClick={() => navigate(`/products/${p.id}`)}>Fiche produit</Button>
              <Button variant="outlined" startIcon={<AddBox />} onClick={() => navigate(`/products/reception?product=${p.id}`)}>Réception</Button>
              <Button variant="outlined" startIcon={<LocalPrintshop />} onClick={() => navigate(`/products/labels?product=${p.id}`)}>Étiquettes</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <CameraScanner open={open} onClose={() => setOpen(false)} onDetected={lookup} />

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Associer le code {unknown}</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={options} getOptionLabel={(o) => `${o.name} (${o.reference || ''})`}
            onInputChange={(_, v) => searchProducts(v)} onChange={(_, v) => setTarget(v)}
            renderInput={(params) => <TextField {...params} label="Produit" sx={{ mt: 1 }} autoFocus />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={!target} onClick={link}>Associer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
