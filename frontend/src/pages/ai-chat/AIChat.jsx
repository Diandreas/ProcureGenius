import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
  Stack,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, staggerContainer } from '../../animations/variants/scroll-reveal';
import { messageIn, typingIndicator, avatarFloat } from '../../animations/variants/chat';
import { buttonPress } from '../../animations/variants/micro-interactions';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
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
  History,
  Search,
  Delete,
  Edit,
  MoreVert,
  CalendarToday,
  AccessTime,
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
import { useHeader } from '../../contexts/HeaderContext';
import { useAINotifications } from '../../components/AI/AINotificationProvider';

// Composant Header compact avec navigation IA - Design Premium Mobile-First
// SuggestionsPanel and other sub-components remain...

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
                    border: theme => `1px solid ${alpha(theme.palette.divider, 0.4)}`,
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


// Composant Historique Amélioré des Conversations
const ConversationsHistory = ({ open, onClose, conversations, onSelectConversation, onDeleteConversation, onNewConversation, currentConversationId }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const { enqueueSnackbar } = useSnackbar();

  // Grouper les conversations par période
  const groupConversationsByDate = (convs) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    convs.forEach(conv => {
      const convDate = new Date(conv.last_message_at);
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= thisWeek) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  // Filtrer les conversations par recherche
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.summary && conv.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedConversations = groupConversationsByDate(filteredConversations);

  const handleDelete = async (convId, e) => {
    e.stopPropagation();
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      try {
        await onDeleteConversation(convId);
        enqueueSnackbar('Conversation supprimée', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
      }
    }
  };

  const renderConversationItem = (conv) => {
    const isActive = currentConversationId === conv.id;

    return (
      <Box
        key={conv.id}
        onClick={() => onSelectConversation(conv.id)}
        className="conv-item"
        sx={{
          mb: 0.5,
          cursor: 'pointer',
          px: 1.5,
          py: 1.25,
          borderRadius: 1.5,
          bgcolor: isActive
            ? alpha(theme.palette.primary.main, isDark ? 0.14 : 0.07)
            : 'transparent',
          borderLeft: isActive
            ? `2px solid ${theme.palette.primary.main}`
            : '2px solid transparent',
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: isActive
              ? alpha(theme.palette.primary.main, isDark ? 0.18 : 0.09)
              : alpha(theme.palette.text.primary, 0.04),
            '& .conv-delete': { opacity: 1 },
          },
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={isActive ? 600 : 400}
            sx={{
              color: isActive ? 'primary.main' : 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.825rem',
              lineHeight: 1.4,
              mb: 0.25,
            }}
          >
            {conv.title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
              {formatDateTime(conv.last_message_at)}
            </Typography>
            {conv.message_count > 0 && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                · {conv.message_count} msg
              </Typography>
            )}
          </Box>
        </Box>

        <IconButton
          className="conv-delete"
          size="small"
          onClick={(e) => handleDelete(conv.id, e)}
          sx={{
            opacity: 0,
            transition: 'opacity 0.15s',
            width: 24,
            height: 24,
            flexShrink: 0,
            mt: 0.25,
            color: 'text.disabled',
            '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.1) }
          }}
        >
          <Delete sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    );
  };

  const renderGroup = (title, conversations) => {
    if (conversations.length === 0) return null;

    return (
      <Box sx={{ mb: 2.5 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: 1.5,
            mb: 0.75,
            color: 'text.disabled',
            fontSize: '0.68rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </Typography>
        {conversations.map(renderConversationItem)}
      </Box>
    );
  };

  const totalCount = conversations.length;
  const todayCount = groupedConversations.today.length;

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 320,
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.97) : theme.palette.background.default,
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
          boxShadow: isDark ? '6px 0 24px rgba(0,0,0,0.25)' : '6px 0 24px rgba(0,0,0,0.05)',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ px: 2, pt: 2.5, pb: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.2, fontSize: '0.95rem' }}>
                Historique
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
                {totalCount} conversation{totalCount !== 1 ? 's' : ''}
                {todayCount > 0 && ` · ${todayCount} aujourd'hui`}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Nouvelle conversation */}
          <Button
            variant="outlined"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={onNewConversation}
            fullWidth
            sx={{
              mb: 1.5,
              py: 0.875,
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.825rem',
              borderColor: alpha(theme.palette.primary.main, 0.35),
              color: 'primary.main',
              boxShadow: 'none',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                boxShadow: 'none',
              },
            }}
          >
            Nouvelle conversation
          </Button>

          {/* Recherche */}
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 0.75, color: 'text.disabled', fontSize: 16 }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                fontSize: '0.8rem',
                bgcolor: 'transparent',
                '& fieldset': { borderColor: alpha(theme.palette.divider, 0.5) },
                '&:hover fieldset': { borderColor: alpha(theme.palette.divider, 0.8) },
              },
            }}
          />
        </Box>

        {/* Liste des conversations */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1, py: 1.5 }}>
          {filteredConversations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <History sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5, opacity: 0.3 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem' }}>
                {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
              </Typography>
              {!searchQuery && (
                <Typography variant="caption" color="text.disabled">
                  Commencez une nouvelle conversation
                </Typography>
              )}
            </Box>
          ) : (
            <>
              {renderGroup("Aujourd'hui", groupedConversations.today)}
              {renderGroup('Hier', groupedConversations.yesterday)}
              {renderGroup('Cette semaine', groupedConversations.thisWeek)}
              {renderGroup('Plus ancien', groupedConversations.older)}
            </>
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
  const { chatId } = useParams();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { setPageHeader } = useHeader();

  // States principaux
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // States pour les nouvelles fonctionnalités
  const [usageStats, setUsageStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsPanelOpen, setSuggestionsPanelOpen] = useState(false);
  const { unreadCount, openCenter: openNotificationsCenter } = useAINotifications();
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

  // Initialiser la conversation sur la base de l'URL
  useEffect(() => {
    if (chatId) {
      if (!currentConversation || currentConversation.id.toString() !== chatId) {
        aiChatAPI.getConversation(chatId).then((response) => {
          setMessages(response.data.messages);
          setCurrentConversation(response.data.conversation);
        }).catch(err => {
          console.error('Erreur chargement conversation URL', err);
          navigate('/ai-chat', { replace: true });
        });
      }
    } else {
      if (currentConversation) {
        setCurrentConversation(null);
        setMessages([]);
      }
    }
  }, [chatId]);

  // Charger les données au montage
  useEffect(() => {
    fetchConversations();
    fetchUsageStats();
    fetchSuggestions();
    fetchProactiveConversations();

    // Écouter les événements depuis MainLayout
    const handleOpenNotifications = () => openNotificationsCenter();
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
  }, []); // Run only on mount

  // Mettre à jour le header global
  useEffect(() => {
    const artifactsCount = artifacts.filter(a => !a.archived).length;
    const conversationsCount = conversations.length;

    setPageHeader({
      title: t('aiChat:title', 'Assistant IA'),
      actions: (
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            startIcon={<Add sx={{ fontSize: 18 }} />}
            onClick={startNewConversation}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: { xs: 1.5, sm: 2 },
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
              }
            }}
          >
            {t('aiChat:topBar.newConversation', 'Nouveau')}
          </Button>
        </Stack>
      )
    });
  }, [t, theme, navigate, setPageHeader]);

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
      navigate(`/ai-chat/${conversationId}`);
    } catch (error) {
      enqueueSnackbar(t('aiChat:messages.loadConversationError'), { variant: 'error' });
    }
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setDrawerOpen(false);
    navigate('/ai-chat');
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
        navigate(`/ai-chat/${response.data.conversation_id}`, { replace: true });
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
      {/* Historique amélioré des conversations */}
      <ConversationsHistory
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={conversations}
        onSelectConversation={loadConversation}
        onDeleteConversation={async (id) => {
          await aiChatAPI.deleteConversation(id);
          fetchConversations();
          if (currentConversation?.id === id) {
            startNewConversation();
          }
        }}
        onNewConversation={startNewConversation}
        currentConversationId={currentConversation?.id}
      />

      {/* Suggestions Panel */}
      <SuggestionsPanel
        open={suggestionsPanelOpen}
        onClose={() => setSuggestionsPanelOpen(false)}
        suggestions={suggestions}
        onActionClick={handleSuggestionAction}
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
        bgcolor: 'background.default',
      }}>
        {/* Barre d'outils interne */}
        <Box sx={{
          px: 2,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: theme => `1px solid ${alpha(theme.palette.divider, 0.35)}`,
          bgcolor: 'background.paper',
        }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              startIcon={<History sx={{ fontSize: 16 }} />}
              onClick={() => setDrawerOpen(true)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: 'text.secondary',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main' }
              }}
            >
              {t('aiChat:sidebar.history', 'Historique')}
            </Button>
            <Divider orientation="vertical" flexItem sx={{ height: 16, my: 'auto' }} />
            <IconButton size="small" onClick={() => navigate('/ai-chat/import-reviews')} title="Imports">
              <Assignment sx={{ fontSize: 18, color: 'text.secondary' }} />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {/* Notifications */}
            <IconButton size="small" onClick={() => openNotificationsCenter()} sx={{ color: unreadCount > 0 ? 'warning.main' : 'text.secondary' }}>
              <Badge badgeContent={unreadCount} color="warning" variant="dot">
                <Notifications sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>

            {/* Suggestions */}
            <IconButton size="small" onClick={() => setSuggestionsPanelOpen(true)} sx={{ color: usageStats?.suggestions_count > 0 ? 'secondary.main' : 'text.secondary' }}>
              <Badge badgeContent={usageStats?.suggestions_count || 0} color="secondary" variant="dot">
                <Lightbulb sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>

            {/* Visualisations - Toujours conditionnel */}
            {artifacts.filter(a => !a.archived).length > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Analytics sx={{ fontSize: 16 }} />}
                onClick={() => setArtifactsPanelOpen(true)}
                sx={{
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  color: 'primary.main',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderColor: 'primary.main',
                  }
                }}
              >
                Visualisations ({artifacts.filter(a => !a.archived).length})
              </Button>
            )}
          </Stack>
        </Box>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {/* Zone de conversation */}

          {messages.length === 0 ? (
            <Fade in timeout={500}>
              <Box sx={{ mt: { xs: 2, sm: 4 }, maxWidth: 680, mx: 'auto', px: { xs: 2, sm: 0 } }}>

                {/* Header section — épuré, axé sur le texte */}
                <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                  {/* Indicateur IA minimal */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981',
                      boxShadow: '0 0 0 3px rgba(16,185,129,0.2)',
                      animation: 'aiPulse 2.5s ease-in-out infinite',
                      '@keyframes aiPulse': {
                        '0%, 100%': { boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' },
                        '50%': { boxShadow: '0 0 0 6px rgba(16,185,129,0.08)' },
                      }
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#10b981', letterSpacing: '0.05em', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Procura IA · En ligne
                    </Typography>
                  </Box>

                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 400,
                      fontStyle: 'italic',
                      fontFamily: '"Georgia", "Times New Roman", serif',
                      color: 'text.primary',
                      lineHeight: 1.25,
                      mb: 1,
                      fontSize: { xs: '1.5rem', sm: '1.9rem' },
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {t('aiChat:welcome.greeting')}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontSize: { xs: '0.85rem', sm: '0.9rem' },
                      lineHeight: 1.6,
                      maxWidth: 460,
                    }}
                  >
                    {t('aiChat:welcome.description')}
                  </Typography>
                </Box>

                {/* Quick Actions — rangées de chips compacts */}
                <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', mb: 1.5, display: 'block' }}>
                    Actions rapides
                  </Typography>
                  <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}>
                    {QUICK_ACTIONS_CATEGORIES.flatMap(category =>
                      category.actions.map(action => (
                        <Box
                          key={action.id}
                          onClick={() => handleQuickAction(action)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.875,
                            borderRadius: '10px',
                            border: theme => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            bgcolor: 'background.paper',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            '&:hover': {
                              borderColor: category.color,
                              bgcolor: alpha(category.color, 0.05),
                              transform: 'translateY(-1px)',
                              boxShadow: `0 4px 12px ${alpha(category.color, 0.12)}`,
                              '& .action-icon': { color: category.color },
                              '& .action-label': { color: 'text.primary' },
                            },
                          }}
                        >
                          <Box className="action-icon" sx={{ color: 'text.disabled', display: 'flex', transition: 'color 0.18s', '& svg': { fontSize: 15 } }}>
                            {action.icon}
                          </Box>
                          <Typography className="action-label" variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.775rem', whiteSpace: 'nowrap', transition: 'color 0.18s', lineHeight: 1 }}>
                            {action.title}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>

                {/* Navigation rapide — import docs */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Box
                    onClick={() => navigate('/ai-chat/document-import')}
                    sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.75,
                      px: 1.5, py: 0.75,
                      borderRadius: '8px',
                      border: theme => `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      '&:hover': { borderColor: 'primary.main', bgcolor: theme => alpha(theme.palette.primary.main, 0.04) },
                    }}
                  >
                    <DocumentScanner sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>Importer un document</Typography>
                  </Box>
                  <Box
                    onClick={() => navigate('/ai-chat/import-reviews')}
                    sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.75,
                      px: 1.5, py: 0.75,
                      borderRadius: '8px',
                      border: theme => `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      '&:hover': { borderColor: 'primary.main', bgcolor: theme => alpha(theme.palette.primary.main, 0.04) },
                    }}
                  >
                    <Assignment sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>Imports en attente</Typography>
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
            <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 1, sm: 2 } }}>
              <AnimatePresence mode="popLayout">
                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  const isConsecutive = index > 0 && messages[index - 1].role === msg.role;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      layout
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: 1,
                          mb: isConsecutive ? 0.5 : 2,
                        }}
                      >
                        {/* Avatar — only shown on first in a group */}
                        <Box sx={{ width: 26, flexShrink: 0, mb: 0.25 }}>
                          {!isConsecutive && (
                            isUser ? (
                              <Box sx={{
                                width: 26, height: 26, borderRadius: '50%',
                                bgcolor: isDark ? alpha('#6366f1', 0.25) : alpha('#6366f1', 0.1),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Person sx={{ fontSize: 14, color: '#6366f1' }} />
                              </Box>
                            ) : (
                              <Mascot pose="happy" animation="none" size={26} />
                            )
                          )}
                        </Box>

                        {/* Bubble */}
                        <Box
                          sx={{
                            maxWidth: { xs: '88%', sm: '78%' },
                            ...(isUser ? {
                              bgcolor: isDark ? '#4f46e5' : '#6366f1',
                              color: '#fff',
                              borderRadius: '16px 16px 4px 16px',
                              px: 2,
                              py: 1.25,
                              boxShadow: isDark
                                ? '0 2px 12px rgba(99,102,241,0.3)'
                                : '0 2px 10px rgba(99,102,241,0.2)',
                            } : {
                              bgcolor: isDark
                                ? alpha(theme.palette.common.white, 0.05)
                                : theme.palette.background.paper,
                              borderRadius: '4px 16px 16px 16px',
                              px: 2,
                              py: 1.25,
                              boxShadow: isDark
                                ? '0 1px 6px rgba(0,0,0,0.2)'
                                : '0 1px 4px rgba(0,0,0,0.06)',
                            }),
                          }}
                        >
                          <MessageContent
                            content={msg.content}
                            actionResults={msg.action_results}
                            actionButtons={msg.action_buttons}
                            onButtonClick={(buttonIndex, confirmationData) => {
                              if (confirmationData) {
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
                            sx={{
                              mt: 0.5,
                              display: 'block',
                              fontSize: '0.58rem',
                              opacity: 0.4,
                              color: isUser ? '#fff' : 'text.secondary',
                              textAlign: isUser ? 'right' : 'left',
                            }}
                          >
                            {formatDateTime(msg.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  );
                })}

                {/* Indicateur de frappe */}
                {typingIndicator && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 2 }}>
                      <Box sx={{ width: 26, flexShrink: 0 }}>
                        <Mascot pose="thinking" animation="pulse" size={26} />
                      </Box>
                      <Box sx={{
                        px: 2, py: 1.25,
                        bgcolor: isDark ? alpha(theme.palette.common.white, 0.05) : theme.palette.background.paper,
                        borderRadius: '4px 16px 16px 16px',
                        boxShadow: isDark ? '0 1px 6px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
                        display: 'flex', alignItems: 'center', gap: 0.5,
                      }}>
                        {[0, 1, 2].map((i) => (
                          <Box key={i} sx={{
                            width: 5, height: 5, borderRadius: '50%',
                            bgcolor: 'text.disabled',
                            animation: 'typingDot 1.4s ease-in-out infinite',
                            animationDelay: `${i * 0.2}s`,
                            '@keyframes typingDot': {
                              '0%, 60%, 100%': { opacity: 0.3, transform: 'translateY(0)' },
                              '30%': { opacity: 1, transform: 'translateY(-4px)' },
                            },
                          }} />
                        ))}
                      </Box>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </Box>
          )}
        </Box>

        {/* Suggestion chips */}
        {messages.length > 0 && (
          <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 1.5, sm: 3 }, mb: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
              {[
                { label: '📊 Stats', prompt: 'Montre-moi les statistiques principales' },
                { label: '📝 Facture', prompt: 'Créer une nouvelle facture' },
                { label: '📦 Stock', prompt: 'Quels produits sont en rupture de stock ?' },
                { label: '💡 Optimiser', prompt: 'Quelles optimisations me suggères-tu ?' },
              ].map((chip, idx) => (
                <Box
                  key={idx}
                  onClick={() => setMessage(chip.prompt)}
                  sx={{
                    px: 1.25, py: 0.5,
                    borderRadius: '8px',
                    border: theme => `1px solid ${alpha(theme.palette.divider, 0.45)}`,
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: '#6366f1',
                      bgcolor: alpha('#6366f1', 0.05),
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 500, color: 'text.secondary' }}>
                    {chip.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Zone de saisie */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 3 },
            pt: { xs: 0.5, sm: 1 },
            pb: { xs: 2, sm: 3 },
            width: '100%',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              maxWidth: 720,
              mx: 'auto',
              display: 'flex',
              gap: { xs: 0.75, sm: 1 },
              alignItems: 'flex-end',
              bgcolor: theme.palette.background.paper,
              borderRadius: '16px',
              p: { xs: '10px 12px', sm: '12px 14px' },
              border: theme => `1px solid ${alpha(theme.palette.divider, 0.4)}`,
              boxShadow: isDark
                ? '0 2px 16px rgba(0,0,0,0.2)'
                : '0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:focus-within': {
                borderColor: alpha('#6366f1', 0.5),
                boxShadow: `0 0 0 3px ${alpha('#6366f1', 0.1)}, 0 2px 16px rgba(0,0,0,0.08)`,
              }
            }}
          >
            {/* Boutons d'action - Design pill */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                mb: 0.5,
              }}
            >
              <Tooltip title="Importer un document">
                <IconButton
                  onClick={() => navigate('/ai-chat/document-import')}
                  disabled={loading}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    bgcolor: alpha(isDark ? '#ffffff' : '#000000', 0.05),
                    borderRadius: '12px',
                    p: { xs: 0.75, sm: 1 },
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      transform: 'scale(1.05)',
                    }
                  }}
                >
                  <AttachFile sx={{ fontSize: { xs: 18, sm: 20 }, transform: 'rotate(45deg)' }} />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('aiChat:input.voiceMessage')}>
                <IconButton
                  onClick={() => setVoiceRecorderOpen(true)}
                  disabled={loading}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    bgcolor: alpha(isDark ? '#ffffff' : '#000000', 0.05),
                    borderRadius: '12px',
                    p: { xs: 0.75, sm: 1 },
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: '#ef4444',
                      bgcolor: alpha('#ef4444', 0.12),
                      transform: 'scale(1.05)',
                    }
                  }}
                >
                  <Mic sx={{ fontSize: { xs: 18, sm: 20 } }} />
                </IconButton>
              </Tooltip>
            </Box>

            <TextField
              fullWidth
              multiline
              maxRows={6}
              placeholder={t('aiChat:input.placeholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={loading}
              variant="standard"
              InputProps={{
                disableUnderline: true,
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.9rem', sm: '0.95rem' },
                  lineHeight: 1.5,
                  py: { xs: 0.75, sm: 1 },
                  px: 1,
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'text.disabled',
                  opacity: 0.7,
                },
              }}
            />

            {/* Bouton envoyer - Design Premium avec gradient */}
            <motion.div
              variants={buttonPress}
              initial="rest"
              whileHover={message.trim() ? "hover" : "rest"}
              whileTap={message.trim() ? "tap" : "rest"}
            >
              <IconButton
                onClick={() => handleSendMessage()}
                disabled={loading || !message.trim()}
                sx={{
                  mb: 0.5,
                  background: message.trim()
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : theme.palette.background.paper,
                  color: message.trim() ? 'white' : 'text.disabled',
                  width: { xs: 38, sm: 42 },
                  height: { xs: 38, sm: 42 },
                  borderRadius: '14px',
                  boxShadow: message.trim()
                    ? `0 4px 16px ${alpha('#6366f1', 0.4)}`
                    : getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft'),
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&.Mui-disabled': {
                    background: theme.palette.background.paper,
                    color: 'text.disabled',
                    boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft'),
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={18} sx={{ color: 'inherit' }} />
                ) : (
                  <Send sx={{ fontSize: { xs: 18, sm: 20 }, ml: 0.25 }} />
                )}
              </IconButton>
            </motion.div>
          </Paper>
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
