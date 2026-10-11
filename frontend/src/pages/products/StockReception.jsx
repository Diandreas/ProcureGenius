import React, { useEffect, useState } from 'react';
import {
  Autocomplete, Box, Button, Card, CardContent, FormControl, Grid, IconButton, InputLabel, MenuItem,
  Select, Stack, TextField, Typography, List, ListItem, ListItemText,
} from '@mui/material';
import { ArrowBack, QrCodeScanner, AddBox } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { stockAPI, productsAPI, warehousesAPI } from '../../services/api';
import CameraScanner from '../../components/stock/CameraScanner';

/**
 * Réception de marchandise hors bon de commande (achat au marché, livraison sans BC, stock initial).
 * Scanner ou chercher le produit, saisir la quantité ; lot et péremption si le produit en a.
 */
export default function StockReception() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const [product, setProduct] = useState(null);
  const [options, setOptions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ quantity: '', batch_number: '', expiration_date: '', unit_cost: '', warehouse_id: '', reference: '' });
  const [scanOpen, setScanOpen] = useState(false);
  const [done, setDone] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    warehousesAPI.list().then((r) => setWarehouses(r.data.results || r.data)).catch(() => {});
    const pid = params.get('product');
    if (pid) productsAPI.get(pid).then((r) => setProduct(r.data)).catch(() => {});
  }, [params]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const search = async (q) => {
    if (q.length < 2) return;
    const r = await productsAPI.list({ search: q, page_size: 20 });
    setOptions((r.data.results || r.data).filter((p) => p.product_type === 'physical' || !p.product_type));
  };
  const onScan = async (code) => {
    setScanOpen(false);
    try {
      const r = await stockAPI.scan(code);
      const full = await productsAPI.get(r.data.product.id);
      setProduct(full.data);
      if (r.data.gs1?.lot) set('batch_number', r.data.gs1.lot);
      if (r.data.gs1?.expiry_date) set('expiration_date', r.data.gs1.expiry_date);
    } catch {
      enqueueSnackbar(`Code inconnu : ${code}`, { variant: 'warning' });
    }
  };

  const submit = async () => {
    if (!product || !(parseInt(form.quantity, 10) > 0)) {
      enqueueSnackbar('Produit et quantité obligatoires', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const payload = { product_id: product.id, quantity: parseInt(form.quantity, 10) };
      ['batch_number', 'expiration_date', 'unit_cost', 'warehouse_id', 'reference'].forEach((k) => { if (form[k]) payload[k] = form[k]; });
      const r = await stockAPI.receive(payload);
      setDone((d) => [{ name: r.data.product.name, qty: payload.quantity, stock: r.data.product.stock, lot: r.data.batch }, ...d]);
      enqueueSnackbar(`${payload.quantity} × ${r.data.product.name} entré(s) en stock`, { variant: 'success' });
      setProduct(null);
      setForm((f) => ({ ...f, quantity: '', batch_number: '', expiration_date: '', unit_cost: '' }));
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Réception impossible', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={{ xs: 0, sm: 1 }} maxWidth={720}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton onClick={() => navigate('/products')}><ArrowBack /></IconButton>
        <Typography variant="h5" fontWeight={800}>Réception de marchandise</Typography>
      </Stack>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} mb={2}>
            <Autocomplete sx={{ flex: 1 }} options={options} value={product}
              getOptionLabel={(o) => (o ? `${o.name} (${o.reference || ''})` : '')}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onInputChange={(_, v) => search(v)} onChange={(_, v) => setProduct(v)}
              renderInput={(p) => <TextField {...p} label="Produit" />} />
            <Button variant="outlined" onClick={() => setScanOpen(true)} aria-label="Scanner"><QrCodeScanner /></Button>
          </Stack>
          {product && (
            <Typography variant="body2" color="text.secondary" mb={2}>Stock actuel : <strong>{product.stock_quantity}</strong></Typography>
          )}
          <Grid container spacing={2}>
            <Grid item xs={6}><TextField fullWidth label="Quantité reçue" type="number" value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)} inputProps={{ min: 1, inputMode: 'numeric' }} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Prix d'achat unitaire (optionnel)" type="number" value={form.unit_cost}
              onChange={(e) => set('unit_cost', e.target.value)} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="N° de lot (optionnel)" value={form.batch_number}
              onChange={(e) => set('batch_number', e.target.value)} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Péremption (optionnel)" type="date" InputLabelProps={{ shrink: true }}
              value={form.expiration_date} onChange={(e) => set('expiration_date', e.target.value)} /></Grid>
            {warehouses.length > 0 && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="rec-depot">Entrepôt</InputLabel>
                  <Select labelId="rec-depot" label="Entrepôt" value={form.warehouse_id} onChange={(e) => set('warehouse_id', e.target.value)}>
                    <MenuItem value="">Par défaut</MenuItem>
                    {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6}><TextField fullWidth label="Bon de livraison / référence (optionnel)" value={form.reference}
              onChange={(e) => set('reference', e.target.value)} /></Grid>
          </Grid>
          <Button variant="contained" size="large" startIcon={<AddBox />} sx={{ mt: 2 }} onClick={submit} disabled={saving}>
            Entrer en stock
          </Button>
        </CardContent>
      </Card>
      {done.length > 0 && (
        <Card sx={{ mt: 2, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Reçu dans cette session</Typography>
            <List dense>
              {done.map((d, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText primary={`${d.qty} × ${d.name}${d.lot ? ` (lot ${d.lot})` : ''}`} secondary={`Nouveau stock : ${d.stock}`} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
      <CameraScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={onScan} />
    </Box>
  );
}
