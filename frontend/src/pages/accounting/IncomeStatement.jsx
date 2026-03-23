import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, CircularProgress, Alert, Button, Card, CardContent,
} from '@mui/material';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';

export default function IncomeStatement() {
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
    accountingAPI.getIncomeStatement({ start_date: start, end_date: end })
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError('Erreur chargement du compte de résultat'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const isProfit = data && parseFloat(data.net_result) >= 0;

  return (
    <Box p={3} maxWidth={720}>
      <AccountingNav title="Compte de Résultat" subtitle="Produits vs Charges" />

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
          {/* Produits */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'success.light', mb: 2 }}>
            <Box sx={{ bgcolor: 'success.main', color: 'white', px: 2, py: 1, borderRadius: '4px 4px 0 0' }}>
              <Typography variant="subtitle1" fontWeight={700}>Produits (Recettes)</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Compte</strong></TableCell>
                  <TableCell align="right"><strong>Montant</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.revenue.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="body2" color="text.secondary" py={1}>Aucune recette pour la période</Typography>
                    </TableCell>
                  </TableRow>
                ) : data.revenue.lines.map((r) => (
                  <TableRow key={r.code} hover>
                    <TableCell><Typography fontFamily="monospace" variant="body2">{r.code}</Typography></TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell align="right">
                      <Typography color="success.main" fontWeight={600}>{format(parseFloat(r.amount))}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell colSpan={2}><strong>Total Produits</strong></TableCell>
                  <TableCell align="right">
                    <Typography color="success.main" fontWeight={700} variant="subtitle2">
                      {format(parseFloat(data.revenue.total))}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>

          {/* Charges */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'error.light', mb: 3 }}>
            <Box sx={{ bgcolor: 'error.main', color: 'white', px: 2, py: 1, borderRadius: '4px 4px 0 0' }}>
              <Typography variant="subtitle1" fontWeight={700}>Charges</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Compte</strong></TableCell>
                  <TableCell align="right"><strong>Montant</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.expenses.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="body2" color="text.secondary" py={1}>Aucune charge pour la période</Typography>
                    </TableCell>
                  </TableRow>
                ) : data.expenses.lines.map((e) => (
                  <TableRow key={e.code} hover>
                    <TableCell><Typography fontFamily="monospace" variant="body2">{e.code}</Typography></TableCell>
                    <TableCell>{e.name}</TableCell>
                    <TableCell align="right">
                      <Typography color="error.main" fontWeight={600}>{format(parseFloat(e.amount))}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2}><strong>Total Charges</strong></TableCell>
                  <TableCell align="right">
                    <Typography color="error.main" fontWeight={700} variant="subtitle2">
                      {format(parseFloat(data.expenses.total))}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>

          {/* Résultat net */}
          <Card elevation={0} sx={{ border: 2, borderColor: isProfit ? 'success.main' : 'error.main' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {isProfit ? 'Bénéfice net' : 'Déficit net'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.start_date} → {data.end_date}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color={isProfit ? 'success.main' : 'error.main'}>
                  {isProfit ? '+' : '-'}{format(Math.abs(parseFloat(data.net_result)))}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
