import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Box,
  Chip,
  Fade,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Lightbulb,
  Close,
  TipsAndUpdates,
  AutoAwesome,
  ArrowForward,
  School
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import * as widgetsAPI from '../../services/widgetsAPI';

const AIProactiveSuggestionsWidget = ({ period = 'last_30_days' }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuggestions();
  }, [period]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await widgetsAPI.getWidgetData('ai_suggestions', { period });
      if (response.success) {
        setSuggestions(response.data.suggestions || []);
        setMessage(response.data.message || '');
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Impossible de charger les suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (suggestionId) => {
    // Retirer la suggestion de la liste
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const handleActionClick = (suggestion) => {
    // Naviguer vers l'URL d'action si disponible
    if (suggestion.action_url) {
      navigate(suggestion.action_url);
    }

    // Retirer la suggestion de la liste
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const getIconByType = (type) => {
    switch (type) {
      case 'learning':
        return <School sx={{ fontSize: 40 }} />;
      case 'feature':
        return <AutoAwesome sx={{ fontSize: 40 }} />;
      case 'best_practice':
        return <TipsAndUpdates sx={{ fontSize: 40 }} />;
      case 'optimization':
        return <Lightbulb sx={{ fontSize: 40 }} />;
      default:
        return <Lightbulb sx={{ fontSize: 40 }} />;
    }
  };

  const getColorByType = (type) => {
    switch (type) {
      case 'learning':
        return '#2196f3'; // Bleu
      case 'feature':
        return '#9c27b0'; // Violet
      case 'best_practice':
        return '#4caf50'; // Vert
      case 'optimization':
        return '#ff9800'; // Orange
      default:
        return '#2196f3';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'learning': 'Apprentissage',
      'feature': 'Nouvelle fonctionnalité',
      'best_practice': 'Bonne pratique',
      'optimization': 'Optimisation'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box textAlign="center" py={3}>
            <AutoAwesome sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {message || 'Aucune suggestion pour le moment'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Nous vous tiendrons informé des nouvelles fonctionnalités!
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const suggestion = suggestions[0]; // Afficher la première suggestion

  return (
    <Fade in>
      <Card
        sx={{
          height: '100%',
          background: `linear-gradient(135deg, ${getColorByType(suggestion.type)}15 0%, ${getColorByType(suggestion.type)}05 100%)`,
          border: `2px solid ${getColorByType(suggestion.type)}40`,
          position: 'relative',
          overflow: 'visible'
        }}
      >
        <IconButton
          onClick={() => handleDismiss(suggestion.id)}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1
          }}
          size="small"
        >
          <Close fontSize="small" />
        </IconButton>

        <CardContent>
          <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
            <Box
              sx={{
                color: getColorByType(suggestion.type),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: `${getColorByType(suggestion.type)}20`,
                flexShrink: 0
              }}
            >
              {getIconByType(suggestion.type)}
            </Box>

            <Box flex={1}>
              <Chip
                label={getTypeLabel(suggestion.type)}
                size="small"
                sx={{
                  backgroundColor: `${getColorByType(suggestion.type)}30`,
                  color: getColorByType(suggestion.type),
                  fontWeight: 600,
                  mb: 1
                }}
              />
              <Typography variant="h6" gutterBottom fontWeight={600}>
                {suggestion.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {suggestion.message}
              </Typography>
            </Box>
          </Box>

          {suggestion.action_label && (
            <Box mt={2}>
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() => handleActionClick(suggestion)}
                fullWidth
                sx={{
                  backgroundColor: getColorByType(suggestion.type),
                  '&:hover': {
                    backgroundColor: getColorByType(suggestion.type),
                    filter: 'brightness(0.9)'
                  }
                }}
              >
                {suggestion.action_label}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Fade>
  );
};

export default AIProactiveSuggestionsWidget;
