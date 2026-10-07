import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useTranslation } from 'react-i18next';
import '@lottiefiles/dotlottie-wc';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AutoAwesome,
  Receipt,
  Inventory,
  People,
  TrendingUp,
  DocumentScanner,
  Psychology,
  Speed,
  ArrowForward,
  PlayArrow,
  NotificationsActive,
  SmartToy,
  Lock,
  CreditCardOff,
  Gavel,
  SupportAgent,
  WifiOff,
  Payments,
  ExpandMore,
} from '@mui/icons-material';
import { useColorMode } from '../App';
import { trackVisit } from '../services/tracking';
import { usePricingCurrency, memeMonnaie } from '../utils/visitorCurrency';
import { PLANS, BILLING_CURRENCY } from '../data/pricingPlans';
import usePageMeta from '../hooks/usePageMeta';
import LiveAIDemo from '../components/landing/LiveAIDemo';

// Enregistrer les plugins GSAP une seule fois (côté client).
gsap.registerPlugin(ScrollTrigger, useGSAP);

// ─── Feature Card ─────────────────────────────────────────────────
const FeatureCard = ({ icon, title, description, color, delay = 0 }) => {
  const theme = useTheme();
  // Suit le thème de l'app, comme le reste de la landing.
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box className="gsap-reveal" sx={{ height: '100%' }}>
      <Card sx={{
        bgcolor: isDark ? '#16223b' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 4,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
        transition: 'transform 0.25s ease, box-shadow 0.3s, border-color 0.3s',
        '&:hover': {
          transform: 'translateY(-6px)',
          borderColor: alpha(color, 0.3),
          boxShadow: `0 16px 40px -8px ${alpha(color, 0.12)}`,
        }
      }}>
        <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: alpha(color, 0.1), color, mb: 2.5, borderRadius: 3 }}>
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, fontSize: '1.05rem', mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', fontSize: '0.875rem', lineHeight: 1.65 }}>
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

// Monnaie du visiteur : voir utils/visitorCurrency.js (partagé avec la page Tarifs).

