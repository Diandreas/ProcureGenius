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
  Divider,
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
  CheckCircle,
  ArrowForward,
  PlayArrow,
  Star,
  NotificationsActive,
  SmartToy,
  CheckCircleOutline,
  Lock,
  CreditCardOff,
  Gavel,
  SupportAgent,
} from '@mui/icons-material';
import { useColorMode } from '../App';
import { trackVisit } from '../services/tracking';

// Enregistrer les plugins GSAP une seule fois (côté client).
gsap.registerPlugin(ScrollTrigger, useGSAP);

// ─── Animated counter ────────────────────────────────────────────
const AnimatedCounter = ({ end, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// ─── AI Chat Demo ────────────────────────────────────────────────
const AIChatDemo = () => {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const messages = [
    { role: 'user', text: 'Quels produits sont bientôt en rupture ?' },
    { role: 'ai', text: ' 3 produits critiques détectés :', detail: '• Écran LED 27" — 4 restants (~2 jours)\n• Câble HDMI 2.1 — 8 restants (~5 jours)\n• Souris ergonomique — 2 restants (~1 jour)' },
    { role: 'ai', text: ' Je peux créer automatiquement un bon de commande pour réapprovisionner ces 3 produits. Voulez-vous que je le fasse ?', action: 'Créer le bon de commande' },
  ];

  useEffect(() => {
    const timers = messages.map((_, i) =>
      setTimeout(() => setVisibleMessages(i + 1), (i + 1) * 1200)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const theme = useTheme();
  // La landing est volontairement toujours claire (charte marketing) : on ne
  // suit pas le thème sombre de l'app, sinon seuls certains blocs basculaient
  // en sombre (header/cartes) alors que le fond restait blanc -> incohérence.
  const isDark = false;

  return (
    <Box
      className="gsap-reveal"
      sx={{
        bgcolor: isDark ? '#111827' : '#ffffff',
        borderRadius: 4,
        p: 2.5,
        maxWidth: 480,
        mx: 'auto',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: isDark
          ? '0 30px 60px rgba(0,0,0,0.6)'
          : '0 20px 40px rgba(0,0,0,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#2563eb', fontSize: '0.8rem' }}>
          <SmartToy sx={{ fontSize: 16 }} />
        </Avatar>
        <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 600, fontSize: '0.85rem' }}>Procura IA</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } }
          }} />
          <Typography sx={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 500 }}>En ligne</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 220 }}>
          {messages.slice(0, visibleMessages).map((msg, i) => (
            <Box
              key={i}
              sx={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                animation: 'msgIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
                '@keyframes msgIn': {
                  from: { opacity: 0, transform: 'scale(0.92) translateY(16px)' },
                  to: { opacity: 1, transform: 'scale(1) translateY(0)' },
                },
              }}
            >
              <Box sx={{
                p: 1.5,
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                bgcolor: msg.role === 'user' ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                border: msg.role === 'ai' ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}` : 'none',
              }}>
                <Typography sx={{ color: msg.role === 'user' ? '#fff' : (isDark ? '#fff' : '#0f172a'), fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {msg.text}
                </Typography>
                {msg.detail && (
                  <Typography sx={{
                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                    fontSize: '0.75rem',
                    mt: 1.5,
                    whiteSpace: 'pre-line',
                    fontFamily: 'monospace',
                    bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                    p: 1.5,
                    borderRadius: 1,
                    borderLeft: '2px solid #f59e0b'
                  }}>
                    {msg.detail}
                  </Typography>
                )}
                {msg.action && (
                  <Button size="small" variant="contained" sx={{
                    mt: 1.5, bgcolor: '#f59e0b', color: '#0f172a',
                    textTransform: 'none', fontSize: '0.75rem', borderRadius: 2,
                    fontWeight: 700, boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                    '&:hover': { bgcolor: '#d97706' }
                  }}>
                    {msg.action}
                  </Button>
                )}
              </Box>
            </Box>
          ))}
        {visibleMessages < messages.length && (
          <Box sx={{ display: 'flex', gap: '4px', pl: 1, animation: 'fadeIn 0.3s ease both', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{
                width: 6, height: 6, borderRadius: '50%', bgcolor: '#2563eb',
                animation: 'blink 1.4s infinite',
                animationDelay: `${i * 0.2}s`,
                '@keyframes blink': { '0%,80%,100%': { opacity: 0.2 }, '40%': { opacity: 1 } }
              }} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Feature Card ─────────────────────────────────────────────────
const FeatureCard = ({ icon, title, description, color, delay = 0 }) => {
  const theme = useTheme();
  // La landing est volontairement toujours claire (charte marketing) : on ne
  // suit pas le thème sombre de l'app, sinon seuls certains blocs basculaient
  // en sombre (header/cartes) alors que le fond restait blanc -> incohérence.
  const isDark = false;

  return (
    <Box className="gsap-reveal" sx={{ height: '100%' }}>
      <Card sx={{
        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
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

// ─── Pricing Card ─────────────────────────────────────────────────
const PricingCard = ({ t, title, price, originalPrice, period, features, isPopular, isFree, ctaText, onCta, delay }) => {
  const theme = useTheme();
  // La landing est volontairement toujours claire (charte marketing) : on ne
  // suit pas le thème sombre de l'app, sinon seuls certains blocs basculaient
  // en sombre (header/cartes) alors que le fond restait blanc -> incohérence.
  const isDark = false;

  return (
    <Box className="gsap-reveal" sx={{ height: '100%' }}>
      <Card sx={{
        bgcolor: isPopular
          ? (isDark ? 'rgba(37,99,235,0.1)' : '#eff6ff')
          : (isDark ? 'rgba(255,255,255,0.02)' : '#ffffff'),
        border: `1px solid ${isPopular ? alpha('#2563eb', 0.4) : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
        borderRadius: 5,
        position: 'relative',
        overflow: 'visible',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.25s ease',
        '&:hover': { transform: 'translateY(-6px)' },
        boxShadow: isPopular
          ? `0 20px 60px ${alpha('#2563eb', 0.12)}`
          : (isDark ? '0 8px 24px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.04)'),
      }}>
        {isPopular && (
          <Box sx={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            bgcolor: '#f59e0b', color: '#0f172a', fontWeight: 800, fontSize: '0.72rem',
            px: 2, py: 0.5, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 0.5,
            boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
            whiteSpace: 'nowrap',
          }}>
            <AutoAwesome sx={{ fontSize: 13 }} /> {t('pricing.plans.business.popular', 'LE PLUS CHOISI')}
          </Box>
        )}
        <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{
            color: isPopular ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'),
            fontWeight: 700, fontSize: '0.8rem', mb: 2,
            textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center'
          }}>
            {title}
          </Typography>

          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {originalPrice && (
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', textDecoration: 'line-through', fontSize: '1.1rem', fontWeight: 500 }}>
                {originalPrice}
              </Typography>
            )}
            <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 900, fontSize: '3.2rem', lineHeight: 1 }}>
              {price}
            </Typography>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)', fontSize: '0.875rem', mt: 0.75 }}>
              {period}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', my: 2.5 }} />

          <Stack spacing={1.75} sx={{ mb: 4, flex: 1 }}>
            {features.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <CheckCircleOutline sx={{ fontSize: 19, color: isPopular ? '#2563eb' : '#10b981', mt: 0.15, flexShrink: 0 }} />
                <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                  {f}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Button
            fullWidth
            variant={isPopular ? 'contained' : 'outlined'}
            onClick={onCta}
            disableElevation
            sx={{
              py: 1.6, borderRadius: 3, fontWeight: 700, textTransform: 'none', fontSize: '0.95rem',
              ...(isPopular ? {
                bgcolor: '#2563eb', color: '#fff',
                boxShadow: `0 8px 24px ${alpha('#2563eb', 0.3)}`,
                '&:hover': { bgcolor: '#1d4ed8', boxShadow: `0 12px 32px ${alpha('#2563eb', 0.4)}` }
              } : {
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                color: isDark ? '#fff' : '#0f172a',
                '&:hover': { borderColor: '#2563eb', bgcolor: isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.04)' }
              }),
            }}
          >
            {ctaText}
          </Button>

          {isFree && (
            <Typography sx={{ color: '#10b981', fontSize: '0.75rem', textAlign: 'center', mt: 1.5, fontWeight: 600 }}>
              {t('pricing.freeUntil')}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// ─── Country → Currency mapping ──────────────────────────────────
const COUNTRY_CURRENCY_MAP = {
  SN: 'XOF', ML: 'XOF', BF: 'XOF', CI: 'XOF', TG: 'XOF', BJ: 'XOF', GW: 'XOF', NE: 'XOF',
  CM: 'XAF', CG: 'XAF', GA: 'XAF', CF: 'XAF', TD: 'XAF', GQ: 'XAF',
  MA: 'MAD', TN: 'TND', DZ: 'DZD',
  NG: 'NGN', ZA: 'ZAR', GH: 'GHS', KE: 'KES', EG: 'EGP',
  GB: 'GBP', CH: 'CHF',
  US: 'USD', CA: 'CAD', BR: 'BRL', MX: 'MXN',
  JP: 'JPY', IN: 'INR', SG: 'SGD', HK: 'HKD', CN: 'CNY',
  AE: 'AED', SA: 'SAR',
};
const EUR_RATES = {
  EUR: 1, USD: 1.08, GBP: 0.86, CHF: 0.96, CAD: 1.47,
  XOF: 655.96, XAF: 655.96, MAD: 10.8, TND: 3.35, DZD: 144,
  NGN: 1780, ZAR: 20, GHS: 16, KES: 140, EGP: 52,
  JPY: 163, INR: 91, SGD: 1.45, HKD: 8.4, CNY: 7.8,
  AED: 3.97, SAR: 4.05, BRL: 5.5, MXN: 18.5,
};
const CURRENCY_SYMBOLS_SIMPLE = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', CAD: 'C$',
  XOF: 'FCFA', XAF: 'FCFA', MAD: 'DH', TND: 'TND', DZD: 'DZD',
  NGN: '₦', ZAR: 'R', GHS: 'GH₵', KES: 'KSh', EGP: 'E£',
  JPY: '¥', INR: '₹', SGD: 'S$', HKD: 'HK$', CNY: '¥',
  AED: 'AED', SAR: 'SR', BRL: 'R$', MXN: 'MX$',
};
const SYMBOL_AFTER = ['EUR', 'XOF', 'XAF', 'MAD', 'TND', 'DZD', 'CHF', 'AED', 'SAR'];
const formatPriceCurrency = (amount, currency) => {
  const sym = CURRENCY_SYMBOLS_SIMPLE[currency] || currency;
  const formatted = amount.toLocaleString('fr-FR');
  return SYMBOL_AFTER.includes(currency) ? `${formatted} ${sym}` : `${sym}${formatted}`;
};

const usePricingCurrency = () => {
  const [currency, setCurrency] = useState('EUR');
  useEffect(() => {
    const cached = sessionStorage.getItem('pricingCurrency');
    if (cached) { setCurrency(cached); return; }
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const detected = COUNTRY_CURRENCY_MAP[data.country_code] || 'EUR';
        setCurrency(detected);
        sessionStorage.setItem('pricingCurrency', detected);
      })
      .catch(() => {});
  }, []);
  const convertPrice = (eurAmount) => {
    if (currency === 'EUR') return null;
    const rate = EUR_RATES[currency] || 1;
    return Math.round(eurAmount * rate);
  };
  return { currency, convertPrice };
};

