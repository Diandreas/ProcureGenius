import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@mui/icons-material';
import { useColorMode } from '../App';

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
    { role: 'ai', text: '🚨 3 produits critiques détectés :', detail: '• Écran LED 27" — 4 restants (~2 jours)\n• Câble HDMI 2.1 — 8 restants (~5 jours)\n• Souris ergonomique — 2 restants (~1 jour)' },
    { role: 'ai', text: '💡 Je peux créer automatiquement un bon de commande pour réapprovisionner ces 3 produits. Voulez-vous que je le fasse ?', action: 'Créer le bon de commande' },
  ];

  useEffect(() => {
    const timers = messages.map((_, i) =>
      setTimeout(() => setVisibleMessages(i + 1), (i + 1) * 1200)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 40, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
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
        <AnimatePresence>
          {messages.slice(0, visibleMessages).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9, y: 20, originX: msg.role === 'user' ? 1 : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
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
            </motion.div>
          ))}
        </AnimatePresence>
        {visibleMessages < messages.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 4, paddingLeft: 8 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{
                width: 6, height: 6, borderRadius: '50%', bgcolor: '#2563eb',
                animation: 'blink 1.4s infinite',
                animationDelay: `${i * 0.2}s`,
                '@keyframes blink': { '0%,80%,100%': { opacity: 0.2 }, '40%': { opacity: 1 } }
              }} />
            ))}
          </motion.div>
        )}
      </Box>
    </Box>
  );
};

