import React, { useEffect } from 'react';
import { Box, Container, Typography, useTheme, Divider, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ShieldIcon from '@mui/icons-material/Shield';

const SECTIONS_ORDER = [
  'intro',
  'data',
  'usage',
  'ai',
  'security',
  'rights',
  'cookies',
  'contact',
];

export default function PrivacyPolicy() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t } = useTranslation(['public']);

  useEffect(() => {
    document.title = `${t('public:privacy.title')} | ProcureGenius`;
    window.scrollTo(0, 0);
  }, [t]);

  const headingColor = isDark ? '#fff' : '#0f172a';
  const textColor = isDark ? 'rgba(255,255,255,0.72)' : '#374151';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const accentColor = '#2563eb';

  return (
    <Box sx={{ py: { xs: 6, md: 10 }, minHeight: '100vh' }}>
      <Container maxWidth="md">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          {/* En-tête */}
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: `${accentColor}15`, display: 'flex' }}>
                <ShieldIcon sx={{ color: accentColor, fontSize: 28 }} />
              </Box>
              <Chip
                label="RGPD conforme"
                size="small"
                sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 600, fontSize: '0.75rem', border: '1px solid #bbf7d0' }}
              />
            </Box>
            <Typography variant="h1" sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 800,
              mb: 2,
              letterSpacing: '-0.02em',
              color: headingColor,
              lineHeight: 1.1,
            }}>
              {t('public:privacy.title')}
            </Typography>
            <Typography sx={{ fontSize: '1rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
              {t('public:privacy.lastUpdated', { date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </Typography>
          </Box>

          {/* Intro banner */}
          <Box sx={{
            mb: 5, p: 3,
            borderRadius: 3,
            bgcolor: isDark ? 'rgba(37,99,235,0.08)' : '#eff6ff',
            border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#bfdbfe'}`,
          }}>
            <Typography sx={{ color: textColor, fontSize: '1rem', lineHeight: 1.8 }}>
              {t('public:privacy.intro')}
            </Typography>
          </Box>

          <Divider sx={{ mb: 5, borderColor }} />

          {/* Sections */}
          {SECTIONS_ORDER.map((key, index) => {
            const section = t(`public:privacy.sections.${key}`, { returnObjects: true });
            if (!section || !section.title) return null;
            const items = section.items;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Box
                  sx={{
                    mb: 4,
                    p: { xs: 2.5, md: 3.5 },
                    borderRadius: 3,
                    bgcolor: cardBg,
                    border: `1px solid ${borderColor}`,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0, top: 0, bottom: 0,
                      width: 4,
                      bgcolor: accentColor,
                      borderRadius: '4px 0 0 4px',
                    },
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 1.5, color: headingColor }}>
                    {section.title}
                  </Typography>
                  {section.content && (
                    <Typography sx={{ color: textColor, fontSize: '0.97rem', lineHeight: 1.85, mb: items ? 1.5 : 0 }}>
                      {section.content}
                    </Typography>
                  )}
                  {Array.isArray(items) && (
                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                      {items.map((item, i) => (
                        <Box component="li" key={i} sx={{ color: textColor, fontSize: '0.95rem', lineHeight: 1.8, mb: 0.5 }}>
                          {item.includes(':') ? (
                            <>
                              <strong style={{ color: headingColor }}>{item.split(':')[0]} :</strong>
                              {item.split(':').slice(1).join(':')}
                            </>
                          ) : item}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </motion.div>
            );
          })}

          {/* Pied de page */}
          <Box sx={{
            mt: 6, p: 3,
            borderRadius: 3,
            bgcolor: isDark ? 'rgba(22,163,74,0.08)' : '#f0fdf4',
            border: `1px solid ${isDark ? 'rgba(22,163,74,0.2)' : '#bbf7d0'}`,
            textAlign: 'center',
          }}>
            <Typography sx={{ color: isDark ? '#86efac' : '#16a34a', fontSize: '0.88rem', fontWeight: 600, mb: 0.5 }}>
              Vos données sont protégées et hébergées en Europe
            </Typography>
            <Typography sx={{ color: textColor, fontSize: '0.85rem' }}>
              Pour exercer vos droits RGPD : <strong>privacy@procuregenius.com</strong>
            </Typography>
          </Box>

        </motion.div>
      </Container>
    </Box>
  );
}
