import React from 'react';
import { Box, Container } from '@mui/material';
import ErrorState from '../components/ErrorState';

/**
 * Page 404 - Page non trouvée
 */
function NotFound() {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 8 }}>
        <ErrorState
          title="Page non trouvée"
          message="Désolé, la page que vous recherchez n'existe pas ou a été déplacée."
          onRetry={null}
          showHome={true}
        />
      </Box>
    </Container>
  );
}

export default NotFound;
