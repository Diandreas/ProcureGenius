import React, { useEffect } from 'react';
import { Box, Container, Typography, useTheme, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t } = useTranslation(['public']);

  useEffect(() => {
    document.title = `${t('public:privacy.title')} | Procura`;
    window.scrollTo(0, 0);
  }, [t]);

  const sectionStyle = {
    mb: 6
  };

  const titleStyle = {
    fontWeight: 800,
    fontSize: '1.6rem',
    mb: 2,
    color: isDark ? '#fff' : '#0f172a'
  };

  const textStyle = {
    color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary',
    fontSize: '1.1rem',
    lineHeight: 1.8,
    mb: 2
  };

  return (
    <Box sx={{ py: { xs: 6, md: 10 }, minHeight: '100vh', position: 'relative' }}>
      <Container maxWidth="md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Box sx={{ mb: 6 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, fontWeight: 800, mb: 3, letterSpacing: '-0.02em', color: isDark ? '#fff' : '#0f172a' }}>
              {t('public:privacy.title')}
            </Typography>
            <Typography sx={{ fontSize: '1.2rem', color: isDark ? 'rgba(255,255,255,0.6)' : 'text.secondary' }}>
              {t('public:privacy.lastUpdated', { date: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) })}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 6, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

          <Box sx={sectionStyle}>
            <Typography sx={titleStyle}>{t('public:privacy.sections.intro.title')}</Typography>
            <Typography sx={textStyle}>
              {t('public:privacy.intro')}
            </Typography>
            <Typography sx={textStyle}>
              {t('public:privacy.sections.intro.content')}
            </Typography>
          </Box>

          <Box sx={sectionStyle}>
            <Typography sx={titleStyle}>{t('public:privacy.sections.data.title')}</Typography>
            <Typography sx={textStyle}>
              {t('public:privacy.sections.data.content')}
            </Typography>
            <Box component="ul" sx={{ ...textStyle, pl: 3 }}>
              {t('public:privacy.sections.data.items', { returnObjects: true }).map((item, idx) => (
                <li key={idx}><strong>{item.split(':')[0]} :</strong>{item.split(':')[1]}</li>
              ))}
            </Box>
          </Box>

          <Box sx={sectionStyle}>
            <Typography sx={titleStyle}>{t('public:privacy.sections.usage.title')}</Typography>
            <Typography sx={textStyle}>
              {t('public:privacy.sections.usage.content')}
            </Typography>
          </Box>

          <Box sx={sectionStyle}>
            <Typography sx={titleStyle}>{t('public:privacy.sections.ai.title')}</Typography>
            <Typography sx={textStyle}>
              {t('public:privacy.sections.ai.content')}
            </Typography>
          </Box>

          <Box sx={sectionStyle}>
            <Typography sx={titleStyle}>{t('public:privacy.sections.security.title')}</Typography>
            <Typography sx={textStyle}>
              {t('public:privacy.sections.security.content')}
            </Typography>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
}
