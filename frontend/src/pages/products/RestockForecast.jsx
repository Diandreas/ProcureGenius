import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Paper, Alert, Chip, LinearProgress, Button,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Inventory2, WarningAmber, LocalShipping, Lock, TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import analyticsAPI from '../../services/analyticsAPI';
import useCurrency from '../../hooks/useCurrency';

const URGENCY = {
  critical: { color: 'error', key: 'critical', fallback: 'Rupture imminente' },
  soon: { color: 'warning', key: 'soon', fallback: 'À recommander' },
  ok: { color: 'success', key: 'ok', fallback: 'Stock suffisant' },
  idle: { color: 'default', key: 'idle', fallback: 'Sans vente' },
};

const SummaryCard = ({ icon, label, value, color }) => (
  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={1} sx={{ color }}>
        {icon}
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
      <Typography variant="h5" fontWeight={800}>{value}</Typography>
    </CardContent>
  </Card>
);

export default function RestockForecast() {
  const navigate = useNavigate();
  const { t } = useTranslation(['products', 'common']);
  const { format } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  // Fenêtre d'analyse des ventes (jours). Filtre demandé : jour/semaine/mois...
  const [windowDays, setWindowDays] = useState(30);

  const PERIODS = [
    { value: 1, label: t('products:restock.periodDay', 'Aujourd\'hui') },
    { value: 7, label: t('products:restock.periodWeek', '7 jours') },
    { value: 30, label: t('products:restock.periodMonth', '30 jours') },
    { value: 90, label: t('products:restock.periodQuarter', '90 jours') },
  ];

  const load = useCallback(() => {
    setLoading(true);
    analyticsAPI.getRestockForecast({ days: windowDays, horizon: 30 })
      .then((r) => setData(r.data))
      .catch(() => setData({ locked: false, products: [], summary: {} }))
      .finally(() => setLoading(false));
  }, [windowDays]);

  useEffect(() => { load(); }, [load]);

  const urgencyLabel = (u) => t(`products:restock.urgency.${URGENCY[u]?.key || 'idle'}`, URGENCY[u]?.fallback || u);

  // ── Verrou Premium : aperçu grisé + incitation upgrade ──────────────────
  if (data?.locked) {
    return (
      <Box p={{ xs: 2, md: 3 }} maxWidth={900} mx="auto">
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <LocalShipping color="primary" />
          <Typography variant="h5" fontWeight={800}>
            {t('products:restock.title', 'Restockage prédictif')}
          </Typography>
          <Chip size="small" icon={<Lock sx={{ fontSize: 14 }} />} label="Pro" color="primary" sx={{ fontWeight: 700 }} />
        </Box>

        <Box sx={{ position: 'relative', mt: 2 }}>
          {/* Aperçu flouté (placeholder) */}
          <Box sx={{ filter: 'blur(4px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>
            <Grid container spacing={2} mb={3}>
              {[0, 1, 2].map((i) => (
                <Grid item xs={12} md={4} key={i}>
                  <SummaryCard icon={<Inventory2 />} color="#2563eb" label="—" value="—" />
                </Grid>
              ))}
            </Grid>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableBody>
                  {[0, 1, 2, 3].map((i) => (
                    <TableRow key={i}><TableCell>Produit exemple</TableCell><TableCell align="right">—</TableCell><TableCell align="right">—</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Carte d'incitation par-dessus */}
          <Card elevation={0} sx={{
            position: 'absolute', inset: 0, m: 'auto', maxWidth: 460, height: 'fit-content',
            border: '1px solid', borderColor: 'primary.light', textAlign: 'center', p: 1,
            boxShadow: '0 12px 40px rgba(37,99,235,0.15)',
          }}>
            <CardContent>
              <Lock sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={800} gutterBottom>
                {t('products:restock.lockedTitle', 'Anticipez vos ruptures de stock')}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {data.message || t('products:restock.lockedDesc', 'Le restockage prédictif calcule automatiquement quoi recommander et en quelle quantité. Disponible avec le plan Pro.')}
              </Typography>
              <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                {t('products:restock.upgrade', 'Passer au plan Pro')}
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  const summary = data?.summary;

  return (
    <Box p={{ xs: 2, md: 3 }}>
      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <LocalShipping color="primary" />
        <Typography variant="h5" fontWeight={800}>{t('products:restock.title', 'Restockage prédictif')}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {t('products:restock.subtitle', 'Quoi recommander et en quelle quantité, selon vos ventes récentes.')}
      </Typography>

      {/* Filtre de période d'analyse des ventes */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {t('products:restock.periodLabel', 'Période d\'analyse des ventes')}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={windowDays}
          onChange={(e, v) => { if (v != null) setWindowDays(v); }}
        >
          {PERIODS.map((p) => (
            <ToggleButton key={p.value} value={p.value} sx={{ textTransform: 'none', px: 1.5 }}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {data?.hint && <Alert severity="info" sx={{ mb: 3 }}>{data.hint}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {summary && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} md={3}>
              <SummaryCard icon={<Inventory2 />} color="#2563eb" label={t('products:restock.analyzed', 'Produits analysés')} value={summary.products_analyzed} />
            </Grid>
            <Grid item xs={6} md={3}>
              <SummaryCard icon={<LocalShipping />} color="#f59e0b" label={t('products:restock.toReorder', 'À recommander')} value={summary.products_to_reorder} />
            </Grid>
            <Grid item xs={6} md={3}>
              <SummaryCard icon={<WarningAmber />} color="#ef4444" label={t('products:restock.critical', 'Ruptures imminentes')} value={summary.critical_count} />
            </Grid>
            <Grid item xs={6} md={3}>
              <SummaryCard icon={<TrendingUp />} color="#10b981" label={t('products:restock.estCost', 'Coût estimé')} value={format(summary.estimated_total_cost)} />
            </Grid>
          </Grid>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>{t('products:restock.product', 'Produit')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('products:restock.stock', 'Stock')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('products:restock.sold', 'Qté vendue')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('products:restock.velocity', 'Ventes/jour')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('products:restock.daysLeft', 'Jours restants')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('products:restock.recommended', 'À commander')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('products:restock.statusCol', 'État')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.products || []).length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('products:restock.empty', 'Aucun produit physique à analyser.')}
                  </TableCell></TableRow>
                )}
                {(data.products || []).map((p) => (
                  <TableRow key={p.product_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${p.product_id}`)}>
                    <TableCell>
                      {p.name}
                      <Typography variant="caption" color="text.secondary" display="block">{p.reference}</Typography>
                    </TableCell>
                    <TableCell align="right">{p.stock}</TableCell>
                    <TableCell align="right">{p.units_sold ?? 0}</TableCell>
                    <TableCell align="right">{p.daily_velocity}</TableCell>
                    <TableCell align="right">{p.days_left ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: p.recommended_qty > 0 ? 'primary.main' : 'text.secondary' }}>
                      {p.recommended_qty > 0 ? `+${p.recommended_qty}` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" color={URGENCY[p.urgency]?.color || 'default'} label={urgencyLabel(p.urgency)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
