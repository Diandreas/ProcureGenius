import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import Mascot from './Mascot';

/**
 * Composant d'état de chargement avec la mascotte
 * 
 * @param {string} message - Message de chargement personnalisé
 * @param {boolean} fullScreen - Afficher en plein écran
 * @param {number} size - Taille de la mascotte (défaut: 100)
 */
function LoadingState({ 
  message = "Chargement en cours...", 
  fullScreen = false,
  size = 100 
}) {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 4,
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Mascot
          pose="thinking"
          animation="pulse"
          size={size}
        />
        <CircularProgress
          size={size + 20}
          thickness={2}
          sx={{
            position: 'absolute',
            top: -10,
            left: -10,
            color: 'primary.light',
            opacity: 0.3,
          }}
        />
      </Box>
      
      <Typography 
        variant="body1" 
        color="text.secondary"
        sx={{ 
          fontWeight: 500,
          textAlign: 'center',
          maxWidth: 400,
        }}
      >
        {message}
      </Typography>
      
      {/* Points de chargement animés */}
      <Box sx={{
        display: 'flex',
        gap: 0.5,
        '& > div': {
          width: 8,
          height: 8,
          backgroundColor: 'primary.main',
          borderRadius: '50%',
          animation: 'bounce 1.4s infinite ease-in-out',
          '&:nth-of-type(1)': { animationDelay: '0s' },
          '&:nth-of-type(2)': { animationDelay: '0.2s' },
          '&:nth-of-type(3)': { animationDelay: '0.4s' },
        },
        '@keyframes bounce': {
          '0%, 80%, 100%': {
            transform: 'scale(0.8)',
            opacity: 0.5,
          },
          '40%': {
            transform: 'scale(1.2)',
            opacity: 1,
          },
        },
      }}>
        <Box />
        <Box />
        <Box />
      </Box>
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}

export default LoadingState;

