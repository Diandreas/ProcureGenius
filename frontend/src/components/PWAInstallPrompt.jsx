import React, { useState } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from '@mui/material';
import {
  GetApp,
  Close,
  PhoneIphone,
  Computer,
  OfflinePin,
  Update,
  WifiOff,
} from '@mui/icons-material';
import { usePWA } from '../hooks/usePWA';

function PWAInstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    isOffline,
    installPWA,
    updatePWA,
  } = usePWA();

  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      setShowInstallPrompt(false);
      setShowInstallDialog(false);
    }
  };

  // Notification d'installation disponible
  if (isInstallable && !isInstalled && showInstallPrompt) {
    return (
      <>
        <Snackbar
          open={true}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 60, sm: 20 } }}
        >
          <Alert
            severity="info"
            action={
              <>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setShowInstallDialog(true)}
                  startIcon={<GetApp />}
                >
                  Installer
                </Button>
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => setShowInstallPrompt(false)}
                >
                  <Close />
                </IconButton>
              </>
            }
          >
            Installer l'application pour un accès rapide et hors ligne
          </Alert>
        </Snackbar>

        <Dialog open={showInstallDialog} onClose={() => setShowInstallDialog(false)}>
          <DialogTitle>Installer l'application</DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                <PhoneIphone sx={{ fontSize: 48, color: 'primary.main' }} />
                <Computer sx={{ fontSize: 48, color: 'primary.main' }} />
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Avantages de l'installation
              </Typography>
              
              <Box sx={{ textAlign: 'left', mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <OfflinePin sx={{ mr: 1, color: 'success.main' }} />
                  <Typography>Accès hors ligne aux données</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GetApp sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography>Lancement rapide depuis l'écran d'accueil</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Update sx={{ mr: 1, color: 'info.main' }} />
                  <Typography>Mises à jour automatiques</Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInstallDialog(false)}>
              Plus tard
            </Button>
            <Button variant="contained" onClick={handleInstall} startIcon={<GetApp />}>
              Installer maintenant
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Notification de mise à jour disponible
  if (isUpdateAvailable) {
    return (
      <Snackbar open={true} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={updatePWA} startIcon={<Update />}>
              Mettre à jour
            </Button>
          }
        >
          Une nouvelle version de l'application est disponible
        </Alert>
      </Snackbar>
    );
  }

  // Notification hors ligne
  if (isOffline) {
    return (
      <Snackbar open={true} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="warning" icon={<WifiOff />}>
          Vous êtes hors ligne - Certaines fonctionnalités peuvent être limitées
        </Alert>
      </Snackbar>
    );
  }

  return null;
}

export default PWAInstallPrompt;