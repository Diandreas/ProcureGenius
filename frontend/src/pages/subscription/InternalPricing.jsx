import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Button, Grid, Chip,
  Stack, Divider, CircularProgress, ToggleButtonGroup, ToggleButton, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { Check, Close, ArrowForward, OpenInNew, Bolt, WarningAmber } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import subscriptionAPI from '../../services/subscriptionAPI';
import { PLANS } from '../../data/pricingPlans';

const BLUE = '#2563eb';
const NAVY = '#0b1f4d';
const GOLD = '#f59e0b';

// Pricing interne (utilisateur connecté) — MÊME contenu que la page publique
// (data/pricingPlans), avec checkout Stripe direct et mise en avant du plan courant.
export default function InternalPricing() {
  const { enqueueSnackbar } = useSnackbar();
  const [current, setCurrent] = useState('free');
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [confirmPlan, setConfirmPlan] = useState(null); // downgrade a confirmer
  const [subStatus, setSubStatus] = useState(null);     // statut complet (annulation, dates)
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Rang des plans pour detecter un downgrade.
  const RANK = { free: 0, pro: 1, business: 2, enterprise: 3 };
  const isDowngrade = (target) => (RANK[target] ?? 0) < (RANK[current] ?? 0);

  const loadStatus = async () => {
    const status = await subscriptionAPI.getStatus().catch(() => null);
    setSubStatus(status);
    setCurrent(status?.subscription?.plan?.code || status?.plan_code || 'free');
  };

  useEffect(() => {
    (async () => {
      try { await loadStatus(); } finally { setLoading(false); }
    })();
  }, []);

  const sub = subStatus?.subscription || null;
  const isPaidPlan = current === 'pro' || current === 'business';
  const cancelScheduled = Boolean(sub?.cancelled_at) && sub?.status !== 'cancelled';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      const res = await subscriptionAPI.cancel({ immediately: false, reason: cancelReason });
      enqueueSnackbar(`Abonnement annulé. Actif jusqu'au ${fmtDate(res?.ends_at)}.`, { variant: 'success' });
      setCancelOpen(false);
      setCancelReason('');
      await loadStatus();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "Impossible d'annuler l'abonnement.", { variant: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  // Execute reellement le changement de plan (apres confirmation si downgrade).
  const doChangePlan = async (plan) => {
    if (plan.code === 'free') {
      setBusy('free');
      try { await subscriptionAPI.startTrial('free'); enqueueSnackbar('Plan gratuit activé.', { variant: 'success' }); setCurrent('free'); }
      catch { enqueueSnackbar('Action impossible.', { variant: 'error' }); }
      finally { setBusy(null); }
      return;
    }
    if (plan.code === 'enterprise') {
      window.open('https://wa.me/237693427913?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20le%20plan%20Enterprise%20de%20Procura.', '_blank');
      return;
    }
    setBusy(plan.code);
    try {
      await subscriptionAPI.createStripeCheckout(plan.code, billing); // redirige vers Stripe
    } catch (err) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail;
      enqueueSnackbar(detail || 'Impossible de lancer le paiement. Réessayez.', { variant: 'error' });
      setBusy(null);
    }
  };

  const handleCTA = (plan) => {
    if (plan.code === current) return;
    // Downgrade : on previent l'utilisateur des privileges perdus avant d'agir.
    if (isDowngrade(plan.code)) {
      setConfirmPlan(plan);
      return;
    }
    doChangePlan(plan);
  };

  const priceOf = (plan) => billing === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1, md: 3 } }}>
      {/* Mon abonnement (plan courant + annulation in-app) */}
      {isPaidPlan && sub && (
        <Box sx={{
          mb: 4, p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: 'background.paper',
          boxShadow: 'var(--shadow-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
        }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mon abonnement
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>{sub.plan?.name || current}</Typography>
              {sub.is_trial && <Chip size="small" color="success" label={`Essai — ${sub.trial_days_remaining} j`} />}
              {cancelScheduled && <Chip size="small" color="warning" label="Annulation programmée" />}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {cancelScheduled
                ? `Actif jusqu'au ${fmtDate(sub.current_period_end)} — non renouvelé.`
                : `Prochain renouvellement le ${fmtDate(sub.current_period_end)}.`}
            </Typography>
          </Box>
          {!cancelScheduled && (
            <Button variant="outlined" color="inherit" onClick={() => setCancelOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', borderColor: 'divider' }}>
              Annuler l'abonnement
            </Button>
          )}
        </Box>
      )}

      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Votre abonnement</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          1 mois d'essai offert sur Pro et Business — sans carte. Changez ou annulez à tout moment.
        </Typography>
        <ToggleButtonGroup
          exclusive value={billing} onChange={(_, v) => v && setBilling(v)} size="small"
          sx={{ bgcolor: 'background.paper', borderRadius: 999, p: 0.5, boxShadow: 'var(--shadow-sm)' }}
        >
          <ToggleButton value="monthly" sx={{ border: 0, borderRadius: '999px !important', px: 3, textTransform: 'none', fontWeight: 700 }}>Mensuel</ToggleButton>
          <ToggleButton value="yearly" sx={{ border: 0, borderRadius: '999px !important', px: 3, textTransform: 'none', fontWeight: 700 }}>
            Annuel <Chip label="−20%" size="small" color="success" sx={{ ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {PLANS.map((plan) => {
          const isCurrent = current === plan.code;
          const featured = plan.code === 'pro';
          const price = priceOf(plan);
          return (
            <Grid item xs={12} sm={6} md={3} key={plan.code}>
              <Box sx={{
                height: '100%', display: 'flex', flexDirection: 'column', p: 3, borderRadius: 4,
                position: 'relative', overflow: 'visible',
                bgcolor: featured ? NAVY : 'background.paper',
                color: featured ? '#fff' : 'text.primary',
                border: isCurrent ? `2px solid ${GOLD}` : (featured ? 'none' : '1px solid'),
                borderColor: isCurrent ? GOLD : 'divider',
                boxShadow: featured ? `0 20px 50px -16px ${alpha(BLUE, 0.45)}` : 'var(--shadow-md)',
              }}>
                {plan.badge && (
                  <Typography sx={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: GOLD, mb: 1.5 }}>
                    {plan.badge}
                  </Typography>
                )}
                {!plan.badge && <Box sx={{ height: 24, mb: 1.5 }} />}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 24, fontWeight: 600 }}>{plan.name}</Typography>
                  {isCurrent && <Chip label="Plan actuel" size="small" sx={{ ml: 'auto', fontWeight: 700, bgcolor: alpha(GOLD, 0.18), color: featured ? '#fff' : '#9a6500' }} />}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1.5, mb: 1 }}>
                  {price === null ? (
                    <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: 30, fontWeight: 600 }}>Sur devis</Typography>
                  ) : price === 0 ? (
                    <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: 30, fontWeight: 600 }}>Gratuit</Typography>
                  ) : (
                    <>
                      <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{fmt(price)}€</Typography>
                      <Typography sx={{ fontSize: 13, color: featured ? 'rgba(255,255,255,0.6)' : 'text.secondary' }}>/{billing === 'monthly' ? 'mois' : 'an'}</Typography>
                    </>
                  )}
                </Box>

                <Typography sx={{ fontSize: 13.5, lineHeight: 1.5, color: featured ? 'rgba(255,255,255,0.72)' : 'text.secondary', mb: 2.5, minHeight: 44 }}>
                  {plan.tagline}
                </Typography>

                <Button
                  fullWidth disableElevation
                  disabled={isCurrent || busy === plan.code}
                  onClick={() => handleCTA(plan)}
                  endIcon={busy === plan.code ? <CircularProgress size={16} color="inherit" /> : (plan.code === 'enterprise' ? <OpenInNew sx={{ fontSize: 16 }} /> : <ArrowForward sx={{ fontSize: 16 }} />)}
                  sx={{
                    py: 1.25, mb: 2.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 14.5,
                    ...(featured
                      ? { bgcolor: GOLD, color: '#0f172a', '&:hover': { bgcolor: '#d97706' } }
                      : { bgcolor: BLUE, color: '#fff', '&:hover': { bgcolor: '#1d4ed8' } }),
                    '&.Mui-disabled': { bgcolor: alpha('#94a3b8', 0.3), color: featured ? 'rgba(255,255,255,0.6)' : 'text.disabled' },
                  }}
                >
                  {isCurrent ? 'Votre plan' : busy === plan.code ? 'Redirection…' : plan.cta}
                </Button>

                <Stack spacing={1.1} sx={{ flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Check sx={{ fontSize: 17, color: featured ? GOLD : '#10b981', mt: '1px', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13, color: featured ? 'rgba(255,255,255,0.9)' : 'text.primary' }}>{f}</Typography>
                    </Box>
                  ))}
                  {plan.missing.map((f, i) => (
                    <Box key={`m${i}`} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', opacity: 0.5 }}>
                      <Close sx={{ fontSize: 17, mt: '1px', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13, textDecoration: 'line-through' }}>{f}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Alert severity="info" sx={{ mt: 4, borderRadius: 2 }}>
        Paiement sécurisé par Stripe. Après le paiement, votre compte est activé automatiquement et vous êtes redirigé vers votre tableau de bord.
      </Alert>

      {/* Confirmation de downgrade : on liste les privileges perdus. */}
      <Dialog open={Boolean(confirmPlan)} onClose={() => setConfirmPlan(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <WarningAmber sx={{ color: GOLD }} /> Confirmer le changement
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            En passant au plan <strong>{confirmPlan?.name}</strong>, vous perdez l'accès à :
          </Typography>
          <Stack spacing={0.75}>
            {(confirmPlan?.missing || []).map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Close sx={{ fontSize: 16, color: 'error.main' }} />
                <Typography variant="body2">{f}</Typography>
              </Box>
            ))}
            {(!confirmPlan?.missing || confirmPlan.missing.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                Vos quotas (factures, clients, utilisateurs…) seront réduits selon le plan {confirmPlan?.name}.
              </Typography>
            )}
          </Stack>
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            Vos données sont conservées, mais ces fonctionnalités deviennent inaccessibles tant que vous n'êtes pas sur un plan supérieur.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmPlan(null)}>Annuler</Button>
          <Button
            variant="contained" color="warning"
            onClick={() => { const p = confirmPlan; setConfirmPlan(null); doChangePlan(p); }}
          >
            Confirmer le passage à {confirmPlan?.name}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Annulation in-app (retention + raison) */}
      <Dialog open={cancelOpen} onClose={cancelling ? undefined : () => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Annuler votre abonnement ?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
            Votre abonnement restera <strong>actif jusqu'au {fmtDate(sub?.current_period_end)}</strong>.
            Ensuite, vous repasserez en Gratuit et perdrez l'accès aux fonctionnalités payantes
            (vos données sont conservées).
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Une raison ? (facultatif — ça nous aide à nous améliorer)
          </Typography>
          <TextField
            fullWidth multiline minRows={2} size="small" placeholder="Trop cher, je n'utilise pas assez…"
            value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelling} variant="contained" sx={{ textTransform: 'none' }}>
            Garder mon abonnement
          </Button>
          <Button onClick={confirmCancel} disabled={cancelling} color="error" sx={{ textTransform: 'none' }}>
            {cancelling ? 'Annulation…' : "Confirmer l'annulation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
