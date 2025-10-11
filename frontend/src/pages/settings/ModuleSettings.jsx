import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
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
    Radio,
    RadioGroup,
    FormControlLabel,
    CircularProgress,
    Paper,
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
    Analytics,
    CheckCircle,
    Lock,
    Upgrade,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useModules } from '../../contexts/ModuleContext';

// Module icons map
const MODULE_ICONS = {
    'dashboard': <DashboardIcon />,
    'suppliers': <Business />,
    'purchase-orders': <ShoppingCart />,
    'invoices': <Receipt />,
    'products': <Inventory />,
    'clients': <People />,
    'e-sourcing': <CompareArrows />,
    'contracts': <Gavel />,
    'analytics': <Analytics />,
};

function ModuleSettings() {
    const { enqueueSnackbar } = useSnackbar();
    const { moduleMetadata, refreshModules } = useModules();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organizationSettings, setOrganizationSettings] = useState(null);
    const [profileTypes, setProfileTypes] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState('');
    const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
    const [userPermissions, setUserPermissions] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');

            // Fetch user profile to check permissions
            const profileResponse = await fetch('/api/v1/accounts/profile/', {
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setUserPermissions(profileData.permissions);
            }

            // Fetch organization settings
            const settingsResponse = await fetch('/api/v1/accounts/organization/settings/', {
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });

            if (settingsResponse.ok) {
                const settingsData = await settingsResponse.json();
                setOrganizationSettings(settingsData);
                setSelectedProfile(settingsData.subscription_type);
            } else if (settingsResponse.status === 403) {
                enqueueSnackbar('Vous n\'avez pas les permissions pour gérer les paramètres', { variant: 'warning' });
            }

            // Fetch available profile types
            const profileTypesResponse = await fetch('/api/v1/accounts/profile-types/', {
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });

            if (profileTypesResponse.ok) {
                const profileTypesData = await profileTypesResponse.json();
                setProfileTypes(profileTypesData.profiles || []);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangeSubscription = async () => {
        if (!selectedProfile || selectedProfile === organizationSettings?.subscription_type) {
            setUpgradeDialogOpen(false);
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/v1/accounts/organization/settings/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`,
                },
                body: JSON.stringify({
                    subscription_type: selectedProfile,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setOrganizationSettings(data);
                setUpgradeDialogOpen(false);
                enqueueSnackbar('Type de profil mis à jour avec succès', { variant: 'success' });

                // Refresh modules in context
                refreshModules();

                // Reload page to update navigation
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update subscription');
            }
        } catch (error) {
            console.error('Error updating subscription:', error);
            enqueueSnackbar(error.message || 'Erreur lors de la mise à jour', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }

    // Check if user has permission to manage settings
    if (!userPermissions?.can_manage_settings) {
        return (
            <Box>
                <Alert severity="warning">
                    Vous n'avez pas les permissions nécessaires pour gérer les modules de l'organisation.
                    Contactez un administrateur.
                </Alert>
            </Box>
        );
    }

    const currentProfile = profileTypes.find(p => p.type === organizationSettings?.subscription_type);

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                    Gestion des modules
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Gérez le profil d'abonnement et les modules disponibles pour votre organisation
                </Typography>
            </Box>

            {/* Current Subscription */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Profil actuel
                            </Typography>
                            {currentProfile && (
                                <>
                                    <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                                        {currentProfile.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {currentProfile.description}
                                    </Typography>
                                </>
                            )}
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<Upgrade />}
                            onClick={() => setUpgradeDialogOpen(true)}
                            size="large"
                        >
                            Changer de profil
                        </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Current modules */}
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                        Modules inclus ({organizationSettings?.enabled_modules?.length || 0})
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {organizationSettings?.enabled_modules?.map((moduleCode) => {
                            const metadata = moduleMetadata.find(m => m.code === moduleCode);
                            if (!metadata) return null;

                            return (
                                <Grid item xs={12} sm={6} md={4} key={moduleCode}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Box sx={{ color: 'primary.main', fontSize: 32 }}>
                                            {MODULE_ICONS[moduleCode] || <DashboardIcon />}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                {metadata.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {metadata.description}
                                            </Typography>
                                        </Box>
                                        <CheckCircle color="success" />
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                </CardContent>
            </Card>

            {/* Features list */}
            {currentProfile && currentProfile.features && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Fonctionnalités incluses
                        </Typography>
                        <List>
                            {currentProfile.features.map((feature, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon>
                                        <CheckCircle color="success" />
                                    </ListItemIcon>
                                    <ListItemText primary={feature} />
                                </ListItem>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}

            {/* Upgrade Dialog */}
            <Dialog
                open={upgradeDialogOpen}
                onClose={() => !saving && setUpgradeDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Changer de profil d'abonnement
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Sélectionnez le profil qui correspond le mieux à vos besoins. Les modules seront automatiquement mis à jour.
                    </Alert>

                    <RadioGroup value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)}>
                        {profileTypes.map((profile) => (
                            <Card
                                key={profile.type}
                                variant="outlined"
                                sx={{
                                    mb: 2,
                                    border: selectedProfile === profile.type ? 2 : 1,
                                    borderColor: selectedProfile === profile.type ? 'primary.main' : 'divider',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        boxShadow: 1,
                                    },
                                }}
                                onClick={() => setSelectedProfile(profile.type)}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                                        <FormControlLabel
                                            value={profile.type}
                                            control={<Radio />}
                                            label=""
                                            sx={{ m: 0 }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                {profile.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                {profile.description}
                                            </Typography>

                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                                Modules inclus ({profile.modules.length}):
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {profile.modules.map((moduleCode) => {
                                                    const metadata = moduleMetadata.find(m => m.code === moduleCode);
                                                    return (
                                                        <Chip
                                                            key={moduleCode}
                                                            label={metadata?.name || moduleCode}
                                                            size="small"
                                                            variant={selectedProfile === profile.type ? 'filled' : 'outlined'}
                                                            color={selectedProfile === profile.type ? 'primary' : 'default'}
                                                        />
                                                    );
                                                })}
                                            </Box>

                                            {profile.features && profile.features.length > 0 && (
                                                <>
                                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                                                        Fonctionnalités:
                                                    </Typography>
                                                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                                        {profile.features.map((feature, idx) => (
                                                            <Typography key={idx} variant="caption" component="li" color="text.secondary">
                                                                {feature}
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </RadioGroup>

                    {selectedProfile && selectedProfile !== organizationSettings?.subscription_type && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            Cette action modifiera les modules disponibles pour tous les utilisateurs de l'organisation.
                            La page se rechargera automatiquement après la mise à jour.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUpgradeDialogOpen(false)} disabled={saving}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleChangeSubscription}
                        variant="contained"
                        disabled={!selectedProfile || selectedProfile === organizationSettings?.subscription_type || saving}
                        startIcon={saving ? <CircularProgress size={20} /> : <Upgrade />}
                    >
                        {saving ? 'Mise à jour...' : 'Confirmer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ModuleSettings;
