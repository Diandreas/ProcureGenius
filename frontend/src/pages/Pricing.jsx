import React, { useState } from 'react';
import {
  Container, Grid, Box, Typography, Button, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Check, Close, WhatsApp, NorthEast,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import subscriptionAPI from '../services/subscriptionAPI';
import { PLAN_CHOISI_KEY, avecPrixSiege, nomDevise } from '../data/pricingPlans';
import usePlansTarifs, { traduirePlan } from '../hooks/usePlansTarifs';
import usePageMeta from '../hooks/usePageMeta';
import { usePricingCurrency, memeMonnaie, formatPriceCurrency } from '../utils/visitorCurrency';

// ── Direction artistique : éditorial premium, dans la charte Procura ──────────
// Charte : bleu #2563eb (primaire) + doré #f59e0b (accent) + ardoise.
// Titres en serif (Fraunces), corps en sans épuré (Inter Tight). Aucun emoji.
// Carte « Pro » mise en avant en bleu marine profond, accents dorés sobres.
const INK = '#0f172a';        // texte / fond marine profond (slate-900, charte)
const NAVY = '#0b1f4d';       // marine premium dérivé du bleu primaire
const BLUE = '#2563eb';       // bleu primaire de la charte
const GOLD = '#f59e0b';       // doré accent de la charte (boucle mascotte)
const IVORY = '#f8fafc';      // fond clair de la charte (subtle)
const LINE = 'rgba(15,23,42,0.12)';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600;700&display=swap';

// Lignes du comparatif : codes stables, libellés traduits au rendu
// (subscription:pricing.comparison.rows / .values).
const COMPARISON = [
  { key: 'invoicesPerMonth', free: '30', pro: 'unlimited', business: 'unlimited', enterprise: 'unlimited' },
  { key: 'clients', free: '20', pro: 'unlimited', business: 'unlimited', enterprise: 'unlimited' },
  { key: 'products', free: '50', pro: 'unlimited', business: 'unlimited', enterprise: 'unlimited' },
  { key: 'purchaseOrders', free: false, pro: 'unlimited', business: 'unlimited', enterprise: 'unlimited' },
  { key: 'suppliers', free: false, pro: 'unlimited', business: 'unlimited', enterprise: 'unlimited' },
  { key: 'accounting', free: false, pro: true, business: true, enterprise: true },
  { key: 'aiAssistant', free: false, pro: 'aiPerMonth', business: 'unlimited', enterprise: 'unlimited' },
  { key: 'contracts', free: false, pro: true, business: true, enterprise: true },
  { key: 'eSourcing', free: false, pro: false, business: true, enterprise: true },
  { key: 'advancedAnalytics', free: false, pro: true, business: true, enterprise: true },
  { key: 'adFree', free: false, pro: true, business: true, enterprise: true },
  { key: 'prioritySupport', free: false, pro: false, business: true, enterprise: true },
];
const COMPARISON_VALUES = ['unlimited', 'aiPerMonth'];

const CellValue = ({ value }) => {
  const { t } = useTranslation(['subscription', 'common']);
  if (value === true) return <Check sx={{ color: GOLD, fontSize: 18 }} />;
  if (value === false) return <Close sx={{ color: 'rgba(20,17,14,0.22)', fontSize: 18 }} />;
  const text = COMPARISON_VALUES.includes(value) ? t(`subscription:pricing.comparison.values.${value}`) : value;
  return <Typography sx={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 14, fontWeight: 500 }}>{text}</Typography>;
};

const serif = { fontFamily: '"Fraunces", Georgia, serif' };
const sans = { fontFamily: '"Inter Tight", system-ui, sans-serif' };

