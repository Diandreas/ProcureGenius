import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  useTheme,
  alpha,
  Fade,
} from '@mui/material';
import {
  SmartToy,
  CheckCircle,
  Close,
  TrendingUp,
  Warning,
  Lightbulb,
} from '@mui/icons-material';

function ProactiveConversationCard({ conversation, onAccept, onDismiss }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const getIcon = () => {
    const priority = conversation.context_data?.priority || 5;
    if (priority >= 9) return <Warning sx={{ color: '#ef4444', fontSize: 24 }} />;
    if (priority >= 7) return <TrendingUp sx={{ color: '#f59e0b', fontSize: 24 }} />;
    return <Lightbulb sx={{ color: '#3b82f6', fontSize: 24 }} />;
  };

  const getColor = () => {
    const priority = conversation.context_data?.priority || 5;
    if (priority >= 9) return '#ef4444';
    if (priority >= 7) return '#f59e0b';
    return '#3b82f6';
  };

  const color = getColor();

  return (
    <Fade in timeout={400}>
      <Card
        sx={{
          mb: 2,
          border: `2px solid ${alpha(color, 0.3)}`,
          bgcolor: alpha(color, 0.05),
          borderRadius: 2,
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: color,
            boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
            transform: 'translateY(-2px)',
          },
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: alpha(color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getIcon()}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {conversation.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {conversation.starter_message}
              </Typography>
              {conversation.context_data?.analysis_context && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {Object.entries(conversation.context_data.analysis_context).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: alpha(color, 0.1),
                        color: color,
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Close />}
              onClick={() => onDismiss(conversation.id)}
              sx={{
                flex: 1,
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'error.main',
                  bgcolor: alpha(theme.palette.error.main, 0.05),
                },
              }}
            >
              Ignorer
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => onAccept(conversation.id)}
              sx={{
                flex: 2,
                bgcolor: color,
                '&:hover': {
                  bgcolor: alpha(color, 0.8),
                },
              }}
            >
              Démarrer conversation
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Fade>
  );
}

export default ProactiveConversationCard;

