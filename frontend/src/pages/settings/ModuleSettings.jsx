import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Switch,
    Button,
    Grid,
    Chip,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
} from '@mui/material';
import {
    Business,
    ShoppingCart,
    Receipt,
    Inventory,
    People,
    CompareArrows,
    Gavel,
    Dashboard as DashboardIcon,
    Warning,
    RestartAlt,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import Mascot from '../../components/Mascot';

// Configuration des modules
const AVAILABLE_MODULES = [
    {
        id: 'dashboard',
        name: 'Tableau de bord',
        icon: <DashboardIcon />,
        description: 'Vue d\'ensemble et statistiques',
        isCore: true, // Module obligatoire
    },
    {
        id: 'suppliers',
        name: 'Fournisseurs',
        icon: <Business />,
        description: 'Gestion des fournisseurs',
        isCore: false,
    },
    {
        id: 'purchase-orders',
        name: 'Bons de commande',
        icon: <ShoppingCart />,
        description: 'Gestion des achats',
        isCore: false,
    },
    {
        id: 'invoices',
        name: 'Factures',
        icon: <Receipt />,
        description: 'Facturation et paiements',
        isCore: false,
    },
    {
        id: 'products',
        name: 'Produits',
        icon: <Inventory />,
        description: 'Catalogue et stocks',
        isCore: false,
    },
    {
        id: 'clients',
        name: 'Clients',
        icon: <People />,
        description: 'Gestion des clients',
        isCore: false,
    },
    {
        id: 'e-sourcing',
        name: 'E-Sourcing',
        icon: <CompareArrows />,
        description: 'Appels d\'offres (RFQ)',
        isCore: false,
    },
    {
        id: 'contracts',
        name: 'Contrats',
        icon: <Gavel />,
        description: 'Gestion des contrats',
        isCore: false,
    },
];

// Profils prédéfinis
const MODULE_PROFILES = {
    basic: {
        name: 'Basique',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices'],
    },
    advanced: {
        name: 'Avancé',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients', 'e-sourcing', 'contracts'],
    },
    complete: {
        name: 'Complet',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients', 'e-sourcing', 'contracts'],
    },
};

function ModuleSettings() {
    const { enqueueSnackbar } = useSnackbar();
    const [enabledModules, setEnabledModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);

    useEffect(() => {
        fetchUserPreferences();
    }, []);

    const fetchUserPreferences = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/v1/accounts/preferences/', {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setEnabledModules(data.enabled_modules || ['dashboard']);
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
            enqueueSnackbar('Erreur lors du chargement des préférences', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleModuleToggle = async (moduleId) => {
        const module = AVAILABLE_MODULES.find(m => m.id === moduleId);

        // Empêcher la désactivation des modules core
        if (module.isCore && enabledModules.includes(moduleId)) {
            enqueueSnackbar('Ce module est obligatoire et ne peut pas être désactivé', { variant: 'warning' });
            return;
        }

        const newModules = enabledModules.includes(moduleId)
            ? enabledModules.filter(m => m !== moduleId)
            : [...enabledModules, moduleId];

        try {
            const response = await fetch('/api/v1/accounts/preferences/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify({
                    enabled_modules: newModules,
                }),
            });

            if (response.ok) {
                setEnabledModules(newModules);
                enqueueSnackbar(
                    enabledModules.includes(moduleId) ? 'Module désactivé' : 'Module activé',
                    { variant: 'success' }
                );

                // Recharger la page pour mettre à jour la navigation
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                throw new Error('Failed to update preferences');
            }
        } catch (error) {
            console.error('Error updating preferences:', error);
            enqueueSnackbar('Erreur lors de la mise à jour', { variant: 'error' });
        }
    };

    const handleResetToProfile = async (profile) => {
        try {
            const response = await fetch('/api/v1/accounts/preferences/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify({
                    enabled_modules: MODULE_PROFILES[profile].modules,
                }),
            });

            if (response.ok) {
                setEnabledModules(MODULE_PROFILES[profile].modules);
                setResetDialogOpen(false);
                enqueueSnackbar(`Modules réinitialisés au profil ${MODULE_PROFILES[profile].name}`, { variant: 'success' });

                // Recharger la page
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                throw new Error('Failed to update preferences');
            }
        } catch (error) {
            console.error('Error resetting preferences:', error);
            enqueueSnackbar('Erreur lors de la réinitialisation', { variant: 'error' });
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <Mascot pose="thinking" animation="pulse" size={80} />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                    Gestion des modules
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Activez ou désactivez les modules selon vos besoins
                </Typography>
            </Box>

            {/* Statistiques */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h3" color="primary.main">
                                {enabledModules.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Modules activés
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h3" color="text.secondary">
                                {AVAILABLE_MODULES.length - enabledModules.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Modules désactivés
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'primary.lighter' }}>
                        <CardContent>
                            <Typography variant="h3">
                                {Math.round((enabledModules.length / AVAILABLE_MODULES.length) * 100)}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Utilisation
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Profils prédéfinis */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">
                            Profils prédéfinis
                        </Typography>
                        <Button
                            startIcon={<RestartAlt />}
                            onClick={() => setResetDialogOpen(true)}
                            variant="outlined"
                            size="small"
                        >
                            Réinitialiser
                        </Button>
                    </Box>

                    <Grid container spacing={2}>
                        {Object.entries(MODULE_PROFILES).map(([key, profile]) => (
                            <Grid item xs={12} md={4} key={key}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': { borderColor: 'primary.main' },
                                    }}
                                    onClick={() => {
                                        setSelectedProfile(key);
                                        setResetDialogOpen(true);
                                    }}
                                >
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                            {profile.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {profile.modules.length} modules
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {profile.modules.slice(0, 4).map((moduleId) => {
                                                const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
                                                return (
                                                    <Chip
                                                        key={moduleId}
                                                        label={module?.name}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                );
                                            })}
                                            {profile.modules.length > 4 && (
                                                <Chip label={`+${profile.modules.length - 4}`} size="small" />
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            {/* Liste des modules */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        Modules disponibles
                    </Typography>

                    <List>
                        {AVAILABLE_MODULES.map((module, index) => (
                            <React.Fragment key={module.id}>
                                {index > 0 && <Divider />}
                                <ListItem>
                                    <ListItemIcon sx={{ color: 'primary.main', fontSize: 40 }}>
                                        {module.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {module.name}
                                                </Typography>
                                                {module.isCore && (
                                                    <Chip label="Obligatoire" size="small" color="primary" />
                                                )}
                                                {enabledModules.includes(module.id) && (
                                                    <Chip label="Activé" size="small" color="success" variant="outlined" />
                                                )}
                                            </Box>
                                        }
                                        secondary={module.description}
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            edge="end"
                                            checked={enabledModules.includes(module.id)}
                                            onChange={() => handleModuleToggle(module.id)}
                                            disabled={module.isCore && enabledModules.includes(module.id)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            💡 Les modules désactivés n'apparaîtront pas dans la navigation.
                            Vous pourrez les réactiver à tout moment.
                        </Typography>
                    </Alert>
                </CardContent>
            </Card>

            {/* Dialog de confirmation de réinitialisation */}
            <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Warning color="warning" />
                        <Typography variant="h6">
                            Réinitialiser aux profils prédéfinis
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                        Choisissez un profil pour réinitialiser vos modules:
                    </Typography>

                    <Grid container spacing={2}>
                        {Object.entries(MODULE_PROFILES).map(([key, profile]) => (
                            <Grid item xs={12} key={key}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        cursor: 'pointer',
                                        border: selectedProfile === key ? 2 : 1,
                                        borderColor: selectedProfile === key ? 'primary.main' : 'divider',
                                        '&:hover': { borderColor: 'primary.main' },
                                    }}
                                    onClick={() => setSelectedProfile(key)}
                                >
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {profile.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {profile.modules.length} modules: {profile.modules.join(', ')}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Cette action remplacera votre configuration actuelle.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetDialogOpen(false)}>
                        Annuler
                    </Button>
                    <Button
                        onClick={() => selectedProfile && handleResetToProfile(selectedProfile)}
                        variant="contained"
                        disabled={!selectedProfile}
                    >
                        Confirmer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ModuleSettings;

