import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  IconButton,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Collapse,
  Card,
  CardContent,
  CardActionArea,
  Grid,
} from '@mui/material';
import {
  SmartToy,
  Send,
  Close,
  Person,
  Minimize,
  ExpandMore,
  ExpandLess,
  Receipt,
  ShoppingCart,
  Business,
  Analytics,
  DocumentScanner,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { aiChatAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';

/**
 * Assistant IA flottant - MODULE 3 IA Conversationnelle
 * Peut être intégré sur toutes les pages selon votre contexte
 */
function FloatingAIAssistant({
  isVisible = true,
  contextData = null, // Données du contexte de la page actuelle
  onActionExecuted = null, // Callback quand une action est exécutée
}) {
  const { enqueueSnackbar } = useSnackbar();
  const messagesEndRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [quickActions, setQuickActions] = useState([]);

  // Messages d'accueil contextuels
  const getWelcomeMessage = () => {
    if (contextData?.page === 'suppliers') {
      return "Je peux vous aider à gérer vos fournisseurs : créer, rechercher, modifier ou analyser leurs performances.";
    } else if (contextData?.page === 'invoices') {
      return "Je peux créer des factures, suivre les paiements, ou analyser vos revenus.";
    } else if (contextData?.page === 'purchase-orders') {
      return "Je peux créer des bons de commande, suivre les livraisons, ou analyser vos achats.";
    }
    return "Comment puis-je vous aider avec la gestion de votre entreprise ?";
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuickActions();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchQuickActions = async () => {
    try {
      const response = await aiChatAPI.getQuickActions();
      setQuickActions(response.data);
    } catch (error) {
      console.error('Error fetching quick actions:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };

    // Ajouter le contexte de la page si disponible
    let contextualMessage = message;
    if (contextData) {
      contextualMessage = `[Contexte: ${contextData.page}] ${message}`;
    }

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setShowQuickActions(false);

    try {
      const response = await aiChatAPI.sendMessage({
        message: contextualMessage,
        context: contextData,
      });

      const aiMessage = response.data.message;
      setMessages(prev => [...prev, aiMessage]);

      // Exécuter callback si action réussie
      if (response.data.action_result && response.data.action_result.success) {
        enqueueSnackbar(
          response.data.action_result.message || 'Action exécutée avec succès',
          { variant: 'success' }
        );
        if (onActionExecuted) {
          onActionExecuted(response.data.action_result);
        }
      } else if (response.data.action_result && !response.data.action_result.success) {
        enqueueSnackbar(
          response.data.action_result.error || 'Erreur lors de l\'exécution',
          { variant: 'error' }
        );
      }
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'envoi du message', { variant: 'error' });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    setMessage(action.prompt);
    setShowQuickActions(false);
    // Auto-send for quick actions
    setTimeout(() => {
      handleSendMessage();
    }, 100);
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

  const clearChat = () => {
    setMessages([]);
    setShowQuickActions(true);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <Fab
          color="primary"
          aria-label="assistant-ia"
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            '&:hover': {
              transform: 'scale(1.1)',
            },
            transition: 'transform 0.2s',
          }}
        >
          <SmartToy />
        </Fab>
      )}

      {/* Dialog de chat */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            height: isMinimized ? 'auto' : '70vh',
            maxHeight: isMinimized ? 'auto' : '70vh',
            position: 'fixed',
            bottom: 24,
            right: 24,
            top: 'auto',
            left: 'auto',
            margin: 0,
          },
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32 }}>
            <SmartToy sx={{ fontSize: 20 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Assistant IA</Typography>
            <Typography variant="caption" color="text.secondary">
              {contextData?.page ? `Mode ${contextData.page}` : 'Mode général'}
            </Typography>
          </Box>
          <IconButton onClick={() => setIsMinimized(!isMinimized)} size="small">
            {isMinimized ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          <IconButton onClick={clearChat} size="small">
            <Minimize />
          </IconButton>
          <IconButton onClick={() => setIsOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <Collapse in={!isMinimized}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 0 }}>
            {/* Messages */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, py: 1 }}>
              {messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    {getWelcomeMessage()}
                  </Typography>

                  {/* Actions rapides contextuelles */}
                  {showQuickActions && (
                    <Grid container spacing={1} sx={{ mt: 2 }}>
                      {quickActions.slice(0, 4).map((action) => (
                        <Grid item xs={6} key={action.id}>
                          <Card sx={{ height: '100%' }}>
                            <CardActionArea
                              onClick={() => handleQuickAction(action)}
                              sx={{ p: 1, height: '100%' }}
                            >
                              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                <Avatar sx={{ bgcolor: 'primary.light', mx: 'auto', mb: 1, width: 32, height: 32 }}>
                                  {getActionIcon(action.id)}
                                </Avatar>
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                  {action.title}
                                </Typography>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              ) : (
                <List dense>
                  {messages.map((msg, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                        py: 0.5,
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar sx={{
                          bgcolor: msg.role === 'user' ? 'secondary.main' : 'primary.main',
                          width: 32,
                          height: 32,
                        }}>
                          {msg.role === 'user' ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
                        </Avatar>
                      </ListItemAvatar>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.5,
                          maxWidth: '85%',
                          bgcolor: msg.role === 'user' ? 'secondary.light' : 'background.paper',
                        }}
                      >
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {formatDateTime(msg.created_at)}
                        </Typography>
                      </Paper>
                    </ListItem>
                  ))}
                  {loading && (
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          <SmartToy sx={{ fontSize: 18 }} />
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
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                multiline
                maxRows={3}
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
                    <IconButton
                      onClick={handleSendMessage}
                      disabled={loading || !message.trim()}
                      color="primary"
                      size="small"
                    >
                      <Send fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
            </Box>
          </DialogContent>
        </Collapse>
      </Dialog>
    </>
  );
}

export default FloatingAIAssistant;