import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip,
  ToggleButton, ToggleButtonGroup, CircularProgress, Alert, Divider,
  Table, TableBody, TableCell, TableRow, LinearProgress, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  People, TrendingUp, Bolt, Paid, Visibility, AutoGraph,
} from '@mui/icons-material';
import api from '../services/api';

/**
 * Tableau de bord produit (admin/fondateur).
 * Consomme GET /api/v1/analytics/admin-stats/?days=N (superuser only).
 * Donne une lecture immédiate de : acquisition, activation, engagement,
 * usage par fonctionnalité, et revenu/churn — pour décider quoi améliorer.
 */

const fmt = (n) => (n == null ? '—' : new Intl.NumberFormat('fr-FR').format(n));
const pct = (n) => (n == null ? '—' : `${n} %`);

function KpiCard({ icon, label, value, sub, color }) {
  const theme = useTheme();
  const c = color || theme.palette.primary.main;
  return (
    <Card sx={{ height: '100%', borderRadius: 3, border: `1px solid ${alpha(c, 0.18)}` }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center',
            bgcolor: alpha(c, 0.12), color: c,
          }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">{sub}</Typography>
        )}
      </CardContent>
    </Card>
  );
}

function Sparkline({ data, color }) {
  const theme = useTheme();
  const c = color || theme.palette.primary.main;
  if (!data || !data.length) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 100, H = 28;
  const step = W / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => `${i * step},${H - (d.count / max) * H}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

function ListPanel({ title, rows, labelKey, valueKey, total }) {
  const theme = useTheme();
  if (!rows || !rows.length) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} mb={1}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">Aucune donnée</Typography>
      </Box>
    );
  }
  const sum = total || rows.reduce((a, r) => a + (r[valueKey] || 0), 0) || 1;
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{title}</Typography>
      <Stack spacing={1.2}>
        {rows.map((r, i) => {
          const val = r[valueKey] || 0;
          const label = r[labelKey] || '—';
          return (
            <Box key={i}>
              <Stack direction="row" justifyContent="space-between" mb={0.4}>
                <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>{label}</Typography>
                <Typography variant="body2" fontWeight={700}>{fmt(val)}</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (val / sum) * 100)}
                sx={{ height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.08) }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export default function AdminStats() {
  const theme = useTheme();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (d) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/analytics/admin-stats/?days=${d}`);
      setData(res.data);
    } catch (e) {
      const code = e?.response?.status;
      if (code === 403) setError("Accès réservé aux administrateurs (superuser).");
      else setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const u = data?.users || {};
  const acq = data?.acquisition || {};
  const act = data?.activation || {};
  const eng = data?.engagement || {};
  const feat = data?.feature_usage || {};
  const sub = data?.subscriptions || {};
  const vol = feat.volumes || {};

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
             alignItems={{ sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            Statistiques produit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acquisition, activation, usage réel et revenu — pour savoir quoi améliorer.
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small" exclusive value={days}
          onChange={(_, v) => v && setDays(v)}
        >
          <ToggleButton value={7}>7 j</ToggleButton>
          <ToggleButton value={30}>30 j</ToggleButton>
          <ToggleButton value={90}>90 j</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && <Alert severity="warning">{error}</Alert>}

      {data && !loading && !error && (
        <Stack spacing={3}>
          {/* KPI principaux */}
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <KpiCard icon={<People />} label="Utilisateurs"
                value={fmt(u.total)}
                sub={`+${fmt(u.new_this_period)} sur ${days} j · ${u.growth_pct == null ? '' : (u.growth_pct >= 0 ? '+' : '') + u.growth_pct + '%'}`}
                color={theme.palette.primary.main} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard icon={<Bolt />} label="Taux d'activation"
                value={pct(act.activation_rate)}
                sub={`${fmt(act.users_with_real_action)} / ${fmt(act.signed_up)} ont agi`}
                color={theme.palette.warning.main} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard icon={<TrendingUp />} label="Actifs (WAU / MAU)"
                value={`${fmt(eng.wau)} / ${fmt(eng.mau)}`}
                sub={`Stickiness ${pct(eng.stickiness_pct)}`}
                color={theme.palette.success.main} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard icon={<Paid />} label="MRR estimé"
                value={`${fmt(sub.mrr_estimate)} €`}
                sub={`${fmt(sub.active)} actifs · churn ${pct(sub.churn_rate_pct)}`}
                color={theme.palette.info.main} />
            </Grid>
          </Grid>

          {/* Acquisition + inscriptions */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Visibility fontSize="small" color="action" />
                    <Typography variant="subtitle2" fontWeight={700}>Acquisition</Typography>
                  </Stack>
                  {acq.available ? (
                    <>
                      <Stack direction="row" spacing={3} mb={2}>
                        <Box>
                          <Typography variant="h5" fontWeight={800}>{fmt(acq.unique_visitors)}</Typography>
                          <Typography variant="caption" color="text.secondary">visiteurs uniques</Typography>
                        </Box>
                        <Box>
                          <Typography variant="h5" fontWeight={800}>{pct(acq.visit_to_signup_rate)}</Typography>
                          <Typography variant="caption" color="text.secondary">visite → inscription</Typography>
                        </Box>
                      </Stack>
                      <ListPanel title="Sources de trafic" rows={acq.top_sources}
                        labelKey="referrer_domain" valueKey="c" />
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Aucune visite enregistrée pour l'instant. Le tracking démarre dès les prochaines visites de la landing.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <AutoGraph fontSize="small" color="action" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Inscriptions ({days} j)
                    </Typography>
                  </Stack>
                  <Typography variant="h4" fontWeight={800}>{fmt(u.new_this_period)}</Typography>
                  <Box sx={{ my: 1 }}>
                    <Sparkline data={u.daily_signups} color={theme.palette.primary.main} />
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={`24h : ${fmt(u.new_last_24h)}`} />
                    <Chip size="small" label={`7j : ${fmt(u.new_last_7d)}`} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent>
                  <ListPanel title="Usage par fonctionnalité"
                    rows={feat.by_feature} labelKey="entity_type" valueKey="c" />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Volumes métier + abonnements */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                    Volume de données créées
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      {[
                        ['Factures', vol.invoices],
                        ['Bons de commande', vol.purchase_orders],
                        ['Produits', vol.products],
                        ['Clients', vol.clients],
                        ['Fournisseurs', vol.suppliers],
                        ['Conversations IA', vol.ai_conversations],
                        [`Messages IA (${days} j)`, vol.ai_messages_period],
                      ].map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell sx={{ border: 0, py: 0.6 }}>{k}</TableCell>
                          <TableCell align="right" sx={{ border: 0, py: 0.6, fontWeight: 700 }}>
                            {fmt(v)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Abonnements & revenu</Typography>
                  <Grid container spacing={2} mb={1}>
                    <Grid item xs={4}>
                      <Typography variant="h5" fontWeight={800}>{fmt(sub.active)}</Typography>
                      <Typography variant="caption" color="text.secondary">actifs</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h5" fontWeight={800}>{fmt(sub.trial)}</Typography>
                      <Typography variant="caption" color="text.secondary">en essai</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h5" fontWeight={800}>{fmt(sub.cancelled)}</Typography>
                      <Typography variant="caption" color="text.secondary">annulés</Typography>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">MRR estimé</Typography>
                    <Typography variant="body2" fontWeight={700}>{fmt(sub.mrr_estimate)} €</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">ARR estimé</Typography>
                    <Typography variant="body2" fontWeight={700}>{fmt(sub.arr_estimate)} €</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Essais finissant sous 7 j</Typography>
                    <Typography variant="body2" fontWeight={700}>{fmt(sub.trials_ending_7d)}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary" textAlign="center">
            Généré le {data.generated_at ? new Date(data.generated_at).toLocaleString('fr-FR') : ''}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
