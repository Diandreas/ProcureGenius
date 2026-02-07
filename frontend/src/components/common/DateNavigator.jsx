import React from 'react';
import { Box, IconButton, TextField, Stack, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

// Initialize dayjs locale
dayjs.locale('fr');

/**
 * DateNavigator Component
 *
 * Un composant de navigation de date intuitif avec des boutons de navigation rapide
 * et un sélecteur de date.
 *
 * @param {string} value - La date actuelle au format YYYY-MM-DD
 * @param {function} onChange - Callback appelé quand la date change, reçoit la nouvelle date (YYYY-MM-DD)
 * @param {boolean} disabled - Si true, désactive tous les contrôles
 */
function DateNavigator({ value, onChange, disabled = false }) {
  const { t } = useTranslation('common');

  // Fonction pour ajouter/soustraire des jours à une date
  const addDays = (dateString, days) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Handlers
  const handlePreviousDay = () => {
    if (disabled) return;
    const newDate = addDays(value || getTodayDate(), -1);
    onChange(newDate);
  };

  const handleNextDay = () => {
    if (disabled) return;
    const newDate = addDays(value || getTodayDate(), 1);
    onChange(newDate);
  };

  const handleToday = () => {
    if (disabled) return;
    onChange(getTodayDate());
  };

  const handleDateChange = (event) => {
    if (disabled) return;
    onChange(event.target.value);
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 0.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Bouton jour précédent */}
      <Tooltip title={t('dateNavigator.previousDay', 'Jour précédent')}>
        <span>
          <IconButton
            size="small"
            onClick={handlePreviousDay}
            disabled={disabled}
            sx={{
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.50' },
            }}
          >
            <ChevronLeft />
          </IconButton>
        </span>
      </Tooltip>

      {/* Bouton aujourd'hui */}
      <Tooltip title={t('dateNavigator.today', 'Aujourd\'hui')}>
        <span>
          <IconButton
            size="small"
            onClick={handleToday}
            disabled={disabled}
            sx={{
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.50' },
            }}
          >
            <Today />
          </IconButton>
        </span>
      </Tooltip>

      {/* Bouton jour suivant */}
      <Tooltip title={t('dateNavigator.nextDay', 'Jour suivant')}>
        <span>
          <IconButton
            size="small"
            onClick={handleNextDay}
            disabled={disabled}
            sx={{
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.50' },
            }}
          >
            <ChevronRight />
          </IconButton>
        </span>
      </Tooltip>

      {/* Sélecteur de date */}
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
        <DatePicker
          value={value ? dayjs(value) : null}
          onChange={(date) => {
            if (disabled || !date) return;
            onChange(date.format('YYYY-MM-DD'));
          }}
          disabled={disabled}
          slotProps={{
            textField: {
              size: 'small',
              sx: {
                minWidth: 140,
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '& .MuiInputBase-root': {
                  fontSize: '0.875rem',
                },
              }
            }
          }}
          format="DD/MM/YYYY"
        />
      </LocalizationProvider>
    </Stack>
  );
}

export default DateNavigator;