const Pricing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['subscription', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [choixPeriode, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const { currency, formatPrice } = usePricingCurrency();
  // Prix lus dans Stripe (via le serveur) ; l'annuel n'existe que si Stripe en a un.
  const { plans: plansTarifs, annuelDisponible, siege } = usePlansTarifs();
  const PLANS = plansTarifs.map((p) => traduirePlan(t, p));
  const billing = annuelDisponible ? choixPeriode : 'monthly';
  const deviseFacturation = siege.devise;
  // Visiteur dont la monnaie diffère de celle de facturation : équivalent indicatif.
  const enDevise = !memeMonnaie(currency, deviseFacturation);
  const prix = (montant, devise = deviseFacturation) => formatPrice(montant, devise);
  const facture = (montant, devise = deviseFacturation) => formatPriceCurrency(montant, devise);

  usePageMeta({ page: 'pricing', path: '/pricing' });

  const getPrice = (plan) => {
    if (plan.priceMonthly === null) return null;
    if (plan.priceMonthly === 0) return 0;
    return billing === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  };

  const handleCTA = async (plan) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('access_token');
    if (plan.code === 'free' || (!token && plan.code !== 'enterprise')) {
      // Visiteur sans compte : on l'envoie créer son compte (pas vers la
      // connexion, qu'il ne peut pas utiliser), en retenant le plan choisi.
      try { sessionStorage.setItem(PLAN_CHOISI_KEY, plan.code); } catch (_) { /* mode privé */ }
      navigate('/register');
      return;
    }
    if (plan.code === 'enterprise') {
      window.open(`https://wa.me/237693427913?text=${encodeURIComponent(t('subscription:enterpriseWhatsappMessage'))}`, '_blank');
      return;
    }
    setLoading(plan.code);
    try {
      await subscriptionAPI.createStripeCheckout(plan.code, billing);
    } catch (err) {
      console.error('Stripe checkout error:', err);
      alert(t('subscription:pricing.checkoutError'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box sx={{ bgcolor: IVORY, minHeight: '100vh', color: INK, ...sans }}>
      <link rel="stylesheet" href={FONTS_HREF} />

      {/* ── En-tête éditorial ─────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ pt: { xs: 7, md: 12 }, pb: { xs: 5, md: 8 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box sx={{ width: 28, height: 1, bgcolor: GOLD }} />
          <Typography sx={{ ...sans, fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, fontWeight: 600 }}>
            {t('subscription:pricing.eyebrow')}
          </Typography>
        </Box>

        <Grid container spacing={4} alignItems="flex-end">
          <Grid item xs={12} md={8}>
            <Typography sx={{ ...serif, fontSize: { xs: 40, md: 68 }, lineHeight: 1.02, fontWeight: 400, letterSpacing: '-0.02em' }}>
              <Trans
                t={t}
                i18nKey="subscription:pricing.heroTitle"
                components={{ br: <br />, accent: <Box component="span" sx={{ fontStyle: 'italic', color: GOLD }} /> }}
              />
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography sx={{ ...sans, fontSize: 17, lineHeight: 1.6, color: 'rgba(20,17,14,0.66)' }}>
              {t('subscription:pricing.intro')}
            </Typography>
            {enDevise && (
              <Typography sx={{ ...sans, fontSize: 13, mt: 1, color: 'rgba(20,17,14,0.5)' }}>
                {t('subscription:pricing.indicativePrices', {
                  currency: currency === 'XAF' || currency === 'XOF' ? 'FCFA' : currency,
                  billingCurrency: t(`subscription:currencyNames.${deviseFacturation}`, { defaultValue: nomDevise(deviseFacturation) }),
                })}
              </Typography>
            )}

            {/* Bascule mensuel / annuel (seulement si Stripe a des prix annuels) */}
            {annuelDisponible && (
            <Box sx={{ display: 'inline-flex', mt: 3, p: '4px', border: `1px solid ${LINE}`, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.5)' }}>
              {[['monthly', t('subscription:billing.monthly')], ['yearly', t('subscription:billing.yearly')]].map(([val, label]) => (
                <Box
                  key={val}
                  onClick={() => setBilling(val)}
                  sx={{
                    px: 2.5, py: 0.9, borderRadius: 999, cursor: 'pointer', ...sans, fontSize: 13.5, fontWeight: 600,
                    transition: 'all .2s',
                    bgcolor: billing === val ? INK : 'transparent',
                    color: billing === val ? IVORY : 'rgba(20,17,14,0.55)',
                  }}
                >
                  {label}{val === 'yearly' && <Box component="span" sx={{ color: billing === val ? GOLD : GOLD, ml: 0.75, fontWeight: 600 }}>−20%</Box>}
                </Box>
              ))}
            </Box>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* ── Cartes des formules ───────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            border: `1px solid ${LINE}`,
            bgcolor: '#fff',
            // lignes de séparation fines entre colonnes
            '& > *': { borderRight: { lg: `1px solid ${LINE}` }, borderBottom: { xs: `1px solid ${LINE}`, lg: 'none' } },
            '& > *:last-of-type': { borderRight: 'none' },
          }}
        >
          {PLANS.map((plan) => {
            const price = getPrice(plan);
            const featured = plan.code === 'pro';
            return (
              <Box
                key={plan.code}
                sx={{
                  position: 'relative', p: { xs: 3, md: 3.5 }, display: 'flex', flexDirection: 'column',
                  bgcolor: featured ? NAVY : 'transparent',
                  color: featured ? '#fff' : INK,
                }}
              >
                {plan.badge && (
                  <Typography sx={{
                    ...sans, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600,
                    color: GOLD, mb: 2,
                  }}>
                    {plan.badge}
                  </Typography>
                )}
                {!plan.badge && <Box sx={{ height: 27, mb: 2 }} />}

                <Typography sx={{ ...serif, fontSize: 26, fontWeight: 500, mb: 0.5 }}>{plan.name}</Typography>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1.5, mb: 1 }}>
                  {price === null ? (
                    <Typography sx={{ ...serif, fontSize: 34, fontWeight: 500 }}>{t('subscription:price.onQuote')}</Typography>
                  ) : price === 0 ? (
                    <Typography sx={{ ...serif, fontSize: 34, fontWeight: 500 }}>{t('subscription:price.free')}</Typography>
                  ) : (
                    <>
                      <Typography sx={{ ...serif, fontSize: enDevise ? 30 : 46, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>{prix(price, plan.currency)}</Typography>
                      <Typography sx={{ ...sans, fontSize: 14, color: featured ? 'rgba(255,255,255,0.6)' : 'rgba(20,17,14,0.5)' }}>
                        {billing === 'monthly' ? t('subscription:price.perMonth') : t('subscription:price.perYear')}
                      </Typography>
                    </>
                  )}
                </Box>
                <Box sx={{ minHeight: 18, mb: 2 }}>
                  {billing === 'yearly' && price !== null && price > 0 && (
                    <Typography sx={{ ...sans, fontSize: 12.5, color: GOLD, fontWeight: 600 }}>
                      {t('subscription:pricing.yearlyEquivalent', { monthly: prix(price / 12, plan.currency), saved: prix(plan.priceMonthly * 12 - price, plan.currency) })}
                    </Typography>
                  )}
                  {enDevise && price !== null && price > 0 && (
                    <Typography sx={{ ...sans, fontSize: 12, mt: 0.5, color: featured ? 'rgba(255,255,255,0.6)' : 'rgba(20,17,14,0.5)' }}>
                      {t(billing === 'monthly' ? 'subscription:price.billedMonthly' : 'subscription:price.billedYearly', { amount: facture(price, plan.currency) })}
                    </Typography>
                  )}
                </Box>

                <Typography sx={{ ...sans, fontSize: 14, lineHeight: 1.55, color: featured ? 'rgba(255,255,255,0.72)' : 'rgba(20,17,14,0.6)', mb: 3, minHeight: 44 }}>
                  {plan.tagline}
                </Typography>

                <Button
                  fullWidth
                  disableElevation
                  disabled={loading === plan.code}
                  onClick={() => handleCTA(plan)}
                  endIcon={plan.code === 'enterprise' ? <WhatsApp sx={{ fontSize: 16 }} /> : <NorthEast sx={{ fontSize: 15 }} />}
                  sx={{
                    ...sans, textTransform: 'none', fontWeight: 600, fontSize: 14.5, py: 1.25, borderRadius: 0,
                    mb: 3,
                    ...(featured
                      ? { bgcolor: GOLD, color: INK, '&:hover': { bgcolor: '#d97706' } }
                      : { bgcolor: BLUE, color: '#fff', '&:hover': { bgcolor: '#1d4ed8' } }),
                  }}
                >
                  {loading === plan.code ? t('subscription:redirecting') : plan.cta}
                </Button>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                  {plan.features.map((f, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                      <Check sx={{ fontSize: 17, color: GOLD, mt: '1px', flexShrink: 0 }} />
                      <Typography sx={{ ...sans, fontSize: 13.5, lineHeight: 1.4 }}>{avecPrixSiege(f, prix(plan.seatPrice, plan.currency))}</Typography>
                    </Box>
                  ))}
                  {plan.missing.map((f, i) => (
                    <Box key={`m-${i}`} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', opacity: 0.42 }}>
                      <Close sx={{ fontSize: 17, mt: '1px', flexShrink: 0 }} />
                      <Typography sx={{ ...sans, fontSize: 13.5, lineHeight: 1.4, textDecoration: 'line-through' }}>{f}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Container>

      {/* ── Bandeau Afrique ───────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: INK, color: IVORY, py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography sx={{ ...sans, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, fontWeight: 600, mb: 1.5 }}>
                {t('subscription:pricing.africa.eyebrow')}
              </Typography>
              <Typography sx={{ ...serif, fontSize: { xs: 24, md: 32 }, fontWeight: 400, lineHeight: 1.2, mb: 2 }}>
                {t('subscription:pricing.africa.title')}
              </Typography>
              <Typography sx={{ ...sans, fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
                {t('subscription:pricing.africa.body')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
              <Button
                disableElevation
                startIcon={<WhatsApp />}
                onClick={() => window.open('https://wa.me/237693427913', '_blank')}
                sx={{ ...sans, textTransform: 'none', fontWeight: 600, fontSize: 15, px: 3, py: 1.4, borderRadius: 0, bgcolor: GOLD, color: INK, '&:hover': { bgcolor: '#c79c63' } }}
              >
                {t('subscription:pricing.africa.talkToAdvisor')}
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Tableau comparatif ────────────────────────────────────────────── */}
      {!isMobile && (
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Typography sx={{ ...serif, fontSize: 34, fontWeight: 400, mb: 1 }}>{t('subscription:pricing.comparison.title')}</Typography>
          <Typography sx={{ ...sans, fontSize: 15, color: 'rgba(20,17,14,0.55)', mb: 4 }}>
            {t('subscription:pricing.comparison.subtitle')}
          </Typography>
          <Box sx={{ border: `1px solid ${LINE}`, bgcolor: '#fff' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { borderBottom: `1px solid ${LINE}` } }}>
                  <TableCell sx={{ ...sans, fontWeight: 600, fontSize: 13, width: '34%', color: 'rgba(20,17,14,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {t('subscription:pricing.comparison.feature')}
                  </TableCell>
                  {PLANS.map((p) => (
                    <TableCell key={p.code} align="center" sx={{ ...serif, fontWeight: 500, fontSize: 18 }}>
                      {p.name}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {COMPARISON.map((row) => (
                  <TableRow key={row.key} sx={{ '& td': { borderBottom: `1px solid ${LINE}` }, '&:last-child td': { borderBottom: 'none' } }}>
                    <TableCell sx={{ ...sans, fontWeight: 500, fontSize: 14 }}>{t(`subscription:pricing.comparison.rows.${row.key}`)}</TableCell>
                    <TableCell align="center"><CellValue value={row.free} /></TableCell>
                    <TableCell align="center" sx={{ bgcolor: 'rgba(176,141,87,0.05)' }}><CellValue value={row.pro} /></TableCell>
                    <TableCell align="center"><CellValue value={row.business} /></TableCell>
                    <TableCell align="center"><CellValue value={row.enterprise} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Container>
      )}

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 }, textAlign: 'center' }}>
        <Typography sx={{ ...serif, fontSize: { xs: 28, md: 38 }, fontWeight: 400, mb: 1.5 }}>
          {t('subscription:pricing.contact.title')}
        </Typography>
        <Typography sx={{ ...sans, fontSize: 16, color: 'rgba(20,17,14,0.6)', mb: 4 }}>
          {t('subscription:pricing.contact.subtitle')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            disableElevation
            startIcon={<WhatsApp />}
            onClick={() => window.open('https://wa.me/237693427913', '_blank')}
            sx={{ ...sans, textTransform: 'none', fontWeight: 600, fontSize: 15, px: 3.5, py: 1.4, borderRadius: 0, bgcolor: INK, color: IVORY, '&:hover': { bgcolor: '#2a2520' } }}
          >
            WhatsApp
          </Button>
          <Button
            disableElevation
            onClick={() => { window.location.href = 'mailto:report.makeitreal@gmail.com'; }}
            sx={{ ...sans, textTransform: 'none', fontWeight: 600, fontSize: 15, px: 3.5, py: 1.4, borderRadius: 0, border: `1px solid ${INK}`, color: INK, '&:hover': { bgcolor: 'rgba(20,17,14,0.04)' } }}
          >
            {t('subscription:pricing.contact.email')}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Pricing;
