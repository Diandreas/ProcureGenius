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
import subscriptionAPI from '../services/subscriptionAPI';
import { PLANS } from '../data/pricingPlans';

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

const COMPARISON = [
  { label: 'Factures / mois', free: '30', pro: 'Illimité', business: 'Illimité', enterprise: 'Illimité' },
  { label: 'Clients', free: '20', pro: 'Illimité', business: 'Illimité', enterprise: 'Illimité' },
  { label: 'Produits', free: '50', pro: 'Illimité', business: 'Illimité', enterprise: 'Illimité' },
  { label: 'Bons de commande', free: false, pro: 'Illimité', business: 'Illimité', enterprise: 'Illimité' },
  { label: 'Fournisseurs', free: false, pro: 'Illimité', business: 'Illimité', enterprise: 'Illimité' },
  { label: 'Comptabilité', free: false, pro: true, business: true, enterprise: true },
  { label: 'Assistant IA', free: false, pro: '100 / mois', business: 'Illimité', enterprise: 'Illimité' },
  { label: 'Contrats', free: false, pro: true, business: true, enterprise: true },
  { label: 'E-Sourcing', free: false, pro: false, business: true, enterprise: true },
  { label: 'Analytics avancés', free: false, pro: true, business: true, enterprise: true },
  { label: 'Sans publicité', free: false, pro: true, business: true, enterprise: true },
  { label: 'Support prioritaire', free: false, pro: false, business: true, enterprise: true },
];

const CellValue = ({ value }) => {
  if (value === true) return <Check sx={{ color: GOLD, fontSize: 18 }} />;
  if (value === false) return <Close sx={{ color: 'rgba(20,17,14,0.22)', fontSize: 18 }} />;
  return <Typography sx={{ fontFamily: '"Inter Tight", sans-serif', fontSize: 14, fontWeight: 500 }}>{value}</Typography>;
};

const serif = { fontFamily: '"Fraunces", Georgia, serif' };
const sans = { fontFamily: '"Inter Tight", system-ui, sans-serif' };

