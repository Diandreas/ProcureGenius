import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent, Chip,
  Stack, Divider, CircularProgress, ToggleButtonGroup, ToggleButton, Alert,
} from '@mui/material';
import { CheckCircleOutline, Bolt, WorkspacePremium, ArrowForward, OpenInNew } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import subscriptionAPI from '../../services/subscriptionAPI';

// Pricing interne (utilisateur connecté) : lance directement le checkout Stripe,
// reste dans l'app, met en avant le plan courant.
export default function InternalPricing() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, status] = await Promise.all([
          subscriptionAPI.getPlans(),
          subscriptionAPI.getStatus().catch(() => null),
        ]);
        setPlans((p.plans || []).filter((pl) => pl.code !== 'free'));
        setCurrent(status?.subscription?.plan?.code || status?.plan_code || 'free');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubscribe = async (plan) => {
    if (plan.code === 'enterprise') {
      window.open('https://wa.me/237693427913?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20le%20plan%20Enterprise%20de%20Procura.', '_blank');
      return;
    }
    setBusy(plan.code);
    try {
      await subscriptionAPI.createStripeCheckout(plan.code, billing); // redirige vers Stripe
    } catch (err) {
      enqueueSnackbar("Impossible de lancer le paiement. Réessayez.", { variant: 'error' });
      setBusy(null);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
  const priceOf = (plan) => billing === 'yearly' ? plan.price_yearly : plan.price_monthly;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Choisissez votre plan</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          1 mois d'essai offert sur les formules payantes — sans carte. Changez ou annulez à tout moment.
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
        {plans.map((plan) => {
          const isCurrent = current === plan.code;
          const popular = plan.code === 'pro';
          const price = priceOf(plan);
          const isEnterprise = plan.code === 'enterprise';
          return (
            <Grid item xs={12} sm={6} md={4} key={plan.code}>
              <Card sx={{
                height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4,
                border: popular ? `2px solid ${alpha('#2563eb', 0.5)}` : '1px solid',
                borderColor: popular ? undefined : 'divider',
                position: 'relative', overflow: 'visible',
                boxShadow: popular ? `0 18px 50px -12px ${alpha('#2563eb', 0.3)}` : 'var(--shadow-md)',
              }}>
                {popular && (
                  <Chip icon={<Bolt sx={{ fontSize: 16 }} />} label="Le plus choisi" color="primary"
                    sx={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontWeight: 700 }} />
                )}
                <CardContent sx={{ p: 3.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    {plan.code === 'business' || isEnterprise ? <WorkspacePremium color="primary" /> : <Bolt color="primary" />}
                    <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{plan.name}</Typography>
                    {isCurrent && <Chip label="Plan actuel" size="small" color="success" variant="outlined" sx={{ ml: 'auto', fontWeight: 700 }} />}
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    {isEnterprise ? (
                      <Typography variant="h4" sx={{ fontWeight: 900 }}>Sur devis</Typography>
                    ) : (
                      <>
                        <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1, display: 'inline' }}>{fmt(price)}€</Typography>
                        <Typography component="span" color="text.secondary" sx={{ ml: 0.5 }}>/{billing === 'monthly' ? 'mois' : 'an'}</Typography>
                      </>
                    )}
                  </Box>

                  <Typography color="text.secondary" sx={{ fontSize: '0.9rem', mb: 2, minHeight: 40 }}>
                    {plan.description}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1.25} sx={{ mb: 3, flex: 1 }}>
                    {Object.entries(plan.features || {}).filter(([, v]) => v === true).slice(0, 6).map(([k]) => (
                      <Box key={k} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <CheckCircleOutline sx={{ fontSize: 18, color: '#10b981' }} />
                        <Typography sx={{ fontSize: '0.85rem' }}>{FEATURE_LABELS[k] || k}</Typography>
                      </Box>
                    ))}
                  </Stack>

                  <Button
                    fullWidth variant={popular ? 'contained' : 'outlined'}
                    disabled={isCurrent || busy === plan.code}
                    onClick={() => handleSubscribe(plan)}
                    endIcon={busy === plan.code ? <CircularProgress size={16} color="inherit" /> : (isEnterprise ? <OpenInNew /> : <ArrowForward />)}
                    sx={{ py: 1.4, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                  >
                    {isCurrent ? 'Votre plan' : isEnterprise ? 'Nous contacter' : busy === plan.code ? 'Redirection…' : "S'abonner"}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Alert severity="info" sx={{ mt: 4, borderRadius: 2 }}>
        Le paiement est sécurisé par Stripe. Après le paiement, votre compte est activé automatiquement et vous êtes redirigé vers votre tableau de bord.
      </Alert>
    </Container>
  );
}

const FEATURE_LABELS = {
  has_ai_assistant: 'Assistant IA',
  has_purchase_orders: 'Bons de commande',
  has_suppliers: 'Fournisseurs',
  has_contracts: 'Contrats',
  has_analytics: 'Analytics avancés',
  has_accounting: 'Comptabilité',
  has_e_sourcing: 'E-Sourcing (appels d\'offres)',
};
