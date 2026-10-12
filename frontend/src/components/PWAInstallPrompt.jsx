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
import { useTranslation } from 'react-i18next';
import { usePWA } from '../hooks/usePWA';

function PWAInstallPrompt() {
  const { t } = useTranslation('common');
  const {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    isOffline,
    installPWA,
    updatePWA,
  } = usePWA();

  const [showInstallPrompt, setShowInstallPrompt] = useState(() => {
    return sessionStorage.getItem('pwaPromptDismissed') !== 'true';
  });
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    sessionStorage.setItem('pwaPromptDismissed', 'true');
  };

  const handleCloseDialog = () => {
    setShowInstallDialog(false);
    sessionStorage.setItem('pwaPromptDismissed', 'true');
  };

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
                  {t('common:pwa.install.button')}
                </Button>
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={handleDismiss}
                >
                  <Close />
                </IconButton>
              </>
            }
          >
            {t('common:pwa.prompt.snackbar')}
          </Alert>
        </Snackbar>

        <Dialog open={showInstallDialog} onClose={handleCloseDialog}>
          <DialogTitle>{t('common:pwa.prompt.dialogTitle')}</DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                <PhoneIphone sx={{ fontSize: 48, color: 'primary.main' }} />
                <Computer sx={{ fontSize: 48, color: 'primary.main' }} />
              </Box>
              
              <Typography variant="h6" gutterBottom>
                {t('common:pwa.prompt.benefitsTitle')}
              </Typography>
              
              <Box sx={{ textAlign: 'left', mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <OfflinePin sx={{ mr: 1, color: 'success.main' }} />
                  <Typography>{t('common:pwa.prompt.benefitOffline')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GetApp sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography>{t('common:pwa.prompt.benefitLaunch')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Update sx={{ mr: 1, color: 'info.main' }} />
                  <Typography>{t('common:pwa.prompt.benefitUpdates')}</Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              {t('common:pwa.install.later')}
            </Button>
            <Button variant="contained" onClick={handleInstall} startIcon={<GetApp />}>
              {t('common:pwa.prompt.installNow')}
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
              {t('common:pwa.prompt.update')}
            </Button>
          }
        >
          {t('common:pwa.prompt.updateAvailable')}
        </Alert>
      </Snackbar>
    );
  }

  // Notification hors ligne
  if (isOffline) {
    return (
      <Snackbar open={true} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="warning" icon={<WifiOff />}>
          {t('common:pwa.prompt.offline')}
        </Alert>
      </Snackbar>
    );
  }

  return null;
}

export default PWAInstallPrompt;