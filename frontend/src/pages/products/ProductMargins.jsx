import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Paper, CircularProgress, Alert,
  ToggleButtonGroup, ToggleButton, Chip, LinearProgress, Tooltip, Button,
} from '@mui/material';
import {
  TrendingUp, ShoppingCart, AccountBalanceWallet, Percent, Info, WarningAmber,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import analyticsAPI from '../../services/analyticsAPI';
import useCurrency from '../../hooks/useCurrency';

const PERIODS = [
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: '3 mois' },
  { value: 'year', label: 'Année' },
  { value: 'all', label: 'Tout' },
];

const SummaryCard = ({ icon, label, value, color, sub }) => (
  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={1} sx={{ color }}>
        {icon}
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
      <Typography variant="h5" fontWeight={800}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
);

export default function ProductMargins() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [period, setPeriod] = useState('year');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    analyticsAPI.getProductMargins({ period })
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError('Erreur lors du chargement des marges.'))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary;

  return (
    <Box p={{ xs: 2, md: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={1}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Marges & bénéfice brut</Typography>
          <Typography variant="body2" color="text.secondary">
            Calculé automatiquement : ventes − prix d'achat de vos produits.
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small" exclusive value={period}
          onChange={(_, v) => v && setPeriod(v)}
        >
          {PERIODS.map((p) => (
            <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {data?.hint && (
        <Alert
          severity="info" icon={<Info />} sx={{ mb: 3 }}
          action={
            <Typography
              variant="button" sx={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => navigate('/accounting')}
            >
              Ajouter mes charges →
            </Typography>
          }
        >
          {data.hint}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {summary && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} md={3}>
              <SummaryCard icon={<ShoppingCart />} color="#6366f1"
                label="Chiffre d'affaires" value={format(summary.total_revenue)}
                sub={`${summary.products_count} produit(s) vendu(s)`} />
            </Grid>
            <Grid item xs={6} md={3}>
              <SummaryCard icon={<AccountBalanceWallet />} color="#f59e0b"
                label="Coût d'achat (CMV)" value={format(summary.total_cogs)} />
            </Grid>
            <Grid item xs={6} md={3}>
              <SummaryCard icon={<TrendingUp />} color="#10b981"
                label="Bénéfice brut" value={format(summary.total_gross_profit)} />
            </Grid>
            <Grid item xs={6} md={3}>
              <SummaryCard icon={<Percent />} color="#0ea5e9"
                label="Taux de marge" value={`${summary.total_margin_percent} %`} />
            </Grid>
          </Grid>

          {summary.products_without_cost > 0 && (
            <Alert
              severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => navigate('/products')} sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                  Renseigner les prix d'achat →
                </Button>
              }
            >
              {summary.products_without_cost} produit(s) n'ont pas de prix d'achat renseigné :
              leur bénéfice brut est surévalué. Renseignez le prix d'achat dans la fiche produit
              pour un calcul fiable.
            </Alert>
          )}

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Produit</strong></TableCell>
                  <TableCell align="right"><strong>Prix d'achat</strong></TableCell>
                  <TableCell align="right"><strong>Vendus</strong></TableCell>
                  <TableCell align="right"><strong>CA</strong></TableCell>
                  <TableCell align="right"><strong>Bénéfice brut</strong></TableCell>
                  <TableCell align="right"><strong>Marge</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        Pas encore de marges à afficher
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Les marges se calculent à partir de vos ventes et du <strong>prix d'achat</strong> de
                        vos produits. Renseignez le prix d'achat sur vos fiches produit pour commencer.
                      </Typography>
                      <Button variant="contained" size="small" onClick={() => navigate('/products')}>
                        Aller à mes produits
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {data.products.map((p) => (
                  <TableRow
                    key={p.product_id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/products/${p.product_id}`)}
                  >
                    <TableCell>
                      {p.name}
                      {p.cost_missing && (
                        <Tooltip title="Prix d'achat manquant">
                          <Chip size="small" color="warning" label="prix d'achat ?" sx={{ ml: 1, height: 18 }} />
                        </Tooltip>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {p.reference}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{format(p.cost_price)}</TableCell>
                    <TableCell align="right">{p.units_sold}</TableCell>
                    <TableCell align="right">{format(p.revenue)}</TableCell>
                    <TableCell align="right" sx={{ color: p.gross_profit >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
                      {format(p.gross_profit)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={`${p.margin_percent} %`}
                        color={p.margin_percent >= 30 ? 'success' : p.margin_percent >= 10 ? 'warning' : 'default'}
                      />
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
