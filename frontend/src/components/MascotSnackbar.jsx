import React from 'react';
import { Snackbar, Alert, Box } from '@mui/material';
import Mascot from './Mascot';

/**
 * Composant Snackbar avec mascotte intégrée
 * 
 * @param {boolean} open - État d'ouverture
 * @param {function} onClose - Callback de fermeture
 * @param {string} severity - Type: 'success', 'error', 'info', 'warning'
 * @param {string} message - Message à afficher
 * @param {number} autoHideDuration - Durée avant fermeture auto (ms)
 */
function MascotSnackbar({
  open,
  onClose,
  severity = 'info',
  message,
  autoHideDuration = 4000,
}) {
  // Mapping des severities aux poses de mascotte
  const getMascotPose = () => {
    switch (severity) {
      case 'success':
        return 'thumbup';
      case 'error':
        return 'error';
      case 'warning':
        return 'reading';
      case 'info':
      default:
        return 'thinking';
    }
  };

  const getAnimation = () => {
    switch (severity) {
      case 'success':
        return 'bounce';
      case 'error':
        return 'wave';
      default:
        return 'float';
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pr: 2,
          borderRadius: 2,
          boxShadow: 3,
          '& .MuiAlert-icon': {
            display: 'none', // Cacher l'icône par défaut
          },
        }}
        icon={false}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Mascot
            pose={getMascotPose()}
            animation={getAnimation()}
            size={40}
          />
          <Box sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {message}
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
}

export default MascotSnackbar;

