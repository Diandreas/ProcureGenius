import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Button,
  Chip,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Fade,
  Slide,
  Collapse,
} from '@mui/material';
import {
  Person,
  SmartToy,
  OpenInNew,
  Download,
  PlayArrow,
  Refresh,
  CheckCircle,
  Error,
  ContentCopy,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';
import { formatDateTime } from '../../utils/formatters';

/**
 * Composant de message de chat IA avancé avec animations et actions
 */
function ChatMessage({
  message,
  isTyping = false,
  onQuickAction,
  onFeedback,
}) {
  const [showActions, setShowActions] = useState(false);
  const [animatingText, setAnimatingText] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  const isUser = message.role === 'user';
  const isAI = message.role === 'assistant';

  // Animation de frappe pour les messages IA
  useEffect(() => {
    if (isAI && message.content && !isTyping) {
      setCurrentCharIndex(0);
      setAnimatingText('');

      const animateTyping = () => {
        const text = message.content;
        const delay = 20; // ms entre chaque caractère

        for (let i = 0; i <= text.length; i++) {
          setTimeout(() => {
            setAnimatingText(text.slice(0, i));
            setCurrentCharIndex(i);

            if (i === text.length) {
              setShowActions(true);
            }
          }, i * delay);
        }
      };

      const timer = setTimeout(animateTyping, 500);
      return () => clearTimeout(timer);
    } else if (isAI) {
      setAnimatingText(message.content || '');
      setShowActions(true);
    }
  }, [message.content, isAI, isTyping]);

  const handleActionClick = (action) => {
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
  };

  const renderTypingIndicator = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          '& > div': {
            width: 8,
            height: 8,
            backgroundColor: 'primary.main',
            borderRadius: '50%',
            animation: 'typing 1.4s infinite ease-in-out',
            '&:nth-of-type(1)': { animationDelay: '0s' },
            '&:nth-of-type(2)': { animationDelay: '0.2s' },
            '&:nth-of-type(3)': { animationDelay: '0.4s' },
          },
          '@keyframes typing': {
            '0%, 80%, 100%': {
              transform: 'scale(0.8)',
              opacity: 0.5,
            },
            '40%': {
              transform: 'scale(1.2)',
              opacity: 1,
            },
          },
        }}
      >
        <Box />
        <Box />
        <Box />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        L'IA réfléchit...
      </Typography>
    </Box>
  );

  const renderActionButton = (action) => {
    const getIcon = () => {
      switch (action.type) {
        case 'redirect_option': return <OpenInNew fontSize="small" />;
        case 'file_action': return <Download fontSize="small" />;
        case 'quick_action': return <PlayArrow fontSize="small" />;
        case 'refresh_data': return <Refresh fontSize="small" />;
        default: return <PlayArrow fontSize="small" />;
      }
    };

    const getColor = () => {
      switch (action.type) {
        case 'redirect_option': return 'primary';
        case 'file_action': return 'success';
        case 'quick_action': return 'secondary';
        default: return 'default';
      }
    };

    return (
      <Button
        key={action.type + action.label}
        size="small"
        variant="outlined"
        color={getColor()}
        startIcon={getIcon()}
        onClick={() => handleActionClick(action)}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          minWidth: 'auto',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 2,
          },
          transition: 'all 0.2s ease',
        }}
      >
        {action.label}
      </Button>
    );
  };

  const renderSuccessActions = () => {
    if (!message.success_actions || message.success_actions.length === 0) {
      return null;
    }

    return (
      <Collapse in={showActions}>
        <Card variant="outlined" sx={{ mt: 1, backgroundColor: 'action.hover' }}>
          <CardContent sx={{ py: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Actions disponibles :
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {message.success_actions.map(renderActionButton)}
            </Box>
          </CardContent>
        </Card>
      </Collapse>
    );
  };

  const renderProcessingStatus = () => {
    if (!message.processing) return null;

    return (
      <Box sx={{ mt: 1 }}>
        <LinearProgress
          variant={message.processing.progress ? "determinate" : "indeterminate"}
          value={message.processing.progress || 0}
          sx={{ borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {message.processing.status || 'Traitement en cours...'}
        </Typography>
      </Box>
    );
  };

  if (isTyping) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        mb: 2
      }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32 }}>
          <SmartToy sx={{ fontSize: 18 }} />
        </Avatar>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            maxWidth: '80%',
            backgroundColor: 'background.paper',
            borderRadius: 3,
          }}
        >
          {renderTypingIndicator()}
        </Paper>
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={300}>
      <Box sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-start',
        mb: 2
      }}>
        {!isUser && (
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32 }}>
            <SmartToy sx={{ fontSize: 18 }} />
          </Avatar>
        )}

        <Box sx={{ maxWidth: '80%' }}>
          <Paper
            elevation={isUser ? 1 : 2}
            sx={{
              p: 2,
              backgroundColor: isUser ? 'primary.main' : 'background.paper',
              color: isUser ? 'primary.contrastText' : 'text.primary',
              borderRadius: 3,
              position: 'relative',
              '&::before': isUser ? {} : {
                content: '""',
                position: 'absolute',
                left: -6,
                top: 12,
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderWidth: '6px 6px 6px 0',
                borderColor: 'transparent #fff transparent transparent',
              },
            }}
          >
            {/* Statut de résultat */}
            {message.status && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {message.status === 'success' ? (
                  <CheckCircle color="success" fontSize="small" />
                ) : (
                  <Error color="error" fontSize="small" />
                )}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {message.status === 'success' ? 'Succès' : 'Erreur'}
                </Typography>
              </Box>
            )}

            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
              }}
            >
              {isAI ? animatingText : message.content}
              {isAI && currentCharIndex < message.content?.length && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: 2,
                    height: 16,
                    backgroundColor: 'primary.main',
                    animation: 'blink 1s infinite',
                    '@keyframes blink': {
                      '0%, 50%': { opacity: 1 },
                      '51%, 100%': { opacity: 0 },
                    },
                  }}
                />
              )}
            </Typography>

            {renderProcessingStatus()}

            {/* Actions de message */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1
            }}>
              <Typography variant="caption" color={isUser ? 'inherit' : 'text.secondary'}>
                {formatDateTime(message.created_at)}
              </Typography>

              {!isUser && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={handleCopyMessage}
                    sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>

                  {onFeedback && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => onFeedback(message.id, 'positive')}
                        sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                      >
                        <ThumbUp fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onFeedback(message.id, 'negative')}
                        sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                      >
                        <ThumbDown fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              )}
            </Box>
          </Paper>

          {/* Actions de suivi */}
          {renderSuccessActions()}
        </Box>

        {isUser && (
          <Avatar sx={{ bgcolor: 'secondary.main', ml: 2, width: 32, height: 32 }}>
            <Person sx={{ fontSize: 18 }} />
          </Avatar>
        )}
      </Box>
    </Fade>
  );
}

export default ChatMessage;