import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { aiChatAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import MessageContent from '../../components/ai-chat/MessageContent';
import Mascot from '../../components/Mascot';
import VoiceRecorder from '../../components/VoiceRecorder';

function AIChat() {
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['aiChat', 'common']);
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
    fetchQuickActions();

    if (location.state?.voiceMessage) {
      setMessage(location.state.voiceMessage);
      enqueueSnackbar(t('aiChat:messages.voiceTranscribed'), { variant: 'success' });
      window.history.replaceState({}, document.title);
    }

    const handleNewConversation = () => startNewConversation();
    window.addEventListener('ai-chat-new-conversation', handleNewConversation);
    return () => window.removeEventListener('ai-chat-new-conversation', handleNewConversation);
  }, [location]);

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

  const fetchQuickActions = async () => {
    try {
      const response = await aiChatAPI.getQuickActions();
      setQuickActions(response.data.actions || []);
    } catch (error) {
      console.error('Error fetching quick actions:', error);
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

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || message;
    if (!textToSend.trim()) return;

    const userMessage = {
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setTypingIndicator(true);

    try {
      const response = await aiChatAPI.sendMessage({
        message: userMessage.content,
        conversation_id: currentConversation?.id,
      });

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
      enqueueSnackbar(t('aiChat:messages.sendMessageError'), { variant: 'error' });
      setMessages(prev => prev.slice(0, -1));
      window.dispatchEvent(new CustomEvent('mascot-error'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => handleSendMessage(action.prompt);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    enqueueSnackbar(t('aiChat:messages.scanInDevelopment'), { variant: 'info' });
  };

  const getActionIcon = (actionId) => {
    const icons = {
      create_invoice: <Receipt fontSize="small" />,
      create_purchase_order: <ShoppingCart fontSize="small" />,
      create_supplier: <Business fontSize="small" />,
      get_statistics: <Analytics fontSize="small" />,
      analyze_document: <DocumentScanner fontSize="small" />,
      add_invoice_items: <Add fontSize="small" />,
      send_invoice: <Send fontSize="small" />,
      add_po_items: <Add fontSize="small" />,
      send_purchase_order: <Send fontSize="small" />,
    };
    return icons[actionId] || <SmartToy fontSize="small" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      suppliers: '#3b82f6',
      invoices: '#10b981',
      purchase_orders: '#06b6d4',
      dashboard: '#f59e0b',
      documents: '#8b5cf6',
    };
    return colors[category] || '#64748b';
  };

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

      {/* Zone principale */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {/* Header avec bouton menu */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              onClick={() => setDrawerOpen(true)}
              size="small"
              sx={{
                bgcolor: isDark ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.04),
                '&:hover': {
                  bgcolor: isDark ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.black, 0.08),
                }
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </Box>

          {messages.length === 0 ? (
            <Fade in timeout={400}>
              <Box sx={{ textAlign: 'center', mt: 2, maxWidth: 700, mx: 'auto' }}>
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

                {/* Actions rapides */}
                <Grid container spacing={1.5} sx={{ mt: 1 }}>
                  {quickActions.slice(0, 6).map((action) => (
                    <Grid item xs={6} sm={4} key={action.id}>
                      <Card
                        onClick={() => handleQuickAction(action)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: 'background.paper',
                          border: 'none',
                          borderRadius: 2,
                          transition: 'all 0.15s ease',
                          boxShadow: isDark 
                            ? '0 1px 3px rgba(0,0,0,0.3)' 
                            : '0 1px 3px rgba(0,0,0,0.06)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: isDark 
                              ? '0 4px 12px rgba(0,0,0,0.4)' 
                              : '0 4px 12px rgba(0,0,0,0.1)',
                          },
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: alpha(getCategoryColor(action.category), 0.15),
                                color: getCategoryColor(action.category),
                              }}
                            >
                              {getActionIcon(action.id)}
                            </Avatar>
                            <Typography 
                              variant="body2" 
                              sx={{ fontWeight: 600, fontSize: '0.813rem', color: 'text.primary' }}
                            >
                              {action.title}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontSize: '0.688rem',
                              display: { xs: 'none', md: 'block' },
                              lineHeight: 1.3,
                            }}
                          >
                            {action.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
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
                  <Avatar
                    sx={{
                      bgcolor: msg.role === 'user' 
                        ? (isDark ? '#475569' : '#e2e8f0')
                        : 'primary.main',
                      color: msg.role === 'user' 
                        ? (isDark ? '#e2e8f0' : '#475569')
                        : 'white',
                      ml: msg.role === 'user' ? 1.5 : 0,
                      mr: msg.role === 'user' ? 0 : 1.5,
                      width: 32,
                      height: 32,
                    }}
                  >
                    {msg.role === 'user' ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
                  </Avatar>
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
                      onButtonClick={(buttonIndex) => {
                        const responseMap = { 0: '1', 1: '2', 2: '3' };
                        handleSendMessage(responseMap[buttonIndex] || '1');
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
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 1.5, width: 32, height: 32 }}>
                    <SmartToy sx={{ fontSize: 18 }} />
                  </Avatar>
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
            
            <Tooltip title={t('aiChat:input.attach')}>
              <span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf"
                />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  <AttachFile sx={{ fontSize: 20 }} />
                </IconButton>
              </span>
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
