import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, CircularProgress, Alert, Button, Card, CardContent, useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
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
  const { t } = useTranslation(['accounting', 'common']);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const neu = getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft');

  const load = () => {
    setLoading(true);
    accountingAPI.getIncomeStatement({ start_date: start, end_date: end })
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError(t('accounting:incomeStatement.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const isProfit = data && parseFloat(data.net_result) >= 0;

  return (
    <Box p={{ xs: 2, sm: 3 }} maxWidth={720}>
      <AccountingNav title={t('accounting:incomeStatement.title')} subtitle={t('accounting:incomeStatement.subtitle')} />

      <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField size="small" type="date" label={t('accounting:common.from')} InputLabelProps={{ shrink: true }}
          value={start} onChange={(e) => setStart(e.target.value)} />
        <TextField size="small" type="date" label={t('accounting:common.to')} InputLabelProps={{ shrink: true }}
          value={end} onChange={(e) => setEnd(e.target.value)} />
        <Button variant="contained" onClick={load} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : t('accounting:common.refresh')}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <>
          {/* Produits */}
          <Paper elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, overflow: 'hidden', mb: 2 }}>
            <Box sx={{ bgcolor: 'success.main', color: 'white', px: 2, py: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>{t('accounting:incomeStatement.revenueSection')}</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>{t('accounting:common.code')}</strong></TableCell>
                  <TableCell><strong>{t('accounting:common.account')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('accounting:common.amount')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.revenue.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="body2" color="text.secondary" py={1}>{t('accounting:incomeStatement.noRevenue')}</Typography>
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
                  <TableCell colSpan={2}><strong>{t('accounting:incomeStatement.totalRevenue')}</strong></TableCell>
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
          <Paper elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, overflow: 'hidden', mb: 3 }}>
            <Box sx={{ bgcolor: 'error.main', color: 'white', px: 2, py: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>{t('accounting:incomeStatement.expensesSection')}</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>{t('accounting:common.code')}</strong></TableCell>
                  <TableCell><strong>{t('accounting:common.account')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('accounting:common.amount')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.expenses.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="body2" color="text.secondary" py={1}>{t('accounting:incomeStatement.noExpenses')}</Typography>
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
                  <TableCell colSpan={2}><strong>{t('accounting:incomeStatement.totalExpenses')}</strong></TableCell>
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
          <Card elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, borderTop: 4, borderTopColor: isProfit ? 'success.main' : 'error.main' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                <Box minWidth={0}>
                  <Typography variant="h6" fontWeight={700}>
                    {isProfit ? t('accounting:incomeStatement.netProfit') : t('accounting:incomeStatement.netLoss')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.start_date} → {data.end_date}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} color={isProfit ? 'success.main' : 'error.main'} sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' } }}>
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
