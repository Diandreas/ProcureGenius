import React from 'react';
import { ToggleButtonGroup, ToggleButton, Box, Typography } from '@mui/material';
import { Today, DateRange, CalendarMonth, CalendarToday } from '@mui/icons-material';

const TimeRangeSelector = ({ value, onChange, label }) => {
  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight="600">
          {label}
        </Typography>
      )}
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(e, val) => val && onChange(val)}
        size="small"
        fullWidth
        sx={{
          '& .MuiToggleButton-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem'
          }
        }}
      >
        <ToggleButton value="day">
          <Today sx={{ fontSize: 16, mr: 0.5 }} />
          Jour
        </ToggleButton>
        <ToggleButton value="week">
          <CalendarToday sx={{ fontSize: 16, mr: 0.5 }} />
          Semaine
        </ToggleButton>
        <ToggleButton value="month">
          <CalendarMonth sx={{ fontSize: 16, mr: 0.5 }} />
          Mois
        </ToggleButton>
        <ToggleButton value="year">
          <DateRange sx={{ fontSize: 16, mr: 0.5 }} />
          Année
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default TimeRangeSelector;
