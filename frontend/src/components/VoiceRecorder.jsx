import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Fade,
  Chip,
} from '@mui/material';
import {
  Mic,
  Stop,
  Send,
  Close,
} from '@mui/icons-material';

/**
 * Composant d'enregistrement vocal avec transcription en temps réel
 * Utilise Web Speech API pour la reconnaissance vocale en temps réel
 */
function VoiceRecorder({ onVoiceMessage, onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);

  useEffect(() => {
    // Vérifier si l'API Web Speech est supportée
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('La reconnaissance vocale n\'est pas supportée par votre navigateur. Utilisez Chrome, Edge ou Safari.');
      return;
    }

    // Initialiser la reconnaissance vocale
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Continue d'écouter
    recognition.interimResults = true; // Résultats en temps réel
    recognition.lang = 'fr-FR'; // Français
    recognition.maxAlternatives = 1;

    // Événement: résultat de la transcription
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setTranscript((prev) => prev + final);
      }
      setInterimTranscript(interim);
    };

    // Événement: erreur
    recognition.onerror = (event) => {
      console.error('Erreur de reconnaissance vocale:', event.error);
      if (event.error === 'no-speech') {
        setError('Aucune parole détectée. Parlez plus fort.');
      } else if (event.error === 'not-allowed') {
        setError('Permission d\'accès au microphone refusée.');
      } else {
        setError(`Erreur: ${event.error}`);
      }
      setIsListening(false);
    };

    // Événement: fin de reconnaissance
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Démarrer l'écoute
  const startListening = () => {
    if (!recognitionRef.current) return;

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setIsListening(true);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Erreur au démarrage:', err);
      setError('Impossible de démarrer l\'écoute.');
      setIsListening(false);
    }
  };

  // Arrêter l'écoute
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  // Envoyer le message
  const handleSend = () => {
    const fullText = transcript.trim();
    if (fullText && onVoiceMessage) {
      onVoiceMessage(fullText);
      onClose();
    }
  };

  // Annuler
  const handleCancel = () => {
    stopListening();
    onClose();
  };

  const displayText = transcript + (interimTranscript ? ' ' + interimTranscript : '');

  if (!isSupported) {
    return (
      <Fade in>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 20 },
            right: { xs: '50%', sm: 20 },
            transform: { xs: 'translateX(50%)', sm: 'none' },
            zIndex: 1300,
            borderRadius: 3,
            overflow: 'hidden',
            maxWidth: { xs: '90%', sm: 360 },
            width: { xs: 'auto', sm: 360 },
          }}
        >
          <Box sx={{ p: 2, bgcolor: 'error.main', color: 'white' }}>
            <Typography variant="body2" fontWeight={600}>
              ❌ Fonctionnalité non supportée
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <IconButton onClick={handleCancel} size="small" color="primary">
              <Close />
            </IconButton>
          </Box>
        </Paper>
      </Fade>
    );
  }

  return (
    <Fade in>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, sm: 20 },
          right: { xs: '50%', sm: 20 },
          transform: { xs: 'translateX(50%)', sm: 'none' },
          zIndex: 1300,
          borderRadius: 3,
          overflow: 'hidden',
          maxWidth: { xs: '90%', sm: 400 },
          width: { xs: 'auto', sm: 400 },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            background: isListening
              ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
              : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isListening && (
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: 'white',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.5, transform: 'scale(1.2)' },
                  },
                }}
              />
            )}
            <Typography variant="body2" fontWeight={600}>
              {isListening ? '🎤 Écoute en cours...' : '🎤 Message vocal'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCancel} sx={{ color: 'white' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Transcription */}
        <Box sx={{ p: 2, minHeight: 120, maxHeight: 300, overflow: 'auto' }}>
          {error && (
            <Chip
              label={error}
              color="error"
              size="small"
              onDelete={() => setError(null)}
              sx={{ mb: 2 }}
            />
          )}

          {displayText ? (
            <Typography
              variant="body2"
              sx={{
                color: 'text.primary',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {transcript}
              {interimTranscript && (
                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  {' ' + interimTranscript}
                </span>
              )}
            </Typography>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', py: 4 }}
            >
              {isListening
                ? 'Parlez maintenant...'
                : 'Appuyez sur le micro pour commencer'}
            </Typography>
          )}
        </Box>

        {/* Actions */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          {!isListening ? (
            <>
              <IconButton
                color="primary"
                onClick={startListening}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 56,
                  height: 56,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <Mic fontSize="large" />
              </IconButton>
              {transcript && (
                <IconButton
                  color="success"
                  onClick={handleSend}
                  sx={{
                    bgcolor: 'success.main',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': {
                      bgcolor: 'success.dark',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Send fontSize="large" />
                </IconButton>
              )}
            </>
          ) : (
            <IconButton
              color="error"
              onClick={stopListening}
              sx={{
                bgcolor: 'error.main',
                color: 'white',
                width: 56,
                height: 56,
                '&:hover': {
                  bgcolor: 'error.dark',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <Stop fontSize="large" />
            </IconButton>
          )}
        </Box>

        {/* Info */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
            {isListening
              ? 'La transcription se fait en temps réel'
              : transcript
              ? 'Cliquez sur Envoyer pour utiliser ce texte'
              : 'Reconnaissance vocale en temps réel - Chrome, Edge, Safari'}
          </Typography>
        </Box>
      </Paper>
    </Fade>
  );
}

export default VoiceRecorder;
