import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import useCurrentUser from '../../hooks/useCurrentUser';

const ACCOUNTING_ALLOWED = ['boris', 'ashley'];

/**
 * Guard pour le module comptabilité.
 * Seuls Boris et Ashley ont accès.
 */
const AccountingRoute = ({ children }) => {
    const { user, loading } = useCurrentUser();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!user || !ACCOUNTING_ALLOWED.includes(user.username)) {
        return (
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="60vh"
                gap={2}
            >
                <LockIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                    Accès restreint
                </Typography>
                <Typography variant="body2" color="text.disabled">
                    Le module comptabilité est réservé aux utilisateurs autorisés.
                </Typography>
            </Box>
        );
    }

    return children;
};

export default AccountingRoute;
