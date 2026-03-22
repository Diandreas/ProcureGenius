import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Box, Container, Typography, Button, Divider, useTheme } from '@mui/material';
import { LightMode, DarkMode, Translate } from '@mui/icons-material';
import { useColorMode } from '../App';

export default function PublicLayout() {
  const { t, i18n } = useTranslation(['landing', 'public']);
  const navigate = useNavigate();
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === 'dark';
  const location = useLocation();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const headerBgActive = isDark ? 'rgba(9,9,11,0.95)' : 'rgba(248,250,252,0.95)';
  const isLanding = location.pathname === '/landing' || location.pathname === '/';
  const hasScrollStyle = !isLanding || scrollY > 50;

  return (
    <Box sx={{
      bgcolor: isDark ? '#09090b' : '#f8fafc',
      color: isDark ? '#fff' : '#0f172a',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      overflowX: 'hidden'
    }}>
      <header>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}
      >
        <Box
          sx={{
            background: hasScrollStyle ? headerBgActive : 'transparent',
            borderBottom: hasScrollStyle ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : '1px solid transparent',
            transition: 'all 0.3s',
            backdropFilter: hasScrollStyle ? 'blur(10px)' : 'none',
            boxShadow: hasScrollStyle ? (isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)') : 'none',
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => navigate('/landing')}>
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
                  component="a"
                  href="/landing#pricing-section"
                  sx={{ 
                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    fontSize: '0.95rem', 
                    '&:hover': { color: isDark ? '#fff' : '#000', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, 
                    borderRadius: 2, 
                    px: 1,
                    display: { xs: 'none', lg: 'block' }
                  }}
                >
                  {t('landing:nav.pricing', 'Pricing')}
                </Button>
                <Button 
                  component="a"
                  href="/help"
                  sx={{ 
                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    fontSize: '0.95rem', 
                    '&:hover': { color: isDark ? '#fff' : '#000', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, 
                    borderRadius: 2, 
                    px: 1,
                    display: { xs: 'none', md: 'block' }
                  }}
                >
                  Documentation
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
                    px: { xs: 1, sm: 2 } 
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
                    px: { xs: 2, sm: 4 },
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

      <Box component="main" sx={{ flexGrow: 1, pt: isLanding ? 0 : { xs: 10, sm: 12 } }}>
        <Outlet />
      </Box>

      <footer>
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
                {t('footer.subtitle', 'Automatisez, analysez et maîtrisez vos flux d\'achats')}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: { xs: 4, sm: 8 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>Produit</Typography>
                <Typography component="a" href="/landing#demo-section" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>Fonctionnalités</Typography>
                <Typography component="a" href="/landing#pricing-section" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>{t('landing:pricing.title')}</Typography>
                <Typography component="a" href="/privacy" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>{t('public:privacy.title')}</Typography>
                <Typography component="a" href="/terms" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>{t('public:terms.title')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>Ressources</Typography>
                <Typography component="a" href="/help" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>Documentation</Typography>
                <Typography component="a" href="/help/faq" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>FAQ</Typography>
                <Typography component="a" href="/support" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '0.85rem', textDecoration: 'none', '&:hover': { color: '#2563eb' } }}>Support & Contact</Typography>
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', my: 4 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', fontSize: '0.8rem' }}>
              &copy; {new Date().getFullYear()} Procura. {t('footer.rights', 'Tous droits réservés.')}
            </Typography>
          </Box>
        </Container>
      </Box>
      </footer>
    </Box>
  );
}
