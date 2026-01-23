import React, { useState } from 'react';
import { Box, Button, Popover, Typography, ToggleButtonGroup, ToggleButton, Divider } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateRange as DateRangeIcon, CalendarToday } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const DateRangeSelector = ({ startDate, endDate, onChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [quickRange, setQuickRange] = useState('last_30_days');
  const [customStart, setCustomStart] = useState(startDate ? dayjs(startDate) : null);
  const [customEnd, setCustomEnd] = useState(endDate ? dayjs(endDate) : null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const handleQuickRangeChange = (event, newRange) => {
    if (!newRange) return;

    setQuickRange(newRange);
    const today = dayjs();
    let start, end;

    switch (newRange) {
      case 'today':
        start = today.startOf('day');
        end = today.endOf('day');
        break;
      case 'yesterday':
        start = today.subtract(1, 'day').startOf('day');
        end = today.subtract(1, 'day').endOf('day');
        break;
      case 'last_7_days':
        start = today.subtract(7, 'day').startOf('day');
        end = today.endOf('day');
        break;
      case 'last_30_days':
        start = today.subtract(30, 'day').startOf('day');
        end = today.endOf('day');
        break;
      case 'this_month':
        start = today.startOf('month');
        end = today.endOf('month');
        break;
      case 'last_month':
        start = today.subtract(1, 'month').startOf('month');
        end = today.subtract(1, 'month').endOf('month');
        break;
      case 'this_year':
        start = today.startOf('year');
        end = today.endOf('year');
        break;
      default:
        return;
    }

    setCustomStart(start);
    setCustomEnd(end);
    onChange({
      start_date: start.format('YYYY-MM-DD'),
      end_date: end.format('YYYY-MM-DD')
    });
    handleClose();
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        start_date: customStart.format('YYYY-MM-DD'),
        end_date: customEnd.format('YYYY-MM-DD')
      });
      setQuickRange('custom');
      handleClose();
    }
  };

  const getLabel = () => {
    if (!startDate || !endDate) return '30 derniers jours';

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (quickRange !== 'custom') {
      const labels = {
        today: "Aujourd'hui",
        yesterday: 'Hier',
        last_7_days: '7 derniers jours',
        last_30_days: '30 derniers jours',
        this_month: 'Ce mois-ci',
        last_month: 'Mois dernier',
        this_year: 'Cette année'
      };
      return labels[quickRange] || '30 derniers jours';
    }

    return `${start.format('DD/MM/YY')} - ${end.format('DD/MM/YY')}`;
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<DateRangeIcon />}
        onClick={handleClick}
        sx={{
          borderRadius: 2,
          fontWeight: 600,
          px: 2,
          py: 0.8,
          fontSize: '0.875rem',
          textTransform: 'none',
          borderColor: 'divider',
          color: 'text.primary',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
      >
        {getLabel()}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            p: 2,
            minWidth: 320
          }
        }}
      >
        <Typography variant="subtitle2" fontWeight="700" mb={2}>
          Sélectionner une période
        </Typography>

        <ToggleButtonGroup
          value={quickRange}
          exclusive
          onChange={handleQuickRangeChange}
          orientation="vertical"
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="today" sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1 }}>
            Aujourd'hui
          </ToggleButton>
          <ToggleButton value="yesterday" sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1 }}>
            Hier
          </ToggleButton>
          <ToggleButton value="last_7_days" sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1 }}>
            7 derniers jours
          </ToggleButton>
          <ToggleButton value="last_30_days" sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1 }}>
            30 derniers jours
          </ToggleButton>
          <ToggleButton value="this_month" sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1 }}>
            Ce mois-ci
          </ToggleButton>
          <ToggleButton value="last_month" sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1 }}>
            Mois dernier
          </ToggleButton>
          <ToggleButton value="this_year" sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1 }}>
            Cette année
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Plage personnalisée
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <DatePicker
              label="Date début"
              value={customStart}
              onChange={setCustomStart}
              maxDate={customEnd || dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small"
                }
              }}
            />
            <DatePicker
              label="Date fin"
              value={customEnd}
              onChange={setCustomEnd}
              minDate={customStart}
              maxDate={dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small"
                }
              }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              sx={{
                mt: 1,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Appliquer
            </Button>
          </Box>
        </LocalizationProvider>
      </Popover>
    </>
  );
};

export default DateRangeSelector;
