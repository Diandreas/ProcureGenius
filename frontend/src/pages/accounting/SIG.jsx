import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, CircularProgress, Alert, Button,
  Paper, Collapse, IconButton, Chip, useTheme,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import AccountingNav from './AccountingNav';

// Le serveur renvoie les libellés des soldes en français : on les associe à une clé
// stable pour les traduire (repli sur le texte du serveur si un libellé est inconnu).
const SIG_ROW_KEYS = {
  "Chiffre d'affaires": 'revenue',
  'Marge brute': 'grossMargin',
  'Valeur ajoutée': 'valueAdded',
  "EBE (Excédent Brut d'Exploitation)": 'ebitda',
  "Résultat d'exploitation": 'operatingResult',
  'Résultat financier': 'financialResult',
  'Résultat courant': 'currentResult',
  'Résultat exceptionnel': 'exceptionalResult',
  'Résultat net': 'netResult',
};

function SoldeRow({ solde, format }) {
  const { t } = useTranslation(['accounting', 'common']);
  const rowKey = SIG_ROW_KEYS[solde.label];
  const label = rowKey ? t(`accounting:sig.rows.${rowKey}.label`, { defaultValue: solde.label }) : solde.label;
  const description = rowKey ? t(`accounting:sig.rows.${rowKey}.description`, { defaultValue: solde.description }) : solde.description;
  const [open, setOpen] = useState(false);
  const montant = parseFloat(solde.montant);
  const isPositive = montant >= 0;
  const hasLines = solde.lines && solde.lines.length > 0;

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        px={2}
        py={1.5}
        sx={{
          bgcolor: solde.final
            ? (isPositive ? 'success.main' : 'error.main')
            : solde.sous_total
            ? 'action.selected'
            : 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          cursor: hasLines ? 'pointer' : 'default',
          '&:hover': hasLines ? { bgcolor: solde.final || solde.sous_total ? undefined : 'action.hover' } : {},
        }}
        onClick={() => hasLines && setOpen(o => !o)}
      >
        <Box flex={1}>
          <Typography
            variant={solde.final ? 'subtitle1' : solde.sous_total ? 'body1' : 'body2'}
            fontWeight={solde.final || solde.sous_total ? 700 : 500}
            color={solde.final ? 'white' : 'text.primary'}
          >
            {label}
          </Typography>
          <Typography
            variant="caption"
            color={solde.final ? 'rgba(255,255,255,0.7)' : 'text.secondary'}
          >
            {description}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {hasLines && (
            <Chip
              label={t('accounting:sig.accountCount', { count: solde.lines.length })}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', color: solde.final ? 'white' : undefined, borderColor: solde.final ? 'rgba(255,255,255,0.5)' : undefined }}
            />
          )}
          <Typography
            variant={solde.final ? 'h6' : 'subtitle2'}
            fontWeight={700}
            color={
              solde.final
                ? 'white'
                : isPositive
                ? 'success.main'
                : 'error.main'
            }
            minWidth={{ xs: 90, sm: 120 }}
            textAlign="right"
          >
            {isPositive && !solde.final ? '+' : ''}{format(Math.abs(montant))}
            {montant < 0 && !solde.final && ' (−)'}
          </Typography>
          {hasLines && (
            <IconButton size="small" sx={{ color: solde.final ? 'white' : 'text.secondary', p: 0.5 }}>
              {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          )}
        </Box>
      </Box>

      {hasLines && (
        <Collapse in={open}>
          <Box sx={{ bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
            {solde.lines.map((line, i) => (
              <Box key={i} display="flex" justifyContent="space-between" px={4} py={0.75}
                sx={{ borderBottom: i < solde.lines.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{line.code}</span>
                  {' — '}{line.name}
                </Typography>
                <Typography variant="caption" fontWeight={600}
                  color={parseFloat(line.amount) >= 0 ? 'success.main' : 'error.main'}>
                  {format(Math.abs(parseFloat(line.amount)))}
                </Typography>
              </Box>
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

export default function SIG() {
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
    accountingAPI.getSIG({ start_date: start, end_date: end })
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError(t('accounting:sig.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <Box p={{ xs: 2, sm: 3 }} maxWidth={860}>
      <AccountingNav title={t('accounting:sig.title')} subtitle={t('accounting:sig.subtitle')} />

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

      {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}

      {data && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('accounting:sig.info')}
          </Alert>
          <Paper elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, overflow: 'hidden' }}>
            {data.soldes.map((solde, i) => (
              <SoldeRow key={i} solde={solde} format={format} />
            ))}
          </Paper>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            {t('accounting:sig.footer', { start: data.start_date, end: data.end_date })}
          </Typography>
        </>
      )}
    </Box>
  );
}
