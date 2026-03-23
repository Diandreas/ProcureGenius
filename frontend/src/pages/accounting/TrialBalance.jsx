import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, CircularProgress, Alert, Button,
} from '@mui/material';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';

const TYPE_LABELS = {
  asset: 'Actif', liability: 'Passif', equity: 'Capitaux', revenue: 'Produit', expense: 'Charge',
};
const TYPE_COLORS = {
  asset: 'primary', liability: 'warning', equity: 'secondary', revenue: 'success', expense: 'error',
};

export default function TrialBalance() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [start, setStart] = useState(firstDay);
  const [end, setEnd] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { format } = useCurrency();

  const load = () => {
    setLoading(true);
    accountingAPI.getTrialBalance({ start_date: start, end_date: end })
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError('Erreur chargement de la balance'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <Box p={3}>
      <AccountingNav title="Balance des Comptes" subtitle="Soldes débiteurs et créditeurs par compte" />

      <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField size="small" type="date" label="Du" InputLabelProps={{ shrink: true }}
          value={start} onChange={(e) => setStart(e.target.value)} />
        <TextField size="small" type="date" label="Au" InputLabelProps={{ shrink: true }}
          value={end} onChange={(e) => setEnd(e.target.value)} />
        <Button variant="contained" onClick={load} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Actualiser'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <>
          <Box mb={2}>
            {data.is_balanced ? (
              <Alert severity="success">Balance équilibrée — Total = {format(parseFloat(data.total_debit))}</Alert>
            ) : (
              <Alert severity="error">Balance déséquilibrée — Débit : {format(parseFloat(data.total_debit))} / Crédit : {format(parseFloat(data.total_credit))}</Alert>
            )}
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Intitulé</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell align="right"><strong>Total Débit</strong></TableCell>
                  <TableCell align="right"><strong>Total Crédit</strong></TableCell>
                  <TableCell align="right"><strong>Solde Débiteur</strong></TableCell>
                  <TableCell align="right"><strong>Solde Créditeur</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.account_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{row.code}</Typography>
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip label={TYPE_LABELS[row.account_type]} size="small" color={TYPE_COLORS[row.account_type] || 'default'} />
                    </TableCell>
                    <TableCell align="right">{format(parseFloat(row.total_debit))}</TableCell>
                    <TableCell align="right">{format(parseFloat(row.total_credit))}</TableCell>
                    <TableCell align="right">
                      {parseFloat(row.solde_debiteur) > 0 ? (
                        <Typography variant="body2" color="primary.main" fontWeight={600}>{format(parseFloat(row.solde_debiteur))}</Typography>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(row.solde_crediteur) > 0 ? (
                        <Typography variant="body2" color="secondary.main" fontWeight={600}>{format(parseFloat(row.solde_crediteur))}</Typography>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell colSpan={3}><strong>TOTAL</strong></TableCell>
                  <TableCell align="right"><strong>{format(parseFloat(data.total_debit))}</strong></TableCell>
                  <TableCell align="right"><strong>{format(parseFloat(data.total_credit))}</strong></TableCell>
                  <TableCell /><TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
