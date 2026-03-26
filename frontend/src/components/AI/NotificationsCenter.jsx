import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close,
  Notifications,
  Warning,
  TipsAndUpdates,
  EmojiEvents,
  Lightbulb,
  CheckCircle,
} from '@mui/icons-material';
import { formatDateTime } from '../../utils/formatters';

const NotificationsCenter = ({ open, onClose, notifications = [], onMarkRead }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [filter, setFilter] = useState('all');

  const getTypeIcon = (type) => {
    switch (type) {
      case 'alert': return <Warning sx={{ color: '#f59e0b', fontSize: 24 }} />;
      case 'insight': return <TipsAndUpdates sx={{ color: '#3b82f6', fontSize: 24 }} />;
      case 'achievement': return <EmojiEvents sx={{ color: '#10b981', fontSize: 24 }} />;
      default: return <Lightbulb sx={{ color: '#8b5cf6', fontSize: 24 }} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'alert': return '#f59e0b';
      case 'insight': return '#3b82f6';
      case 'achievement': return '#10b981';
      default: return '#8b5cf6';
    }
  };

  const filteredNotifications = notifications?.filter(n =>
    filter === 'all' || n.type === filter
  ) || [];

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 400, // Supérieur au AppBar
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 450 },
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Centre de Notifications IA
            </Typography>
            {unreadCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close fontSize="small" />
          </IconButton>
        </Box>

        <Tabs
          value={filter}
          onChange={(e, v) => setFilter(v)}
          variant="fullWidth"
          sx={{ mb: 2, minHeight: 40 }}
        >
          <Tab label={`Tout (${notifications?.length || 0})`} value="all" sx={{ minHeight: 40 }} />
          <Tab label={`Alertes (${notifications?.filter(n => n.type === 'alert').length || 0})`} value="alert" sx={{ minHeight: 40 }} />
          <Tab label={`Insights (${notifications?.filter(n => n.type === 'insight').length || 0})`} value="insight" sx={{ minHeight: 40 }} />
          <Tab label={`Succès (${notifications?.filter(n => n.type === 'achievement').length || 0})`} value="achievement" sx={{ minHeight: 40 }} />
        </Tabs>

        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {filteredNotifications.length > 0 ? (
            <List dense disablePadding>
              {filteredNotifications.map((notif) => (
                <Card
                  key={notif.id}
                  sx={{
                    mb: 2,
                    bgcolor: notif.is_read
                      ? 'transparent'
                      : alpha(getTypeColor(notif.type), 0.08),
                    border: notif.is_read ? `1px solid ${theme.palette.divider}` : `2px solid ${getTypeColor(notif.type)}`,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                      {getTypeIcon(notif.type)}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={notif.is_read ? 500 : 600} gutterBottom>
                          {notif.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {notif.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatDateTime(notif.created_at)}
                        </Typography>
                      </Box>
                    </Box>

                    {!notif.is_read && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onMarkRead(notif.id)}
                          startIcon={<CheckCircle />}
                          sx={{
                            borderColor: getTypeColor(notif.type),
                            color: getTypeColor(notif.type),
                            '&:hover': {
                              borderColor: getTypeColor(notif.type),
                              bgcolor: alpha(getTypeColor(notif.type), 0.1),
                            }
                          }}
                        >
                          Marquer comme lu
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Notifications sx={{ fontSize: 64, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucune notification
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filter === 'all' ? 'Vous êtes à jour !' : `Aucune notification de type "${filter}"`}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default NotificationsCenter;