const Pricing = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(null);

  const getPrice = (plan) => {
    if (plan.priceMonthly === null) return null;
    if (plan.priceMonthly === 0) return 0;
    return billing === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  };

  const handleCTA = async (plan) => {
    if (plan.code === 'free') { navigate('/register'); return; }
    if (plan.code === 'enterprise') {
      window.open('https://wa.me/237693427913?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20le%20plan%20Enterprise%20de%20Procura.', '_blank');
      return;
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('access_token');
    if (!token) { navigate('/login?next=/pricing'); return; }
    setLoading(plan.code);
    try {
      await subscriptionAPI.createStripeCheckout(plan.code, billing);
    } catch (err) {
      console.error('Stripe checkout error:', err);
      alert('Erreur lors de la création du paiement. Veuillez réessayer.');
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
            Tarifs Procura
          </Typography>
        </Box>

        <Grid container spacing={4} alignItems="flex-end">
          <Grid item xs={12} md={8}>
            <Typography sx={{ ...serif, fontSize: { xs: 40, md: 68 }, lineHeight: 1.02, fontWeight: 400, letterSpacing: '-0.02em' }}>
              Un prix juste,
              <br />
              <Box component="span" sx={{ fontStyle: 'italic', color: GOLD }}>une croissance</Box> sans friction.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography sx={{ ...sans, fontSize: 17, lineHeight: 1.6, color: 'rgba(20,17,14,0.66)' }}>
              Commencez gratuitement. Un mois d&apos;essai offert sur les formules payantes — sans carte bancaire.
            </Typography>

            {/* Bascule mensuel / annuel */}
            <Box sx={{ display: 'inline-flex', mt: 3, p: '4px', border: `1px solid ${LINE}`, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.5)' }}>
              {[['monthly', 'Mensuel'], ['yearly', 'Annuel']].map(([val, label]) => (
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
                    <Typography sx={{ ...serif, fontSize: 34, fontWeight: 500 }}>Sur devis</Typography>
                  ) : price === 0 ? (
                    <Typography sx={{ ...serif, fontSize: 34, fontWeight: 500 }}>Gratuit</Typography>
                  ) : (
                    <>
                      <Typography sx={{ ...serif, fontSize: 46, fontWeight: 500, lineHeight: 1 }}>{price}€</Typography>
                      <Typography sx={{ ...sans, fontSize: 14, color: featured ? 'rgba(255,255,255,0.6)' : 'rgba(20,17,14,0.5)' }}>
                        /{billing === 'monthly' ? 'mois' : 'an'}
                      </Typography>
                    </>
                  )}
                </Box>
                <Box sx={{ minHeight: 18, mb: 2 }}>
                  {billing === 'yearly' && price !== null && price > 0 && (
                    <Typography sx={{ ...sans, fontSize: 12.5, color: GOLD, fontWeight: 600 }}>
                      soit {(price / 12).toFixed(0)}€/mois · {Math.round(plan.priceMonthly * 12 - price)}€ économisés
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
                  {loading === plan.code ? 'Redirection…' : plan.cta}
                </Button>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                  {plan.features.map((f, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                      <Check sx={{ fontSize: 17, color: GOLD, mt: '1px', flexShrink: 0 }} />
                      <Typography sx={{ ...sans, fontSize: 13.5, lineHeight: 1.4 }}>{f}</Typography>
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
                Pensé pour l&apos;Afrique
              </Typography>
              <Typography sx={{ ...serif, fontSize: { xs: 24, md: 32 }, fontWeight: 400, lineHeight: 1.2, mb: 2 }}>
                Une facturation locale, des règles que vous connaissez.
              </Typography>
              <Typography sx={{ ...sans, fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
                Facturation en FCFA, CDF, XOF, MAD. Contrats adaptés au droit OHADA. TVA Cameroun 19,25 %,
                Sénégal 18 %, Côte d&apos;Ivoire 18 %. Interface en français, optimisée pour les réseaux mobiles.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
              <Button
                disableElevation
                startIcon={<WhatsApp />}
                onClick={() => window.open('https://wa.me/237693427913', '_blank')}
                sx={{ ...sans, textTransform: 'none', fontWeight: 600, fontSize: 15, px: 3, py: 1.4, borderRadius: 0, bgcolor: GOLD, color: INK, '&:hover': { bgcolor: '#c79c63' } }}
              >
                Parler à un conseiller
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Tableau comparatif ────────────────────────────────────────────── */}
      {!isMobile && (
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Typography sx={{ ...serif, fontSize: 34, fontWeight: 400, mb: 1 }}>Le détail, ligne par ligne</Typography>
          <Typography sx={{ ...sans, fontSize: 15, color: 'rgba(20,17,14,0.55)', mb: 4 }}>
            Toutes les fonctionnalités, comparées plan par plan.
          </Typography>
          <Box sx={{ border: `1px solid ${LINE}`, bgcolor: '#fff' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { borderBottom: `1px solid ${LINE}` } }}>
                  <TableCell sx={{ ...sans, fontWeight: 600, fontSize: 13, width: '34%', color: 'rgba(20,17,14,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Fonctionnalité
                  </TableCell>
                  {PLANS.map((p) => (
                    <TableCell key={p.code} align="center" sx={{ ...serif, fontWeight: 500, fontSize: 18 }}>
                      {p.name}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {COMPARISON.map((row, i) => (
                  <TableRow key={i} sx={{ '& td': { borderBottom: `1px solid ${LINE}` }, '&:last-child td': { borderBottom: 'none' } }}>
                    <TableCell sx={{ ...sans, fontWeight: 500, fontSize: 14 }}>{row.label}</TableCell>
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
          Une question avant de vous lancer&nbsp;?
        </Typography>
        <Typography sx={{ ...sans, fontSize: 16, color: 'rgba(20,17,14,0.6)', mb: 4 }}>
          Notre équipe répond en moins de 2 h, du lundi au samedi, de 8 h à 20 h (WAT).
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
            Écrire un email
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Pricing;
