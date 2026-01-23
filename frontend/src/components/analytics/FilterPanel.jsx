import React from 'react';
import { Box, Grid, TextField, Button, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { FilterAlt as FilterIcon, Close as ClearIcon } from '@mui/icons-material';

const FilterPanel = ({
  filters = {},
  onChange,
  showDateRange = true,
  showStatus = false,
  showPriority = false,
  statusOptions = [],
  priorityOptions = [],
  customFilters = []
}) => {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    onChange({});
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          p: 2.5,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          mb: 3
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {showDateRange && (
            <>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Date Début"
                  value={filters.start_date || null}
                  onChange={(val) => handleChange('start_date', val)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small"
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Date Fin"
                  value={filters.end_date || null}
                  onChange={(val) => handleChange('end_date', val)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small"
                    }
                  }}
                />
              </Grid>
            </>
          )}

        {showStatus && (
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Statut"
              value={filters.status || ''}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {statusOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )}

        {showPriority && (
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Priorité"
              value={filters.priority || ''}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <MenuItem value="">Toutes</MenuItem>
              {priorityOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )}

        {customFilters.map(filter => (
          <Grid item xs={12} md={3} key={filter.field}>
            {filter.type === 'select' ? (
              <TextField
                select
                fullWidth
                size="small"
                label={filter.label}
                value={filters[filter.field] || ''}
                onChange={(e) => handleChange(filter.field, e.target.value)}
              >
                <MenuItem value="">Tous</MenuItem>
                {filter.options.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                fullWidth
                size="small"
                label={filter.label}
                value={filters[filter.field] || ''}
                onChange={(e) => handleChange(filter.field, e.target.value)}
              />
            )}
          </Grid>
        ))}

        <Grid item xs={12} md={showDateRange && !showStatus ? 3 : 2}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ClearIcon />}
            onClick={handleClear}
            sx={{ height: 40 }}
          >
            Réinitialiser
          </Button>
        </Grid>
      </Grid>
    </Box>
    </LocalizationProvider>
  );
};

export default FilterPanel;
