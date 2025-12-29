import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  Avatar,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Drawer,
  ListItemButton,
  ListItemText,
  Fade,
  Tooltip,
  useTheme,
  alpha,
  Chip,
  Badge,
  Tabs,
  Tab,
  Divider,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  AttachFile,
  Receipt,
  ShoppingCart,
  Business,
  Analytics,
  DocumentScanner,
  Menu as MenuIcon,
  Add,
  Close,
  Mic,
  Lightbulb,
  Notifications,
  TrendingUp,
  ExpandMore,
  CheckCircle,
  Warning,
  TipsAndUpdates,
  EmojiEvents,
  Assignment,
  Category,
  BarChart,
  Description,
  Inventory,
  People,
  LocalShipping,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { aiChatAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import MessageContent from '../../components/ai-chat/MessageContent';
import Mascot from '../../components/Mascot';
import VoiceRecorder from '../../components/VoiceRecorder';
import ProactiveConversationCard from '../../components/AI/ProactiveConversationCard';
import ArtifactsPanel from '../../components/ai-chat/ArtifactsPanel';

// Composant Header compact avec navigation IA
const StatsHeader = ({ stats, onNotificationsClick, onSuggestionsClick, onImportReviewsClick, onArtifactsClick, artifactsCount }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        mb: 1.5,
        bgcolor: isDark ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.03),
        borderRadius: 1.5,
      }}
    >
      <Box sx={{ flexGrow: 1 }} />

      {/* Import Reviews - NOUVELLE FONCTIONNALITÉ */}
      <Tooltip title="Imports en attente">
        <IconButton
          size="small"
          onClick={onImportReviewsClick}
          sx={{
            p: 0.75,
            bgcolor: alpha('#10b981', 0.1),
            '&:hover': {
              bgcolor: alpha('#10b981', 0.2),
            }
          }}
        >
          <Assignment sx={{ fontSize: 18, color: '#10b981' }} />
        </IconButton>
      </Tooltip>

      {/* Notifications */}
      <Tooltip title="Notifications IA">
        <IconButton
          size="small"
          onClick={onNotificationsClick}
          sx={{
            p: 0.75,
            bgcolor: stats?.notifications_count > 0
              ? alpha('#f59e0b', 0.15)
              : 'transparent',
            '&:hover': {
              bgcolor: stats?.notifications_count > 0
                ? alpha('#f59e0b', 0.25)
                : alpha(theme.palette.action.hover, 0.05),
            }
          }}
        >
          <Badge badgeContent={stats?.notifications_count || 0} color="warning" max={9}>
            <Notifications sx={{ fontSize: 18 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Suggestions */}
      <Tooltip title="Suggestions actives">
        <IconButton
          size="small"
          onClick={onSuggestionsClick}
          sx={{
            p: 0.75,
            bgcolor: stats?.suggestions_count > 0
              ? alpha('#8b5cf6', 0.15)
              : 'transparent',
            '&:hover': {
              bgcolor: stats?.suggestions_count > 0
                ? alpha('#8b5cf6', 0.25)
                : alpha(theme.palette.action.hover, 0.05),
            }
          }}
        >
          <Badge badgeContent={stats?.suggestions_count || 0} color="secondary" max={9}>
            <Lightbulb sx={{ fontSize: 18 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Artifacts / Visualisations */}
      <Tooltip title="Visualisations & Graphiques">
        <IconButton
          size="small"
          onClick={onArtifactsClick}
          sx={{
            p: 0.75,
            bgcolor: artifactsCount > 0
              ? alpha('#3b82f6', 0.15)
              : 'transparent',
            '&:hover': {
              bgcolor: artifactsCount > 0
                ? alpha('#3b82f6', 0.25)
                : alpha(theme.palette.action.hover, 0.05),
            }
          }}
        >
          <Badge badgeContent={artifactsCount || 0} color="primary" max={9}>
            <BarChart sx={{ fontSize: 18 }} />
          </Badge>
        </IconButton>
      </Tooltip>
    </Box>
  );
};

