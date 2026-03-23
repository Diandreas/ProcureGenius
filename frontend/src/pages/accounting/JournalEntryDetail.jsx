import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, CircularProgress, Alert, Card, CardContent,
  Grid,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';

const STATUS_COLORS = { draft: 'default', posted: 'success', cancelled: 'error' };
const STATUS_LABELS = { draft: 'Brouillon', posted: 'Validée', cancelled: 'Annulée' };

export default function JournalEntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
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
    <Box p={3} maxWidth={860}>
      <AccountingNav
        title={entry ? `Écriture ${entry.entry_number}` : 'Détail Écriture'}
        subtitle={entry ? entry.description : ''}
        action={entry && <Chip label={STATUS_LABELS[entry.status]} color={STATUS_COLORS[entry.status]} />}
      />

      {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {entry && (
        <>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
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
                  <Typography variant="body1">{entry.source_display}</Typography>
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
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Table size="small">
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

          {entry.is_balanced ? (
            <Alert severity="success" sx={{ mb: 3 }}>Écriture équilibrée ✓</Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 3 }}>
              Déséquilibrée — Débit : {format(parseFloat(entry.total_debit))} / Crédit : {format(parseFloat(entry.total_credit))}
            </Alert>
          )}

          <Box display="flex" gap={2}>
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
