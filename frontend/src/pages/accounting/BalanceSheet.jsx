import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, CircularProgress, Alert, Button, Card, CardContent,
} from '@mui/material';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';

export default function BalanceSheet() {
  const today = new Date().toISOString().slice(0, 10);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { format } = useCurrency();

  const load = () => {
    setLoading(true);
    accountingAPI.getBalanceSheet({ end_date: endDate })
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError('Erreur chargement du bilan'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const SectionTable = ({ title, lines, total, color }) => (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: `${color}.light`, mb: 2 }}>
      <Box sx={{ bgcolor: `${color}.main`, color: 'white', px: 2, py: 1, borderRadius: '4px 4px 0 0' }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell><strong>Code</strong></TableCell>
            <TableCell><strong>Compte</strong></TableCell>
            <TableCell align="right"><strong>Solde</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center">
                <Typography variant="body2" color="text.secondary" py={1}>Aucun mouvement</Typography>
              </TableCell>
            </TableRow>
          ) : lines.map((r) => (
            <TableRow key={r.code} hover>
              <TableCell><Typography fontFamily="monospace" variant="body2">{r.code}</Typography></TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell align="right">
                <Typography color={`${color}.main`} fontWeight={600}>{format(parseFloat(r.balance))}</Typography>
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell colSpan={2}><strong>Total</strong></TableCell>
            <TableCell align="right">
              <Typography color={`${color}.main`} fontWeight={700} variant="subtitle2">
                {format(parseFloat(total))}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );

  return (
    <Box p={3} maxWidth={800}>
      <AccountingNav title="Bilan Comptable" subtitle="Actif / Passif / Capitaux propres" />

      <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField size="small" type="date" label="Au" InputLabelProps={{ shrink: true }}
          value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button variant="contained" onClick={load} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Actualiser'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <>
          {data.is_balanced ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Bilan équilibré — Total Actif = Total Passif = {format(parseFloat(data.total_assets))}
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Bilan déséquilibré — Actif : {format(parseFloat(data.total_assets))} / Passif : {format(parseFloat(data.total_passif))}
            </Alert>
          )}

          <Box display="flex" gap={3} flexWrap="wrap">
            {/* Colonne Actif */}
            <Box flex={1} minWidth={320}>
              <Typography variant="h6" fontWeight={700} mb={1} color="primary.main">ACTIF</Typography>
              <SectionTable
                title="Actif"
                lines={data.assets.lines}
                total={data.assets.total}
                color="primary"
              />
              <Card elevation={0} sx={{ border: 2, borderColor: 'primary.main' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>TOTAL ACTIF</Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.main">
                      {format(parseFloat(data.total_assets))}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Colonne Passif */}
            <Box flex={1} minWidth={320}>
              <Typography variant="h6" fontWeight={700} mb={1} color="warning.main">PASSIF</Typography>
              <SectionTable
                title="Dettes & Passif"
                lines={data.liabilities.lines}
                total={data.liabilities.total}
                color="warning"
              />
              <SectionTable
                title="Capitaux Propres"
                lines={data.equity.lines}
                total={data.equity.total}
                color="secondary"
              />

              {/* Résultat net de l'exercice */}
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Box sx={{ bgcolor: 'action.hover', px: 2, py: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Résultat de l'exercice</Typography>
                </Box>
                <Box px={2} py={1} display="flex" justifyContent="space-between">
                  <Typography variant="body2">Résultat net (Produits − Charges)</Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={parseFloat(data.net_result) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {parseFloat(data.net_result) >= 0 ? '+' : ''}{format(parseFloat(data.net_result))}
                  </Typography>
                </Box>
              </Paper>

              <Card elevation={0} sx={{ border: 2, borderColor: 'warning.main' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>TOTAL PASSIF</Typography>
                    <Typography variant="h6" fontWeight={800} color="warning.main">
                      {format(parseFloat(data.total_passif))}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Bilan arrêté au {data.as_of} — cumul depuis l'origine
          </Typography>
        </>
      )}
    </Box>
  );
}
