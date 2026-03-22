import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  Business,
  CheckCircleOutline,
  LightMode,
  DarkMode,
  Translate,
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

// ─── Fake AI Chat Demo ───────────────────────────────────────────
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
          : '0 20px 40px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#2563eb', fontSize: '0.8rem' }}>
          <SmartToy sx={{ fontSize: 16 }} />
        </Avatar>
        <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 600, fontSize: '0.85rem' }}>Procura IA</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', animation: 'pulse 2s infinite' }} />
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
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  bgcolor: msg.role === 'user' ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  border: msg.role === 'ai' ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}` : 'none',
                }}
              >
                <Typography sx={{ color: msg.role === 'user' ? '#fff' : (isDark ? '#fff' : '#0f172a'), fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {msg.text}
                </Typography>
                
                {msg.detail && (
                  <Typography
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                      fontSize: '0.75rem',
                      mt: 1.5,
                      whiteSpace: 'pre-line',
                      fontFamily: 'monospace',
                      bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                      p: 1.5,
                      borderRadius: 1,
                      borderLeft: '2px solid #f59e0b'
                    }}
                  >
                    {msg.detail}
                  </Typography>
                )}
                
                {msg.action && (
                  <Button 
                    size="small" 
                    variant="contained" 
                    sx={{ 
                      mt: 1.5, 
                      bgcolor: '#f59e0b', 
                      color: '#0f172a', 
                      textTransform: 'none', 
                      fontSize: '0.75rem', 
                      borderRadius: 2, 
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                      '&:hover': { bgcolor: '#d97706' }
                    }}
                  >
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
              <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2563eb', animation: 'blink 1.4s infinite', animationDelay: `${i * 0.2}s` }} />
            ))}
          </motion.div>
        )}
      </Box>
    </Box>
  );
};

// ─── Feature Card ────────────────────────────────────────────────
const FeatureCard = ({ icon, title, description, color, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 4,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.03)',
          transition: 'all 0.3s',
          '&:hover': {
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
            borderColor: alpha(color, 0.3),
            boxShadow: `0 20px 40px -10px ${alpha(color, 0.1)}`,
          }
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Avatar 
            sx={{ 
              width: 56, 
              height: 56, 
              bgcolor: alpha(color, 0.1), 
              color: color, 
              mb: 2.5, 
              borderRadius: 3 
            }}
          >
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, fontSize: '1.1rem', mb: 1.5 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {description}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── Pricing Card ────────────────────────────────────────────────
const PricingCard = ({ title, price, originalPrice, period, features, isPopular, isFree, ctaText, onCta, delay }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const cardBgColor = isPopular 
    ? (isDark ? 'rgba(37, 99, 235, 0.08)' : '#eff6ff') 
    : (isDark ? 'rgba(255,255,255,0.02)' : '#ffffff');

  const cardBorderColor = isPopular 
    ? alpha('#2563eb', 0.4) 
    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8 }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          bgcolor: cardBgColor,
          border: `1px solid ${cardBorderColor}`,
          borderRadius: 5,
          position: 'relative',
          overflow: 'visible',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isPopular ? `0 20px 60px ${alpha('#2563eb', 0.1)}` : (isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.03)'),
        }}
      >
        {isPopular && (
          <Box
            sx={{
              position: 'absolute',
              top: -14,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: '#f59e0b',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.75rem',
              px: 2,
              py: 0.5,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <AutoAwesome sx={{ fontSize: 14 }} /> LE PLUS CHOISI
          </Box>
        )}
        <CardContent sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ color: isPopular ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'), fontWeight: 700, fontSize: '1rem', mb: 2, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' }}>
            {title}
          </Typography>
          
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {originalPrice && (
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', textDecoration: 'line-through', fontSize: '1.2rem', fontWeight: 500 }}>
                {originalPrice}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
              <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 900, fontSize: '3.5rem', lineHeight: 1 }}>{price}</Typography>
            </Box>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', fontSize: '0.9rem', mt: 1 }}>
              {period}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', my: 3 }} />

          <Stack spacing={2} sx={{ mb: 4, flex: 1 }}>
            {features.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <CheckCircleOutline sx={{ fontSize: 20, color: isPopular ? '#3b82f6' : '#10b981', mt: 0.2 }} />
                <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', fontSize: '0.95rem', lineHeight: 1.4 }}>
                  {f}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Button
            fullWidth
            variant={isPopular ? 'contained' : 'outlined'}
            onClick={onCta}
            sx={{
              py: 1.8,
              borderRadius: 3,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1rem',
              ...(isPopular
                ? { 
                    bgcolor: '#2563eb',
                    color: '#fff',
                    '&:hover': { bgcolor: '#1d4ed8' }
                  }
                : { 
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', 
                    color: isDark ? '#fff' : '#0f172a', 
                    '&:hover': { borderColor: isDark ? '#fff' : '#000', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } 
                  }
              ),
            }}
          >
            {ctaText}
          </Button>

          {isFree && (
            <Typography sx={{ color: '#10b981', fontSize: '0.75rem', textAlign: 'center', mt: 1.5, fontWeight: 600 }}>
              Gratuit jusqu'au 30 Avril
            </Typography>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════════════
// MAIN LANDING COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function Landing() {
  const { t, i18n } = useTranslation('landing');
  const navigate = useNavigate();
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === 'dark';
  
  const [scrollY, setScrollY] = useState(0);

  // Typewriter effect logic
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
      timer = setTimeout(() => setIsDeleting(true), 2000); // Pause at end of word
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
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // SEO setup
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

  const bgColor = isDark ? '#09090b' : '#f8fafc';
  const headerBgActive = isDark ? 'rgba(9,9,11,0.95)' : 'rgba(248,250,252,0.95)';
  const headerBgInactive = 'transparent';

  return (
    <Box
      sx={{
        bgcolor: bgColor,
        color: isDark ? '#fff' : '#0f172a',
        minHeight: '100vh',
        overflowX: 'hidden',
        position: 'relative',
        fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      }}
    >
      <header>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <Box
          sx={{
            background: scrollY > 50 ? headerBgActive : headerBgInactive,
            borderBottom: scrollY > 50 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : '1px solid transparent',
            transition: 'all 0.3s',
            boxShadow: scrollY > 50 ? (isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)') : 'none',
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => window.scrollTo(0, 0)}>
                <img 
                  src="/main.png" 
                  alt="Procura Logo" 
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/32'; }} 
                />
                <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: -0.5, color: isDark ? '#fff' : '#0f172a' }}>
                  Procura
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center' }}>
                <Button 
                  onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
                  title="Changer de langue / Switch Language"
                  sx={{ 
                    minWidth: 'auto', p: 1, 
                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', 
                    '&:hover': { color: isDark ? '#fff' : '#000', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, 
                    borderRadius: 2 
                  }}
                >
                  <Translate fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>{i18n.language}</Typography>
                </Button>
                <Button 
                  onClick={toggleColorMode} 
                  sx={{ 
                    minWidth: 'auto', p: 1, 
                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', 
                    '&:hover': { color: isDark ? '#fff' : '#000', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, 
                    borderRadius: 2 
                  }}
                >
                  {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                </Button>
                <Button 
                  onClick={() => navigate('/login')} 
                  sx={{ 
                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    fontSize: '0.95rem', 
                    '&:hover': { color: isDark ? '#fff' : '#000', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, 
                    borderRadius: 2, 
                    px: 2 
                  }}
                >
                  {t('nav.login')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/register')}
                  sx={{
                    bgcolor: '#2563eb',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    borderRadius: 2.5,
                    px: { xs: 2.5, sm: 4 },
                    color: '#fff',
                    '&:hover': { bgcolor: '#1d4ed8' }
                  }}
                >
                  {t('nav.freeTrial')}
                </Button>
              </Box>

            </Box>
          </Container>
        </Box>
      </motion.div>
      </header>
      <main>
      {/* ─── Hero Section ─── */}
      <Box 
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          pt: { xs: 14, sm: 20 },
          pb: { xs: 8, sm: 12 },
          position: 'relative',
          zIndex: 1
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 4,
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    px: 2,
                    py: 1,
                    borderRadius: 8,
                  }}
                >
                  <AutoAwesome sx={{ fontSize: 18 }} />
                  {t('hero.badge')}
                </Box>

                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                    lineHeight: 1.05,
                    mb: 3,
                    letterSpacing: -1.5,
                    color: isDark ? '#fff' : '#0f172a'
                  }}
                >
                  {t('hero.titleStart')}{' '}
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #f59e0b 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      position: 'relative',
                      display: 'inline-block',
                      minWidth: '200px'
                    }}
                  >
                    {text}
                    <span style={{ borderRight: '2px solid #3b82f6', ml: 1, animation: 'blink 0.7s infinite' }} />
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    lineHeight: 1.6,
                    mb: 5,
                    maxWidth: 500,
                  }}
                >
                  {t('hero.subtitle')}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 5 }}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate('/register')}
                    sx={{
                      bgcolor: '#2563eb',
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      borderRadius: 3,
                      px: { xs: 3, sm: 5 },
                      py: 1.8,
                      color: '#fff',
                      '&:hover': { bgcolor: '#1d4ed8', transform: 'translateY(-2px)' },
                      transition: 'all 0.3s',
                    }}
                  >
                    {t('hero.ctaPrimary')}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PlayArrow />}
                    onClick={() => {
                      document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    sx={{
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                      color: isDark ? '#fff' : '#0f172a',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      borderRadius: 3,
                      px: { xs: 3, sm: 4 },
                      py: 1.8,
                      bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      '&:hover': {
                        borderColor: '#2563eb',
                        bgcolor: isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)',
                      }
                    }}
                  >
                    {t('hero.ctaSecondary')}
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex' }}>
                    {['#2563eb', '#f59e0b', '#10b981', '#ef4444'].map((c, i) => (
                      <Avatar 
                        key={i}
                        src={`https://i.pravatar.cc/100?img=${i + 10}`}
                        sx={{ 
                          width: 36, height: 36, 
                          ml: i > 0 ? -1.5 : 0, 
                          border: `2px solid ${bgColor}`
                        }} 
                      />
                    ))}
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} sx={{ fontSize: 16, color: '#f59e0b' }} />)}
                    </Box>
                    <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.8rem', fontWeight: 500 }}>
                      {t('hero.socialProof')}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              >
                <img 
                    src="/landing.png" 
                    alt="Procura" 
                    style={{ 
                      width: '100%', 
                      maxWidth: 600, 
                      display: 'block', 
                      margin: '0 auto',
                      borderRadius: 16,
                      boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(0,0,0,0.1)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                    }} 
                />
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── Stats Section ─── */}
      <Box sx={{ py: 6, position: 'relative', zIndex: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
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
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', sm: '2.5rem' }, color: s.color, lineHeight: 1 }}>
                    <AnimatedCounter end={s.value} suffix={s.suffix} />
                  </Typography>
                  <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: '0.9rem', fontWeight: 600, mt: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {s.label}
                  </Typography>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ─── Platform Features Grid ─── */}
      <Box sx={{ py: { xs: 12, sm: 16 }, position: 'relative', zIndex: 1, bgcolor: bgColor }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Chip label={t('platform.badge')} sx={{ mb: 3, bgcolor: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#2563eb', fontWeight: 700, px: 1, py: 2.5, borderRadius: 2 }} />
              <Typography variant="h2" sx={{ fontWeight: 900, fontSize: { xs: '2rem', sm: '3rem' }, mb: 3 }}>
                {t('platform.titleStart')}{' '}
                <Box component="span" sx={{ color: '#2563eb' }}>
                  {t('platform.titleHighlight')}
                </Box>{' '}
                {t('platform.titleEnd')}
              </Typography>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', maxWidth: 650, mx: 'auto', fontSize: '1.15rem', lineHeight: 1.6 }}>
                {t('platform.subtitle')}
              </Typography>
            </motion.div>
          </Box>

          <Grid container spacing={3}>
            {[
              { icon: <SmartToy />, title: t('platform.features.ai.title'), description: t('platform.features.ai.desc'), color: '#2563eb', delay: 0 },
              { icon: <Receipt />, title: t('platform.features.invoices.title'), description: t('platform.features.invoices.desc'), color: '#10b981', delay: 0.1 },
              { icon: <Inventory />, title: t('platform.features.inventory.title'), description: t('platform.features.inventory.desc'), color: '#f59e0b', delay: 0.2 },
              { icon: <People />, title: t('platform.features.suppliers.title'), description: t('platform.features.suppliers.desc'), color: '#8b5cf6', delay: 0.3 },
              { icon: <DocumentScanner />, title: t('platform.features.ocr.title'), description: t('platform.features.ocr.desc'), color: '#ec4899', delay: 0.4 },
              { icon: <TrendingUp />, title: t('platform.features.analytics.title'), description: t('platform.features.analytics.desc'), color: '#ef4444', delay: 0.5 },
            ].map((f, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <FeatureCard {...f} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ─── Interface Showcase ─── */}
      <Box sx={{ py: { xs: 12, sm: 16 }, position: 'relative', zIndex: 1, bgcolor: isDark ? '#0f172a' : '#f1f5f9', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <img 
                  src="/procura.png" 
                  alt="Interface Procura" 
                  style={{ 
                    width: '100%', 
                    borderRadius: 16, 
                    boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(0,0,0,0.1)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` 
                  }} 
                />
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Chip label="Interface unifiée" sx={{ mb: 3, bgcolor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontWeight: 700, borderRadius: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 3, fontSize: { xs: '2rem', sm: '2.5rem' } }}>
                  Gagnez en clarté avec un <Box component="span" sx={{ color: '#2563eb' }}>tableau de bord interactif</Box>
                </Typography>
                <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '1.1rem', lineHeight: 1.6, mb: 4 }}>
                  Centralisez vos achats, factures, et suivi d'activités sur une seule vue. Dites adieu aux tableurs et prenez des décisions rapides avec confiance.
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/register')}
                  sx={{ 
                    borderRadius: 2, 
                    textTransform: 'none', 
                    fontWeight: 600,
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    color: isDark ? '#fff' : '#000',
                    '&:hover': {
                      borderColor: '#2563eb',
                      bgcolor: isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)'
                    }
                  }}
                >
                  Découvrir l'interface
                </Button>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── AI Showcase ─── */}
      <Box sx={{ py: { xs: 12, sm: 16 }, position: 'relative', zIndex: 1, bgcolor: isDark ? '#111827' : '#f8fafc', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }} id="demo-section">
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={5}>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Chip icon={<Psychology />} label="L'Avantage IA" sx={{ mb: 3, bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', fontWeight: 700, px: 1, py: 2.5, borderRadius: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '2rem', sm: '2.5rem' }, mb: 3 }}>
                  Votre analyste privé{' '}
                  <Box component="span" sx={{ color: '#f59e0b' }}>
                    travaillant H24
                  </Box>
                </Typography>
                <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '1.1rem', mb: 5, lineHeight: 1.6 }}>
                  L'IA intégrée de Procura n'est pas un simple gadget. Elle analyse en continu vos transactions pour vous offrir des recommandations business concrètes.
                </Typography>
                
                <Stack spacing={4}>
                  {[
                    { icon: <Psychology />, title: t('platform.features.ai.title'), desc: t('platform.features.ai.desc'), color: '#2563eb' },
                    { icon: <Speed />, title: 'Actions en un clic', desc: "Transformez une alerte de stock en bon de commande via l'interface conversationnelle.", color: '#f59e0b' },
                    { icon: <NotificationsActive />, title: 'Alertes intelligentes', desc: "Soyez notifié quand les marges d'un produit baissent en dessous du seuil.", color: '#10b981' },
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.02 }} 
                      style={{ display: 'flex', gap: 20 }}
                    >
                      <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(item.color, 0.1), color: item.color, flexShrink: 0 }}>
                        {item.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, fontSize: '1.05rem', mb: 0.5 }}>{item.title}</Typography>
                        <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</Typography>
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

      {/* ─── Pricing ─── */}
      <Box sx={{ py: { xs: 12, sm: 16 }, position: 'relative', zIndex: 1, bgcolor: bgColor, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }} id="pricing">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Chip label={t('pricing.badge')} sx={{ mb: 3, bgcolor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontWeight: 700, px: 1, py: 2.5, borderRadius: 2 }} />
              <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '2rem', sm: '3rem' }, mb: 3 }}>
                Un investissement{' '}
                <Box component="span" sx={{ color: '#10b981' }}>
                  rentable
                </Box>
              </Typography>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', maxWidth: 600, mx: 'auto', fontSize: '1.15rem' }}>
                {t('pricing.subtitle')}
              </Typography>
            </motion.div>
          </Box>

          <Grid container spacing={4} justifyContent="center" alignItems="stretch">
            <Grid item xs={12} sm={6} md={4}>
              <PricingCard
                title={t('pricing.plans.essential.name')}
                price={t('pricing.plans.essential.price')}
                period="par mois, à vie"
                features={[
                  t('pricing.plans.essential.f1'),
                  t('pricing.plans.essential.f2'),
                  t('pricing.plans.essential.f3'),
                  t('pricing.plans.essential.f4'),
                ]}
                ctaText={t('pricing.cta')}
                onCta={() => navigate('/register')}
                delay={0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <PricingCard
                title={t('pricing.plans.business.name')}
                price={t('pricing.plans.business.price')}
                originalPrice="99€/mois"
                period="par mois"
                isPopular
                isFree
                features={[
                  t('pricing.plans.business.f1'),
                  t('pricing.plans.business.f2'),
                  t('pricing.plans.business.f3'),
                  t('pricing.plans.business.f4'),
                  t('pricing.plans.business.f5'),
                  t('pricing.plans.business.f6'),
                ]}
                ctaText={t('pricing.cta')}
                onCta={() => navigate('/register')}
                delay={0.1}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <PricingCard
                title={t('pricing.plans.enterprise.name')}
                price={t('pricing.plans.enterprise.price')}
                period="paiement annuel"
                features={[
                  t('pricing.plans.enterprise.f1'),
                  t('pricing.plans.enterprise.f2'),
                  t('pricing.plans.enterprise.f3'),
                  t('pricing.plans.enterprise.f4'),
                  t('pricing.plans.enterprise.f5'),
                ]}
                ctaText={t('pricing.ctaContact')}
                onCta={() => navigate('/register')}
                delay={0.2}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
      </main>
      
      <footer>
      {/* ─── Footer ─── */}
      <Box sx={{ py: 6, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, position: 'relative', zIndex: 1, bgcolor: isDark ? '#09090b' : '#f8fafc' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 4 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <img src="/main.png" alt="Procura" style={{ width: 32, height: 32 }} />
                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: isDark ? '#fff' : '#0f172a' }}>
                  Procura
                </Typography>
              </Box>
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', fontSize: '0.85rem', maxWidth: 300 }}>
                {t('footer.subtitle')}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: { xs: 4, sm: 8 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>Produit</Typography>
                {['Fonctionnalités', 'Tarifs', 'Sécurité'].map(l => (
                  <Typography key={l} component="a" href="#" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>{l}</Typography>
                ))}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>Ressources</Typography>
                {['Centre d\'aide', 'Blog', 'Contact'].map(l => (
                  <Typography key={l} component="a" href="#" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>{l}</Typography>
                ))}
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', my: 4 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', fontSize: '0.8rem' }}>
              {t('footer.rights')}
            </Typography>
          </Box>
        </Container>
      </Box>
      </footer>
    </Box>
  );
}