// ─── Feature Card ─────────────────────────────────────────────────
const FeatureCard = ({ icon, title, description, color, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      style={{ height: '100%' }}
    >
      <Card sx={{
        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 4,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
        transition: 'all 0.3s',
        '&:hover': {
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
    </motion.div>
  );
};

// ─── Pricing Card ─────────────────────────────────────────────────
const PricingCard = ({ t, title, price, originalPrice, period, features, isPopular, isFree, ctaText, onCta, delay }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -6 }}
      style={{ height: '100%' }}
    >
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
    </motion.div>
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
  const isDark = theme.palette.mode === 'dark';
  const { currency, convertPrice } = usePricingCurrency();

  const bgColor = isDark ? '#09090b' : '#f8fafc';
  const bgSection = isDark ? '#0f172a' : '#f1f5f9';

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

  return (
    <Box sx={{ bgcolor: bgColor, color: isDark ? '#fff' : '#0f172a', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        pt: { xs: 14, sm: 20 },
        pb: { xs: 8, sm: 12 },
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle background glow */}
        <Box sx={{
          position: 'absolute',
          top: '20%', right: '10%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: isDark
            ? `radial-gradient(circle, ${alpha('#2563eb', 0.08)} 0%, transparent 70%)`
            : `radial-gradient(circle, ${alpha('#2563eb', 0.05)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
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

                {/* Headline */}
                <Typography variant="h1" sx={{
                  fontWeight: 900,
                  fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' },
                  lineHeight: 1.08,
                  mb: 0.5,
                  letterSpacing: -1,
                  color: isDark ? '#fff' : '#0f172a',
                }}>
                  {t('hero.titleStart')}
                </Typography>
                <Typography variant="h1" sx={{
                  fontWeight: 900,
                  fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' },
                  lineHeight: 1.08,
                  mb: 3,
                  letterSpacing: -1,
                }}>
                  <Box component="span" sx={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #f59e0b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    minWidth: '200px',
                    display: 'inline-block',
                  }}>
                    {text}
                  </Box>
                  <Box component="span" sx={{
                    display: 'inline-block', width: '2px', height: '0.8em',
                    bgcolor: '#2563eb', ml: '3px', verticalAlign: 'text-bottom',
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

                {/* Social proof */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex' }}>
                    {['#2563eb', '#f59e0b', '#10b981', '#ef4444'].map((c, i) => (
                      <Avatar key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`}
                        sx={{ width: 34, height: 34, ml: i > 0 ? -1.5 : 0, border: `2px solid ${bgColor}` }}
                      />
                    ))}
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                      {[1,2,3,4,5].map(i => <Star key={i} sx={{ fontSize: 15, color: '#f59e0b' }} />)}
                    </Box>
                    <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)', fontSize: '0.8rem', fontWeight: 500 }}>
                      {t('hero.socialProof')}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              >
                <Box sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  boxShadow: isDark ? '0 40px 80px rgba(0,0,0,0.5)' : '0 24px 60px rgba(37,99,235,0.08)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(37,99,235,0.02)',
                }}>
                  <dotlottie-wc
                    src="https://lottie.host/ea0ff272-a2d1-4a4d-a09d-b9d190ae1244/nTY70f1Nfx.lottie"
                    style={{ width: '100%', height: '560px' }}
                    autoplay loop
                  />
                </Box>
              </motion.div>
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
              { value: 500, suffix: '+', label: t('stats.companies'), color: '#2563eb' },
              { value: 150, suffix: 'k+', label: t('stats.documents'), color: '#f59e0b' },
              { value: 99, suffix: '.9%', label: t('stats.uptime'), color: '#10b981' },
              { value: 12, suffix: 'h', label: t('stats.timeSaved'), color: '#8b5cf6' },
            ].map((s, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', sm: '2.4rem' }, color: s.color, lineHeight: 1 }}>
                    <AnimatedCounter end={s.value} suffix={s.suffix} />
                  </Typography>
                  <Typography sx={{
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    fontSize: '0.8rem', fontWeight: 600, mt: 0.75,
                    textTransform: 'uppercase', letterSpacing: 1,
                  }}>
                    {s.label}
                  </Typography>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ─── Features ─────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 10, sm: 14 }, bgcolor: bgColor }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Chip label={t('platform.badge')} sx={{
                mb: 3,
                bgcolor: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)',
                border: `1px solid ${alpha('#2563eb', 0.25)}`,
                color: '#2563eb', fontWeight: 700, px: 1, py: 2.5, borderRadius: 2,
              }} />
              <Typography variant="h2" sx={{
                fontWeight: 900, fontSize: { xs: '1.8rem', sm: '2.6rem' },
                mb: 2.5, color: isDark ? '#fff' : '#0f172a',
              }}>
                {t('platform.titleStart')}{' '}
                <Box component="span" sx={{ color: '#2563eb' }}>
                  {t('platform.titleHighlight')}
                </Box>{' '}
                {t('platform.titleEnd')}
              </Typography>
              <Typography sx={{
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)',
                maxWidth: 580, mx: 'auto', fontSize: '1.05rem', lineHeight: 1.65,
              }}>
                {t('platform.subtitle')}
              </Typography>
            </motion.div>
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
              <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Box sx={{
                  borderRadius: 4, overflow: 'hidden',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.5)' : '0 16px 48px rgba(0,0,0,0.08)',
                }}>
                  <img src="/procura.png" alt="Interface Procura" style={{ width: '100%', display: 'block' }} />
                </Box>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
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
              </motion.div>
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
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
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
                    <motion.div key={i} whileHover={{ scale: 1.02 }} style={{ display: 'flex', gap: 16 }}>
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
                    </motion.div>
                  ))}
                </Stack>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={7}>
              <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <AIChatDemo />
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── Pricing ──────────────────────────────────────────── */}
      <Box sx={{
        py: { xs: 10, sm: 14 }, bgcolor: bgSection,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      }} id="pricing-section">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
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
            </motion.div>
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
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Typography variant="h2" sx={{
              fontWeight: 900, fontSize: { xs: '2rem', sm: '2.8rem' },
              mb: 2.5, color: isDark ? '#fff' : '#0f172a',
            }}>
              Prêt à transformer votre gestion{' '}
              <Box component="span" sx={{ color: '#2563eb' }}>achats</Box> ?
            </Typography>
            <Typography sx={{
              color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
              fontSize: '1.05rem', lineHeight: 1.65, mb: 5,
            }}>
              Rejoignez 500+ entreprises qui ont déjà optimisé leurs achats avec Procura.
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
          </motion.div>
        </Container>
      </Box>

    </Box>
  );
}
