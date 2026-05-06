import React, { useEffect } from 'react';
import { Box, Container, Typography, useTheme, Divider, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import GavelIcon from '@mui/icons-material/Gavel';

const SECTIONS_ORDER = [
  'acceptance',
  'services',
  'accounts',
  'usage_rules',
  'subscription',
  'intellectual_property',
  'liability',
  'termination',
  'governing_law',
];

export default function TermsOfService() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t } = useTranslation(['public']);

  useEffect(() => {
    document.title = `${t('public:terms.title')} | ProcureGenius`;
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
                <GavelIcon sx={{ color: accentColor, fontSize: 28 }} />
              </Box>
              <Chip
                label="Document légal"
                size="small"
                sx={{ bgcolor: `${accentColor}12`, color: accentColor, fontWeight: 600, fontSize: '0.75rem', border: `1px solid ${accentColor}30` }}
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
              {t('public:terms.title')}
            </Typography>
            <Typography sx={{ fontSize: '1rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
              {t('public:terms.lastUpdated', { date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </Typography>
          </Box>

          <Divider sx={{ mb: 6, borderColor }} />

          {/* Sections */}
          {SECTIONS_ORDER.map((key, index) => {
            const section = t(`public:terms.sections.${key}`, { returnObjects: true });
            if (!section || !section.title) return null;
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
                  <Typography sx={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    mb: 1.5,
                    color: headingColor,
                  }}>
                    {section.title}
                  </Typography>
                  <Typography sx={{
                    color: textColor,
                    fontSize: '0.97rem',
                    lineHeight: 1.85,
                  }}>
                    {section.content}
                  </Typography>
                </Box>
              </motion.div>
            );
          })}

          {/* Pied de page légal */}
          <Box sx={{
            mt: 6, p: 3,
            borderRadius: 3,
            bgcolor: isDark ? 'rgba(37,99,235,0.08)' : '#eff6ff',
            border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#bfdbfe'}`,
            textAlign: 'center',
          }}>
            <Typography sx={{ color: isDark ? '#93c5fd' : accentColor, fontSize: '0.88rem', fontWeight: 600, mb: 0.5 }}>
              Des questions sur ces conditions ?
            </Typography>
            <Typography sx={{ color: textColor, fontSize: '0.85rem' }}>
              Contactez-nous à <strong>legal@procuregenius.com</strong>
            </Typography>
          </Box>

        </motion.div>
      </Container>
    </Box>
  );
}