// Composant Panel Latéral Suggestions
const SuggestionsPanel = ({ open, onClose, suggestions, onActionClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const getTypeIcon = (type) => {
    switch (type) {
      case 'alert': return <Warning sx={{ color: '#f59e0b' }} />;
      case 'insight': return <TipsAndUpdates sx={{ color: '#3b82f6' }} />;
      case 'achievement': return <EmojiEvents sx={{ color: '#10b981' }} />;
      default: return <Lightbulb sx={{ color: '#8b5cf6' }} />;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 360,
          bgcolor: 'background.paper',
          borderLeft: 'none',
          boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.3)' : '-4px 0 20px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            Suggestions Intelligentes
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {suggestions && suggestions.length > 0 ? (
            <List dense disablePadding>
              {suggestions.map((suggestion, idx) => (
                <Card
                  key={idx}
                  sx={{
                    mb: 1.5,
                    bgcolor: isDark ? alpha(theme.palette.common.white, 0.03) : '#f8fafc',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      {getTypeIcon(suggestion.type || suggestion.suggestion_type)}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} gutterBottom>
                          {suggestion.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {suggestion.message}
                        </Typography>
                        {suggestion.actions && suggestion.actions.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                            {suggestion.actions.map((action, actionIdx) => (
                              <Button
                                key={actionIdx}
                                size="small"
                                variant="outlined"
                                startIcon={<Send fontSize="small" />}
                                onClick={() => onActionClick(suggestion, action)}
                                sx={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </Box>
                        ) : suggestion.action_label && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onActionClick(suggestion)}
                            sx={{ mt: 0.5, fontSize: '0.75rem' }}
                          >
                            {suggestion.action_label}
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Lightbulb sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Aucune suggestion pour le moment
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

// Composant Centre de Notifications IA
const NotificationsCenter = ({ open, onClose, notifications, onMarkRead }) => {
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
        '& .MuiDrawer-paper': {
          width: 450,
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

// Quick Actions améliorées
const QUICK_ACTIONS_CATEGORIES = [
  {
    id: 'chat',
    label: 'Conversation IA',
    icon: <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}><Mascot pose="happy" animation="none" size={20} /></Box>,
    color: '#6366f1',
    actions: [
      {
        id: 'help_me',
        title: 'Aide-moi',
        icon: <Lightbulb />,
        prompt: 'Peux-tu m\'aider avec mes tâches quotidiennes ?',
        description: 'Assistance générale pour vos questions'
      },
      {
        id: 'analyze_data',
        title: 'Analyser mes données',
        icon: <Analytics />,
        prompt: 'Analyse mes données et donne-moi des insights pertinents pour mon entreprise.',
        description: 'Insights intelligents sur vos données'
      },
      {
        id: 'optimize',
        title: 'Optimisations',
        icon: <TrendingUp />,
        prompt: 'Quelles optimisations puis-je apporter à mon entreprise pour améliorer l\'efficacité et réduire les coûts ?',
        description: 'Suggestions d\'optimisation'
      },
    ]
  },
  {
    id: 'actions',
    label: 'Actions',
    icon: <Category />,
    color: '#10b981',
    actions: [
      {
        id: 'create_invoice',
        title: 'Créer facture',
        icon: <Receipt />,
        prompt: 'Je souhaite créer une nouvelle facture. Peux-tu me guider dans le processus ?',
        description: 'Création de factures'
      },
      {
        id: 'create_purchase_order',
        title: 'Bon de commande',
        icon: <ShoppingCart />,
        prompt: 'J\'ai besoin de créer un nouveau bon de commande. Quelle est la procédure ?',
        description: 'Gestion des commandes'
      },
      {
        id: 'create_supplier',
        title: 'Ajouter fournisseur',
        icon: <Business />,
        prompt: 'Je veux ajouter un nouveau fournisseur à mon système. Comment procéder ?',
        description: 'Gestion des fournisseurs'
      },
    ]
  },
  {
    id: 'analysis',
    label: 'Analyses',
    icon: <Analytics />,
    color: '#f59e0b',
    actions: [
      {
        id: 'get_statistics',
        title: 'Tableau de bord',
        icon: <BarChart />,
        prompt: 'Montre-moi les statistiques principales de mon entreprise ce mois-ci.',
        description: 'Vue d\'ensemble des métriques'
      },
      {
        id: 'product_analysis',
        title: 'Performance produits',
        icon: <Inventory />,
        prompt: 'Analyse la performance de mes produits les plus vendus ce trimestre.',
        description: 'Analyse des produits'
      },
      {
        id: 'client_analysis',
        title: 'Analyse clients',
        icon: <People />,
        prompt: 'Analyse le comportement de mes clients et leurs habitudes d\'achat.',
        description: 'Insights clients'
      },
    ]
  },
];

function AIChat() {
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['aiChat', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // States principaux
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);

  // States pour les nouvelles fonctionnalités
  const [usageStats, setUsageStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [suggestionsPanelOpen, setSuggestionsPanelOpen] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [currentWidgetIndex, setCurrentWidgetIndex] = useState(0);
  const [widgetVisible, setWidgetVisible] = useState(true);
  const [proactiveConversations, setProactiveConversations] = useState([]);

  // States pour le panel Artifacts (style Claude.ai)
  const [artifactsPanelOpen, setArtifactsPanelOpen] = useState(false);
  const [artifacts, setArtifacts] = useState([]);

  // Charger les conversations proactives
  const fetchProactiveConversations = async () => {
    try {
      const response = await aiChatAPI.getProactiveConversations();
      setProactiveConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching proactive conversations:', error);
    }
  };

  // Charger les données au montage
  useEffect(() => {
    fetchConversations();
    fetchUsageStats();
    fetchSuggestions();
    fetchNotifications();
    fetchProactiveConversations();

    // Écouter les événements depuis MainLayout
    const handleOpenNotifications = () => setNotificationsPanelOpen(true);
    const handleOpenSuggestions = () => setSuggestionsPanelOpen(true);
    const handleOpenConversations = () => setDrawerOpen(true);

    window.addEventListener('ai-chat-open-notifications', handleOpenNotifications);
    window.addEventListener('ai-chat-open-suggestions', handleOpenSuggestions);
    window.addEventListener('ai-chat-open-conversations', handleOpenConversations);

    if (location.state?.voiceMessage) {
      setMessage(location.state.voiceMessage);
      enqueueSnackbar(t('aiChat:messages.voiceTranscribed'), { variant: 'success' });
      window.history.replaceState({}, document.title);
    }

    const handleNewConversation = () => startNewConversation();
    window.addEventListener('ai-chat-new-conversation', handleNewConversation);

    return () => {
      window.removeEventListener('ai-chat-open-notifications', handleOpenNotifications);
      window.removeEventListener('ai-chat-open-suggestions', handleOpenSuggestions);
      window.removeEventListener('ai-chat-open-conversations', handleOpenConversations);
      window.removeEventListener('ai-chat-new-conversation', handleNewConversation);
    };
  }, [location]);

  // Effet pour changer automatiquement les widgets
  useEffect(() => {
    const allActions = QUICK_ACTIONS_CATEGORIES.flatMap(category => category.actions);

    const changeWidget = () => {
      setWidgetVisible(false);
      setTimeout(() => {
        setCurrentWidgetIndex(Math.floor(Math.random() * allActions.length));
        setWidgetVisible(true);
      }, 300);
    };

    // Changer de widget toutes les 8 secondes
    const interval = setInterval(changeWidget, 8000);

    return () => clearInterval(interval);
  }, []);

  // Polling pour les stats (toutes les 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsageStats();
      fetchNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsageStats = async () => {
    try {
      const response = await aiChatAPI.getUsageSummary();
      setUsageStats(response.data);
      // Notifier MainLayout des stats mises à jour
      window.dispatchEvent(new CustomEvent('ai-chat-stats-update', {
        detail: { stats: response.data }
      }));
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await aiChatAPI.getSuggestions();
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await aiChatAPI.getNotifications(false);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await aiChatAPI.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      fetchUsageStats(); // Refresh counts
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await aiChatAPI.getHistory();
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const response = await aiChatAPI.getConversation(conversationId);
      setMessages(response.data.messages);
      setCurrentConversation(response.data.conversation);
      setDrawerOpen(false);
    } catch (error) {
      enqueueSnackbar(t('aiChat:messages.loadConversationError'), { variant: 'error' });
    }
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setDrawerOpen(false);
  };

  const handleSendMessage = async (messageText = null, confirmationData = null) => {
    const textToSend = messageText || message;
    if (!textToSend.trim() && !confirmationData) return;

    const userMessage = {
      role: 'user',
      content: confirmationData ? `Confirmer la création` : textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setTypingIndicator(true);

    try {
      const requestData = {
        message: confirmationData ? textToSend : userMessage.content,
      };

      // Ajouter les données de confirmation si présentes
      if (confirmationData) {
        requestData.confirmation_data = {
          ...confirmationData,
          force_create: true,
        };
      }

      // Only include conversation_id if it exists and is valid
      if (currentConversation?.id) {
        requestData.conversation_id = currentConversation.id;
      }

      const response = await aiChatAPI.sendMessage(requestData);

      setTypingIndicator(false);

      const aiMessage = {
        ...response.data.message,
        action_results: response.data.action_results || [],
        action_buttons: response.data.action_buttons || null,
      };

      setMessages(prev => [...prev, aiMessage]);

      if (!currentConversation) {
        setCurrentConversation({ id: response.data.conversation_id });
        fetchConversations();
      }

      // Refresh stats after AI interaction
      fetchUsageStats();

      if (response.data.action_results) {
        response.data.action_results.forEach(result => {
          if (result.result?.success) {
            enqueueSnackbar(result.result.message || t('aiChat:messages.actionExecutedSuccess'), {
              variant: 'success',
              autoHideDuration: 3000,
            });
            window.dispatchEvent(new CustomEvent('mascot-success'));
          } else if (result.result?.success === false) {
            window.dispatchEvent(new CustomEvent('mascot-error'));
          }
        });
      }
    } catch (error) {
      setTypingIndicator(false);
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Full error:', error);

      // Show more detailed error message if available
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || t('aiChat:messages.sendMessageError');

      // For 500 errors, provide more helpful message
      if (error.response?.status === 500) {
        console.error('Server Error 500 - Check Django server logs for details');
        enqueueSnackbar(
          'Erreur serveur (500). Vérifiez les logs Django pour plus de détails.',
          {
            variant: 'error',
            autoHideDuration: 5000
          }
        );
      } else {
        enqueueSnackbar(errorMessage, { variant: 'error' });
      }

      setMessages(prev => prev.slice(0, -1));
      window.dispatchEvent(new CustomEvent('mascot-error'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    if (action.link) {
      navigate(action.link);
    } else if (action.prompt) {
      // Remplir directement le champ de saisie
      setMessage(action.prompt);
      // Focus sur le champ pour permettre l'édition
      setTimeout(() => {
        const input = document.querySelector('input[type="text"], textarea');
        if (input) input.focus();
      }, 100);
    }
  };

  const handleAcceptProactiveConversation = async (conversationId) => {
    try {
      const response = await aiChatAPI.acceptProactiveConversation(conversationId);
      if (response.data.success) {
        enqueueSnackbar('Conversation démarrée !', { variant: 'success' });
        // Recharger les conversations et naviguer vers la nouvelle
        await fetchConversations();
        if (response.data.conversation_id) {
          navigate(`/ai-chat?conversation=${response.data.conversation_id}`);
        }
        // Retirer de la liste
        setProactiveConversations(prev => prev.filter(c => c.id !== conversationId));
      }
    } catch (error) {
      console.error('Error accepting proactive conversation:', error);
      enqueueSnackbar('Erreur lors du démarrage de la conversation', { variant: 'error' });
    }
  };

  const handleDismissProactiveConversation = async (conversationId) => {
    try {
      const response = await aiChatAPI.dismissProactiveConversation(conversationId);
      if (response.data.success) {
        // Retirer de la liste
        setProactiveConversations(prev => prev.filter(c => c.id !== conversationId));
      }
    } catch (error) {
      console.error('Error dismissing proactive conversation:', error);
      enqueueSnackbar('Erreur lors de l\'ignorance de la conversation', { variant: 'error' });
    }
  };

  const handleSuggestionAction = (suggestion, action = null) => {
    // Si c'est une suggestion avec actions d'envoi d'email
    if (suggestion.type === 'email_action' && suggestion.actions) {
      if (action) {
        // Ouvrir la page de détail avec le modal d'envoi d'email
        if (action.type === 'send_invoice_email') {
          navigate(`/invoices/${action.invoice_id}`, {
            state: { openEmailDialog: true, recipientEmail: action.client_name ? undefined : '' }
          });
        } else if (action.type === 'send_purchase_order_email') {
          navigate(`/purchase-orders/${action.po_id}`, {
            state: { openEmailDialog: true }
          });
        }
      }
      setSuggestionsPanelOpen(false);
    } else if (suggestion.action_url) {
      navigate(suggestion.action_url);
      setSuggestionsPanelOpen(false);
    }
  };

  const handleFileUpload = (event) => {
    // Rediriger vers la page d'import dédiée au lieu de traiter ici
    navigate('/ai-chat/document-import');
  };

  const getCategoryColor = (category) => {
    const cat = QUICK_ACTIONS_CATEGORIES.find(c => c.id === category);
    return cat?.color || '#64748b';
  };

  // Fonctions pour gérer les Artifacts (visualisations)
  const addArtifact = useCallback((artifact) => {
    // Vérifier si un artifact avec le même titre existe déjà
    setArtifacts(prev => {
      const exists = prev.some(a =>
        !a.archived &&
        a.chart_title === artifact.chart_title &&
        a.chart_type === artifact.chart_type
      );
      if (exists) {
        return prev; // Ne pas ajouter de doublon
      }
      return [{
        ...artifact,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        archived: false,
      }, ...prev];
    });
  }, []);

  const removeArtifact = useCallback((id) => {
    setArtifacts(prev => prev.map(a =>
      a.id === id ? { ...a, archived: true } : a
    ));
  }, []);

  const refreshArtifact = useCallback((id) => {
    enqueueSnackbar('Rafraîchissement en cours...', { variant: 'info' });
  }, [enqueueSnackbar]);

  // NOTE: Les visualisations ne sont plus capturées automatiquement
  // L'utilisateur peut les épingler manuellement via le bouton dans MessageContent

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 80px)',
        bgcolor: 'background.default',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Drawer conversations */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            bgcolor: 'background.paper',
            borderRight: 'none',
            boxShadow: isDark ? '4px 0 20px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,0,0,0.08)',
          },
        }}
      >
        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="600" color="text.primary">
              {t('aiChat:drawer.conversations')}
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Box>

          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={startNewConversation}
            fullWidth
            sx={{ mb: 2 }}
          >
            Nouvelle conversation
          </Button>

          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <List dense disablePadding>
              {conversations.map((conv) => (
                <ListItemButton
                  key={conv.id}
                  selected={currentConversation?.id === conv.id}
                  onClick={() => loadConversation(conv.id)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.1),
                    },
                  }}
                >
                  <ListItemText
                    primary={conv.title}
                    secondary={formatDateTime(conv.last_message_at)}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontSize: '0.813rem',
                      fontWeight: currentConversation?.id === conv.id ? 600 : 400,
                      color: 'text.primary',
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      fontSize: '0.688rem',
                      color: 'text.secondary',
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Box>
      </Drawer>

      {/* Suggestions Panel */}
      <SuggestionsPanel
        open={suggestionsPanelOpen}
        onClose={() => setSuggestionsPanelOpen(false)}
        suggestions={suggestions}
        onActionClick={handleSuggestionAction}
      />

      {/* Notifications History */}
      <NotificationsCenter
        open={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
      />

      {/* Artifacts Panel - Style Claude.ai */}
      <ArtifactsPanel
        open={artifactsPanelOpen}
        onClose={() => setArtifactsPanelOpen(false)}
        artifacts={artifacts}
        onRemoveArtifact={removeArtifact}
        onRefreshArtifact={refreshArtifact}
      />

      {/* Zone principale */}
      <Box sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}>
        {/* Header avec actions rapides */}
        <StatsHeader
          stats={usageStats}
          onNotificationsClick={() => setNotificationsPanelOpen(true)}
          onSuggestionsClick={() => setSuggestionsPanelOpen(true)}
          onImportReviewsClick={() => navigate('/ai-chat/import-reviews')}
          onArtifactsClick={() => setArtifactsPanelOpen(true)}
          artifactsCount={artifacts.filter(a => !a.archived).length}
        />

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {/* Zone de conversation */}

          {messages.length === 0 ? (
            <Fade in timeout={400}>
              <Box sx={{ textAlign: 'center', mt: 2, maxWidth: 800, mx: 'auto' }}>
                {/* Navigation IA rapide */}
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DocumentScanner />}
                    onClick={() => navigate('/ai-chat/document-import')}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Importer un document
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Assignment />}
                    onClick={() => navigate('/ai-chat/import-reviews')}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Imports en attente
                  </Button>
                </Box>

                {/* Mascotte */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Mascot pose="excited" animation="wave" size={100} />
                </Box>

                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}
                >
                  {t('aiChat:welcome.greeting')}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}
                >
                  {t('aiChat:welcome.description')}
                </Typography>

                {/* Widget d'action rapide qui change automatiquement */}
                <Box sx={{ mt: 1, mb: 1 }}>
                  {(() => {
                    const allActions = QUICK_ACTIONS_CATEGORIES.flatMap(category =>
                      category.actions.map(action => ({
                        ...action,
                        categoryColor: category.color,
                        categoryIcon: category.icon,
                        categoryName: category.label,
                      }))
                    );
                    const currentAction = allActions[currentWidgetIndex];

                    return currentAction ? (
                      <Box
                        onClick={() => handleQuickAction(currentAction)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: alpha(currentAction.categoryColor, 0.08),
                          border: `1px solid ${alpha(currentAction.categoryColor, 0.2)}`,
                          borderRadius: 2,
                          p: 1.5,
                          mx: 1,
                          transition: 'all 0.3s ease',
                          opacity: widgetVisible ? 1 : 0,
                          transform: widgetVisible ? 'translateY(0)' : 'translateY(-10px)',
                          '&:hover': {
                            bgcolor: alpha(currentAction.categoryColor, 0.12),
                            borderColor: currentAction.categoryColor,
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: alpha(currentAction.categoryColor, 0.15),
                              color: currentAction.categoryColor,
                            }}
                          >
                            {currentAction.icon}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <Lightbulb sx={{ fontSize: 14, color: 'warning.main' }} />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                  lineHeight: 1.2,
                                  color: 'text.primary',
                                }}
                              >
                                {currentAction.title}
                              </Typography>
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: currentAction.categoryColor,
                                fontSize: '0.7rem',
                                fontWeight: 500,
                              }}
                            >
                              {currentAction.categoryName}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontSize: '0.65rem',
                                display: 'block',
                                mb: 0.5,
                              }}
                            >
                              Cliquez pour remplir
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.disabled',
                                  fontSize: '0.6rem',
                                }}
                              >
                                Auto dans 8s
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const allActions = QUICK_ACTIONS_CATEGORIES.flatMap(category => category.actions);
                                  setWidgetVisible(false);
                                  setTimeout(() => {
                                    setCurrentWidgetIndex((prev) => (prev + 1) % allActions.length);
                                    setWidgetVisible(true);
                                  }, 150);
                                }}
                                sx={{
                                  width: 20,
                                  height: 20,
                                  '&:hover': {
                                    bgcolor: alpha(theme.palette.action.hover, 0.1),
                                  },
                                }}
                              >
                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                  ⟳
                                </Typography>
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    ) : null;
                  })()}

                  {/* Indicateur d'actions disponibles (4 points max) */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 1 }}>
                    {Array.from({ length: Math.min(4, QUICK_ACTIONS_CATEGORIES.flatMap(category => category.actions).length) }, (_, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: i === (currentWidgetIndex % 4)
                            ? 'primary.main'
                            : alpha(theme.palette.text.disabled, 0.3),
                          transition: 'all 0.3s ease',
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Conversations Proactives */}
                {proactiveConversations.length > 0 && (
                  <Box sx={{ mt: 4, mb: 2, maxWidth: 600, mx: 'auto' }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Mascot pose="excited" animation="wave" size={20} />
                      </Box>
                      L'IA vous propose de discuter
                    </Typography>
                    {proactiveConversations.map((conv) => (
                      <ProactiveConversationCard
                        key={conv.id}
                        conversation={conv}
                        onAccept={handleAcceptProactiveConversation}
                        onDismiss={handleDismissProactiveConversation}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Fade>
          ) : (
            <List sx={{ maxWidth: 800, mx: 'auto', p: 0 }}>
              {messages.map((msg, index) => (
                <ListItem
                  key={index}
                  sx={{
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    mb: 2,
                    p: 0,
                  }}
                >
                  {msg.role === 'user' ? (
                    <Avatar
                      sx={{
                        bgcolor: isDark ? '#475569' : '#e2e8f0',
                        color: isDark ? '#e2e8f0' : '#475569',
                        ml: 1.5,
                        mr: 0,
                        width: 32,
                        height: 32,
                      }}
                    >
                      <Person sx={{ fontSize: 18 }} />
                    </Avatar>
                  ) : (
                    <Box sx={{ ml: 0, mr: 1.5, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mascot pose="happy" animation="float" size={32} />
                    </Box>
                  )}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      maxWidth: '75%',
                      bgcolor: msg.role === 'user'
                        ? (isDark ? alpha(theme.palette.common.white, 0.05) : '#f1f5f9')
                        : 'background.paper',
                      border: msg.role === 'user' ? 'none' : `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                    }}
                  >
                    <MessageContent
                      content={msg.content}
                      actionResults={msg.action_results}
                      actionButtons={msg.action_buttons}
                      onButtonClick={(buttonIndex, confirmationData) => {
                        if (confirmationData) {
                          // Pour les confirmations avec données - envoyer les données de confirmation
                          handleSendMessage('Confirmer la création', confirmationData);
                        } else {
                          const responseMap = { 0: '1', 1: '2', 2: '3' };
                          handleSendMessage(responseMap[buttonIndex] || '1');
                        }
                      }}
                      onAddArtifact={(artifact) => {
                        addArtifact(artifact);
                        enqueueSnackbar('Graphique ajouté aux visualisations', { variant: 'success' });
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: 'block', fontSize: '0.625rem', opacity: 0.7 }}
                    >
                      {formatDateTime(msg.created_at)}
                    </Typography>
                  </Paper>
                </ListItem>
              ))}

              {/* Indicateur de frappe */}
              {typingIndicator && (
                <ListItem sx={{ alignItems: 'flex-start', mb: 2, p: 0 }}>
                  <Box sx={{ mr: 1.5, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mascot pose="thinking" animation="pulse" size={32} />
                  </Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: 'background.paper',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {[0, 1, 2].map((i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            animation: 'pulse 1.4s infinite',
                            animationDelay: `${i * 0.2}s`,
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
                              '50%': { opacity: 1, transform: 'scale(1.2)' },
                            },
                          }}
                        />
                      ))}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.813rem', ml: 0.5 }}>
                      {t('aiChat:messages.assistantThinking')}
                    </Typography>
                  </Paper>
                </ListItem>
              )}
              <div ref={messagesEndRef} />
            </List>
          )}
        </Box>

        {/* Zone de saisie */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              maxWidth: 800,
              mx: 'auto',
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
              bgcolor: isDark ? alpha(theme.palette.common.white, 0.03) : '#f8fafc',
              borderRadius: 2,
              p: 1,
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder={t('aiChat:input.placeholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={loading}
              size="small"
              variant="standard"
              InputProps={{
                disableUnderline: true,
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '0.875rem',
                  px: 1,
                },
              }}
            />

            <Tooltip title="Importer un document">
              <IconButton
                onClick={() => navigate('/ai-chat/document-import')}
                disabled={loading}
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                <DocumentScanner sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('aiChat:input.voiceMessage')}>
              <span>
                <IconButton
                  onClick={() => setVoiceRecorderOpen(true)}
                  disabled={loading}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  <Mic sx={{ fontSize: 20 }} />
                </IconButton>
              </span>
            </Tooltip>

            <IconButton
              onClick={() => handleSendMessage()}
              disabled={loading || !message.trim()}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                width: 36,
                height: 36,
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': {
                  bgcolor: isDark ? alpha(theme.palette.common.white, 0.1) : '#e2e8f0',
                  color: isDark ? alpha(theme.palette.common.white, 0.3) : '#94a3b8',
                },
              }}
            >
              <Send sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Enregistrement vocal */}
        {voiceRecorderOpen && (
          <VoiceRecorder
            onVoiceMessage={(transcribedText) => {
              setMessage(transcribedText);
              enqueueSnackbar(t('aiChat:messages.voiceTranscribed'), { variant: 'success' });
            }}
            onClose={() => setVoiceRecorderOpen(false)}
          />
        )}
      </Box>
    </Box>
  );
}

export default AIChat;
