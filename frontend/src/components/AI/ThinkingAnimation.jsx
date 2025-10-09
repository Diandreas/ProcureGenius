import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  Fade,
  Slide,
} from '@mui/material';
import {
  SmartToy,
  Psychology,
  AutoAwesome,
  Lightbulb,
} from '@mui/icons-material';
import Mascot from '../Mascot';

const THINKING_MESSAGES = [
  "Je réfléchis à votre demande...",
  "Analyse des informations en cours...",
  "Recherche de la meilleure solution...",
  "Préparation de la réponse...",
  "Vérification des données...",
  "Finalisation du traitement...",
];

const PROCESSING_STEPS = [
  "Validation des données",
  "Recherche d'informations",
  "Analyse contextuelle",
  "Génération de la réponse",
  "Vérification qualité",
  "Finalisation"
];

/**
 * Composant d'animation de réflexion IA avec différents modes
 */
function ThinkingAnimation({
  type = 'typing', // 'typing', 'processing', 'analyzing', 'celebration'
  message = null,
  progress = null,
  duration = 3000,
  onComplete = null,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [dots, setDots] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let intervals = [];

    if (type === 'typing') {
      // Animation des points de frappe
      const dotsInterval = setInterval(() => {
        setDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);
      intervals.push(dotsInterval);

      // Rotation des messages
      const messageInterval = setInterval(() => {
        setCurrentMessage(THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)]);
      }, 2000);
      intervals.push(messageInterval);

      setCurrentMessage(THINKING_MESSAGES[0]);
    }

    if (type === 'processing') {
      // Animation des étapes
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          const next = (prev + 1) % PROCESSING_STEPS.length;
          return next;
        });
      }, 800);
      intervals.push(stepInterval);
    }

    // Auto-complete
    if (duration > 0 && onComplete) {
      const completeTimeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
      }, duration);
      intervals.push(completeTimeout);
    }

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [type, duration, onComplete]);

  const renderTypingAnimation = () => (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 3,
      backgroundColor: 'background.paper',
      borderRadius: 3,
      boxShadow: 1,
    }}>
      <Box sx={{ position: 'relative' }}>
        <Mascot
          pose="thinking"
          animation="pulse"
          size={48}
        />
        <AutoAwesome
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            fontSize: 12,
            color: 'warning.main',
            animation: 'sparkle 1.5s infinite',
            '@keyframes sparkle': {
              '0%, 100%': { opacity: 0, transform: 'scale(0.5)' },
              '50%': { opacity: 1, transform: 'scale(1)' },
            },
          }}
        />
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {currentMessage}{dots}
        </Typography>

        <Box sx={{
          display: 'flex',
          gap: 0.5,
          mt: 1,
          '& > div': {
            width: 6,
            height: 6,
            backgroundColor: 'primary.main',
            borderRadius: '50%',
            animation: 'bounce 1.4s infinite ease-in-out',
            '&:nth-of-type(1)': { animationDelay: '0s' },
            '&:nth-of-type(2)': { animationDelay: '0.2s' },
            '&:nth-of-type(3)': { animationDelay: '0.4s' },
          },
          '@keyframes bounce': {
            '0%, 80%, 100%': {
              transform: 'scale(0.8)',
              opacity: 0.5,
            },
            '40%': {
              transform: 'scale(1.2)',
              opacity: 1,
            },
          },
        }}>
          <Box />
          <Box />
          <Box />
        </Box>
      </Box>
    </Box>
  );

  const renderProcessingAnimation = () => (
    <Box sx={{
      p: 3,
      backgroundColor: 'background.paper',
      borderRadius: 3,
      boxShadow: 1,
      minWidth: 300,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Psychology
          sx={{
            fontSize: 28,
            color: 'secondary.main',
            animation: 'rotate 3s linear infinite',
            '@keyframes rotate': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
        <Typography variant="h6" color="secondary">
          Traitement en cours
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <LinearProgress
          variant={progress !== null ? "determinate" : "indeterminate"}
          value={progress || (currentStep / PROCESSING_STEPS.length) * 100}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'action.hover',
          }}
        />
      </Box>

      <Typography variant="body2" color="text.secondary">
        Étape {currentStep + 1}/{PROCESSING_STEPS.length}: {PROCESSING_STEPS[currentStep]}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        {PROCESSING_STEPS.map((_, index) => (
          <Box
            key={index}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: index <= currentStep ? 'primary.main' : 'action.disabled',
              mx: 0.5,
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </Box>
    </Box>
  );

  const renderAnalyzingAnimation = () => (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      p: 3,
      backgroundColor: 'background.paper',
      borderRadius: 3,
      boxShadow: 1,
    }}>
      <Box sx={{ position: 'relative' }}>
        <CircularProgress
          size={48}
          thickness={2}
          sx={{ color: 'warning.main' }}
        />
        <Lightbulb
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 20,
            color: 'warning.main',
            animation: 'glow 2s infinite',
            '@keyframes glow': {
              '0%, 100%': { opacity: 0.5 },
              '50%': { opacity: 1, filter: 'drop-shadow(0 0 5px currentColor)' },
            },
          }}
        />
      </Box>

      <Typography variant="body1" align="center">
        {message || "Analyse approfondie en cours..."}
      </Typography>

      <Typography variant="caption" color="text.secondary">
        Cela peut prendre quelques instants
      </Typography>
    </Box>
  );

  const renderCelebrationAnimation = () => (
    <Slide direction="up" in={isVisible}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        backgroundColor: 'success.light',
        borderRadius: 3,
        color: 'success.contrastText',
      }}>
        <Mascot
          pose="excited"
          animation="bounce"
          size={40}
        />
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {message || "Action terminée avec succès !"}
        </Typography>
      </Box>
    </Slide>
  );

  const getAnimation = () => {
    switch (type) {
      case 'processing': return renderProcessingAnimation();
      case 'analyzing': return renderAnalyzingAnimation();
      case 'celebration': return renderCelebrationAnimation();
      default: return renderTypingAnimation();
    }
  };

  return (
    <Fade in={isVisible} timeout={300}>
      <Box>
        {getAnimation()}
      </Box>
    </Fade>
  );
}

export default ThinkingAnimation;