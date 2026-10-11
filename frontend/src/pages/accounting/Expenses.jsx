import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Select, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
  useMediaQuery, useTheme, CircularProgress,
} from '@mui/material';
import { Add, CameraAlt, Delete, Edit, ReceiptLong } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import AccountingNav from './AccountingNav';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import { PAYMENT_METHODS, paymentMethodLabel } from '../../constants/paymentMethods';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = {
  date: today(), category: 'exp_other', description: '', supplier_name: '', reference: '',
  amount: '', tax_amount: '', is_paid: true, payment_method: 'cash', notes: '', receipt: null,
};
const SOURCE_LABEL = { manual: 'Saisie', ai_chat: 'Assistant IA', ai_import: 'Photo (IA)' };

/**
 * Dépenses : loyer, électricité, transport, salaires, factures fournisseurs, reçus.
 * Chaque dépense passe son écriture comptable automatiquement (compte de charge selon la catégorie).
 * Le plus rapide : « Importer un reçu » (photo analysée par l'IA) ou le dire à l'assistant.
 */
export default function Expenses() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: '0', by_category: [] });
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        accountingAPI.getExpenses(filter ? { category: filter } : {}),
        accountingAPI.getExpenseSummary(),
      ]);
      setItems(list.data.results || list.data);
      setSummary(sum.data);
    } catch {
      enqueueSnackbar('Impossible de charger les dépenses', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filter, enqueueSnackbar]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    accountingAPI.getExpenseCategories().then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.description.trim() || !(parseFloat(form.amount) > 0)) {
      enqueueSnackbar('Libellé et montant obligatoires', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      ['date', 'category', 'description', 'supplier_name', 'reference', 'payment_method', 'notes'].forEach((k) => fd.append(k, form[k] || ''));
      fd.append('amount', form.amount);
      fd.append('tax_amount', form.tax_amount || '0');
      fd.append('is_paid', form.is_paid ? 'true' : 'false');
      if (form.receipt instanceof File) fd.append('receipt', form.receipt);
      if (form.id) await accountingAPI.updateExpense(form.id, fd);
      else await accountingAPI.createExpense(fd);
      enqueueSnackbar(form.id ? 'Dépense modifiée — écriture mise à jour' : 'Dépense enregistrée — écriture passée', { variant: 'success' });
      setForm(null);
      load();
    } catch (e) {
      const d = e.response?.data;
      enqueueSnackbar(d?.detail || d?.amount?.[0] || d?.tax_amount?.[0] || 'Enregistrement impossible', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (exp) => {
    if (!window.confirm(`Supprimer « ${exp.description} » ? Son écriture comptable sera annulée.`)) return;
    try {
      await accountingAPI.deleteExpense(exp.id);
      enqueueSnackbar('Dépense supprimée, écriture annulée', { variant: 'success' });
      load();
    } catch {
      enqueueSnackbar('Suppression impossible', { variant: 'error' });
    }
  };

  const edit = (exp) => setForm({
    ...EMPTY, ...exp, amount: exp.amount, tax_amount: exp.tax_amount === '0.00' ? '' : exp.tax_amount, receipt: null,
  });

  const openImport = () => navigate('/ai-chat/document-import?type=expense');
  const openNew = () => setForm({ ...EMPTY });
  const actions = (
    <Stack direction="row" spacing={1}>
      <Button variant="outlined" startIcon={<CameraAlt />} onClick={openImport}>Importer un reçu (IA)</Button>
      <Button variant="contained" startIcon={<Add />} onClick={openNew}>Nouvelle dépense</Button>
    </Stack>
  );
  // sur téléphone, l'en-tête n'a la place que pour deux icônes
  const headerActions = isMobile ? (
    <Stack direction="row" spacing={0.5}>
      <IconButton color="primary" onClick={openImport} aria-label="Importer un reçu"><CameraAlt /></IconButton>
      <IconButton color="primary" onClick={openNew} aria-label="Nouvelle dépense"><Add /></IconButton>
    </Stack>
  ) : actions;

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav title="Dépenses" subtitle="Loyer, transport, salaires, factures fournisseurs…" action={headerActions} />

      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">Ce mois-ci</Typography>
          <Typography variant="h4" fontWeight={800}>{format(parseFloat(summary.total || 0))}</Typography>
          <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
            <Chip label="Toutes" color={!filter ? 'primary' : 'default'} onClick={() => setFilter('')} />
            {summary.by_category.map((c) => (
              <Chip key={c.category} label={`${c.label} · ${format(parseFloat(c.total))}`}
                color={filter === c.category ? 'primary' : 'default'}
                onClick={() => setFilter(filter === c.category ? '' : c.category)} />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ReceiptLong sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography variant="h6" mt={1}>Aucune dépense</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Photographiez un reçu, ou dites à l'assistant : « J'ai payé le loyer 150 000 par Orange Money ».
            </Typography>
            {actions}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {items.map((e) => (
            <Card key={e.id} sx={{ borderRadius: 3 }} onClick={() => edit(e)}>
              <CardContent sx={{ py: 1.5 }}>
                <Box display="flex" justifyContent="space-between" gap={1}>
                  <Box minWidth={0}>
                    <Typography fontWeight={700} noWrap>{e.description}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(e.date).toLocaleDateString('fr-FR')} · {e.category_display}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography fontWeight={800}>{format(parseFloat(e.amount))}</Typography>
                    <Chip size="small" label={e.is_paid ? paymentMethodLabel(e.payment_method) : 'À payer'}
                      color={e.is_paid ? 'default' : 'warning'} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Libellé</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell>Fournisseur</TableCell>
                <TableCell>Paiement</TableCell>
                <TableCell align="right">Montant</TableCell>
                <TableCell>Écriture</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{new Date(e.date).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>
                    {e.description}
                    {e.source !== 'manual' && <Chip size="small" label={SOURCE_LABEL[e.source]} sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>{e.category_display} <Typography component="span" variant="caption" color="text.secondary">({e.account_code})</Typography></TableCell>
                  <TableCell>{e.supplier_name || '—'}</TableCell>
                  <TableCell>
                    {e.is_paid ? paymentMethodLabel(e.payment_method) : <Chip size="small" color="warning" label="À payer" />}
                  </TableCell>
                  <TableCell align="right"><strong>{format(parseFloat(e.amount))}</strong></TableCell>
                  <TableCell>
                    {e.journal_entry
                      ? <Button size="small" onClick={() => navigate(`/accounting/entries/${e.journal_entry}`)}>{e.entry_number}</Button>
                      : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {e.receipt_url && (
                      <Tooltip title="Voir le reçu"><IconButton size="small" href={e.receipt_url} target="_blank"><ReceiptLong fontSize="small" /></IconButton></Tooltip>
                    )}
                    <Tooltip title="Modifier"><IconButton size="small" onClick={() => edit(e)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Supprimer"><IconButton size="small" onClick={() => remove(e)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!form} onClose={() => !saving && setForm(null)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        {form && (
          <>
            <DialogTitle>{form.id ? 'Modifier la dépense' : 'Nouvelle dépense'}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Libellé" value={form.description} autoFocus
                    onChange={(e) => set('description', e.target.value)} placeholder="Ex : Loyer octobre, Carburant…" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Montant payé (TTC)" type="number" value={form.amount}
                    onChange={(e) => set('amount', e.target.value)} inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Date" type="date" value={form.date} InputLabelProps={{ shrink: true }}
                    onChange={(e) => set('date', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="exp-categorie">Catégorie</InputLabel>
                    <Select labelId="exp-categorie" label="Catégorie" value={form.category} onChange={(e) => set('category', e.target.value)}>
                      {categories.map((c) => <MenuItem key={c.value} value={c.value}>{c.label} ({c.account_code})</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel control={<Switch checked={form.is_paid} onChange={(e) => set('is_paid', e.target.checked)} />}
                    label={form.is_paid ? 'Déjà payée' : 'À payer (facture fournisseur)'} />
                </Grid>
                {form.is_paid && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="exp-paiement">Payée par</InputLabel>
                      <Select labelId="exp-paiement" label="Payée par" value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
                        {PAYMENT_METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Fournisseur (optionnel)" value={form.supplier_name || ''}
                    onChange={(e) => set('supplier_name', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="dont TVA récupérable (optionnel)" type="number" value={form.tax_amount}
                    onChange={(e) => set('tax_amount', e.target.value)} inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={12}>
                  <Button component="label" variant="outlined" startIcon={<CameraAlt />}>
                    {form.receipt?.name || (form.receipt_url ? 'Remplacer le reçu' : 'Joindre la photo du reçu')}
                    <input hidden type="file" accept="image/*,application/pdf" capture="environment"
                      onChange={(e) => set('receipt', e.target.files?.[0] || null)} />
                  </Button>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setForm(null)} disabled={saving}>Annuler</Button>
              <Button variant="contained" onClick={save} disabled={saving}>{form.id ? 'Enregistrer' : 'Ajouter'}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
