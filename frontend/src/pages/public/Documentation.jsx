import React, { useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import usePageMeta from '../../hooks/usePageMeta';

export default function Documentation() {
  const { t } = useTranslation(['public']);
  usePageMeta({ page: 'documentation', path: '/documentation' });

  useEffect(() => {
  }, [t]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 12 }}>
      <Container maxWidth="lg">
        <Typography variant="h2" sx={{ fontWeight: 800, mb: 4, color: '#0f172a' }}>{t('public:documentation.title')}</Typography>
        <Typography sx={{ fontSize: '1.2rem', color: 'text.secondary', mb: 6 }}>
          {t('public:documentation.intro')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 300, bgcolor: 'white', p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>{t('public:documentation.quickStart.title')}</Typography>
            <Typography color="text.secondary">{t('public:documentation.quickStart.desc')}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 300, bgcolor: 'white', p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>{t('public:documentation.aiManual.title')}</Typography>
            <Typography color="text.secondary">{t('public:documentation.aiManual.desc')}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 300, bgcolor: 'white', p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>{t('public:documentation.apiReference.title')}</Typography>
            <Typography color="text.secondary">{t('public:documentation.apiReference.desc')}</Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
