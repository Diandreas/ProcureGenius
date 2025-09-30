# ⚛️ Étapes 6 & 7 : Frontend - FloatingAIAssistant & Composants UI

## 🎯 Objectif

Créer une interface utilisateur complète pour l'assistant IA avec :
- Chat conversationnel
- Gestion des function calls
- Upload de documents
- Affichage des résultats d'actions
- Animations et feedback utilisateur

---

## 📁 Structure des Fichiers

```
frontend/src/components/AI/
├── FloatingAIAssistant.jsx       (Composant principal - MAJ)
├── ChatMessage.jsx               (Nouveau)
├── ThinkingAnimation.jsx         (Nouveau)
├── QuickActionsPanel.jsx         (Nouveau)
├── ActionResultCard.jsx          (Nouveau)
├── DocumentUploader.jsx          (Nouveau)
└── styles/
    └── AIComponents.css          (Nouveau)
```

---

## 🔧 Étape 6 : FloatingAIAssistant.jsx (Version Complète)

### Remplacer le fichier existant par :

```jsx
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
  CircularProgress,
  Chip,
  Divider,
  Button,
  Badge,
} from '@mui/material';
import {
  SmartToy,
  Send,
  Close,
  Minimize,
  AttachFile,
  ImageOutlined,
  MicNone,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { aiChatAPI } from '../../services/api';

// Importer les nouveaux composants
import ChatMessage from './ChatMessage';
import ThinkingAnimation from './ThinkingAnimation';
import QuickActionsPanel from './QuickActionsPanel';
import ActionResultCard from './ActionResultCard';
import DocumentUploader from './DocumentUploader';

function FloatingAIAssistant({
  isVisible = true,
  contextData = null,
  onActionExecuted = null,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // États
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // États pour les fonctionnalités avancées
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [quickActions, setQuickActions] = useState([]);
  const [thinkingType, setThinkingType] = useState('typing');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showDocumentUploader, setShowDocumentUploader] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Message d'accueil contextuel
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

  // Initialisation
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Ajouter le message de bienvenue
      setMessages([{
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date().toISOString(),
      }]);
      fetchQuickActions();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Notifier si nouveau message quand minimisé
  useEffect(() => {
    if (isMinimized && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setUnreadCount(prev => prev + 1);
      }
    } else {
      setUnreadCount(0);
    }
  }, [messages, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchQuickActions = async () => {
    try {
      const category = contextData?.page;
      const response = await aiChatAPI.getQuickActions(category);
      const actions = response.data.actions || response.data || [];
      setQuickActions(actions);
    } catch (error) {
      console.error('Error fetching quick actions:', error);
    }
  };

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || message;
    if (!textToSend.trim() && !uploadedFile) return;

    // Ajouter le message utilisateur
    const userMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
      hasFile: !!uploadedFile,
      fileName: uploadedFile?.name,
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setShowQuickActions(false);
    setThinkingType('typing');

    try {
      let response;

      // Si fichier uploadé, utiliser l'endpoint d'analyse de document
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('message', textToSend);
        formData.append('conversation_id', conversationId || '');

        response = await aiChatAPI.analyzeDocument(formData);
        setUploadedFile(null);
        setShowDocumentUploader(false);
      } else {
        // Chat normal
        response = await aiChatAPI.sendMessage({
          message: textToSend,
          conversation_id: conversationId,
          context: contextData,
        });
      }

      // Sauvegarder l'ID de conversation
      if (response.data.conversation_id && !conversationId) {
        setConversationId(response.data.conversation_id);
      }

      // Ajouter la réponse de l'IA
      const aiMessage = {
        role: 'assistant',
        content: response.data.response || response.data.message,
        timestamp: new Date().toISOString(),
        tool_calls: response.data.tool_calls,
        action_result: response.data.action_result,
        success_actions: response.data.success_actions,
      };

      setMessages(prev => [...prev, aiMessage]);

      // Si une action a été exécutée, notifier le parent
      if (onActionExecuted && response.data.action_result) {
        onActionExecuted(response.data.action_result);
      }

      // Afficher notification si demandé
      if (response.data.action_result?.success) {
        enqueueSnackbar(
          response.data.action_result.message || 'Action exécutée avec succès',
          { variant: 'success' }
        );
      }

    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage = {
        role: 'assistant',
        content: "Désolé, j'ai rencontré une erreur. Veuillez réessayer.",
        timestamp: new Date().toISOString(),
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);

      enqueueSnackbar('Erreur lors de l\'envoi du message', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    handleSendMessage(action);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        enqueueSnackbar('Type de fichier non supporté', { variant: 'warning' });
        return;
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        enqueueSnackbar('Fichier trop volumineux (max 10MB)', { variant: 'warning' });
        return;
      }

      setUploadedFile(file);
      setShowDocumentUploader(true);
      setMessage(`Analyser ce document : ${file.name}`);
    }
  };

  const handleClearConversation = () => {
    setMessages([{
      role: 'assistant',
      content: getWelcomeMessage(),
      timestamp: new Date().toISOString(),
    }]);
    setConversationId(null);
    setShowQuickActions(true);
  };

  return (
    <>
      {/* Bouton flottant */}
      {isVisible && !isOpen && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
          onClick={() => setIsOpen(true)}
        >
          <Badge badgeContent={unreadCount} color="error">
            <SmartToy />
          </Badge>
        </Fab>
      )}

      {/* Dialog principal */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            position: 'fixed',
            bottom: isMinimized ? -500 : 24,
            right: 24,
            m: 0,
            maxHeight: isMinimized ? 60 : '80vh',
            height: isMinimized ? 60 : 600,
            transition: 'all 0.3s ease',
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'white',
            py: 1,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <SmartToy />
            <Typography variant="h6">ProcureGenius Assistant</Typography>
            {contextData?.page && (
              <Chip
                label={contextData.page}
                size="small"
                sx={{ bgcolor: 'primary.light' }}
              />
            )}
          </Box>
          <Box>
            <IconButton size="small" onClick={() => setIsMinimized(!isMinimized)} sx={{ color: 'white' }}>
              <Minimize />
            </IconButton>
            <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Contenu */}
        {!isMinimized && (
          <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Quick Actions Panel */}
            {showQuickActions && quickActions.length > 0 && (
              <QuickActionsPanel
                actions={quickActions}
                onActionClick={handleQuickAction}
              />
            )}

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'grey.50' }}>
              <List>
                {messages.map((msg, index) => (
                  <ChatMessage
                    key={index}
                    message={msg}
                    onActionClick={handleQuickAction}
                  />
                ))}

                {/* Indicateur de chargement */}
                {loading && <ThinkingAnimation type={thinkingType} />}

                <div ref={messagesEndRef} />
              </List>
            </Box>

            {/* Document Uploader */}
            {showDocumentUploader && uploadedFile && (
              <DocumentUploader
                file={uploadedFile}
                onRemove={() => {
                  setUploadedFile(null);
                  setShowDocumentUploader(false);
                  setMessage('');
                }}
              />
            )}

            <Divider />

            {/* Input Zone */}
            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Box display="flex" gap={1} alignItems="center">
                {/* Bouton Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  color="primary"
                  size="small"
                >
                  <ImageOutlined />
                </IconButton>

                {/* TextField */}
                <TextField
                  fullWidth
                  variant="outlined"
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
                  size="small"
                  multiline
                  maxRows={3}
                />

                {/* Bouton Envoyer */}
                <IconButton
                  color="primary"
                  onClick={() => handleSendMessage()}
                  disabled={loading || (!message.trim() && !uploadedFile)}
                >
                  {loading ? <CircularProgress size={24} /> : <Send />}
                </IconButton>
              </Box>

              {/* Actions secondaires */}
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {conversationId ? `Conversation active` : 'Nouvelle conversation'}
                </Typography>
                {messages.length > 1 && (
                  <Button
                    size="small"
                    onClick={handleClearConversation}
                    sx={{ textTransform: 'none' }}
                  >
                    Nouvelle conversation
                  </Button>
                )}
              </Box>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

export default FloatingAIAssistant;
```

