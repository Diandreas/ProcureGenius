import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, CircularProgress, Alert, Card, CardContent,
  Grid, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import { CheckCircle, Cancel, OpenInNew } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import AccountingNav from './AccountingNav';

const STATUS_COLORS = { draft: 'default', posted: 'success', cancelled: 'error' };
const STATUS_LABELS = { draft: 'Brouillon', posted: 'Validée', cancelled: 'Annulée' };
const SOURCE_LABELS = {
  manual: 'Saisie manuelle',
  invoice: 'Facture client',
  invoice_reversal: 'Extourne facture',
  payment: 'Paiement client',
  purchase_order: 'Bon de commande',
};

function getSourceUrl(entry) {
  if (entry.source === 'invoice' || entry.source === 'invoice_reversal' || entry.source === 'payment') {
    if (entry.source_invoice_id) return `/invoices/${entry.source_invoice_id}`;
    if (entry.reference) return `/invoices?search=${entry.reference}`;
  }
  if (entry.source === 'purchase_order') {
    return `/purchase-orders?search=${entry.reference || ''}`;
  }
  return null;
}

export default function JournalEntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const neu = getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft');
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    accountingAPI.getEntry(id)
      .then((r) => { setEntry(r.data); setError(null); })
      .catch(() => setError('Écriture introuvable'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handlePost = async () => {
    try {
      await accountingAPI.postEntry(id);
      enqueueSnackbar('Écriture validée', { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Erreur', { variant: 'error' });
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Annuler cette écriture ? Une contrepassation sera créée automatiquement.')) return;
    try {
      await accountingAPI.cancelEntry(id);
      enqueueSnackbar('Écriture annulée', { variant: 'warning' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || 'Erreur', { variant: 'error' });
    }
  };

  return (
    <Box p={{ xs: 2, sm: 3 }} maxWidth={860}>
      <AccountingNav
        title={entry ? `Écriture ${entry.entry_number}` : 'Détail Écriture'}
        subtitle={entry ? entry.description : ''}
        action={entry && <Chip label={STATUS_LABELS[entry.status]} color={STATUS_COLORS[entry.status]} />}
      />

      {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {entry && (
        <>
          <Card elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, mb: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Journal</Typography>
                  <Typography variant="body1" fontWeight={600}>{entry.journal_code} — {entry.journal_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body1" fontWeight={600}>{formatDate(entry.date)}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Source</Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                    <Typography variant="body1">{SOURCE_LABELS[entry.source] || entry.source_display}</Typography>
                    {getSourceUrl(entry) && (
                      <Chip
                        label={entry.reference || 'Voir document'}
                        size="small"
                        variant="outlined"
                        color="primary"
                        icon={<OpenInNew sx={{ fontSize: '0.75rem !important' }} />}
                        onClick={() => navigate(getSourceUrl(entry))}
                        sx={{ cursor: 'pointer', fontSize: '0.7rem', ml: 0.5 }}
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="caption" color="text.secondary">Libellé</Typography>
                  <Typography variant="body1">{entry.description}</Typography>
                </Grid>
                {entry.reference && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Référence</Typography>
                    <Typography variant="body1" fontFamily="monospace">{entry.reference}</Typography>
                  </Grid>
                )}
                {entry.created_by_name && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Créé par</Typography>
                    <Typography variant="body1">{entry.created_by_name}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          <Typography variant="subtitle1" fontWeight={600} mb={1}>Lignes d'écriture</Typography>
          {isMobile ? (
            /* ── Vue mobile : cartes ── */
            <Stack spacing={1.25} mb={3}>
              {entry.lines.map((line) => {
                const debit = parseFloat(line.debit);
                const credit = parseFloat(line.credit);
                return (
                  <Card key={line.id} elevation={0} sx={{ border: 'none', borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: neu }}>
                    <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                      <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{line.account_code}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{line.account_name}</Typography>
                      {line.description && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>{line.description}</Typography>
                      )}
                      <Box display="flex" justifyContent="space-between" mt={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Débit</Typography>
                          <Typography variant="body2" fontWeight={600} color={debit > 0 ? 'primary.main' : 'text.disabled'}>
                            {debit > 0 ? format(debit) : '—'}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="caption" color="text.secondary">Crédit</Typography>
                          <Typography variant="body2" fontWeight={600} color={credit > 0 ? 'secondary.main' : 'text.disabled'}>
                            {credit > 0 ? format(credit) : '—'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
              <Card elevation={0} sx={{ border: 'none', borderRadius: 2.5, bgcolor: 'action.hover', boxShadow: neu }}>
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={700}>Total</Typography>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" fontWeight={700}>{format(parseFloat(entry.total_debit))}</Typography>
                    <Typography variant="body2" fontWeight={700}>{format(parseFloat(entry.total_credit))}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          ) : (
            /* ── Vue desktop : tableau ── */
            <TableContainer component={Paper} elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, mb: 3, overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Compte</strong></TableCell>
                    <TableCell><strong>Libellé</strong></TableCell>
                    <TableCell align="right"><strong>Débit</strong></TableCell>
                    <TableCell align="right"><strong>Crédit</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entry.lines.map((line) => (
                    <TableRow key={line.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">{line.account_code}</Typography>
                        <Typography variant="caption" color="text.secondary">{line.account_name}</Typography>
                      </TableCell>
                      <TableCell>{line.description || '—'}</TableCell>
                      <TableCell align="right">
                        {parseFloat(line.debit) > 0 ? (
                          <Typography variant="body2" fontWeight={600} color="primary.main">{format(parseFloat(line.debit))}</Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {parseFloat(line.credit) > 0 ? (
                          <Typography variant="body2" fontWeight={600} color="secondary.main">{format(parseFloat(line.credit))}</Typography>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={2}><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>{format(parseFloat(entry.total_debit))}</strong></TableCell>
                    <TableCell align="right"><strong>{format(parseFloat(entry.total_credit))}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {entry.is_balanced ? (
            <Alert severity="success" sx={{ mb: 3 }}>Écriture équilibrée </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 3 }}>
              Déséquilibrée — Débit : {format(parseFloat(entry.total_debit))} / Crédit : {format(parseFloat(entry.total_credit))}
            </Alert>
          )}

          <Box display="flex" gap={1.5} flexWrap="wrap">
            {entry.status === 'draft' && (
              <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handlePost}>
                Valider l'écriture
              </Button>
            )}
            {entry.status === 'posted' && (
              <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={handleCancel}>
                Annuler (contrepassation)
              </Button>
            )}
            <Button variant="outlined" onClick={() => navigate('/accounting/entries')}>
              Retour à la liste
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
