import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Alert,
} from '@mui/material';
import { Add, Edit, Delete, AutoFixHigh } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import AccountingNav from './AccountingNav';

const TYPE_COLORS = {
  asset: 'primary', liability: 'warning', equity: 'secondary', revenue: 'success', expense: 'error',
};
const TYPE_LABELS = {
  asset: 'Actif', liability: 'Passif', equity: 'Capitaux Propres', revenue: 'Produit', expense: 'Charge',
};
const EMPTY_FORM = { code: '', name: '', account_type: 'asset', parent: '', notes: '' };

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleInitSetup = async () => {
    setInitializing(true);
    try {
      const r = await accountingAPI.initSetup();
      enqueueSnackbar(
        `Plan comptable initialisé — ${r.data.accounts_created} comptes et ${r.data.journals_created} journaux créés`,
        { variant: 'success' }
      );
      load();
    } catch {
      enqueueSnackbar('Erreur lors de l\'initialisation', { variant: 'error' });
    } finally {
      setInitializing(false);
    }
  };

  const load = () => {
    setLoading(true);
    accountingAPI.getAccounts({ active: 'true' })
      .then((r) => { setAccounts(r.data); setError(null); })
      .catch(() => setError('Erreur chargement du plan comptable'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = accounts.filter((a) => {
    if (filterType && a.account_type !== filterType) return false;
    if (search && !`${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (acc) => {
    setEditing(acc);
    setForm({ code: acc.code, name: acc.name, account_type: acc.account_type, parent: acc.parent || '', notes: acc.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      enqueueSnackbar('Code et intitulé obligatoires', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, parent: form.parent || null };
      if (editing) {
        await accountingAPI.updateAccount(editing.id, payload);
        enqueueSnackbar('Compte mis à jour', { variant: 'success' });
      } else {
        await accountingAPI.createAccount(payload);
        enqueueSnackbar('Compte créé', { variant: 'success' });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.code?.[0] || 'Erreur';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Supprimer le compte ${acc.code} — ${acc.name} ?`)) return;
    try {
      await accountingAPI.deleteAccount(acc.id);
      enqueueSnackbar('Compte supprimé', { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Erreur suppression', { variant: 'error' });
    }
  };

  return (
    <Box p={3}>
      <AccountingNav
        title="Plan Comptable"
        subtitle={`${accounts.length} comptes enregistrés`}
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>
            Nouveau compte
          </Button>
        }
      />

      {/* Filtres */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField size="small" placeholder="Rechercher code ou intitulé..." value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 240 }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Type de compte</InputLabel>
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} label="Type de compte">
            <MenuItem value="">Tous</MenuItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Banner : plan comptable vide → proposer l'initialisation */}
      {!loading && !error && accounts.length === 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={initializing ? <CircularProgress size={14} color="inherit" /> : <AutoFixHigh />}
              onClick={handleInitSetup}
              disabled={initializing}
            >
              Initialiser
            </Button>
          }
        >
          <strong>Aucun plan comptable trouvé.</strong> Cliquez sur "Initialiser" pour créer automatiquement
          les comptes et journaux standards (modifiables ensuite selon vos besoins).
        </Alert>
      )}

      {!loading && !error && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Intitulé</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Compte parent</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((acc) => (
                <TableRow key={acc.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{acc.code}</Typography>
                  </TableCell>
                  <TableCell>{acc.name}</TableCell>
                  <TableCell>
                    <Chip label={TYPE_LABELS[acc.account_type]} size="small" color={TYPE_COLORS[acc.account_type] || 'default'} />
                  </TableCell>
                  <TableCell>
                    {acc.parent
                      ? accounts.find((a) => a.id === acc.parent)?.code || '—'
                      : <Typography variant="caption" color="text.secondary">Racine</Typography>}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => openEdit(acc)}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                    {acc.has_transactions ? (
                      <Tooltip title="Impossible de supprimer : ce compte a des transactions associées">
                        <span>
                          <IconButton size="small" color="error" disabled><Delete fontSize="small" /></IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Supprimer">
                        <IconButton size="small" color="error" onClick={() => handleDelete(acc)}><Delete fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>Aucun compte trouvé</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Modifier le compte' : 'Nouveau compte'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <Box display="flex" gap={2}>
              <TextField label="Numéro *" value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                sx={{ width: 150 }} placeholder="ex: 7100" />
              <TextField label="Intitulé *" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Type *</InputLabel>
              <Select value={form.account_type} onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
                label="Type *">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Compte parent (optionnel)</InputLabel>
              <Select value={form.parent} onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
                label="Compte parent (optionnel)">
                <MenuItem value="">— Aucun (compte racine) —</MenuItem>
                {accounts.filter((a) => !editing || a.id !== editing.id).map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Notes" value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} multiline rows={2} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (editing ? 'Mettre à jour' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
