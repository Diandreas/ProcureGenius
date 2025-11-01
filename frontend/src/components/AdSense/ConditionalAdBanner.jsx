/**
 * ConditionalAdBanner Component
 * Only displays ads if user is on FREE plan
 */
import React from 'react';
import { Alert, Button, Box } from '@mui/material';
import { Upgrade } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useSubscription from '../../hooks/useSubscription';
import AdBanner from './AdBanner';

const ConditionalAdBanner = ({ format = 'rectangle', slot = 'auto', ...props }) => {
  const { shouldShowAds, loading, getPlanName } = useSubscription();
  const navigate = useNavigate();

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Only show ads for FREE plan users
  if (!shouldShowAds()) {
    return null;
  }

  return (
    <Box {...props}>
      {/* Upgrade prompt */}
      <Alert
        severity="info"
        sx={{ mb: 1 }}
        action={
          <Button
            size="small"
            color="inherit"
            startIcon={<Upgrade />}
            onClick={() => navigate('/pricing')}
          >
            Passer au plan supérieur
          </Button>
        }
      >
        Plan {getPlanName()} - Supprimez les publicités en passant à un plan payant
      </Alert>

      {/* Ad banner */}
      <AdBanner format={format} slot={slot} />
    </Box>
  );
};

export default ConditionalAdBanner;
