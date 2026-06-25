import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useModules } from '../../contexts/ModuleContext';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { Lock, ArrowForward } from '@mui/icons-material';

/**
 * Protège une route selon l'accès au module.
 *
 * - Module verrouillé par le plan (ex. Fournisseurs / Contrats en Gratuit) :
 *   on affiche un écran d'upsell clair au lieu de rediriger silencieusement
 *   vers le tableau de bord (comportement identique web et mobile).
 * - Module simplement non activé (cas rare) : redirection.
 */
const ModuleRoute = ({ module, children, redirectTo = '/dashboard' }) => {
    const navigate = useNavigate();
    const { hasModule, isLocked, loading } = useModules();

    // Show loading state while fetching modules
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (hasModule(module)) {
        return children;
    }

    // Verrouillé par le plan -> écran d'upsell explicite (pas de redirection muette)
    if (isLocked(module)) {
        return (
            <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', py: { xs: 6, md: 10 }, px: 3 }}>
                <Box sx={{
                    width: 72, height: 72, mx: 'auto', mb: 2, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    boxShadow: '0 12px 30px -10px rgba(124,58,237,0.5)',
                }}>
                    <Lock sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                    Fonctionnalité réservée
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Ce module est inclus dans un abonnement supérieur (Business ou Pro).
                    Passez à un plan supérieur pour y accéder — essai 30 jours offert, sans carte.
                </Typography>
                <Button
                    variant="contained" size="large" endIcon={<ArrowForward />}
                    onClick={() => navigate('/subscription/plans')}
                    sx={{ fontWeight: 700, textTransform: 'none', px: 4, py: 1.2 }}
                >
                    Voir les plans
                </Button>
            </Box>
        );
    }

    // Module non disponible pour une autre raison : redirection.
    return <Navigate to={redirectTo} replace />;
};

export default ModuleRoute;
