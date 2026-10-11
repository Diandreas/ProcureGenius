import React, { useEffect, useState } from 'react';
import {
  Autocomplete, Box, Button, Card, CardContent, FormControlLabel, IconButton, MenuItem, Select, Stack,
  Switch, TextField, Typography, FormControl, InputLabel,
} from '@mui/material';
import { ArrowBack, Delete, LocalPrintshop } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { productsAPI } from '../../services/api';
import useCurrency from '../../hooks/useCurrency';

// Formats de planche : étiquettes A4 adhésives courantes et étiquette unique (imprimante thermique)
const FORMATS = {
  a4_24: { label: 'A4 — 24 étiquettes (63,5 × 38 mm)', cols: 3, w: 63.5, h: 38, page: 'A4', margin: '12mm 7mm' },
  a4_65: { label: 'A4 — 65 petites étiquettes (38 × 21 mm)', cols: 5, w: 38, h: 21, page: 'A4', margin: '10mm 5mm' },
  thermal: { label: 'Thermique — 50 × 30 mm (une par étiquette)', cols: 1, w: 50, h: 30, page: '50mm 30mm', margin: '0' },
};

/**
 * Étiquettes à QR code : le QR contient la référence du produit (et « |LOT » pour un lot), relue
 * par le scanner de Procura en inventaire, réception ou recherche. Générées dans le navigateur
 * et imprimées avec l'imprimante de l'appareil.
 */
export default function StockLabels() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { format } = useCurrency();
  const [items, setItems] = useState([]);
  const [options, setOptions] = useState([]);
  const [fmt, setFmt] = useState('a4_24');
  const [showPrice, setShowPrice] = useState(true);
  const [qr, setQr] = useState({});

  useEffect(() => {
    const pid = params.get('product');
    if (pid) productsAPI.get(pid).then((r) => setItems([{ product: r.data, copies: 1 }])).catch(() => {});
  }, [params]);

  // QR de chaque produit (data URL), recalculé quand la liste change
  useEffect(() => {
    let alive = true;
    Promise.all(items.map(async ({ product }) => [product.id, await QRCode.toDataURL(product.reference || product.id, { margin: 0, width: 240 })]))
      .then((pairs) => { if (alive) setQr(Object.fromEntries(pairs)); });
    return () => { alive = false; };
  }, [items]);

  const search = async (q) => {
    if (q.length < 2) return;
    const r = await productsAPI.list({ search: q, page_size: 20 });
    setOptions(r.data.results || r.data);
  };
  const add = (p) => { if (p && !items.some((i) => i.product.id === p.id)) setItems((x) => [...x, { product: p, copies: 1 }]); };

  const f = FORMATS[fmt];
  const labels = items.flatMap(({ product, copies }) => Array.from({ length: Math.max(1, copies) }, () => product));

  const print = () => {
    const css = `@page { size: ${f.page}; margin: ${f.margin}; }
      body { margin: 0; font-family: Inter, Arial, sans-serif; }
      .grid { display: grid; grid-template-columns: repeat(${f.cols}, ${f.w}mm); gap: 0; }
      .lab { width: ${f.w}mm; height: ${f.h}mm; box-sizing: border-box; padding: 1.5mm; display: flex; gap: 1.5mm;
             align-items: center; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
      .lab img { height: ${Math.min(f.h - 3, f.w * 0.45)}mm; width: auto; }
      .txt { min-width: 0; font-size: ${f.h < 25 ? 6 : 8}pt; line-height: 1.15; }
      .name { font-weight: 700; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .ref { color: #444; } .price { font-weight: 800; font-size: ${f.h < 25 ? 7 : 10}pt; margin-top: 1mm; }`;
    const html = labels.map((p) => `<div class="lab"><img src="${qr[p.id] || ''}"/><div class="txt">
      <div class="name">${(p.name || '').replace(/</g, '&lt;')}</div><div class="ref">${p.reference || ''}</div>
      ${showPrice ? `<div class="price">${format(parseFloat(p.price || 0))}</div>` : ''}</div></div>`).join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Étiquettes</title><style>${css}</style></head>
      <body><div class="grid">${html}</div><script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  };

  return (
    <Box p={{ xs: 0, sm: 1 }} maxWidth={820}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton onClick={() => navigate('/products')}><ArrowBack /></IconButton>
        <Typography variant="h5" fontWeight={800}>Étiquettes</Typography>
      </Stack>
      <Card sx={{ borderRadius: 3, mb: 2 }}>
        <CardContent>
          <Autocomplete options={options} getOptionLabel={(o) => `${o.name} (${o.reference || ''})`}
            onInputChange={(_, v) => search(v)} onChange={(_, v) => add(v)} value={null}
            renderInput={(p) => <TextField {...p} label="Ajouter un produit" />} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2} alignItems={{ sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 300 }}>
              <InputLabel id="lab-format">Format</InputLabel>
              <Select labelId="lab-format" label="Format" value={fmt} onChange={(e) => setFmt(e.target.value)}>
                {Object.entries(FORMATS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />} label="Afficher le prix" />
          </Stack>
        </CardContent>
      </Card>

      {items.map((it, i) => (
        <Card key={it.product.id} sx={{ mb: 1, borderRadius: 2 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 }, display: 'flex', alignItems: 'center', gap: 2 }}>
            {qr[it.product.id] && <img src={qr[it.product.id]} alt="" width={48} height={48} />}
            <Box flex={1} minWidth={0}>
              <Typography fontWeight={700} noWrap>{it.product.name}</Typography>
              <Typography variant="caption" color="text.secondary">{it.product.reference} · {format(parseFloat(it.product.price || 0))}</Typography>
            </Box>
            <TextField size="small" type="number" label="Copies" sx={{ width: 90 }} value={it.copies}
              inputProps={{ min: 1, max: 500 }}
              onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, copies: Math.min(500, parseInt(e.target.value, 10) || 1) } : y)))} />
            <IconButton onClick={() => setItems((x) => x.filter((_, j) => j !== i))} aria-label="Retirer"><Delete /></IconButton>
          </CardContent>
        </Card>
      ))}

      <Button variant="contained" size="large" startIcon={<LocalPrintshop />} disabled={!labels.length} onClick={print} sx={{ mt: 1 }}>
        Imprimer {labels.length ? `${labels.length} étiquette(s)` : ''}
      </Button>
    </Box>
  );
}
