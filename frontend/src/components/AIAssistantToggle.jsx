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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('aiChat');
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
                {currentMode ? t('aiChat:assistantToggle.aiMode') : t('aiChat:assistantToggle.manualMode')}
              </Typography>
              {currentMode && (
                <Chip
                  icon={<AutoAwesome sx={{ fontSize: 16 }} />}
                  label={t('aiChat:assistantToggle.smart')}
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
                  ? t('aiChat:assistantToggle.aiDescription')
                  : t('aiChat:assistantToggle.manualDescription')
                }
              </Typography>
            )}
          </Box>
        </Box>

        {/* Switch pour basculer */}
        <Tooltip title={currentMode ? t('aiChat:assistantToggle.switchToManual') : t('aiChat:assistantToggle.enableAssistant')}>
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