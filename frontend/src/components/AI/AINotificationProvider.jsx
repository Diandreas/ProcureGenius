import React, { useEffect, useState, useCallback } from 'react';
import { Snackbar, Alert, Button, Box, Typography, IconButton } from '@mui/material';
import { Close, Lightbulb, Warning, TipsAndUpdates, EmojiEvents } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { aiChatAPI } from '../../services/api';

/**
 * Provider de notifications push IA
 * Poll régulièrement les nouvelles notifications et les affiche avec Snackbar
 */
const AINotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Poll les notifications toutes les 30 secondes
  const checkForNotifications = useCallback(async () => {
    try {
      const response = await aiChatAPI.get('/ai/notifications/?unread_only=true');

      if (response.data.notifications && response.data.notifications.length > 0) {
        // Afficher la première notification non lue
        const notif = response.data.notifications[0];
        setNotification(notif);
        setOpen(true);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  useEffect(() => {
    // Vérifier immédiatement au chargement
    checkForNotifications();

    // Puis vérifier toutes les 30 secondes
    const interval = setInterval(checkForNotifications, 30000);

    return () => clearInterval(interval);
  }, [checkForNotifications]);

  const handleClose = async (event, reason) => {
    // Ne pas fermer si clique en dehors (sauf timeout)
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);

    // Marquer comme lu
    if (notification) {
      try {
        await aiChatAPI.post(`/ai/notifications/${notification.id}/mark-read/`);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Reset après animation
    setTimeout(() => setNotification(null), 300);
  };

  const handleAction = () => {
    if (notification && notification.action_url) {
      navigate(notification.action_url);
    }
    handleClose();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'alert':
        return <Warning sx={{ fontSize: 28 }} />;
      case 'insight':
        return <TipsAndUpdates sx={{ fontSize: 28 }} />;
      case 'achievement':
        return <EmojiEvents sx={{ fontSize: 28 }} />;
      case 'suggestion':
      default:
        return <Lightbulb sx={{ fontSize: 28 }} />;
    }
  };

  const getSeverity = (type) => {
    switch (type) {
      case 'alert':
        return 'warning';
      case 'insight':
        return 'info';
      case 'achievement':
        return 'success';
      case 'suggestion':
      default:
        return 'info';
    }
  };

  if (!notification) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      <Snackbar
        open={open}
        autoHideDuration={10000} // 10 secondes
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <Alert
          severity={getSeverity(notification.type)}
          icon={getIcon(notification.type)}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {notification.action_label && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleAction}
                  sx={{ fontWeight: 600 }}
                >
                  {notification.action_label}
                </Button>
              )}
              <IconButton
                size="small"
                color="inherit"
                onClick={handleClose}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{
            width: '100%',
            maxWidth: 500,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {notification.title}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {notification.message}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
};

export default AINotificationProvider;
