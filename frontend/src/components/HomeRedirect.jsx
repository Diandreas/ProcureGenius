import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useModules } from '../contexts/ModuleContext';
import { CircularProgress, Box, Typography, Button } from '@mui/material';

/**
 * Component to handle redirection from root URL based on available modules
 * - If dashboard is enabled -> /dashboard
 * - If not, find first available module -> /module-path
 * - If no modules -> Show empty state
 */
const HomeRedirect = () => {
    const { modules, loading, hasModule } = useModules();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && modules.length > 0) {
            // Priority 1: Dashboard if enabled
            if (hasModule('dashboard')) {
                navigate('/dashboard', { replace: true });
                return;
            }

            // Priority 2: First available module that has a route
            // Map module codes to their main route paths
            const moduleRoutes = {
                'healthcare-analytics': '/healthcare/analytics',
                'inventory-analytics': '/inventory/analytics',
                'suppliers': '/suppliers',
                'purchase-orders': '/purchase-orders',
                'invoices': '/invoices',
                'products': '/products',
                'clients': '/clients',
                // 'e-sourcing': '/e-sourcing/events',
                // 'contracts': '/contracts',
                'patients': '/healthcare/patients', // Assuming this is the main route for patients
                'consultations': '/healthcare/consultations',
                'laboratory': '/healthcare/laboratory/orders',
                'pharmacy': '/healthcare/pharmacy/inventory',
            };

            // Find the first enabled module that has a mapped route
            for (const moduleCode of modules) {
                if (moduleRoutes[moduleCode]) {
                    navigate(moduleRoutes[moduleCode], { replace: true });
                    return;
                }
            }

            // Should handled in the render if no route found
        }
    }, [modules, loading, hasModule, navigate]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    // Fallback if no modules are enabled or no mapped routes found
    if (modules.length === 0) {
        return (
            <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                height="100vh"
                p={3}
                textAlign="center"
            >
                <Typography variant="h4" gutterBottom>
                    Bienvenue sur ProcureGenius
                </Typography>
                <Typography variant="body1" color="textSecondary" paragraph>
                    Vous n'avez accès à aucun module pour le moment.
                    Veuillez contacter votre administrateur pour activer des modules sur votre compte.
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => window.location.reload()}
                >
                    Rafraîchir
                </Button>
            </Box>
        );
    }

    // Default return while effect runs or if no matching route found immediately
    return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
            <CircularProgress size={24} />
        </Box>
    );
};

export default HomeRedirect;
