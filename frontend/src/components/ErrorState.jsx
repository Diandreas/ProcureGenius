import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh, Home } from '@mui/icons-material';
import Mascot from './Mascot';
import { useNavigate } from 'react-router-dom';

/**
 * Composant d'état d'erreur avec la mascotte
 *
 * @param {string} title - Titre de l'erreur
 * @param {string} message - Message d'erreur
 * @param {function} onRetry - Callback pour réessayer
 * @param {boolean} showHome - Afficher le bouton retour à l'accueil
 */
function ErrorState({
  title = "Oups ! Une erreur s'est produite",
  message = "Nous rencontrons des difficultés techniques. Veuillez réessayer.",
  onRetry = null,
  showHome = true,
}) {
  const navigate = useNavigate();

  return (
    <Paper
      sx={{
        p: 6,
        textAlign: 'center',
        backgroundColor: 'error.lighter',
        borderRadius: 3,
        border: '2px solid',
        borderColor: 'error.light',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Mascot
          pose="error"
          animation="wave"
          size={150}
        />
      </Box>

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
        {message}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        {onRetry && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Refresh />}
            onClick={onRetry}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            Réessayer
          </Button>
        )}

        {showHome && (
          <Button
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<Home />}
            onClick={() => navigate('/dashboard')}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            Retour à l'accueil
          </Button>
        )}
      </Box>
    </Paper>
  );
}

export default ErrorState;
