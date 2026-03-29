import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, IconButton, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import { Add, Visibility, CheckCircle, Cancel } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';
import useCurrentUser from '../../hooks/useCurrentUser';

const STATUS_COLORS = { draft: 'default', posted: 'success', cancelled: 'error' };
const STATUS_LABELS = { draft: 'Brouillon', posted: 'Validée', cancelled: 'Annulée' };
const SOURCE_LABELS = { manual: 'Saisie', invoice: 'Facture', payment: 'Paiement', purchase_order: 'Bon de cmd' };

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ journal: '', status: '', start_date: '', end_date: '', search: '' });
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
  const { isAdmin } = useCurrentUser();

  const load = (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.journal) params.journal = f.journal;
    if (f.status) params.status = f.status;
    if (f.start_date) params.start_date = f.start_date;
    if (f.end_date) params.end_date = f.end_date;
    if (f.search) params.search = f.search;
    accountingAPI.getEntries(params)
      .then((r) => { setEntries(r.data); setError(null); })
      .catch(() => setError('Erreur chargement des écritures'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    accountingAPI.getJournals().then((r) => setJournals(r.data));
    load();
  }, []);

  const setFilter = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    load(updated);
  };

  const handlePost = async (id) => {
    try {
      await accountingAPI.postEntry(id);
      enqueueSnackbar('Écriture validée', { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Erreur validation', { variant: 'error' });
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Annuler cette écriture ? Une contrepassation sera créée.')) return;
    try {
      await accountingAPI.cancelEntry(id);
      enqueueSnackbar('Écriture annulée', { variant: 'warning' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Erreur annulation', { variant: 'error' });
    }
  };

  return (
    <Box p={3}>
      <AccountingNav
        title="Écritures Comptables"
        subtitle={`${entries.length} écriture(s)`}
        action={isAdmin ? (
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/accounting/entries/new')}>
            Nouvelle écriture
          </Button>
        ) : null}
      />

      {/* Filtres */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField size="small" placeholder="Rechercher..." value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)} sx={{ minWidth: 200 }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Journal</InputLabel>
          <Select value={filters.journal} onChange={(e) => setFilter('journal', e.target.value)} label="Journal">
            <MenuItem value="">Tous</MenuItem>
            {journals.map((j) => <MenuItem key={j.id} value={j.id}>{j.code} — {j.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} label="Statut">
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="draft">Brouillon</MenuItem>
            <MenuItem value="posted">Validée</MenuItem>
            <MenuItem value="cancelled">Annulée</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="Du" InputLabelProps={{ shrink: true }}
          value={filters.start_date} onChange={(e) => setFilter('start_date', e.target.value)} />
        <TextField size="small" type="date" label="Au" InputLabelProps={{ shrink: true }}
          value={filters.end_date} onChange={(e) => setFilter('end_date', e.target.value)} />
      </Box>

      {loading && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>N° écriture</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Libellé</strong></TableCell>
                <TableCell><strong>Journal</strong></TableCell>
                <TableCell><strong>Source</strong></TableCell>
                <TableCell align="right"><strong>Montant</strong></TableCell>
                <TableCell><strong>Statut</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{e.entry_number}</Typography>
                  </TableCell>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>{e.description}</Typography>
                    {e.reference && <Typography variant="caption" color="text.secondary">{e.reference}</Typography>}
                  </TableCell>
                  <TableCell><Chip label={e.journal_code} size="small" variant="outlined" /></TableCell>
                  <TableCell><Typography variant="caption">{SOURCE_LABELS[e.source] || e.source}</Typography></TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>{format(parseFloat(e.total_debit || 0))}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[e.status]} size="small" color={STATUS_COLORS[e.status]} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Voir détail">
                      <IconButton size="small" onClick={() => navigate(`/accounting/entries/${e.id}`)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {e.status === 'draft' && (
                      <Tooltip title="Valider">
                        <IconButton size="small" color="success" onClick={() => handlePost(e.id)}>
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {e.status === 'posted' && (
                      <Tooltip title="Annuler (contrepassation)">
                        <IconButton size="small" color="error" onClick={() => handleCancel(e.id)}>
                          <Cancel fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>Aucune écriture trouvée</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
