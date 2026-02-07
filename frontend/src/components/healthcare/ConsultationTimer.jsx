import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Stack,
  alpha
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const ConsultationTimer = ({ onStart, onEnd, initialStartTime = null, initialEndTime = null, compact = false }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Si déjà démarrée, calculer le temps écoulé
    if (startTime && !endTime) {
      setIsRunning(true);
      const start = new Date(startTime);
      const now = new Date();
      const elapsed = Math.floor((now - start) / 1000);
      setElapsedSeconds(elapsed);
    } else if (startTime && endTime) {
      // Consultation terminée
      const start = new Date(startTime);
      const end = new Date(endTime);
      const elapsed = Math.floor((end - start) / 1000);
      setElapsedSeconds(elapsed);
    }
  }, [startTime, endTime]);

  useEffect(() => {
    if (isRunning && !endTime) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, endTime]);

  const handleStart = () => {
    const now = new Date().toISOString();
    setStartTime(now);
    setIsRunning(true);
    setElapsedSeconds(0);
    if (onStart) onStart(now);
  };

  const handleStop = () => {
    const now = new Date().toISOString();
    setEndTime(now);
    setIsRunning(false);
    if (onEnd) onEnd(now);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = () => {
    if (endTime) return 'success';
    if (isRunning) return 'error';
    return 'default';
  };

  const getStatusText = () => {
    if (endTime) return 'Terminée';
    if (isRunning) return 'En cours';
    return 'Non démarrée';
  };

  // Compact version for show view
  if (compact) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 1,
          background: theme => endTime
            ? alpha(theme.palette.success.main, 0.05)
            : isRunning
              ? alpha(theme.palette.error.main, 0.05)
              : alpha(theme.palette.grey[500], 0.05),
          border: '1px solid',
          borderColor: endTime
            ? 'success.main'
            : isRunning
              ? 'error.main'
              : 'divider',
          borderRadius: 1
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TimerIcon sx={{ fontSize: 16, color: isRunning ? 'error.main' : endTime ? 'success.main' : 'text.secondary' }} />
            <Typography
              variant="body2"
              fontWeight="700"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: endTime ? 'success.main' : isRunning ? 'error.main' : 'text.primary'
              }}
            >
              {formatTime(elapsedSeconds)}
            </Typography>
          </Stack>
          <Chip
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        </Stack>
      </Paper>
    );
  }

  // Full version for form view
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        background: theme => endTime
          ? alpha(theme.palette.success.main, 0.05)
          : isRunning
            ? alpha(theme.palette.error.main, 0.05)
            : alpha(theme.palette.grey[500], 0.05),
        border: '1px solid',
        borderColor: endTime
          ? 'success.main'
          : isRunning
            ? 'error.main'
            : 'divider',
        borderRadius: 2
      }}
    >
      <Stack spacing={2}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon sx={{ color: isRunning ? 'error.main' : endTime ? 'success.main' : 'text.secondary' }} />
            <Typography variant="h6" fontWeight="600">
              Chronomètre de Consultation
            </Typography>
          </Box>
          <Chip
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            icon={endTime ? <CheckIcon /> : isRunning ? <StopIcon /> : undefined}
          />
        </Box>

        {/* Timer Display */}
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography
            variant="h2"
            fontWeight="700"
            sx={{
              fontFamily: 'monospace',
              color: endTime ? 'success.main' : isRunning ? 'error.main' : 'text.primary'
            }}
          >
            {formatTime(elapsedSeconds)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {elapsedSeconds >= 60 ? `${Math.floor(elapsedSeconds / 60)} minute${Math.floor(elapsedSeconds / 60) > 1 ? 's' : ''}` : ''}
          </Typography>
        </Box>

        {/* Time Info */}
        <Stack direction="row" spacing={2} justifyContent="center">
          {startTime && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Début
              </Typography>
              <Typography variant="body2" fontWeight="600">
                {formatDateTime(startTime)}
              </Typography>
            </Box>
          )}
          {endTime && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Fin
              </Typography>
              <Typography variant="body2" fontWeight="600">
                {formatDateTime(endTime)}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          {!startTime && !isRunning && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<StartIcon />}
              onClick={handleStart}
              size="large"
            >
              Démarrer Consultation
            </Button>
          )}
          {isRunning && !endTime && (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStop}
              size="large"
            >
              Terminer Consultation
            </Button>
          )}
        </Box>

        {/* Help Text */}
        {!startTime && (
          <Typography variant="caption" color="text.secondary" textAlign="center">
            💡 Le timer démarrera automatiquement lors de la sélection du patient
          </Typography>
        )}
        {isRunning && (
          <Typography variant="caption" color="text.secondary" textAlign="center">
            ⏱️ Timer en cours - Cliquez sur "Terminer" quand la consultation est finie
          </Typography>
        )}
        {endTime && (
          <Typography variant="caption" color="success.main" textAlign="center" fontWeight="600">
            ✓ Consultation terminée - Durée enregistrée pour les statistiques
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default ConsultationTimer;