---

## 🔧 Étape 7 : Composants UI

### 1. ChatMessage.jsx

```jsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Person,
  SmartToy,
  CheckCircle,
  Error,
  OpenInNew,
  PlayArrow,
} from '@mui/icons-material';
import { formatDateTime } from '../../utils/formatters';
import ActionResultCard from './ActionResultCard';
import ReactMarkdown from 'react-markdown';

function ChatMessage({ message, onActionClick }) {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: 1,
          maxWidth: '80%',
        }}
      >
        {/* Avatar */}
        <Avatar
          sx={{
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
            width: 32,
            height: 32,
          }}
        >
          {isUser ? <Person fontSize="small" /> : <SmartToy fontSize="small" />}
        </Avatar>

        {/* Message Content */}
        <Box sx={{ flex: 1 }}>
          <Paper
            elevation={1}
            sx={{
              p: 1.5,
              bgcolor: isUser ? 'primary.light' : isError ? 'error.light' : 'background.paper',
              color: isUser ? 'primary.contrastText' : 'text.primary',
            }}
          >
            {/* Fichier uploadé */}
            {message.hasFile && (
              <Chip
                label={message.fileName}
                size="small"
                sx={{ mb: 1 }}
                icon={<AttachFile />}
              />
            )}

            {/* Texte du message */}
            <Typography variant="body2" component="div">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </Typography>

            {/* Tool Calls (si présents) */}
            {message.tool_calls && message.tool_calls.length > 0 && (
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  Actions exécutées :
                </Typography>
                {message.tool_calls.map((tool, idx) => (
                  <Chip
                    key={idx}
                    label={tool.function}
                    size="small"
                    sx={{ ml: 0.5, mt: 0.5 }}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}

            {/* Résultat d'action */}
            {message.action_result && (
              <ActionResultCard
                result={message.action_result}
                successActions={message.success_actions}
                onActionClick={onActionClick}
              />
            )}
          </Paper>

          {/* Timestamp */}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {formatDateTime(message.timestamp)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default ChatMessage;
```

