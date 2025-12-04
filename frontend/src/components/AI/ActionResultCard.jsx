import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Alert } from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Receipt,
  ShoppingCart,
  Business,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const ActionResultCard = ({ result }) => {
  const { t } = useTranslation(['aiChat', 'common']);

  if (!result) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'create_supplier':
        return <Business />;
      case 'create_invoice':
        return <Receipt />;
      case 'create_purchase_order':
        return <ShoppingCart />;
      default:
        return <Info />;
    }
  };

  const getColor = (success) => {
    return success ? 'success' : 'error';
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderLeft: 4,
        borderLeftColor: result.success ? 'success.main' : 'error.main',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {getIcon(result.action_type)}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {result.action_name || t('aiChat:actionResult.actionExecuted')}
          </Typography>
          <Chip
            icon={result.success ? <CheckCircle /> : <ErrorIcon />}
            label={result.success ? t('common:success') : t('common:failed')}
            color={getColor(result.success)}
            size="small"
          />
        </Box>

        {result.message && (
          <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 1 }}>
            {result.message}
          </Alert>
        )}

        {result.data && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('aiChat:actionResult.details')}
            </Typography>
            <Box
              component="pre"
              sx={{
                bgcolor: 'grey.100',
                p: 1.5,
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.875rem',
              }}
            >
              {JSON.stringify(result.data, null, 2)}
            </Box>
          </Box>
        )}

        {result.entity_id && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              ID: {result.entity_id}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionResultCard;
