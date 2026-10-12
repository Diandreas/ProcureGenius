import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import Mascot from './Mascot';

/**
 * Composant d'état vide réutilisable avec la mascotte
 *
 * @param {string} title - Titre de l'état vide
 * @param {string} description - Description
 * @param {string} mascotPose - Pose de la mascotte ('main', 'happy', 'reading', 'thinking', etc.)
 * @param {string} actionLabel - Label du bouton d'action
 * @param {function} onAction - Callback du bouton d'action
 * @param {node} children - Contenu personnalisé
 */
function EmptyState({
  title: titleProp,
  description: descriptionProp,
  mascotPose = 'reading',
  actionLabel = null,
  onAction = null,
  children = null,
}) {
  const { t } = useTranslation('common');
  const title = titleProp === undefined ? t('common:emptyState.defaultTitle') : titleProp;
  const description = descriptionProp === undefined ? t('common:emptyState.defaultDescription') : descriptionProp;
  return (
    <Paper
      sx={{
        p: 6,
        textAlign: 'center',
        backgroundColor: 'background.default',
        borderRadius: 3,
        border: '2px dashed',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Mascot
          pose={mascotPose}
          animation="float"
          size={150}
        />
      </Box>

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        {description}
      </Typography>

      {children}

      {actionLabel && onAction && (
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<Add />}
          onClick={onAction}
          sx={{
            mt: 2,
            px: 4,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
}

export default EmptyState;
