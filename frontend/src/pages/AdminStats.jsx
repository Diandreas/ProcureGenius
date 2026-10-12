import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip,
  ToggleButton, ToggleButtonGroup, CircularProgress, Alert, Divider,
  Table, TableBody, TableCell, TableRow, LinearProgress, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  People, TrendingUp, Bolt, Paid, Visibility, AutoGraph,
  ThumbUpAlt, ThumbDownAlt, SmartToy,
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
  const { t } = useTranslation(['dashboard']);
  if (!rows || !rows.length) {
    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={700} mb={1}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{t('dashboard:adminStats.noData')}</Typography>
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
  const { t } = useTranslation(['dashboard']);
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
      if (code === 403) setError('forbidden');
      else setError('loadFailed');
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
  const devise = !sub.currency || sub.currency === 'EUR' ? '€' : (sub.currency === 'XAF' || sub.currency === 'XOF' ? 'FCFA' : sub.currency);
  const vol = feat.volumes || {};
  const fb = data?.ai_feedback || {};

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
             alignItems={{ sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            {t('dashboard:adminStats.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard:adminStats.subtitle')}
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small" exclusive value={days}
          onChange={(_, v) => v && setDays(v)}
        >
          <ToggleButton value={7}>{t('dashboard:adminStats.daysShort', { days: 7 })}</ToggleButton>
          <ToggleButton value={30}>{t('dashboard:adminStats.daysShort', { days: 30 })}</ToggleButton>
          <ToggleButton value={90}>{t('dashboard:adminStats.daysShort', { days: 90 })}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && <Alert severity="warning">{t(`dashboard:adminStats.errors.${error}`)}</Alert>}

      {data && !loading && !error && (
        <Stack spacing={3}>
          {/* KPI principaux */}
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <KpiCard icon={<People />} label={t('dashboard:adminStats.kpi.users')}
                value={fmt(u.total)}
                sub={t('dashboard:adminStats.kpi.usersSub', { added: fmt(u.new_this_period), days, growth: u.growth_pct == null ? '' : (u.growth_pct >= 0 ? '+' : '') + u.growth_pct + '%' })}
                color={theme.palette.primary.main} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard icon={<Bolt />} label={t('dashboard:adminStats.kpi.activationRate')}
                value={pct(act.activation_rate)}
                sub={t('dashboard:adminStats.kpi.activationSub', { acted: fmt(act.users_with_real_action), signedUp: fmt(act.signed_up) })}
                color={theme.palette.warning.main} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard icon={<TrendingUp />} label={t('dashboard:adminStats.kpi.activeUsers')}
                value={`${fmt(eng.wau)} / ${fmt(eng.mau)}`}
                sub={t('dashboard:adminStats.kpi.stickiness', { value: pct(eng.stickiness_pct) })}
                color={theme.palette.success.main} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard icon={<Paid />} label={t('dashboard:adminStats.kpi.mrr')}
                value={`${fmt(sub.mrr_estimate)} ${devise}`}
                sub={t('dashboard:adminStats.kpi.mrrSub', { active: fmt(sub.active), churn: pct(sub.churn_rate_pct) })}
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
                    <Typography variant="subtitle2" fontWeight={700}>{t('dashboard:adminStats.acquisition.title')}</Typography>
                  </Stack>
                  {acq.available ? (
                    <>
                      <Stack direction="row" spacing={3} mb={2}>
                        <Box>
                          <Typography variant="h5" fontWeight={800}>{fmt(acq.unique_visitors)}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('dashboard:adminStats.acquisition.uniqueVisitors')}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="h5" fontWeight={800}>{pct(acq.visit_to_signup_rate)}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('dashboard:adminStats.acquisition.visitToSignup')}</Typography>
                        </Box>
                      </Stack>
                      {acq.funnel?.length > 0 && (
                        <Box mb={2}>
                          {/* Barres rapportées à l'accueil : on voit d'un coup d'œil où ils partent. */}
                          <ListPanel title={t('dashboard:adminStats.acquisition.visitorJourney')} rows={acq.funnel}
                            labelKey="label" valueKey="visitors"
                            total={Math.max(...acq.funnel.map((e) => e.visitors), 1)} />
                        </Box>
                      )}
                      <ListPanel title={t('dashboard:adminStats.acquisition.trafficSources')} rows={acq.top_sources}
                        labelKey="referrer_domain" valueKey="c" />
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {t('dashboard:adminStats.acquisition.empty')}
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
                      {t('dashboard:adminStats.signups.title', { days })}
                    </Typography>
                  </Stack>
                  <Typography variant="h4" fontWeight={800}>{fmt(u.new_this_period)}</Typography>
                  <Box sx={{ my: 1 }}>
                    <Sparkline data={u.daily_signups} color={theme.palette.primary.main} />
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={t('dashboard:adminStats.signups.last24h', { value: fmt(u.new_last_24h) })} />
                    <Chip size="small" label={t('dashboard:adminStats.signups.last7d', { value: fmt(u.new_last_7d) })} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent>
                  <ListPanel title={t('dashboard:adminStats.featureUsage')}
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
                    {t('dashboard:adminStats.volumes.title')}
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      {[
                        [t('dashboard:adminStats.volumes.invoices'), vol.invoices],
                        [t('dashboard:adminStats.volumes.purchaseOrders'), vol.purchase_orders],
                        [t('dashboard:adminStats.volumes.products'), vol.products],
                        [t('dashboard:adminStats.volumes.clients'), vol.clients],
                        [t('dashboard:adminStats.volumes.suppliers'), vol.suppliers],
                        [t('dashboard:adminStats.volumes.aiConversations'), vol.ai_conversations],
                        [t('dashboard:adminStats.volumes.aiMessages', { days }), vol.ai_messages_period],
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
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{t('dashboard:adminStats.subscriptions.title')}</Typography>
                  <Grid container spacing={2} mb={1}>
                    <Grid item xs={4}>
                      <Typography variant="h5" fontWeight={800}>{fmt(sub.active)}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('dashboard:adminStats.subscriptions.active')}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h5" fontWeight={800}>{fmt(sub.trial)}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('dashboard:adminStats.subscriptions.trial')}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h5" fontWeight={800}>{fmt(sub.cancelled)}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('dashboard:adminStats.subscriptions.cancelled')}</Typography>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{t('dashboard:adminStats.kpi.mrr')}</Typography>
                    <Typography variant="body2" fontWeight={700}>{fmt(sub.mrr_estimate)} {devise}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{t('dashboard:adminStats.subscriptions.arr')}</Typography>
                    <Typography variant="body2" fontWeight={700}>{fmt(sub.arr_estimate)} {devise}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{t('dashboard:adminStats.subscriptions.trialsEnding')}</Typography>
                    <Typography variant="body2" fontWeight={700}>{fmt(sub.trials_ending_7d)}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Feedback IA (pouces haut/bas) */}
          {fb.available && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 3 }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                      <SmartToy fontSize="small" color="action" />
                      <Typography variant="subtitle2" fontWeight={700}>
                        {t('dashboard:adminStats.aiFeedback.title', { days })}
                      </Typography>
                    </Stack>
                    <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                      {pct(fb.satisfaction_pct)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                      {t('dashboard:adminStats.aiFeedback.total', { count: fb.total || 0, total: fmt(fb.total) })}
                    </Typography>
                    <Stack direction="row" spacing={3}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <ThumbUpAlt fontSize="small" sx={{ color: theme.palette.success.main }} />
                        <Typography variant="body2" fontWeight={700}>{fmt(fb.positive)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <ThumbDownAlt fontSize="small" sx={{ color: theme.palette.error.main }} />
                        <Typography variant="body2" fontWeight={700}>{fmt(fb.negative)}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Card sx={{ height: '100%', borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                      {t('dashboard:adminStats.aiFeedback.recentNegative')}
                    </Typography>
                    {fb.recent_negative && fb.recent_negative.length ? (
                      <Stack spacing={1.5} sx={{ maxHeight: 320, overflowY: 'auto' }}>
                        {fb.recent_negative.map((r) => (
                          <Box key={r.id} sx={{
                            p: 1.5, borderRadius: 2,
                            bgcolor: alpha(theme.palette.error.main, 0.05),
                            border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
                          }}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">
                                {r.user || t('dashboard:adminStats.aiFeedback.user')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(r.created_at).toLocaleDateString('fr-FR')}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', mb: r.comment ? 0.5 : 0 }} noWrap>
                              {t('dashboard:adminStats.aiFeedback.quotedExcerpt', { text: r.message_excerpt })}
                            </Typography>
                            {r.comment && (
                              <Typography variant="body2" fontWeight={600}>
                                {r.comment}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t('dashboard:adminStats.aiFeedback.noNegative')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          <Typography variant="caption" color="text.secondary" textAlign="center">
            {t('dashboard:adminStats.generatedAt', { date: data.generated_at ? new Date(data.generated_at).toLocaleString('fr-FR') : '' })}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
