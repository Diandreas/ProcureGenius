import React, { useState, useRef, useEffect } from 'react';
import {
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
  Slide,
} from '@mui/material';
import {
  Mic,
  Stop,
  Send,
  Close,
  MicOff,
} from '@mui/icons-material';

/**
 * Composant d'enregistrement vocal pour l'assistant IA
 * Permet d'enregistrer un message vocal et de l'envoyer à l'IA
 */
function VoiceRecorder({ onVoiceMessage, onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Démarrer l'enregistrement
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);

        // Arrêter tous les tracks du stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Démarrer le timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Erreur lors de l\'accès au microphone:', err);
      setError('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Envoyer l'audio à l'IA
  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      // Créer un FormData pour envoyer le fichier audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');

      // Appeler l'API de transcription (ex: Whisper API, Google Speech-to-Text, etc.)
      const response = await fetch('/api/v1/ai-assistant/transcribe/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const transcribedText = data.text || data.transcription;

        // Envoyer le texte transcrit à l'IA
        if (onVoiceMessage) {
          onVoiceMessage(transcribedText);
        }

        // Réinitialiser
        setAudioBlob(null);
        setRecordingTime(0);
        if (onClose) onClose();
      } else {
        setError('Erreur lors de la transcription. Réessayez.');
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message vocal:', err);
      setError('Erreur lors de l\'envoi. Vérifiez votre connexion.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Annuler l'enregistrement
  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    setRecordingTime(0);
    setError(null);
    if (onClose) onClose();
  };

  // Nettoyer les timers à la destruction du composant
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Formater le temps d'enregistrement
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: { xs: 70, sm: 20 },
        right: 20,
        zIndex: 1100,
        borderRadius: 3,
        overflow: 'hidden',
        minWidth: 280,
        maxWidth: 320,
      }}
    >
      <Box
        sx={{
          p: 2,
          background: isRecording
            ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
            : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isRecording ? (
            <>
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
              <Typography variant="body2" fontWeight={600}>
                Enregistrement... {formatTime(recordingTime)}
              </Typography>
            </>
          ) : audioBlob ? (
            <Typography variant="body2" fontWeight={600}>
              Message enregistré ({formatTime(recordingTime)})
            </Typography>
          ) : (
            <Typography variant="body2" fontWeight={600}>
              Message vocal à l'IA
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={cancelRecording} sx={{ color: 'white' }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Typography variant="caption" color="error" sx={{ textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {isProcessing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 2 }}>
            <CircularProgress size={40} />
            <Typography variant="caption" color="text.secondary">
              Transcription en cours...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            {!isRecording && !audioBlob && (
              <IconButton
                color="primary"
                onClick={startRecording}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 64,
                  height: 64,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <Mic fontSize="large" />
              </IconButton>
            )}

            {isRecording && (
              <IconButton
                color="error"
                onClick={stopRecording}
                sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  width: 64,
                  height: 64,
                  '&:hover': {
                    bgcolor: 'error.dark',
                  },
                }}
              >
                <Stop fontSize="large" />
              </IconButton>
            )}

            {!isRecording && audioBlob && (
              <>
                <IconButton
                  color="error"
                  onClick={cancelRecording}
                  sx={{
                    bgcolor: 'grey.200',
                    '&:hover': { bgcolor: 'grey.300' },
                  }}
                >
                  <Close />
                </IconButton>
                <IconButton
                  color="success"
                  onClick={sendVoiceMessage}
                  sx={{
                    bgcolor: 'success.main',
                    color: 'white',
                    width: 64,
                    height: 64,
                    '&:hover': {
                      bgcolor: 'success.dark',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Send fontSize="large" />
                </IconButton>
              </>
            )}
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {!isRecording && !audioBlob && 'Appuyez sur le micro pour commencer'}
          {isRecording && 'Parlez maintenant, appuyez sur stop quand vous avez terminé'}
          {!isRecording && audioBlob && 'Envoyez votre message ou annulez'}
        </Typography>
      </Box>
    </Paper>
  );
}

export default VoiceRecorder;
