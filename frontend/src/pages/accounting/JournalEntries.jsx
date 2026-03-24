import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, IconButton, Tooltip, CircularProgress, Alert,
  Card, CardContent, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import { Add, Visibility, CheckCircle, Cancel, OpenInNew } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';

const STATUS_COLORS = { draft: 'default', posted: 'success', cancelled: 'error' };
const STATUS_LABELS = { draft: 'Brouillon', posted: 'Validée', cancelled: 'Annulée' };
const SOURCE_LABELS = {
  manual: 'Saisie',
  invoice: 'Facture',
  invoice_reversal: 'Extourne',
  payment: 'Paiement',
  purchase_order: 'BC',
};
const SOURCE_COLORS = {
  manual: 'default',
  invoice: 'primary',
  invoice_reversal: 'warning',
  payment: 'success',
  purchase_order: 'info',
};
// Construit l'URL du document source pour navigation directe
function getSourceUrl(entry) {
  if (entry.source === 'invoice' || entry.source === 'invoice_reversal') {
    if (entry.source_invoice_id) return `/invoices/${entry.source_invoice_id}`;
    if (entry.reference) return `/invoices?search=${entry.reference}`;
  }
  if (entry.source === 'payment') {
    if (entry.source_invoice_id) return `/invoices/${entry.source_invoice_id}`;
  }
  if (entry.source === 'purchase_order') {
    return `/purchase-orders?search=${entry.reference || ''}`;
  }
  return null;
}

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ journal: '', status: '', start_date: '', end_date: '', search: '' });
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav
        title="Écritures Comptables"
        subtitle={`${entries.length} écriture(s)`}
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            size={isMobile ? 'small' : 'medium'}
            onClick={() => navigate('/accounting/entries/new')}
          >
            {isMobile ? 'Nouvelle' : 'Nouvelle écriture'}
          </Button>
        }
      />

      {/* Filtres */}
      <Box display="flex" gap={1.5} mb={2} flexWrap="wrap">
        <TextField
          size="small" placeholder="Rechercher..."
          value={filters.search} onChange={(e) => setFilter('search', e.target.value)}
          sx={{ flex: '1 1 160px' }}
        />
        <FormControl size="small" sx={{ flex: '1 1 140px' }}>
          <InputLabel>Journal</InputLabel>
          <Select value={filters.journal} onChange={(e) => setFilter('journal', e.target.value)} label="Journal">
            <MenuItem value="">Tous</MenuItem>
            {journals.map((j) => <MenuItem key={j.id} value={j.id}>{j.code} — {j.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: '1 1 120px' }}>
          <InputLabel>Statut</InputLabel>
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} label="Statut">
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="draft">Brouillon</MenuItem>
            <MenuItem value="posted">Validée</MenuItem>
            <MenuItem value="cancelled">Annulée</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="Du" InputLabelProps={{ shrink: true }}
          value={filters.start_date} onChange={(e) => setFilter('start_date', e.target.value)}
          sx={{ flex: '1 1 130px', maxWidth: 170 }}
        />
        <TextField size="small" type="date" label="Au" InputLabelProps={{ shrink: true }}
          value={filters.end_date} onChange={(e) => setFilter('end_date', e.target.value)}
          sx={{ flex: '1 1 130px', maxWidth: 170 }}
        />
      </Box>

      {loading && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        isMobile ? (
          /* ── Vue mobile : cartes ── */
          <Stack spacing={1.5}>
            {entries.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                Aucune écriture trouvée
              </Typography>
            ) : entries.map((e) => (
              <Card key={e.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box minWidth={0} flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                        <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="text.secondary">
                          {e.entry_number}
                        </Typography>
                        <Chip label={e.journal_code} size="small" variant="outlined" />
                        <Chip label={STATUS_LABELS[e.status]} size="small" color={STATUS_COLORS[e.status]} />
                      </Box>
                      <Typography variant="body2" fontWeight={600} noWrap>{e.description}</Typography>
                      {e.reference && (
                        <Typography variant="caption" color="text.secondary">{e.reference}</Typography>
                      )}
                    </Box>
                    <Box textAlign="right" ml={1} flexShrink={0}>
                      <Typography variant="body2" fontWeight={700}>{format(parseFloat(e.total_debit || 0))}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDate(e.date)}</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center"
                    sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}
                  >
                    {(() => {
                      const url = getSourceUrl(e);
                      return url ? (
                        <Chip
                          label={SOURCE_LABELS[e.source] || e.source}
                          size="small"
                          color={SOURCE_COLORS[e.source] || 'default'}
                          variant="outlined"
                          icon={<OpenInNew sx={{ fontSize: '0.75rem !important' }} />}
                          onClick={() => navigate(url)}
                          sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {SOURCE_LABELS[e.source] || e.source}
                        </Typography>
                      );
                    })()}
                    <Box>
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
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          /* ── Vue desktop : tableau ── */
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>N° écriture</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>Date</strong></TableCell>
                  <TableCell><strong>Libellé</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>Journal</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>Source</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>Montant</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>Statut</strong></TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>Actions</strong></TableCell>
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
                    <TableCell>
                      {(() => {
                        const url = getSourceUrl(e);
                        return url ? (
                          <Chip
                            label={SOURCE_LABELS[e.source] || e.source}
                            size="small"
                            color={SOURCE_COLORS[e.source] || 'default'}
                            variant="outlined"
                            icon={<OpenInNew sx={{ fontSize: '0.75rem !important' }} />}
                            onClick={() => navigate(url)}
                            sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                          />
                        ) : (
                          <Chip label={SOURCE_LABELS[e.source] || e.source} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        );
                      })()}
                    </TableCell>
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
        )
      )}
    </Box>
  );
}
