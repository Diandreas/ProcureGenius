import React from 'react';
import { Navigate } from 'react-router-dom';
import { useModules } from '../../contexts/ModuleContext';
import { CircularProgress, Box } from '@mui/material';

/**
 * Component to protect routes based on module access
 * Usage: <Route element={<ModuleRoute module="suppliers" />}>
 */
const ModuleRoute = ({ module, children, redirectTo = '/dashboard' }) => {
    const { hasModule, loading } = useModules();

    // Show loading state while fetching modules
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    // Check if user has access to the module
    if (!hasModule(module)) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
};

export default ModuleRoute;


