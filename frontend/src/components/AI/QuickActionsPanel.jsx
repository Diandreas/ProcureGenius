import React from 'react';
import { Box, Button, Grid, Paper, Typography } from '@mui/material';
import {
  AddBusiness,
  Receipt,
  ShoppingCart,
  Search,
  BarChart,
  Assessment,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const QuickActionsPanel = ({ onActionClick, disabled = false }) => {
  const { t } = useTranslation('aiChat');

  const quickActions = [
    {
      label: t('quickActions.createSupplier'),
      icon: <AddBusiness />,
      prompt: t('quickActions.prompts.createSupplier'),
      color: 'primary',
    },
    {
      label: t('quickActions.searchSupplier'),
      icon: <Search />,
      prompt: t('quickActions.prompts.searchSupplier'),
      color: 'info',
    },
    {
      label: t('quickActions.createInvoice'),
      icon: <Receipt />,
      prompt: t('quickActions.prompts.createInvoice'),
      color: 'success',
    },
    {
      label: t('quickActions.createPurchaseOrder'),
      icon: <ShoppingCart />,
      prompt: t('quickActions.prompts.createPurchaseOrder'),
      color: 'warning',
    },
    {
      label: t('quickActions.viewStatistics'),
      icon: <BarChart />,
      prompt: t('quickActions.prompts.viewStatistics'),
      color: 'secondary',
    },
    {
      label: t('quickActions.monthlyReport'),
      icon: <Assessment />,
      prompt: t('quickActions.prompts.monthlyReport'),
      color: 'error',
    },
  ];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5 }}>
        {t('quickActions.title')}
      </Typography>
      <Grid container spacing={1}>
        {quickActions.map((action, index) => (
          <Grid item xs={6} key={index}>
            <Button
              fullWidth
              variant="outlined"
              color={action.color}
              startIcon={action.icon}
              onClick={() => onActionClick(action.prompt)}
              disabled={disabled}
              sx={{
                justifyContent: 'flex-start',
                py: 1,
                textTransform: 'none',
                fontSize: '0.875rem',
              }}
            >
              {action.label}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default QuickActionsPanel;