### 2. ThinkingAnimation.jsx

```jsx
import React from 'react';
import { Box, Typography, LinearProgress, CircularProgress } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

const bounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
`;

const Dot = styled('span')(({ delay }) => ({
  display: 'inline-block',
  width: 8,
  height: 8,
  margin: '0 2px',
  backgroundColor: '#1976d2',
  borderRadius: '50%',
  animation: `${bounce} 1.4s infinite ease-in-out`,
  animationDelay: delay,
}));

function ThinkingAnimation({ type = 'typing', message = null }) {
  const defaultMessages = {
    typing: 'Je réfléchis...',
    analyzing: 'Analyse en cours...',
    processing: 'Traitement de votre demande...',
    searching: 'Recherche des informations...',
  };

  const displayMessage = message || defaultMessages[type] || 'Chargement...';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        bgcolor: 'grey.100',
        borderRadius: 1,
        my: 1,
      }}
    >
      {type === 'typing' && (
        <Box>
          <Dot delay="0s" />
          <Dot delay="0.2s" />
          <Dot delay="0.4s" />
        </Box>
      )}

      {type === 'processing' && <CircularProgress size={20} />}

      {type === 'analyzing' && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      )}

      <Typography variant="body2" color="text.secondary">
        {displayMessage}
      </Typography>
    </Box>
  );
}

export default ThinkingAnimation;
```

### 3. QuickActionsPanel.jsx

```jsx
import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import {
  Add,
  Search,
  Assessment,
  Description,
} from '@mui/icons-material';

const iconMap = {
  create: <Add fontSize="small" />,
  search: <Search fontSize="small" />,
  stats: <Assessment fontSize="small" />,
  document: <Description fontSize="small" />,
};

