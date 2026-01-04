import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Paper,
  Slide,
  useTheme,
  alpha,
} from '@mui/material';
import { Close, GetApp, Apple } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const InstallPWAPrompt = () => {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Vérifier si c'est la première visite
    const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
    const isInstalled = localStorage.getItem('pwa-installed') === 'true';

    // Détecter iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Ne pas afficher si déjà vu ou déjà installé
    if (hasSeenPrompt || isInstalled) {
      return;
    }

    // Pour iOS, afficher le prompt manuellement
    if (isIOSDevice) {
      // Vérifier si l'app n'est pas déjà en mode standalone
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

      if (!isInStandaloneMode) {
        setShowPrompt(true);
      }
      return;
    }

    // Pour les autres navigateurs, écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Empêcher l'affichage automatique du navigateur
      e.preventDefault();
      // Sauvegarder l'événement pour l'utiliser plus tard
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Pour iOS, on ne peut pas forcer l'installation, juste donner des instructions
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    // Afficher le prompt d'installation
    deferredPrompt.prompt();

    // Attendre le choix de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installée avec succès');
      localStorage.setItem('pwa-installed', 'true');
    }

    // Réinitialiser le prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-seen', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-seen', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <Slide direction="up" in={showPrompt} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, md: 24 },
          left: { xs: 16, md: 24 },
          right: { xs: 16, md: 'auto' },
          maxWidth: { xs: '100%', md: 400 },
          p: 3,
          borderRadius: 3,
          zIndex: 1400,
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
        }}
      >
        {/* Close button */}
        <IconButton
          size="small"
          onClick={handleDismiss}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'text.secondary',
          }}
        >
          <Close fontSize="small" />
        </IconButton>

        {/* Content */}
        <Box sx={{ pr: 4 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <Box
              component="img"
              src="/icon-192.png"
              alt="ProcureGenius"
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 1,
              fontSize: '1.1rem',
            }}
          >
            {t('pwa.install.title', 'Installer ProcureGenius')}
          </Typography>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, lineHeight: 1.6 }}
          >
            {isIOS
              ? t('pwa.install.descriptionIOS', 'Pour installer l\'application sur votre iPhone, appuyez sur le bouton Partager puis "Sur l\'écran d\'accueil"')
              : t('pwa.install.description', 'Installez l\'application pour un accès rapide et une meilleure expérience, même hors ligne.')
            }
          </Typography>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {!isIOS && (
              <Button
                variant="contained"
                onClick={handleInstallClick}
                startIcon={<GetApp />}
                fullWidth
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  textTransform: 'none',
                  '&:hover': {
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                }}
              >
                {t('pwa.install.button', 'Installer')}
              </Button>
            )}
            {isIOS && (
              <Button
                variant="outlined"
                onClick={handleDismiss}
                fullWidth
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                {t('pwa.install.dismiss', 'J\'ai compris')}
              </Button>
            )}
            {!isIOS && (
              <Button
                variant="text"
                onClick={handleDismiss}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: 2,
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.action.hover, 0.05),
                  },
                }}
              >
                {t('pwa.install.later', 'Plus tard')}
              </Button>
            )}
          </Box>

          {/* iOS instruction with icon */}
          {isIOS && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.08),
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Apple sx={{ color: 'info.main', fontSize: 24 }} />
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {t('pwa.install.iosHint', 'Appuyez sur ')}
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    bgcolor: alpha(theme.palette.info.main, 0.15),
                    fontWeight: 600,
                  }}
                >
                  <Box component="span" sx={{ fontSize: 16 }}>⎙</Box>
                </Box>
                {t('pwa.install.iosHint2', ' puis "Sur l\'écran d\'accueil"')}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Slide>
  );
};

export default InstallPWAPrompt;
