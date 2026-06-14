import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Alert,
  Card, CardContent, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import { Add, Edit, Delete, AutoFixHigh } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import AccountingNav from './AccountingNav';

const TYPE_COLORS = {
  asset: 'primary', liability: 'warning', equity: 'secondary', revenue: 'success', expense: 'error',
};
const TYPE_LABELS = {
  asset: 'Actif', liability: 'Passif', equity: 'Capitaux Propres', revenue: 'Produit', expense: 'Charge',
};
// Ordre d'affichage des classes de comptes (présentation standard d'un plan comptable)
const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TYPE_SECTION_LABELS = {
  asset: 'Actif', liability: 'Passif', equity: 'Capitaux propres',
  revenue: 'Produits', expense: 'Charges',
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const neu = getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft');

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

  // Regroupe les comptes filtrés par classe, dans l'ordre comptable standard,
  // triés par code à l'intérieur de chaque classe.
  const grouped = TYPE_ORDER
    .map((t) => [t, filtered
      .filter((a) => a.account_type === t)
      .sort((a, b) => String(a.code).localeCompare(String(b.code)))])
    .filter(([, list]) => list.length > 0);

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav
        title="Plan Comptable"
        subtitle={`${accounts.length} comptes enregistrés`}
        action={
          <Button variant="contained" startIcon={<Add />} size={isMobile ? 'small' : 'medium'} onClick={openAdd}>
            {isMobile ? 'Nouveau' : 'Nouveau compte'}
          </Button>
        }
      />

      {/* Filtres */}
      <Box display="flex" gap={1.5} mb={2} flexWrap="wrap">
        <TextField size="small" placeholder="Rechercher code ou intitulé..." value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ flex: '1 1 200px' }} />
        <FormControl size="small" sx={{ flex: '1 1 160px' }}>
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
        filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            Aucun compte trouvé
          </Typography>
        ) : isMobile ? (
          /* ── Vue mobile : cartes groupées par classe ── */
          <Stack spacing={2.5}>
            {grouped.map(([type, list]) => (
              <Box key={type}>
                <Box display="flex" alignItems="center" gap={1} mb={1} px={0.5}>
                  <Typography variant="overline" fontWeight={700} color="text.secondary">
                    {TYPE_SECTION_LABELS[type]}
                  </Typography>
                  <Chip label={list.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                </Box>
                <Stack spacing={1.25}>
                  {list.map((acc) => (
                    <Card key={acc.id} elevation={0} sx={{ border: 'none', borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: neu }}>
                      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                          <Box minWidth={0} flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                              <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{acc.code}</Typography>
                              <Chip label={TYPE_LABELS[acc.account_type]} size="small" color={TYPE_COLORS[acc.account_type] || 'default'} />
                            </Box>
                            <Typography variant="body2" fontWeight={600}>{acc.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {acc.parent
                                ? `Parent : ${accounts.find((a) => a.id === acc.parent)?.code || '—'}`
                                : 'Compte racine'}
                            </Typography>
                          </Box>
                          <Box flexShrink={0}>
                            <IconButton size="small" onClick={() => openEdit(acc)}><Edit fontSize="small" /></IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={acc.has_transactions}
                              onClick={() => handleDelete(acc)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          /* ── Vue desktop : tableau groupé par classe ── */
          <TableContainer component={Paper} elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 600 }}>
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
                {grouped.map(([type, list]) => (
                  <React.Fragment key={type}>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ bgcolor: 'action.hover', py: 0.75 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                          {TYPE_SECTION_LABELS[type]} · {list.length}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {list.map((acc) => (
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
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
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