function QuickActionsPanel({ actions, onActionClick }) {
  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Actions rapides :
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1}>
        {actions.map((action, index) => (
          <Chip
            key={index}
            label={action.label || action}
            onClick={() => onActionClick(action.label || action)}
            icon={iconMap[action.type] || iconMap.create}
            color="primary"
            variant="outlined"
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default QuickActionsPanel;
```

### 4. ActionResultCard.jsx

```jsx
import React from 'react';
import { Box, Card, CardContent, Typography, Button, Chip, Divider } from '@mui/material';
import { CheckCircle, Error, OpenInNew, PlayArrow } from '@mui/icons-material';

function ActionResultCard({ result, successActions, onActionClick }) {
  if (!result) return null;

  const isSuccess = result.success;

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 2,
        bgcolor: isSuccess ? 'success.light' : 'error.light',
        borderColor: isSuccess ? 'success.main' : 'error.main',
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        {/* En-tête */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          {isSuccess ? (
            <CheckCircle color="success" fontSize="small" />
          ) : (
            <Error color="error" fontSize="small" />
          )}
          <Typography variant="body2" fontWeight="bold">
            {result.message || (isSuccess ? 'Action réussie' : 'Erreur')}
          </Typography>
        </Box>

        {/* Données créées */}
        {result.data && (
          <Box sx={{ mb: 1 }}>
            {Object.entries(result.data).map(([key, value]) => {
              // Ignorer certains champs
              if (['id', 'entity_type'].includes(key)) return null;

              return (
                <Typography key={key} variant="caption" display="block">
                  <strong>{key}:</strong> {value}
                </Typography>
              );
            })}
          </Box>
        )}

        {/* Actions de suivi */}
        {successActions && successActions.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Actions disponibles :
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {successActions.map((action, index) => {
                if (action.type === 'redirect_option') {
                  return (
                    <Button
                      key={index}
                      size="small"
                      startIcon={<OpenInNew />}
                      href={action.url}
                      target="_blank"
                      sx={{ textTransform: 'none' }}
                    >
                      {action.label}
                    </Button>
                  );
                }

                if (action.type === 'quick_action') {
                  return (
                    <Chip
                      key={index}
                      label={action.label}
                      size="small"
                      icon={<PlayArrow />}
                      onClick={() => onActionClick && onActionClick(action.label)}
                      clickable
                    />
                  );
                }

                return null;
              })}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ActionResultCard;
```

### 5. DocumentUploader.jsx

```jsx
import React from 'react';
import { Box, Paper, Typography, IconButton, Chip } from '@mui/material';
import { Close, Description, Image } from '@mui/icons-material';

function DocumentUploader({ file, onRemove }) {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const fileSize = (file.size / 1024).toFixed(2) + ' KB';

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mx: 2,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: 'primary.light',
      }}
    >
      {/* Icône */}
      {isImage ? (
        <Image color="primary" fontSize="large" />
      ) : (
        <Description color="primary" fontSize="large" />
      )}

      {/* Info fichier */}
      <Box flex={1}>
        <Typography variant="body2" fontWeight="bold">
          {file.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fileSize} • {file.type}
        </Typography>
      </Box>

      {/* Chip & Bouton supprimer */}
      <Chip label="À analyser" size="small" color="primary" />
      <IconButton size="small" onClick={onRemove}>
        <Close />
      </IconButton>
    </Paper>
  );
}

export default DocumentUploader;
```

---

## 📡 API Service - Mettre à jour `api.js`

Ajouter dans `frontend/src/services/api.js` :

```javascript
export const aiChatAPI = {
  sendMessage: (data) => axios.post('/api/v1/ai/chat/', data),

  getQuickActions: (category) =>
    axios.get('/api/v1/ai/quick-actions/', { params: { category } }),

  analyzeDocument: (formData) =>
    axios.post('/api/v1/ai/analyze-document/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  getConversationHistory: (conversationId) =>
    axios.get(`/api/v1/ai/conversations/${conversationId}/history/`),
};
```

---

## ✅ Checklist d'Implémentation

### Frontend
- [ ] Créer dossier `frontend/src/components/AI/`
- [ ] Remplacer `FloatingAIAssistant.jsx` par la nouvelle version
- [ ] Créer `ChatMessage.jsx`
- [ ] Créer `ThinkingAnimation.jsx`
- [ ] Créer `QuickActionsPanel.jsx`
- [ ] Créer `ActionResultCard.jsx`
- [ ] Créer `DocumentUploader.jsx`
- [ ] Mettre à jour `api.js` avec les nouveaux endpoints
- [ ] Installer `react-markdown` : `npm install react-markdown`

### Backend (views.py)
- [ ] Ajouter `QuickActionsView`
- [ ] S'assurer que `ChatView` retourne `tool_calls` et `success_actions`
- [ ] Tester les endpoints

---

## 🧪 Tests Rapides

1. **Ouvrir l'assistant** : Cliquer sur le bouton flottant
2. **Tester quick actions** : Cliquer sur une action rapide
3. **Envoyer un message** : "Crée un fournisseur Test Corp"
4. **Uploader un document** : Cliquer sur l'icône image et uploader une facture
5. **Vérifier les animations** : Observer les animations de chargement
6. **Tester les actions de suivi** : Cliquer sur "Voir le fournisseur" après création

---

## 🎨 Personnalisation

Modifier les couleurs dans `theme` :
```javascript
primary: { main: '#1976d2' },  // Bleu
secondary: { main: '#dc004e' }, // Rouge
```

---

**Prochaine étape :** Gestion du contexte conversationnel et workflows.
