import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  InputAdornment,
  Menu,
  MenuItem,
  Drawer,
  ListItemButton,
  Button,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  AttachFile,
  CameraAlt,
  Receipt,
  ShoppingCart,
  Business,
  Analytics,
  DocumentScanner,
  Menu as MenuIcon,
  Add,
  History,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { aiChatAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';

function AIChat() {
  const { enqueueSnackbar } = useSnackbar();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickActions, setQuickActions] = useState([]);

  useEffect(() => {
    fetchConversations();
    fetchQuickActions();
  }, []);

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
      setQuickActions(response.data);
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
      enqueueSnackbar('Erreur lors du chargement de la conversation', { variant: 'error' });
    }
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setDrawerOpen(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const response = await aiChatAPI.sendMessage({
        message: userMessage.content,
        conversation_id: currentConversation?.id,
      });

      const aiMessage = response.data.message;
      setMessages(prev => [...prev, aiMessage]);

      if (!currentConversation) {
        setCurrentConversation({ id: response.data.conversation_id });
        fetchConversations();
      }

      // Afficher le résultat de l'action si présent
      if (response.data.action_result) {
        const result = response.data.action_result;
        if (result.success) {
          enqueueSnackbar(result.message || 'Action exécutée avec succès', { variant: 'success' });
        } else {
          enqueueSnackbar(result.error || 'Erreur lors de l\'exécution', { variant: 'error' });
        }
      }
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'envoi du message', { variant: 'error' });
      // Retirer le message utilisateur en cas d'erreur
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    setMessage(action.prompt);
    handleSendMessage();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // TODO: Implémenter l'upload et l'OCR
    enqueueSnackbar('Fonctionnalité de scan en cours de développement', { variant: 'info' });
  };

  const getActionIcon = (actionId) => {
    const icons = {
      create_invoice: <Receipt />,
      create_po: <ShoppingCart />,
      add_supplier: <Business />,
      view_stats: <Analytics />,
      scan_document: <DocumentScanner />,
    };
    return icons[actionId] || <SmartToy />;
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Drawer des conversations */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 300,
            position: 'relative',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Add />}
            onClick={startNewConversation}
            sx={{ mb: 2 }}
          >
            Nouvelle conversation
          </Button>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Historique
          </Typography>
          <List>
            {conversations.map((conv) => (
              <ListItemButton
                key={conv.id}
                selected={currentConversation?.id === conv.id}
                onClick={() => loadConversation(conv.id)}
              >
                <ListItemText
                  primary={conv.title}
                  secondary={formatDateTime(conv.last_message_at)}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Zone de chat principale */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <SmartToy />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Assistant IA</Typography>
            <Typography variant="caption" color="text.secondary">
              Votre assistant intelligent pour la gestion
            </Typography>
          </Box>
        </Paper>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Bonjour ! Comment puis-je vous aider ?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Je peux vous aider à gérer vos fournisseurs, créer des factures,
                suivre vos commandes et bien plus encore.
              </Typography>
              
              {/* Actions rapides */}
              <Grid container spacing={2} justifyContent="center">
                {Array.isArray(quickActions) && quickActions.map((action) => (
                  <Grid item key={action.id}>
                    <Card sx={{ width: 150 }}>
                      <CardActionArea onClick={() => handleQuickAction(action)}>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Avatar sx={{ bgcolor: 'primary.light', mb: 1, mx: 'auto' }}>
                            {getActionIcon(action.id)}
                          </Avatar>
                          <Typography variant="body2">
                            {action.title}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <List>
              {messages.map((msg, index) => (
                <ListItem
                  key={index}
                  sx={{
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: msg.role === 'user' ? 'secondary.main' : 'primary.main' }}>
                      {msg.role === 'user' ? <Person /> : <SmartToy />}
                    </Avatar>
                  </ListItemAvatar>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      bgcolor: msg.role === 'user' ? 'secondary.light' : 'background.paper',
                    }}
                  >
                    <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {formatDateTime(msg.created_at)}
                    </Typography>
                  </Paper>
                </ListItem>
              ))}
              {loading && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <SmartToy />
                    </Avatar>
                  </ListItemAvatar>
                  <CircularProgress size={20} />
                </ListItem>
              )}
              <div ref={messagesEndRef} />
            </List>
          )}
        </Box>

        {/* Input zone */}
        <Paper elevation={3} sx={{ p: 2 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Tapez votre message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
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
                  >
                    <AttachFile />
                  </IconButton>
                  <IconButton>
                    <CameraAlt />
                  </IconButton>
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={loading || !message.trim()}
                    color="primary"
                  >
                    <Send />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
}

export default AIChat;