import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, CircularProgress, Alert, Button, Card, CardContent,
  Stack, useMediaQuery, useTheme,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const load = () => {
    setLoading(true);
    accountingAPI.getTrialBalance({ start_date: start, end_date: end })
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError('Erreur chargement de la balance'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav title="Balance des Comptes" subtitle="Soldes débiteurs et créditeurs par compte" />

      {/* Filtres */}
      <Box display="flex" gap={1.5} mb={3} alignItems="center" flexWrap="wrap">
        <TextField
          size="small" type="date" label="Du" InputLabelProps={{ shrink: true }}
          value={start} onChange={(e) => setStart(e.target.value)}
          sx={{ flex: '1 1 130px', maxWidth: 180 }}
        />
        <TextField
          size="small" type="date" label="Au" InputLabelProps={{ shrink: true }}
          value={end} onChange={(e) => setEnd(e.target.value)}
          sx={{ flex: '1 1 130px', maxWidth: 180 }}
        />
        <Button variant="contained" onClick={load} disabled={loading} sx={{ whiteSpace: 'nowrap' }}>
          {loading ? <CircularProgress size={20} /> : 'Actualiser'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {data && (
        <>
          <Box mb={2}>
            {data.is_balanced ? (
              <Alert severity="success">Balance équilibrée — Total = {format(parseFloat(data.total_debit))}</Alert>
            ) : (
              <Alert severity="error">
                Balance déséquilibrée — Débit : {format(parseFloat(data.total_debit))} / Crédit : {format(parseFloat(data.total_credit))}
              </Alert>
            )}
          </Box>

          {isMobile ? (
            /* ── Vue mobile : cartes ── */
            <Stack spacing={1.5}>
              {data.rows.map((row) => (
                <Card key={row.account_id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box>
                        <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="text.secondary">
                          {row.code}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                          {row.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={TYPE_LABELS[row.account_type]}
                        size="small"
                        color={TYPE_COLORS[row.account_type] || 'default'}
                        sx={{ ml: 1, flexShrink: 0 }}
                      />
                    </Box>
                    <Box
                      display="grid"
                      gridTemplateColumns="1fr 1fr"
                      gap={1}
                      sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">Débit</Typography>
                        <Typography variant="body2">{format(parseFloat(row.total_debit))}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Crédit</Typography>
                        <Typography variant="body2">{format(parseFloat(row.total_credit))}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Solde débiteur</Typography>
                        <Typography variant="body2" color="primary.main" fontWeight={parseFloat(row.solde_debiteur) > 0 ? 700 : 400}>
                          {parseFloat(row.solde_debiteur) > 0 ? format(parseFloat(row.solde_debiteur)) : '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Solde créditeur</Typography>
                        <Typography variant="body2" color="secondary.main" fontWeight={parseFloat(row.solde_crediteur) > 0 ? 700 : 400}>
                          {parseFloat(row.solde_crediteur) > 0 ? format(parseFloat(row.solde_crediteur)) : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {/* Total */}
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'primary.main', bgcolor: 'action.hover' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="body2" fontWeight={700} mb={1}>TOTAL</Typography>
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Débit</Typography>
                      <Typography variant="body2" fontWeight={700}>{format(parseFloat(data.total_debit))}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Crédit</Typography>
                      <Typography variant="body2" fontWeight={700}>{format(parseFloat(data.total_credit))}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          ) : (
            /* ── Vue desktop : tableau avec scroll ── */
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
            >
              <Table size="small" sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>Code</strong></TableCell>
                    <TableCell><strong>Intitulé</strong></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>Type</strong></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>Total Débit</strong></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>Total Crédit</strong></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>Solde Débiteur</strong></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>Solde Créditeur</strong></TableCell>
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
          )}
        </>
      )}
    </Box>
  );
}
