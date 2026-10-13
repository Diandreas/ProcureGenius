import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Grid, LinearProgress, CircularProgress,
  Divider, Stack, Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  WorkspacePremium, AutoAwesome, ReceiptLong, OpenInNew, ArrowForward,
  CheckCircle, CreditCard,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import subscriptionAPI from '../../services/subscriptionAPI';
import { neuShadows } from '../neumorphic/NeumorphicList';

const PLAN_META = {
  free: { labelKey: 'settings:billingPanel.plans.free', color: '#64748b' },
  pro: { label: 'Pro', color: '#2563eb' },
  business: { label: 'Business', color: '#8b5cf6' },
  enterprise: { label: 'Enterprise', color: '#0b1f4d' },
};
const STATUS_META = {
  active: { labelKey: 'settings:billingPanel.status.active', color: '#10b981' },
  trial: { labelKey: 'settings:billingPanel.status.trial', color: '#f59e0b' },
  past_due: { labelKey: 'settings:billingPanel.status.past_due', color: '#ef4444' },
  cancelled: { labelKey: 'settings:billingPanel.status.cancelled', color: '#94a3b8' },
  expired: { labelKey: 'settings:billingPanel.status.expired', color: '#94a3b8' },
};
const QUOTA_LABELS = {
  invoices: 'settings:billingPanel.quotas.invoices',
  clients: 'settings:billingPanel.quotas.clients',
  products: 'settings:billingPanel.quotas.products',
  purchase_orders: 'settings:billingPanel.quotas.purchase_orders',
  suppliers: 'settings:billingPanel.quotas.suppliers',
  ai_requests: 'settings:billingPanel.quotas.ai_requests',
};

export default function BillingPanel() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t, i18n } = useTranslation(['settings', 'common']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { setData(await subscriptionAPI.getStatus()); }
      catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const res = await subscriptionAPI.openStripePortal();
      if (!res?.portal_url) throw new Error('no-url');
    } catch (err) {
      // Le portail ne concerne que les abonnements payants : message unique et clair.
      const backendMsg = err?.response?.data?.error;
      enqueueSnackbar(
        backendMsg && !/stripe error/i.test(backendMsg)
          ? backendMsg
          : t('settings:billingPanel.noPaidSubscription'),
        { variant: 'info' }
      );
    } finally { setPortalBusy(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  const sub = data?.subscription;
  const planCode = sub?.plan?.code || data?.plan_code || 'free';
  const meta = PLAN_META[planCode] || PLAN_META.free;
  const statusKey = sub?.status || 'active';
  const status = STATUS_META[statusKey] || STATUS_META.active;
  const isTrial = sub?.is_trial || statusKey === 'trial';
  const hasStripe = !!(sub?.payment_method === 'stripe');
  const quotas = data?.quotas || {};

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(({ en: 'en-US', de: 'de-DE' }[String(i18n.language || 'fr').slice(0, 2)] || 'fr-FR'), { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <Box>
      {/* ─── Carte plan actuel ─────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative', borderRadius: 4, overflow: 'hidden', mb: 3,
        bgcolor: planCode === 'pro' ? '#0b1f4d' : 'background.paper',
        color: planCode === 'pro' ? '#fff' : 'text.primary',
        boxShadow: (th) => neuShadows.shadowRaised(th),
        p: { xs: 2.5, sm: 3.5 },
      }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, bgcolor: meta.color }} />
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
              <WorkspacePremium sx={{ color: meta.color }} />
              <Typography sx={{ fontWeight: 800, fontSize: '1.5rem' }}>{meta.labelKey ? t(meta.labelKey) : meta.label}</Typography>
              <Chip
                label={isTrial && sub?.trial_days_remaining != null ? t('settings:billingPanel.trialRemaining', { count: sub.trial_days_remaining }) : t(status.labelKey)}
                size="small"
                sx={{ fontWeight: 700, bgcolor: alpha(status.color, 0.15), color: planCode === 'pro' ? '#fff' : status.color }}
              />
            </Box>
            <Typography sx={{ fontSize: '0.9rem', opacity: 0.75 }}>
              {sub
                ? (isTrial
                    ? t('settings:billingPanel.trialEnds', { date: fmtDate(sub.trial_ends_at || sub.current_period_end) })
                    : `${planCode === 'free' ? t('settings:billingPanel.freePlan') : t('settings:billingPanel.nextRenewal', { date: fmtDate(sub.current_period_end) })}`)
                : t('settings:billingPanel.freePlan')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={5}>
            <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1.25} sx={{ alignItems: 'stretch' }}>
              <Button
                variant="contained" fullWidth endIcon={<ArrowForward />}
                onClick={() => navigate('/subscription/plans')}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5,
                  bgcolor: planCode === 'pro' ? '#f59e0b' : 'primary.main', color: planCode === 'pro' ? '#0f172a' : '#fff',
                  '&:hover': { bgcolor: planCode === 'pro' ? '#d97706' : 'primary.dark' } }}
              >
                {planCode === 'free' ? t('settings:billingPanel.choosePlan') : t('settings:billingPanel.changePlan')}
              </Button>
              <Button
                variant="outlined" fullWidth disabled={portalBusy}
                startIcon={portalBusy ? <CircularProgress size={16} /> : <CreditCard />}
                onClick={openPortal}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5,
                  borderColor: planCode === 'pro' ? 'rgba(255,255,255,0.4)' : undefined,
                  color: planCode === 'pro' ? '#fff' : undefined }}
              >
                {t('settings:billingPanel.manageBilling')}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* ─── Quotas / utilisation ──────────────────────────────────────── */}
      {Object.keys(quotas).length > 0 && (
        <Box sx={{ borderRadius: 4, bgcolor: 'background.paper', boxShadow: (th) => neuShadows.shadowRaised(th), p: { xs: 2.5, sm: 3 }, mb: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 2 }}>{t('settings:billingPanel.usage')}</Typography>
          <Grid container spacing={2.5}>
            {Object.entries(quotas).map(([key, q]) => {
              const limit = q.limit;
              const unlimited = limit === -1 || limit === null || limit === undefined;
              const used = q.used || 0;
              const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
              const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981';
              return (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600 }}>{QUOTA_LABELS[key] ? t(QUOTA_LABELS[key]) : key}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {used}{unlimited ? '' : ` / ${limit}`}
                    </Typography>
                  </Box>
                  {unlimited ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#10b981' }}>
                      <AutoAwesome sx={{ fontSize: 15 }} />
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{t('settings:billingPanel.unlimited')}</Typography>
                    </Box>
                  ) : (
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 8, borderRadius: 999, bgcolor: alpha(barColor, 0.12), '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 999 } }} />
                  )}
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ─── Aide facturation ──────────────────────────────────────────── */}
      <Alert
        severity={hasStripe ? 'success' : 'info'}
        icon={hasStripe ? <CheckCircle /> : <ReceiptLong />}
        sx={{ borderRadius: 3 }}
        action={hasStripe ? (
          <Button color="inherit" size="small" endIcon={<OpenInNew sx={{ fontSize: 15 }} />} onClick={openPortal}>
            {t('settings:billingPanel.portal')}
          </Button>
        ) : null}
      >
        {hasStripe
          ? t('settings:billingPanel.stripeManaged')
          : t('settings:billingPanel.trialOffer')}
      </Alert>
    </Box>
  );
}
