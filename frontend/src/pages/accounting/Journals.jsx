import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, CircularProgress, Alert,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import AccountingNav from './AccountingNav';
import useCurrentUser from '../../hooks/useCurrentUser';

const JOURNAL_TYPES = [
  { value: 'sales', label: 'Journal des Ventes' },
  { value: 'purchases', label: 'Journal des Achats' },
  { value: 'cash', label: 'Journal de Caisse' },
  { value: 'bank', label: 'Journal de Banque' },
  { value: 'misc', label: 'Opérations Diverses' },
];

const TYPE_COLORS = {
  sales: 'success', purchases: 'warning', cash: 'info', bank: 'primary', misc: 'default',
};

const EMPTY_FORM = { code: '', name: '', journal_type: 'misc' };

export default function Journals() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useCurrentUser();

  const load = () => {
    setLoading(true);
    accountingAPI.getJournals()
      .then((r) => { setJournals(r.data); setError(null); })
      .catch(() => setError('Erreur chargement des journaux'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (j) => {
    setEditing(j);
    setForm({ code: j.code, name: j.name, journal_type: j.journal_type });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      enqueueSnackbar('Code et nom sont obligatoires', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await accountingAPI.updateJournal(editing.id, form);
        enqueueSnackbar('Journal modifié', { variant: 'success' });
      } else {
        await accountingAPI.createJournal(form);
        enqueueSnackbar('Journal créé', { variant: 'success' });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      const msg = err?.response?.data?.code?.[0] || err?.response?.data?.error || JSON.stringify(err?.response?.data) || 'Erreur';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (j) => {
    if (!window.confirm(`Supprimer le journal "${j.name}" ?`)) return;
    try {
      await accountingAPI.deleteJournal(j.id);
      enqueueSnackbar('Journal supprimé', { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Impossible de supprimer ce journal (il contient des écritures)', { variant: 'error' });
    }
  };

  return (
    <Box p={3}>
      <AccountingNav
        title="Journaux Comptables"
        subtitle={`${journals.length} journal(ux)`}
        action={isAdmin ? (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Nouveau journal
          </Button>
        ) : null}
      />

      {loading && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          {journals.length === 0 ? (
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="h6" color="text.secondary" mb={1}>Aucun journal créé</Typography>
              <Typography variant="body2" color="text.disabled" mb={2}>
                Les journaux sont nécessaires pour saisir des écritures comptables.
              </Typography>
              {isAdmin && (
                <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                  Créer le premier journal
                </Button>
              )}
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Nom</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {journals.map((j) => (
                    <TableRow key={j.id} hover>
                      <TableCell><Typography fontFamily="monospace" fontWeight={700}>{j.code}</Typography></TableCell>
                      <TableCell>{j.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={j.journal_type_display || JOURNAL_TYPES.find(t => t.value === j.journal_type)?.label || j.journal_type}
                          color={TYPE_COLORS[j.journal_type] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {isAdmin && (
                          <Box display="flex" gap={0.5} justifyContent="center">
                            <IconButton size="small" onClick={() => openEdit(j)}><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(j)}><Delete fontSize="small" /></IconButton>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Dialog création/modification */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Modifier le journal' : 'Nouveau journal'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Code *"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="Ex: VTE, ACH, CAI, BNQ, OD"
              inputProps={{ maxLength: 10 }}
              helperText="Court identifiant unique (max 10 caractères)"
            />
            <TextField
              label="Nom *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Journal des Ventes"
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={form.journal_type} label="Type" onChange={(e) => setForm((f) => ({ ...f, journal_type: e.target.value }))}>
                {JOURNAL_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (editing ? 'Modifier' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
