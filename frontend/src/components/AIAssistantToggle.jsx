import React, { useState } from 'react';
import {
  Box,
  Switch,
  FormControlLabel,
  Typography,
  Paper,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  SmartToy,
  PersonOutline,
  AutoAwesome,
} from '@mui/icons-material';

/**
 * Composant pour basculer entre Mode IA et Mode Manuel
 * Selon votre architecture hybride du contexte.md
 */
function AIAssistantToggle({
  isAIMode = false,
  onModeChange,
  disabled = false,
  showModeDescription = true
}) {
  const [localMode, setLocalMode] = useState(isAIMode);

  const handleToggle = (event) => {
    const newMode = event.target.checked;
    setLocalMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const currentMode = localMode;

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        backgroundColor: currentMode ? 'primary.50' : 'grey.50',
        border: currentMode ? '1px solid' : '1px solid',
        borderColor: currentMode ? 'primary.200' : 'grey.300',
        transition: 'all 0.3s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Icône du mode actuel */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {currentMode ? (
              <SmartToy sx={{ color: 'primary.main', fontSize: 28 }} />
            ) : (
              <PersonOutline sx={{ color: 'grey.600', fontSize: 28 }} />
            )}
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {currentMode ? 'Mode IA' : 'Mode Manuel'}
              </Typography>
              {currentMode && (
                <Chip
                  icon={<AutoAwesome sx={{ fontSize: 16 }} />}
                  label="Intelligent"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>

            {showModeDescription && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 300 }}
              >
                {currentMode
                  ? "L'IA propose, suggère et automatise les tâches pour vous"
                  : "Vous gardez le contrôle total avec les interfaces traditionnelles"
                }
              </Typography>
            )}
          </Box>
        </Box>

        {/* Switch pour basculer */}
        <Tooltip title={currentMode ? "Passer en mode manuel" : "Activer l'assistant IA"}>
          <FormControlLabel
            control={
              <Switch
                checked={currentMode}
                onChange={handleToggle}
                disabled={disabled}
                color="primary"
                size="medium"
              />
            }
            label=""
            sx={{ margin: 0 }}
          />
        </Tooltip>
      </Box>
    </Paper>
  );
}

export default AIAssistantToggle;