import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Chip, CircularProgress, Alert, Button, Accordion,
  AccordionSummary, AccordionDetails,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import accountingAPI from '../../services/accountingAPI';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';

export default function GeneralLedger() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [start, setStart] = useState(firstDay);
  const [end, setEnd] = useState(today);
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { format } = useCurrency();

  useEffect(() => {
    accountingAPI.getAccounts({ active: 'true' }).then((r) => setAccounts(r.data));
    load();
  }, []);

  const load = () => {
    setLoading(true);
    const params = { start_date: start, end_date: end };
    if (accountId) params.account_id = accountId;
    accountingAPI.getGeneralLedger(params)
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError('Erreur chargement du grand livre'))
      .finally(() => setLoading(false));
  };

  return (
    <Box p={3}>
      <AccountingNav title="Grand Livre" subtitle="Mouvements détaillés par compte" />

      <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
        <TextField size="small" type="date" label="Du" InputLabelProps={{ shrink: true }}
          value={start} onChange={(e) => setStart(e.target.value)} />
        <TextField size="small" type="date" label="Au" InputLabelProps={{ shrink: true }}
          value={end} onChange={(e) => setEnd(e.target.value)} />
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Compte (optionnel)</InputLabel>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} label="Compte (optionnel)">
            <MenuItem value="">Tous les comptes</MenuItem>
            {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={load} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Actualiser'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {data && data.accounts.length === 0 && (
        <Alert severity="info">Aucun mouvement pour la période sélectionnée.</Alert>
      )}

      {data && data.accounts.map((acc) => (
        <Accordion key={acc.account_id} defaultExpanded={data.accounts.length === 1}
          elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
              <Typography fontFamily="monospace" fontWeight={700}>{acc.code}</Typography>
              <Typography fontWeight={600}>{acc.name}</Typography>
              <Box ml="auto" display="flex" gap={3} mr={2}>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">Débit</Typography>
                  <Typography variant="body2" color="primary.main" fontWeight={600}>{format(parseFloat(acc.total_debit))}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">Crédit</Typography>
                  <Typography variant="body2" color="secondary.main" fontWeight={600}>{format(parseFloat(acc.total_credit))}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">Solde</Typography>
                  <Typography variant="body2" fontWeight={700}
                    color={parseFloat(acc.solde) >= 0 ? 'success.main' : 'error.main'}>
                    {parseFloat(acc.solde) >= 0 ? '+' : ''}{format(parseFloat(acc.solde))}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>N° écriture</strong></TableCell>
                    <TableCell><strong>Journal</strong></TableCell>
                    <TableCell><strong>Libellé</strong></TableCell>
                    <TableCell><strong>Référence</strong></TableCell>
                    <TableCell align="right"><strong>Débit</strong></TableCell>
                    <TableCell align="right"><strong>Crédit</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {acc.movements.map((mv, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{formatDate(mv.date)}</TableCell>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{mv.entry_number}</Typography></TableCell>
                      <TableCell><Chip label={mv.journal} size="small" variant="outlined" /></TableCell>
                      <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{mv.description}</Typography></TableCell>
                      <TableCell>{mv.reference || '—'}</TableCell>
                      <TableCell align="right">{parseFloat(mv.debit) > 0 ? format(parseFloat(mv.debit)) : '—'}</TableCell>
                      <TableCell align="right">{parseFloat(mv.credit) > 0 ? format(parseFloat(mv.credit)) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