// ═════════════════════════════════════════════════════════════════
// MAIN LANDING COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function Landing() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const { currency, formatPrice } = usePricingCurrency();
  const prixPro = PLANS.find((p) => p.code === 'pro')?.priceMonthly;

  // Direction « clair éditorial premium » : landing toujours en clair lumineux
  // (charte bleu #2563eb + doré #f59e0b), indépendamment du thème de l'app.
  // La landing suit le thème de l'app (le header public le suit déjà : une
  // page forcée en clair sous un header sombre était incohérente). Toutes les
  // couleurs passent par cette petite palette de jetons — une seule décision
  // par rôle, déclinée clair/sombre, au lieu de couleurs éparpillées.
  const isDark = theme.palette.mode === 'dark';
  const pal = isDark ? {
    bg: '#0f172a',                      // ardoise bleutée, accordée au bleu Procura
    bgSection: '#131d33',               // sections alternées
    card: '#16223b',                    // cartes / chips flottants
    title: '#f1f5f9',
    body: 'rgba(241,245,249,0.65)',
    faint: 'rgba(241,245,249,0.45)',
    border: 'rgba(255,255,255,0.08)',
  } : {
    bg: '#ffffff',
    bgSection: '#f6f8fc',
    card: '#ffffff',
    title: '#0f172a',
    body: 'rgba(0,0,0,0.6)',
    faint: 'rgba(0,0,0,0.45)',
    border: 'rgba(0,0,0,0.06)',
  };
  const bgColor = pal.bg;
  const bgSection = pal.bgSection;

  // Styles éditoriaux partagés (premium, aéré)
  const eyebrow = {
    display: 'inline-block', fontSize: '0.78rem', fontWeight: 700,
    letterSpacing: '0.22em', textTransform: 'uppercase', color: '#2563eb', mb: 2.5,
  };
  const serifTitle = {
    fontFamily: '"Fraunces", Georgia, serif', fontWeight: 500,
    letterSpacing: '-0.02em', lineHeight: 1.08, color: pal.title,
  };

  // Tracking visiteur anonyme : une vue de page à l'arrivée sur la landing.
  useEffect(() => {
    trackVisit('/');
  }, []);

  // Handle hash scroll
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) setTimeout(() => element.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, [location.hash]);

  // Typewriter
  const possibleWords = t('hero.words', { returnObjects: true });
  const words = Array.isArray(possibleWords) ? possibleWords : ['entreprise', 'business', 'start-up', 'croissance'];
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const typingSpeed = isDeleting ? 50 : 100;

  useEffect(() => {
    let timer;
    const currentWord = words[wordIndex] || 'entreprise';
    if (!isDeleting && text === currentWord) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && text === '') {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else {
      timer = setTimeout(() => {
        setText(currentWord.substring(0, text.length + (isDeleting ? -1 : 1)));
      }, typingSpeed);
    }
    return () => clearTimeout(timer);
  }, [text, isDeleting, wordIndex, words, typingSpeed]);

  // SEO : titre + meta description/OG/Twitter, alignés sur la langue active.
  // Les balises statiques d'index.html sont toujours en français ; sans ça,
  // un visiteur anglophone voyait un titre d'onglet traduit mais des balises
  // OG/Twitter de partage encore en français.
  const defaultWord = words[0] || 'entreprise';
  usePageMeta({
    title: `${t('hero.titleStart')} ${defaultWord}`,
    description: t('hero.subtitle'),
    path: '/landing',
  });

  // ─── Animations GSAP (hero choréographié + parallaxe/profondeur) ───
  const pageRef = useRef(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();

    // Respect de prefers-reduced-motion : pas d'animation, tout est visible.
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.hero-left, .hero-right, .gsap-reveal', { clearProps: 'all', opacity: 1, y: 0 });
    });

    // Animations complètes (mouvement OK)
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Entrée chorégraphiée du hero
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-left', { opacity: 0, x: -48, duration: 0.8 })
        .from('.hero-right', { opacity: 0, scale: 0.86, y: 36, duration: 0.9 }, '-=0.55');

      // Parallaxe / profondeur multi-couches : chaque couche se déplace à une
      // vitesse différente au scroll → effet de profondeur bien perceptible.
      // Plage élargie ("top top" → "bottom 20%") pour un mouvement ample.
      const paraTrigger = { trigger: '.hero-section', start: 'top top', end: 'bottom 20%', scrub: 1 };
      // Couche de fond (halo bleu) : descend fortement (effet "loin", lent)
      gsap.to('.hero-glow', { yPercent: 60, ease: 'none', scrollTrigger: paraTrigger });
      // Halo doré : monte (couche opposée → profondeur accentuée)
      gsap.to('.hero-glow-2', { yPercent: -45, ease: 'none', scrollTrigger: paraTrigger });
      // Carte visuelle : remonte (couche rapide, premier plan)
      gsap.to('.hero-right', { yPercent: -22, ease: 'none', scrollTrigger: paraTrigger });
      // Bloc texte : léger décalage vers le bas (profondeur intermédiaire)
      gsap.to('.hero-left', { yPercent: 14, ease: 'none', scrollTrigger: paraTrigger });

      // Flottement doux et continu de la mascotte et de la carte-preuve (vie)
      gsap.to('.hero-float', { y: -14, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true });
      gsap.to('.hero-chip', { y: 10, duration: 2.8, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 0.4 });

      // Révélations au scroll des sections (cartes, blocs, CTA…)
      // État initial masqué appliqué avant le paint (useGSAP = layoutEffect).
      gsap.set('.gsap-reveal', { opacity: 0, y: 28 });
      ScrollTrigger.batch('.gsap-reveal', {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.09, overwrite: true,
        }),
      });
      // Recalcul après chargement des polices/images (positions fiables).
      ScrollTrigger.refresh();
    });

    return () => mm.revert();
  }, { scope: pageRef });

  return (
    <Box ref={pageRef} sx={{ bgcolor: bgColor, color: pal.title, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Police serif éditoriale pour les titres */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap" />

      {/* ─── Hero ────────────────────────────────────────────── */}
      <Box className="hero-section" sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        pt: { xs: 14, sm: 20 },
        pb: { xs: 8, sm: 12 },
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Halos de fond (parallaxe couche lointaine) */}
        <Box className="hero-glow" sx={{
          position: 'absolute',
          top: '8%', right: '4%',
          width: 680, height: 680,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#2563eb', 0.16)} 0%, transparent 68%)`,
          pointerEvents: 'none',
          willChange: 'transform',
          zIndex: 0,
        }} />
        <Box className="hero-glow-2" sx={{
          position: 'absolute',
          bottom: '2%', left: '-6%',
          width: 520, height: 520,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#f59e0b', 0.12)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          willChange: 'transform',
          zIndex: 0,
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box className="hero-left">
                {/* Badge */}
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1, mb: 4,
                  bgcolor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  color: '#10b981', fontWeight: 700, fontSize: '0.82rem',
                  px: 2, py: 0.75, borderRadius: 8,
                }}>
                  <AutoAwesome sx={{ fontSize: 16 }} />
                  {t('hero.badge')}
                </Box>

                {/* Headline — serif éditorial */}
                <Typography variant="h1" sx={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 500,
                  fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.2rem' },
                  lineHeight: 1.04,
                  mb: 0.5,
                  letterSpacing: '-0.02em',
                  color: pal.title,
                }}>
                  {t('hero.titleStart')}
                </Typography>
                <Typography variant="h1" sx={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 500,
                  fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.2rem' },
                  lineHeight: 1.04,
                  mb: 3,
                  letterSpacing: '-0.02em',
                }}>
                  <Box component="span" sx={{
                    fontStyle: 'italic',
                    color: '#f59e0b',
                    minWidth: '200px',
                    display: 'inline-block',
                  }}>
                    {text}
                  </Box>
                  <Box component="span" sx={{
                    display: 'inline-block', width: '2px', height: '0.8em',
                    bgcolor: '#f59e0b', ml: '3px', verticalAlign: 'text-bottom',
                    animation: 'blink 0.7s step-end infinite',
                    '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
                  }} />
                </Typography>

                <Typography sx={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  fontSize: { xs: '1.05rem', sm: '1.15rem' },
                  lineHeight: 1.65,
                  mb: 5,
                  maxWidth: 500,
                }}>
                  {t('hero.subtitle')}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 5 }}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate('/register')}
                    disableElevation
                    sx={{
                      bgcolor: '#2563eb', textTransform: 'none', fontWeight: 700,
                      fontSize: '1rem', borderRadius: 3, px: { xs: 3, sm: 4 }, py: 1.6,
                      color: '#fff',
                      boxShadow: `0 8px 24px ${alpha('#2563eb', 0.3)}`,
                      '&:hover': {
                        bgcolor: '#1d4ed8',
                        boxShadow: `0 12px 32px ${alpha('#2563eb', 0.4)}`,
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.25s',
                    }}
                  >
                    {t('hero.ctaPrimary')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PlayArrow />}
                    onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                    sx={{
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                      color: isDark ? '#fff' : '#0f172a',
                      textTransform: 'none', fontWeight: 600,
                      fontSize: '1rem', borderRadius: 3,
                      px: { xs: 3, sm: 4 }, py: 1.6,
                      '&:hover': {
                        borderColor: '#2563eb',
                        bgcolor: isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.04)',
                      }
                    }}
                  >
                    {t('hero.ctaSecondary')}
                  </Button>
                </Box>

                {/* Réassurance honnête (pas de faux chiffres) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                  {[
                    { icon: <CreditCardOff sx={{ fontSize: 18 }} />, text: t('hero.trust1') },
                    { icon: <Lock sx={{ fontSize: 18 }} />, text: t('hero.trust2') },
                    { icon: <Gavel sx={{ fontSize: 18 }} />, text: t('hero.trust3') },
                  ].map((it, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)' }}>
                      <Box sx={{ color: '#2563eb', display: 'flex' }}>{it.icon}</Box>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{it.text}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box className="hero-right" sx={{ willChange: 'transform', position: 'relative' }}>
                {/* Carte visuelle principale (Lottie) */}
                <Box sx={{
                  borderRadius: 5,
                  overflow: 'hidden',
                  border: '1px solid rgba(37,99,235,0.10)',
                  boxShadow: '0 40px 90px -30px rgba(37,99,235,0.28)',
                  bgcolor: 'rgba(37,99,235,0.025)',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <dotlottie-wc
                    src="https://lottie.host/ea0ff272-a2d1-4a4d-a09d-b9d190ae1244/nTY70f1Nfx.lottie"
                    style={{ width: '100%', height: '520px' }}
                    autoplay loop
                  />
                </Box>

                {/* Mascotte Procura — accent de marque flottant */}
                <Box
                  component="img"
                  src="/mascote/Procura_thumbup.png"
                  alt="Procura"
                  className="hero-float"
                  sx={{
                    position: 'absolute', bottom: -28, left: -34, width: { xs: 120, sm: 168 },
                    zIndex: 2, pointerEvents: 'none',
                    filter: 'drop-shadow(0 18px 30px rgba(15,23,42,0.18))',
                    display: { xs: 'none', sm: 'block' },
                  }}
                />

                {/* Carte flottante "preuve" — chiffre clé */}
                <Box className="hero-chip" sx={{
                  position: 'absolute', top: 28, right: -18, zIndex: 3,
                  bgcolor: pal.card, borderRadius: 3, px: 2, py: 1.25,
                  border: `1px solid ${pal.border}`,
                  boxShadow: '0 16px 40px -12px rgba(15,23,42,0.2)',
                  display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.25,
                }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.1rem', lineHeight: 1, color: pal.title }}>{t('hero.statChipValue')}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: pal.faint, fontWeight: 600 }}>{t('hero.statChipLabel')}</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── Stats ───────────────────────────────────────────── */}
      <Box sx={{
        py: 5,
        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} textAlign="center">
            {/* Différenciateurs terrain — le hero porte déjà la réassurance
                d'inscription (essai, sécurité, OHADA) : pas de doublon ici. */}
            {[
              { icon: <WifiOff />, title: t('trust.offline.title'), desc: t('trust.offline.desc'), color: '#2563eb' },
              { icon: <Payments />, title: t('trust.currency.title'), desc: t('trust.currency.desc'), color: '#10b981' },
              { icon: <Gavel />, title: t('trust.ohada.title'), desc: t('trust.ohada.desc'), color: '#f59e0b' },
              { icon: <SupportAgent />, title: t('trust.support.title'), desc: t('trust.support.desc'), color: '#8b5cf6' },
            ].map((s, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <div className="gsap-reveal">
                  <Box sx={{ display: 'inline-flex', p: 1.25, borderRadius: 2, bgcolor: alpha(s.color, 0.1), color: s.color, mb: 1.5 }}>
                    {React.cloneElement(s.icon, { sx: { fontSize: 26 } })}
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.05rem' }, color: isDark ? '#fff' : '#0f172a', lineHeight: 1.2 }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', fontSize: '0.82rem', mt: 0.5, lineHeight: 1.45, maxWidth: 200, mx: 'auto' }}>
                    {s.desc}
                  </Typography>
                </div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ─── Comment ça marche — guidé par la mascotte ───────────── */}
      <Box sx={{ py: { xs: 11, sm: 16 }, bgcolor: bgColor }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 7, sm: 10 } }}>
            <div className="gsap-reveal">
              <Typography sx={{ ...eyebrow }}>{t('howItWorks.eyebrow')}</Typography>
              <Typography variant="h2" sx={{ ...serifTitle, fontSize: { xs: '2rem', sm: '3rem' } }}>
                {t('howItWorks.titleStart')}<br />
                <Box component="span" sx={{ fontStyle: 'italic', color: '#2563eb' }}>{t('howItWorks.titleHighlight')}</Box>.
              </Typography>
            </div>
          </Box>

          <Grid container spacing={{ xs: 5, md: 6 }} alignItems="flex-start">
            {[
              { img: '/mascote/Procura_thinking.png', step: '01', title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc') },
              { img: '/mascote/Procura_reading.png', step: '02', title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc') },
              { img: '/mascote/Procura_thumbup.png', step: '03', title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc') },
            ].map((s, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box className="gsap-reveal" sx={{ textAlign: 'center', px: { xs: 2, md: 1 } }}>
                  <Box sx={{
                    position: 'relative', width: 150, height: 150, mx: 'auto', mb: 3,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 50% 40%, rgba(37,99,235,0.10), rgba(37,99,235,0) 70%)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  }}>
                    <Box component="img" src={s.img} alt={s.title} sx={{ width: 132, filter: 'drop-shadow(0 14px 24px rgba(15,23,42,0.14))' }} />
                    <Box sx={{
                      position: 'absolute', top: 4, right: 6,
                      fontFamily: '"Fraunces", serif', fontSize: '1.6rem', fontWeight: 600,
                      color: 'rgba(37,99,235,0.22)',
                    }}>{s.step}</Box>
                  </Box>
                  <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.35rem', color: pal.title, mb: 1 }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{ color: pal.body, fontSize: '0.98rem', lineHeight: 1.6, maxWidth: 320, mx: 'auto' }}>
                    {s.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ─── Features ─────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 10, sm: 14 }, bgcolor: bgColor }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 7, sm: 9 } }}>
            <div className="gsap-reveal">
              <Typography sx={{ ...eyebrow }}>{t('platform.badge')}</Typography>
              <Typography variant="h2" sx={{ ...serifTitle, fontSize: { xs: '2rem', sm: '3rem' }, mb: 2 }}>
                {t('platform.titleStart')}{' '}
                <Box component="span" sx={{ fontStyle: 'italic', color: '#2563eb' }}>
                  {t('platform.titleHighlight')}
                </Box>{' '}
                {t('platform.titleEnd')}
              </Typography>
              <Typography sx={{
                color: pal.body,
                maxWidth: 560, mx: 'auto', fontSize: '1.05rem', lineHeight: 1.65,
              }}>
                {t('platform.subtitle')}
              </Typography>
            </div>
          </Box>

          <Grid container spacing={3}>
            {[
              { icon: <SmartToy />, title: t('platform.features.ai.title'), description: t('platform.features.ai.desc'), color: '#2563eb', delay: 0 },
              { icon: <Receipt />, title: t('platform.features.invoices.title'), description: t('platform.features.invoices.desc'), color: '#10b981', delay: 0.08 },
              { icon: <Inventory />, title: t('platform.features.inventory.title'), description: t('platform.features.inventory.desc'), color: '#f59e0b', delay: 0.16 },
              { icon: <People />, title: t('platform.features.suppliers.title'), description: t('platform.features.suppliers.desc'), color: '#8b5cf6', delay: 0.24 },
              { icon: <DocumentScanner />, title: t('platform.features.ocr.title'), description: t('platform.features.ocr.desc'), color: '#ec4899', delay: 0.32 },
              { icon: <TrendingUp />, title: t('platform.features.analytics.title'), description: t('platform.features.analytics.desc'), color: '#ef4444', delay: 0.4 },
            ].map((f, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <FeatureCard {...f} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ─── Interface Showcase ───────────────────────────────── */}
      <Box sx={{
        py: { xs: 10, sm: 14 },
        bgcolor: bgSection,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <div className="gsap-reveal">
                <Box sx={{
                  borderRadius: 4, overflow: 'hidden',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.5)' : '0 16px 48px rgba(0,0,0,0.08)',
                }}>
                  <img src="/procura.png" alt="Interface Procura" style={{ width: '100%', display: 'block' }} />
                </Box>
              </div>
            </Grid>
            <Grid item xs={12} md={6}>
              <div className="gsap-reveal">
                <Chip label={t('interface.badge')} sx={{
                  mb: 3,
                  bgcolor: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)',
                  color: '#2563eb', fontWeight: 700, borderRadius: 2,
                  border: `1px solid ${alpha('#2563eb', 0.2)}`,
                }} />
                <Typography variant="h3" sx={{
                  fontWeight: 900, mb: 2.5,
                  fontSize: { xs: '1.8rem', sm: '2.2rem' },
                  color: isDark ? '#fff' : '#0f172a',
                }}>
                  {t('interface.title')}
                </Typography>
                <Typography sx={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  fontSize: '1.05rem', lineHeight: 1.65, mb: 4,
                }}>
                  {t('interface.desc')}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/register')}
                  sx={{
                    borderRadius: 3, textTransform: 'none', fontWeight: 600,
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                    color: isDark ? '#fff' : '#0f172a',
                    px: 3, py: 1.2,
                    '&:hover': { borderColor: '#2563eb', bgcolor: isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.04)' }
                  }}
                >
                  {t('interfaceCta')}
                </Button>
              </div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── AI Showcase ──────────────────────────────────────── */}
      <Box sx={{
        py: { xs: 10, sm: 14 }, bgcolor: bgColor,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      }} id="demo-section">
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={5}>
              <div className="gsap-reveal">
                <Chip
                  icon={<Psychology sx={{ fontSize: '1rem !important' }} />}
                  label={t('aiShowcase.badge')}
                  sx={{
                    mb: 3,
                    bgcolor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${alpha('#f59e0b', 0.25)}`,
                    color: '#f59e0b', fontWeight: 700, px: 0.5, py: 2.5, borderRadius: 2,
                  }}
                />
                <Typography variant="h3" sx={{
                  fontWeight: 900, fontSize: { xs: '1.8rem', sm: '2.2rem' }, mb: 2.5,
                  color: isDark ? '#fff' : '#0f172a',
                }}>
                  {t('aiShowcase.titleStart')}{' '}
                  <Box component="span" sx={{ color: '#f59e0b' }}>{t('aiShowcase.titleHighlight')}</Box>
                </Typography>
                <Typography sx={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  fontSize: '1.05rem', mb: 5, lineHeight: 1.65,
                }}>
                  {t('aiShowcase.subtitle')}
                </Typography>

                <Stack spacing={3.5}>
                  {[
                    { icon: <Psychology />, title: t('platform.features.ai.title'), desc: t('platform.features.ai.desc'), color: '#2563eb' },
                    { icon: <Speed />, title: t('aiShowcase.oneClick.title'), desc: t('aiShowcase.oneClick.desc'), color: '#f59e0b' },
                    { icon: <NotificationsActive />, title: t('aiShowcase.alerts.title'), desc: t('aiShowcase.alerts.desc'), color: '#10b981' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 2, transition: 'transform 0.2s ease', '&:hover': { transform: 'scale(1.02)' } }}>
                      <Box sx={{
                        width: 46, height: 46, borderRadius: 3, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: alpha(item.color, 0.1), color: item.color,
                      }}>
                        {item.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                          {item.desc}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </div>
            </Grid>
            <Grid item xs={12} md={7}>
              <div className="gsap-reveal">
                <LiveAIDemo />
              </div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── Pricing ──────────────────────────────────────────── */}
      <Box sx={{
        py: { xs: 10, sm: 14 }, bgcolor: bgSection,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      }} id="pricing-section">
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <div className="gsap-reveal">
              <Chip label={t('pricingTeaser.badge')} sx={{
                mb: 3, bgcolor: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)',
                border: `1px solid ${alpha('#2563eb', 0.25)}`, color: '#2563eb', fontWeight: 700, px: 1, py: 2.5, borderRadius: 2,
              }} />
              <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '1.9rem', sm: '2.6rem' }, mb: 2, color: isDark ? '#fff' : '#0f172a' }}>
                {t('pricingTeaser.titleStart')}{' '}
                <Box component="span" sx={{ color: '#2563eb' }}>{t('pricingTeaser.titleHighlight')}</Box>
              </Typography>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', maxWidth: 560, mx: 'auto', fontSize: '1.08rem', lineHeight: 1.65 }}>
                {/* Prix Pro en FCFA, ou équivalent indicatif hors zone CFA */}
                {t('pricingTeaser.subtitle', { price: formatPrice(prixPro, BILLING_CURRENCY) })}
              </Typography>
              {!memeMonnaie(currency, BILLING_CURRENCY) && (
                <Typography sx={{ mt: 1.5, color: pal.faint, fontSize: '0.82rem' }}>
                  {t('pricingTeaser.currencyNote', { currency })}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
                <Button variant="contained" size="large" onClick={() => navigate('/pricing')}
                  sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1rem' }}>
                  {t('pricingTeaser.viewPricing')}
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/register')}
                  sx={{ px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1rem', borderColor: alpha('#2563eb', 0.4), color: '#2563eb', '&:hover': { borderColor: '#2563eb', bgcolor: alpha('#2563eb', 0.04) } }}>
                  {t('pricingTeaser.tryFree')}
                </Button>
              </Box>
            </div>
          </Box>
        </Container>
      </Box>

      {/* ─── FAQ — lève les objections avant l'inscription ────── */}
      <Box sx={{ py: { xs: 10, sm: 14 }, bgcolor: bgColor }} id="faq-section">
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: { xs: 5, sm: 7 } }}>
            <div className="gsap-reveal">
              <Typography sx={{ ...eyebrow }}>{t('faq.eyebrow')}</Typography>
              <Typography variant="h2" sx={{ ...serifTitle, fontSize: { xs: '2rem', sm: '2.8rem' } }}>
                {t('faq.titleStart')}{' '}
                <Box component="span" sx={{ fontStyle: 'italic', color: '#2563eb' }}>{t('faq.titleHighlight')}</Box>
              </Typography>
            </div>
          </Box>
          <div className="gsap-reveal">
            {[1, 2, 3, 4, 5].map((n) => (
              <Accordion
                key={n}
                disableGutters
                elevation={0}
                sx={{
                  bgcolor: 'transparent',
                  border: `1px solid ${pal.border}`,
                  borderRadius: '12px !important',
                  mb: 1.5,
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { borderColor: alpha('#2563eb', 0.35) },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#2563eb' }} />} sx={{ px: 3, py: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: pal.title }}>
                    {t(`faq.q${n}`)}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pt: 0, pb: 2.5 }}>
                  <Typography sx={{ color: pal.body, fontSize: '0.95rem', lineHeight: 1.65 }}>
                    {t(`faq.a${n}`)}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                variant="text"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/faq')}
                sx={{ textTransform: 'none', fontWeight: 600, color: '#2563eb' }}
              >
                {t('faq.seeAll')}
              </Button>
            </Box>
          </div>
        </Container>
      </Box>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <Box sx={{
        py: { xs: 10, sm: 14 }, bgcolor: bgSection, textAlign: 'center',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 700, height: 350,
          background: isDark
            ? `radial-gradient(ellipse, ${alpha('#2563eb', 0.06)} 0%, transparent 70%)`
            : `radial-gradient(ellipse, ${alpha('#2563eb', 0.04)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <div className="gsap-reveal">
            <Box
              component="img"
              src="/mascote/Procura_excited.png"
              alt="Procura"
              className="hero-float"
              sx={{ width: { xs: 110, sm: 138 }, mb: 2, filter: 'drop-shadow(0 16px 28px rgba(15,23,42,0.16))' }}
            />
            <Typography variant="h2" sx={{ ...serifTitle, fontSize: { xs: '2.1rem', sm: '3rem' }, mb: 2.5 }}>
              {t('finalCta.titleStart')}{' '}
              <Box component="span" sx={{ fontStyle: 'italic', color: '#2563eb' }}>{t('finalCta.titleHighlight')}</Box> ?
            </Typography>
            <Typography sx={{
              color: pal.body,
              fontSize: '1.08rem', lineHeight: 1.65, mb: 5, maxWidth: 460, mx: 'auto',
            }}>
              {t('finalCta.subtitle')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/register')}
                disableElevation
                sx={{
                  bgcolor: '#2563eb', textTransform: 'none', fontWeight: 700,
                  fontSize: '1rem', borderRadius: 3, px: 4, py: 1.6, color: '#fff',
                  boxShadow: `0 8px 24px ${alpha('#2563eb', 0.3)}`,
                  '&:hover': { bgcolor: '#1d4ed8', transform: 'translateY(-2px)', boxShadow: `0 12px 32px ${alpha('#2563eb', 0.4)}` },
                  transition: 'all 0.25s',
                }}
              >
                {t('finalCta.start')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                  color: isDark ? '#fff' : '#0f172a',
                  textTransform: 'none', fontWeight: 600,
                  fontSize: '1rem', borderRadius: 3, px: 4, py: 1.6,
                  '&:hover': { borderColor: '#2563eb', bgcolor: alpha('#2563eb', 0.04) }
                }}
              >
                {t('finalCta.login')}
              </Button>
            </Box>
          </div>
        </Container>
      </Box>

    </Box>
  );
}
