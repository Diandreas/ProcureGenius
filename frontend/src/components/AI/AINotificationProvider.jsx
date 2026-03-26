import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { Snackbar, Alert, Button, Box, Typography, IconButton } from '@mui/material';
import { Close, Lightbulb, Warning, TipsAndUpdates, EmojiEvents } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { aiChatAPI } from '../../services/api';
import NotificationsCenter from './NotificationsCenter';

// Création du contexte pour les notifications IA
const AINotificationContext = createContext();

export const useAINotifications = () => {
  const context = useContext(AINotificationContext);
  if (!context) {
    throw new Error('useAINotifications must be used within an AINotificationProvider');
  }
  return context;
};

/**
 * Provider de notifications push IA
 * Poll régulièrement les nouvelles notifications et les affiche avec Snackbar
 */
const AINotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch l'historique complet
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await aiChatAPI.getNotifications();
      if (response.data.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications history:', error);
    }
  }, []);

  // Poll les notifications toutes les 30 secondes
  const checkForNotifications = useCallback(async () => {
    try {
      const response = await aiChatAPI.getNotifications(true); // unread_only=true

      if (response.data.notifications && response.data.notifications.length > 0) {
        // Ajouter à la liste locale si pas déjà présente
        const newNotifs = response.data.notifications;
        setNotifications(prev => {
          const combined = [...newNotifs, ...prev];
          // Dédupliquer par ID
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });

        // Afficher la première notification non lue dans le snackbar
        const notif = newNotifs[0];
        setNotification(notif);
        setOpen(true);
      }
    } catch (error) {
      console.error('Error polling notifications:', error);
    }
  }, []);

  useEffect(() => {
    // Charger l'historique au début
    fetchNotifications();

    // Puis vérifier toutes les 30 secondes
    const interval = setInterval(checkForNotifications, 30000);

    return () => clearInterval(interval);
  }, [checkForNotifications, fetchNotifications]);

  const handleClose = async (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
    setTimeout(() => setNotification(null), 300);
  };

  const markAsRead = async (id) => {
    try {
      await aiChatAPI.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      
      // Si c'est la notification affichée dans le snackbar, le fermer
      if (notification?.id === id) {
        setOpen(false);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleAction = () => {
    if (notification && notification.action_url) {
      navigate(notification.action_url);
    }
    handleClose();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'alert': return <Warning sx={{ fontSize: 28 }} />;
      case 'insight': return <TipsAndUpdates sx={{ fontSize: 28 }} />;
      case 'achievement': return <EmojiEvents sx={{ fontSize: 28 }} />;
      default: return <Lightbulb sx={{ fontSize: 28 }} />;
    }
  };

  const getSeverity = (type) => {
    switch (type) {
      case 'alert': return 'warning';
      case 'insight': return 'info';
      case 'achievement': return 'success';
      default: return 'info';
    }
  };

  return (
    <AINotificationContext.Provider value={{
      notifications,
      unreadCount: notifications.filter(n => !n.is_read).length,
      openCenter: () => setCenterOpen(true),
      closeCenter: () => setCenterOpen(false),
      markAsRead,
      refresh: fetchNotifications
    }}>
      {children}

      <NotificationsCenter 
        open={centerOpen}
        onClose={() => setCenterOpen(false)}
        notifications={notifications}
        onMarkRead={markAsRead}
      />

      <Snackbar
        open={open}
        autoHideDuration={10000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <Alert
          severity={getSeverity(notification?.type)}
          icon={getIcon(notification?.type)}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button color="inherit" size="small" onClick={() => { setCenterOpen(true); handleClose(); }}>
                Voir tout
              </Button>
              <IconButton size="small" color="inherit" onClick={handleClose}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{ width: '100%', maxWidth: 500 }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {notification?.title}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {notification?.message}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </AINotificationContext.Provider>
  );
};

export default AINotificationProvider;
