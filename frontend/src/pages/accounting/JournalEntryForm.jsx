import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, IconButton, Alert, CircularProgress, Card, CardContent, Divider, Chip,
} from '@mui/material';
import { Add, Delete, Save, CheckCircle, Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';
import useCurrentUser from '../../hooks/useCurrentUser';

const EMPTY_LINE = { account: '', description: '', debit: '', credit: '' };

export default function JournalEntryForm() {
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    journal: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
  const { isAdmin, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    Promise.all([accountingAPI.getJournals(), accountingAPI.getAccounts({ active: 'true' })])
      .then(([j, a]) => { setJournals(j.data); setAccounts(a.data); });
  }, []);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const diff = totalDebit - totalCredit;

  const setLine = (i, key, value) => {
    const updated = lines.map((l, idx) => idx === i ? { ...l, [key]: value } : l);
    if (key === 'debit' && value) updated[i].credit = '';
    if (key === 'credit' && value) updated[i].debit = '';
    setLines(updated);
  };

  const addLine = () => setLines((l) => [...l, { ...EMPTY_LINE }]);
  const removeLine = (i) => setLines((l) => l.filter((_, idx) => idx !== i));

  const buildPayload = () => ({
    ...form,
    lines: lines
      .filter((l) => l.account)
      .map((l) => ({
        account: l.account,
        description: l.description,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
  });

  const validate = () => {
    if (!form.journal) { enqueueSnackbar('Journal obligatoire', { variant: 'error' }); return false; }
    if (!form.description.trim()) { enqueueSnackbar('Libellé obligatoire', { variant: 'error' }); return false; }
    const validLines = lines.filter((l) => l.account && (parseFloat(l.debit) || parseFloat(l.credit)));
    if (validLines.length < 2) { enqueueSnackbar('Minimum 2 lignes avec montant', { variant: 'error' }); return false; }
    return true;
  };

  const handleSave = async (post = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await accountingAPI.createEntry(buildPayload());
      const entry = res.data;
      if (post) {
        await accountingAPI.postEntry(entry.id);
        enqueueSnackbar('Écriture créée et validée', { variant: 'success' });
      } else {
        enqueueSnackbar('Écriture sauvegardée en brouillon', { variant: 'success' });
      }
      navigate(`/accounting/entries/${entry.id}`);
    } catch (err) {
      const msg = err?.response?.data?.error || JSON.stringify(err?.response?.data) || 'Erreur';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (userLoading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

  if (!isAdmin) {
    return (
      <Box p={3} maxWidth={960}>
        <AccountingNav title="Nouvelle Écriture Comptable" subtitle="Saisie en partie double" />
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
          <Lock sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary">Accès restreint</Typography>
          <Typography variant="body2" color="text.disabled" textAlign="center">
            Seul l'administrateur peut créer des écritures comptables manuelles.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/accounting/entries')} sx={{ mt: 1 }}>
            Retour aux écritures
          </Button>
        </Box>
      </Box>
    );
  }

  if (!userLoading && isAdmin && journals.length === 0) {
    return (
      <Box p={3} maxWidth={960}>
        <AccountingNav title="Nouvelle Écriture Comptable" subtitle="Saisie en partie double" />
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
          <Typography variant="h6" color="text.secondary">Aucun journal comptable configuré</Typography>
          <Typography variant="body2" color="text.disabled" textAlign="center">
            Vous devez d'abord créer au moins un journal avant de saisir des écritures.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/accounting/journals')} sx={{ mt: 1 }}>
            Créer un journal
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={960}>
      <AccountingNav title="Nouvelle Écriture Comptable" subtitle="Saisie en partie double" />

      {/* En-tête */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl required sx={{ minWidth: 200 }}>
              <InputLabel>Journal *</InputLabel>
              <Select value={form.journal} onChange={(e) => setForm((f) => ({ ...f, journal: e.target.value }))} label="Journal *">
                {journals.map((j) => <MenuItem key={j.id} value={j.id}>{j.code} — {j.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Date *" type="date" value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
            <TextField label="Libellé *" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              sx={{ flex: 1, minWidth: 240 }} />
            <TextField label="Référence" value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              sx={{ width: 180 }} />
          </Box>
        </CardContent>
      </Card>

      {/* Lignes */}
      <Typography variant="subtitle1" fontWeight={600} mb={1}>Lignes d'écriture</Typography>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ minWidth: 240 }}><strong>Compte</strong></TableCell>
              <TableCell><strong>Libellé</strong></TableCell>
              <TableCell align="right" sx={{ width: 140 }}><strong>Débit</strong></TableCell>
              <TableCell align="right" sx={{ width: 140 }}><strong>Crédit</strong></TableCell>
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Select value={line.account} onChange={(e) => setLine(i, 'account', e.target.value)}
                    displayEmpty size="small" fullWidth
                    renderValue={(v) => {
                      if (!v) return <Typography color="text.secondary" variant="body2">Sélectionner...</Typography>;
                      const acc = accounts.find((a) => a.id === v);
                      return acc ? `${acc.code} — ${acc.name}` : v;
                    }}>
                    {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>)}
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField value={line.description} onChange={(e) => setLine(i, 'description', e.target.value)}
                    size="small" fullWidth placeholder="Libellé ligne" />
                </TableCell>
                <TableCell>
                  <TextField value={line.debit} onChange={(e) => setLine(i, 'debit', e.target.value)}
                    size="small" type="number" inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                    placeholder="0.00" />
                </TableCell>
                <TableCell>
                  <TextField value={line.credit} onChange={(e) => setLine(i, 'credit', e.target.value)}
                    size="small" type="number" inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                    placeholder="0.00" />
                </TableCell>
                <TableCell>
                  {lines.length > 2 && (
                    <IconButton size="small" color="error" onClick={() => removeLine(i)}><Delete fontSize="small" /></IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Button startIcon={<Add />} onClick={addLine} size="small" sx={{ mb: 3 }}>Ajouter une ligne</Button>

      {/* Totaux */}
      <Box display="flex" justifyContent="flex-end" mb={3}>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, minWidth: 260 }}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">Total Débit</Typography>
            <Typography variant="body2" fontWeight={600} color="primary.main">{format(totalDebit)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Total Crédit</Typography>
            <Typography variant="body2" fontWeight={600} color="secondary.main">{format(totalCredit)}</Typography>
          </Box>
          <Divider />
          <Box display="flex" justifyContent="space-between" mt={1} alignItems="center">
            <Typography variant="body2">Écart</Typography>
            {isBalanced ? (
              <Chip label="Équilibrée ✓" color="success" size="small" />
            ) : (
              <Chip label={`Écart: ${diff > 0 ? '+' : ''}${format(diff)}`} color="error" size="small" />
            )}
          </Box>
        </Box>
      </Box>

      {!isBalanced && totalDebit > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          L'écriture doit être équilibrée pour être validée. Écart : {format(Math.abs(diff))}.
        </Alert>
      )}

      <Box display="flex" gap={2}>
        <Button variant="outlined" onClick={() => navigate('/accounting/entries')}>Annuler</Button>
        <Button variant="outlined" startIcon={<Save />} onClick={() => handleSave(false)} disabled={saving}>
          Sauvegarder (brouillon)
        </Button>
        <Button variant="contained" color="success" startIcon={<CheckCircle />}
          onClick={() => handleSave(true)} disabled={saving || !isBalanced}>
          {saving ? <CircularProgress size={20} /> : 'Sauvegarder & Valider'}
        </Button>
      </Box>
    </Box>
  );
}
