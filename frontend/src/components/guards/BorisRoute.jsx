import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import useCurrentUser from '../../hooks/useCurrentUser';

const BorisRoute = ({ children }) => {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!user || user.username !== 'boris') {
    return (
      <Box display="flex" flexDirection="column" alignItems="center"
        justifyContent="center" minHeight="60vh" gap={2}>
        <LockIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">Accès restreint</Typography>
        <Typography variant="body2" color="text.disabled">
          Cette section est réservée à l'administrateur.
        </Typography>
      </Box>
    );
  }

  return children;
};

export default BorisRoute;