// ═════════════════════════════════════════════════════════════════
// MAIN LANDING COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function Landing() {
  const { t, i18n } = useTranslation('landing');
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const { currency, convertPrice } = usePricingCurrency();

  // Direction « clair éditorial premium » : landing toujours en clair lumineux
  // (charte bleu #2563eb + doré #f59e0b), indépendamment du thème de l'app.
  const isDark = false; // landing toujours claire
  const bgColor = '#ffffff';       // fond blanc pur
  const bgSection = '#f6f8fc';     // section légèrement teintée bleu très clair

  // Styles éditoriaux partagés (premium, aéré)
  const eyebrow = {
    display: 'inline-block', fontSize: '0.78rem', fontWeight: 700,
    letterSpacing: '0.22em', textTransform: 'uppercase', color: '#2563eb', mb: 2.5,
  };
  const serifTitle = {
    fontFamily: '"Fraunces", Georgia, serif', fontWeight: 500,
    letterSpacing: '-0.02em', lineHeight: 1.08, color: '#0f172a',
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

  useEffect(() => {
    const defaultWord = words[0] || 'entreprise';
    document.title = `${t('hero.titleStart')} ${defaultWord} | Procura`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = t('hero.subtitle');
  }, [t, i18n.language, words]);

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
    <Box ref={pageRef} sx={{ bgcolor: bgColor, color: '#0f172a', minHeight: '100vh', overflowX: 'hidden' }}>
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
                  color: '#0f172a',
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
                    { icon: <CreditCardOff sx={{ fontSize: 18 }} />, text: '1 mois offert, sans carte' },
                    { icon: <Lock sx={{ fontSize: 18 }} />, text: 'Données sécurisées' },
                    { icon: <Gavel sx={{ fontSize: 18 }} />, text: 'Conforme OHADA' },
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
                  bgcolor: '#fff', borderRadius: 3, px: 2, py: 1.25,
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 16px 40px -12px rgba(15,23,42,0.2)',
                  display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.25,
                }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.1rem', lineHeight: 1, color: '#0f172a' }}>−30%</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>de temps admin</Typography>
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
            {[
              { icon: <Lock />, title: 'Données sécurisées', desc: 'Chiffrées et sauvegardées. Elles restent les vôtres.', color: '#2563eb' },
              { icon: <CreditCardOff />, title: '1 mois offert', desc: "Essai gratuit, sans carte bancaire ni engagement.", color: '#10b981' },
              { icon: <Gavel />, title: 'Conforme OHADA', desc: 'TVA Cameroun, Sénégal, Côte d’Ivoire. Facturation en FCFA.', color: '#f59e0b' },
              { icon: <SupportAgent />, title: 'Support humain', desc: 'Une équipe joignable sur WhatsApp, réponse sous 2 h.', color: '#8b5cf6' },
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
              <Typography sx={{ ...eyebrow }}>En 3 étapes</Typography>
              <Typography variant="h2" sx={{ ...serifTitle, fontSize: { xs: '2rem', sm: '3rem' } }}>
                De la question à l'action,<br />
                <Box component="span" sx={{ fontStyle: 'italic', color: '#2563eb' }}>sans effort</Box>.
              </Typography>
            </div>
          </Box>

          <Grid container spacing={{ xs: 5, md: 6 }} alignItems="flex-start">
            {[
              { img: '/mascote/Procura_thinking.png', step: '01', title: 'Vous demandez', desc: 'Posez une question en langage naturel : « Quels produits sont bientôt en rupture ? »' },
              { img: '/mascote/Procura_reading.png', step: '02', title: 'Procura analyse', desc: 'L\'IA parcourt vos stocks, ventes et marges, puis détecte ce qui compte vraiment.' },
              { img: '/mascote/Procura_thumbup.png', step: '03', title: 'Vous validez', desc: 'Un bon de commande, une facture, une relance — généré et prêt en un clic.' },
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
                  <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.35rem', color: '#0f172a', mb: 1 }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{ color: 'rgba(0,0,0,0.55)', fontSize: '0.98rem', lineHeight: 1.6, maxWidth: 320, mx: 'auto' }}>
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
                color: 'rgba(0,0,0,0.55)',
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
                  Découvrir l'interface
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
                  label="L'Avantage IA"
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
                  Votre analyste privé{' '}
                  <Box component="span" sx={{ color: '#f59e0b' }}>travaillant H24</Box>
                </Typography>
                <Typography sx={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  fontSize: '1.05rem', mb: 5, lineHeight: 1.65,
                }}>
                  L'IA intégrée de Procura n'est pas un simple gadget. Elle analyse en continu vos transactions pour vous offrir des recommandations business concrètes.
                </Typography>

                <Stack spacing={3.5}>
                  {[
                    { icon: <Psychology />, title: t('platform.features.ai.title'), desc: t('platform.features.ai.desc'), color: '#2563eb' },
                    { icon: <Speed />, title: 'Actions en un clic', desc: "Transformez une alerte de stock en bon de commande via l'interface conversationnelle.", color: '#f59e0b' },
                    { icon: <NotificationsActive />, title: 'Alertes intelligentes', desc: "Soyez notifié quand les marges d'un produit baissent en dessous du seuil.", color: '#10b981' },
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
                <AIChatDemo />
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
              <Chip label="Tarifs transparents" sx={{
                mb: 3, bgcolor: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)',
                border: `1px solid ${alpha('#2563eb', 0.25)}`, color: '#2563eb', fontWeight: 700, px: 1, py: 2.5, borderRadius: 2,
              }} />
              <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '1.9rem', sm: '2.6rem' }, mb: 2, color: isDark ? '#fff' : '#0f172a' }}>
                Commencez gratuitement,{' '}
                <Box component="span" sx={{ color: '#2563eb' }}>évoluez à votre rythme</Box>
              </Typography>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', maxWidth: 560, mx: 'auto', fontSize: '1.08rem', lineHeight: 1.65 }}>
                Un plan gratuit pour démarrer, le plan Pro à 9&euro;/mois avec un mois d&apos;essai offert (sans carte), et tout illimité dès le plan Business.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
                <Button variant="contained" size="large" onClick={() => navigate('/pricing')}
                  sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1rem' }}>
                  Voir les tarifs
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/register')}
                  sx={{ px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1rem', borderColor: alpha('#2563eb', 0.4), color: '#2563eb', '&:hover': { borderColor: '#2563eb', bgcolor: alpha('#2563eb', 0.04) } }}>
                  Essayer gratuitement
                </Button>
              </Box>
            </div>
          </Box>
        </Container>
      </Box>

      {/* Ancienne grille de prix retirée (infos obsolètes) — source unique : page /pricing */}
      <Box sx={{ display: 'none' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <div className="gsap-reveal">
              <Chip label={t('pricing.badge')} sx={{
                mb: 3,
                bgcolor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${alpha('#10b981', 0.25)}`,
                color: '#10b981', fontWeight: 700, px: 1, py: 2.5, borderRadius: 2,
              }} />
              <Typography variant="h3" sx={{
                fontWeight: 900, fontSize: { xs: '1.8rem', sm: '2.6rem' }, mb: 2.5,
                color: isDark ? '#fff' : '#0f172a',
              }}>
                Un investissement{' '}
                <Box component="span" sx={{ color: '#10b981' }}>rentable</Box>
              </Typography>
              <Typography sx={{
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)',
                maxWidth: 560, mx: 'auto', fontSize: '1.05rem', lineHeight: 1.65,
              }}>
                {t('pricing.subtitle')}
              </Typography>
              {currency !== 'EUR' && (
                <Typography sx={{ mt: 2, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', fontSize: '0.82rem' }}>
                  Prix indicatifs en {CURRENCY_SYMBOLS_SIMPLE[currency] || currency} ({currency}) · Facturation en EUR
                </Typography>
              )}
            </div>
          </Box>

          <Grid container spacing={3} justifyContent="center" alignItems="stretch">
            <Grid item xs={12} sm={6} md={4}>
              <PricingCard
                t={t}
                title={t('pricing.plans.essential.name')}
                price={convertPrice(10) !== null ? formatPriceCurrency(convertPrice(10), currency) : t('pricing.plans.essential.price')}
                period="par mois, à vie"
                features={[t('pricing.plans.essential.f1'), t('pricing.plans.essential.f2'), t('pricing.plans.essential.f3'), t('pricing.plans.essential.f4')]}
                ctaText={t('pricing.cta')}
                onCta={() => navigate('/register')}
                delay={0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <PricingCard
                t={t}
                title={t('pricing.plans.business.name')}
                price={convertPrice(45) !== null ? formatPriceCurrency(convertPrice(45), currency) : t('pricing.plans.business.price')}
                originalPrice={convertPrice(99) !== null ? formatPriceCurrency(convertPrice(99), currency) + '/mois' : '99€/mois'}
                period="par mois"
                isPopular isFree
                features={[t('pricing.plans.business.f1'), t('pricing.plans.business.f2'), t('pricing.plans.business.f3'), t('pricing.plans.business.f4'), t('pricing.plans.business.f5'), t('pricing.plans.business.f6')]}
                ctaText={t('pricing.cta')}
                onCta={() => navigate('/register')}
                delay={0.1}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <PricingCard
                t={t}
                title={t('pricing.plans.enterprise.name')}
                price={t('pricing.plans.enterprise.price')}
                period="paiement annuel"
                features={[t('pricing.plans.enterprise.f1'), t('pricing.plans.enterprise.f2'), t('pricing.plans.enterprise.f3'), t('pricing.plans.enterprise.f4'), t('pricing.plans.enterprise.f5')]}
                ctaText={t('pricing.ctaContact')}
                onCta={() => navigate('/register')}
                delay={0.2}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <Box sx={{
        py: { xs: 10, sm: 14 }, bgcolor: bgColor, textAlign: 'center',
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
              Prêt à gagner{' '}
              <Box component="span" sx={{ fontStyle: 'italic', color: '#2563eb' }}>du temps</Box> ?
            </Typography>
            <Typography sx={{
              color: 'rgba(0,0,0,0.55)',
              fontSize: '1.08rem', lineHeight: 1.65, mb: 5, maxWidth: 460, mx: 'auto',
            }}>
              Créez votre compte en 2 minutes. Un mois offert, sans carte.
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
                Commencer gratuitement
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
                Se connecter
              </Button>
            </Box>
          </div>
        </Container>
      </Box>

    </Box>
  );
}
