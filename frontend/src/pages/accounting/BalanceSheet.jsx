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

export default function BalanceSheet() {
  const today = new Date().toISOString().slice(0, 10);
  const [endDate, setEndDate] = useState(today);
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
    accountingAPI.getBalanceSheet({ end_date: endDate })
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError(t('accounting:balanceSheet.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const SectionTable = ({ title, lines, total, color }) => (
    <Paper elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, overflow: 'hidden', mb: 2 }}>
      <Box sx={{ bgcolor: `${color}.main`, color: 'white', px: 2, py: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell><strong>{t('accounting:common.code')}</strong></TableCell>
            <TableCell><strong>{t('accounting:common.account')}</strong></TableCell>
            <TableCell align="right"><strong>{t('accounting:common.balance')}</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center">
                <Typography variant="body2" color="text.secondary" py={1}>{t('accounting:common.noMovement')}</Typography>
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
            <TableCell colSpan={2}><strong>{t('accounting:common.total')}</strong></TableCell>
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
    <Box p={{ xs: 2, sm: 3 }} maxWidth={900}>
      <AccountingNav title={t('accounting:balanceSheet.title')} subtitle={t('accounting:balanceSheet.subtitle')} />

      <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField size="small" type="date" label={t('accounting:balanceSheet.asOf')} InputLabelProps={{ shrink: true }}
          value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button variant="contained" onClick={load} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : t('accounting:common.refresh')}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <>
          {data.is_balanced ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {t('accounting:balanceSheet.balanced', { amount: format(parseFloat(data.total_assets)) })}
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('accounting:balanceSheet.unbalanced', { assets: format(parseFloat(data.total_assets)), liabilities: format(parseFloat(data.total_passif)) })}
            </Alert>
          )}

          <Box display="flex" gap={{ xs: 2, md: 3 }} flexWrap="wrap">
            {/* Colonne Actif */}
            <Box flex={1} minWidth={{ xs: '100%', sm: 320 }}>
              <Typography variant="h6" fontWeight={700} mb={1} color="primary.main">{t('accounting:balanceSheet.assetsHeading')}</Typography>
              <SectionTable
                title={t('accounting:balanceSheet.assets')}
                lines={data.assets.lines}
                total={data.assets.total}
                color="primary"
              />
              <Card elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, borderTop: 3, borderTopColor: 'primary.main' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>{t('accounting:balanceSheet.totalAssets')}</Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.main">
                      {format(parseFloat(data.total_assets))}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Colonne Passif */}
            <Box flex={1} minWidth={{ xs: '100%', sm: 320 }}>
              <Typography variant="h6" fontWeight={700} mb={1} color="warning.main">{t('accounting:balanceSheet.liabilitiesHeading')}</Typography>
              <SectionTable
                title={t('accounting:balanceSheet.debts')}
                lines={data.liabilities.lines}
                total={data.liabilities.total}
                color="warning"
              />
              <SectionTable
                title={t('accounting:balanceSheet.equity')}
                lines={data.equity.lines}
                total={data.equity.total}
                color="secondary"
              />

              {/* Résultat net de l'exercice */}
              <Paper elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, overflow: 'hidden', mb: 2 }}>
                <Box sx={{ bgcolor: 'action.hover', px: 2, py: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>{t('accounting:balanceSheet.yearResult')}</Typography>
                </Box>
                <Box px={2} py={1} display="flex" justifyContent="space-between">
                  <Typography variant="body2">{t('accounting:balanceSheet.netResultFormula')}</Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={parseFloat(data.net_result) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {parseFloat(data.net_result) >= 0 ? '+' : ''}{format(parseFloat(data.net_result))}
                  </Typography>
                </Box>
              </Paper>

              <Card elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, borderTop: 3, borderTopColor: 'warning.main' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>{t('accounting:balanceSheet.totalLiabilities')}</Typography>
                    <Typography variant="h6" fontWeight={800} color="warning.main">
                      {format(parseFloat(data.total_passif))}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            {t('accounting:balanceSheet.asOfFooter', { date: data.as_of })}
          </Typography>
        </>
      )}
    </Box>
  );
}
