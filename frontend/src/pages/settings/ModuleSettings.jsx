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
    Stack,
    Tooltip,
    IconButton,
    Badge,
    LinearProgress,
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
    Info,
    Stars,
    Verified,
    Speed,
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
                console.log('Organization settings loaded:', settingsData); // Debug
                setOrganizationSettings(settingsData);
                setSelectedProfile(settingsData.subscription_type || '');
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
                console.log('Profile types loaded:', profileTypesData); // Debug
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
    const totalModules = moduleMetadata.length;
    const enabledModulesCount = organizationSettings?.enabled_modules?.length || 0;
    const coveragePercent = (enabledModulesCount / totalModules) * 100;

    return (
        <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3 } }}>
            {/* Header Compact */}
            <Box sx={{
                mb: { xs: 2, sm: 3 },
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: { xs: 1.5, sm: 2 }
            }}>
                <Box>
                    <Typography variant="h4" sx={{
                        fontWeight: 700,
                        mb: 0.5,
                        letterSpacing: '-0.02em',
                        fontSize: { xs: '1.5rem', sm: '2rem' }
                    }}>
                        Gestion des Modules
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        Configuration de votre abonnement
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Upgrade />}
                    onClick={() => setUpgradeDialogOpen(true)}
                    size={window.innerWidth < 600 ? 'medium' : 'large'}
                    sx={{
                        borderRadius: 2,
                        px: { xs: 2, sm: 3 },
                        py: { xs: 1, sm: 1.5 },
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        boxShadow: 3,
                        '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.2s'
                    }}
                >
                    Changer
                </Button>
            </Box>

            {/* Current Plan Overview - Compact Mobile & Desktop */}
            <Card sx={{
                mb: { xs: 2, sm: 3 },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: { xs: 2, sm: 3 },
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.25)',
            }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
                        <Grid item xs={12} md={7}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 1, sm: 2 } }}>
                                {currentProfile && (
                                    <Chip
                                        icon={<Stars />}
                                        label="Actif"
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                            height: { xs: 22, sm: 24 },
                                            '& .MuiChip-icon': { color: 'white', fontSize: { xs: 14, sm: 16 } }
                                        }}
                                    />
                                )}
                            </Box>
                            <Typography variant="h4" sx={{
                                fontWeight: 700,
                                mb: { xs: 0.5, sm: 1 },
                                fontSize: { xs: '1.5rem', sm: '2rem' }
                            }}>
                                {currentProfile?.name || 'Aucun profil'}
                            </Typography>
                            <Typography variant="body2" sx={{
                                opacity: 0.9,
                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                display: { xs: 'none', sm: 'block' }
                            }}>
                                {currentProfile?.description || 'Sélectionnez un profil'}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.95)' }}>
                                <Stack spacing={{ xs: 1, sm: 1.5 }}>
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                                Modules
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                                {enabledModulesCount} / {totalModules}
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={coveragePercent}
                                            sx={{
                                                height: { xs: 6, sm: 8 },
                                                borderRadius: 1,
                                                bgcolor: 'rgba(0,0,0,0.1)',
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 1,
                                                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                                                }
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-around', pt: 0.5 }}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                                {enabledModulesCount}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                                Actifs
                                            </Typography>
                                        </Box>
                                        <Divider orientation="vertical" flexItem />
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                                {totalModules - enabledModulesCount}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                                Disponibles
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Modules Grid - Compact et Visuel */}
            <Card sx={{ mb: { xs: 2, sm: 3 }, borderRadius: { xs: 2, sm: 3 }, boxShadow: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1.5, sm: 2.5 } }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            Modules Installés
                        </Typography>
                        <Chip
                            label={`${enabledModulesCount}`}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 700, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        />
                    </Box>

                    <Grid container spacing={{ xs: 1, sm: 1.5 }}>
                        {organizationSettings?.enabled_modules?.map((moduleCode) => {
                            const metadata = moduleMetadata.find(m => m.code === moduleCode);
                            if (!metadata) return null;

                            return (
                                <Grid item xs={6} sm={4} md={3} lg={2.4} key={moduleCode}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: { xs: 1, sm: 1.5 },
                                            border: '2px solid',
                                            borderColor: 'success.light',
                                            borderRadius: { xs: 1.5, sm: 2 },
                                            bgcolor: 'success.50',
                                            transition: 'all 0.2s',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            '&:hover': {
                                                borderColor: 'success.main',
                                                boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)',
                                                transform: 'translateY(-2px)',
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 0.75, sm: 1.5 }, textAlign: { xs: 'center', sm: 'left' } }}>
                                            <Box sx={{
                                                color: 'success.main',
                                                fontSize: { xs: 24, sm: 28 },
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: { xs: 36, sm: 40 },
                                                height: { xs: 36, sm: 40 },
                                                bgcolor: 'white',
                                                borderRadius: { xs: 1, sm: 1.5 },
                                            }}>
                                                {MODULE_ICONS[moduleCode] || <DashboardIcon />}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: 'success.dark',
                                                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                        lineHeight: 1.2,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {metadata.name}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: 'success.dark',
                                                        opacity: 0.8,
                                                        display: { xs: 'none', sm: 'block' },
                                                        fontSize: '0.7rem',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {metadata.description}
                                                </Typography>
                                            </Box>
                                            <Verified sx={{ color: 'success.main', fontSize: { xs: 16, sm: 20 }, display: { xs: 'none', sm: 'block' } }} />
                                        </Box>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {/* Modules Disponibles Mais Non Activés - Masqué sur mobile */}
                    {moduleMetadata.filter(m => !organizationSettings?.enabled_modules?.includes(m.code)).length > 0 && (
                        <>
                            <Divider sx={{ my: { xs: 2, sm: 3 } }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1.5, sm: 2 } }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, color: 'text.secondary', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                    Non Activés
                                </Typography>
                                <Chip
                                    label={`${totalModules - enabledModulesCount}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                />
                            </Box>
                            <Grid container spacing={{ xs: 1, sm: 1.5 }}>
                                {moduleMetadata
                                    .filter(m => !organizationSettings?.enabled_modules?.includes(m.code))
                                    .map((metadata) => (
                                        <Grid item xs={6} sm={4} md={3} lg={2.4} key={metadata.code}>
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: { xs: 1, sm: 1.5 },
                                                    border: '1px dashed',
                                                    borderColor: 'divider',
                                                    borderRadius: { xs: 1.5, sm: 2 },
                                                    bgcolor: 'grey.50',
                                                    opacity: 0.6,
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 0.75, sm: 1.5 }, textAlign: { xs: 'center', sm: 'left' } }}>
                                                    <Box sx={{
                                                        color: 'text.disabled',
                                                        fontSize: { xs: 24, sm: 28 },
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: { xs: 36, sm: 40 },
                                                        height: { xs: 36, sm: 40 },
                                                        bgcolor: 'white',
                                                        borderRadius: { xs: 1, sm: 1.5 },
                                                    }}>
                                                        {MODULE_ICONS[metadata.code] || <DashboardIcon />}
                                                    </Box>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{
                                                                fontWeight: 600,
                                                                color: 'text.secondary',
                                                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                                lineHeight: 1.2,
                                                            }}
                                                        >
                                                            {metadata.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: 'text.disabled',
                                                                fontSize: '0.65rem',
                                                                display: { xs: 'none', sm: 'block' }
                                                            }}
                                                        >
                                                            Verrouillé
                                                        </Typography>
                                                    </Box>
                                                    <Lock sx={{ color: 'text.disabled', fontSize: { xs: 14, sm: 18 }, display: { xs: 'none', sm: 'block' } }} />
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    ))}
                            </Grid>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Features list - Masqué sur mobile, compact sur desktop */}
            {currentProfile && currentProfile.features && currentProfile.features.length > 0 && (
                <Card sx={{ borderRadius: { xs: 2, sm: 3 }, boxShadow: 2, display: { xs: 'none', sm: 'block' } }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Stars color="warning" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                Fonctionnalités Premium
                            </Typography>
                        </Box>
                        <Grid container spacing={0.75}>
                            {currentProfile.features.map((feature, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        p: 0.75,
                                        borderRadius: 1,
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}>
                                        <CheckCircle sx={{ color: 'success.main', fontSize: 16 }} />
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                            {feature}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Upgrade Dialog - Version Améliorée */}
            <Dialog
                open={upgradeDialogOpen}
                onClose={() => !saving && setUpgradeDialogOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '90vh'
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Sélectionner un Profil
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Choisissez le profil adapté à vos besoins métier
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    <Alert
                        severity="info"
                        sx={{
                            mb: 3,
                            borderRadius: 2,
                            '& .MuiAlert-icon': {
                                fontSize: 24
                            }
                        }}
                        icon={<Info />}
                    >
                        Les modules seront automatiquement activés selon le profil choisi.
                        Vous pourrez revenir à tout moment.
                    </Alert>

                    <RadioGroup value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)}>
                        <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                            {/* Version Mobile - Liste verticale ultra-compacte */}
                            {profileTypes.map((profile) => {
                                const isSelected = selectedProfile === profile.type;
                                const currentType = organizationSettings?.subscription_type;
                                const isCurrent = currentType && profile.type && profile.type === currentType;

                                return (
                                    <Card
                                        key={profile.type}
                                        variant="outlined"
                                        sx={{
                                            border: 2,
                                            borderColor: isSelected ? 'primary.main' : (isCurrent ? 'success.main' : 'divider'),
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                            borderRadius: 2,
                                            bgcolor: isSelected ? 'primary.50' : (isCurrent ? 'success.50' : 'background.paper'),
                                        }}
                                        onClick={() => setSelectedProfile(profile.type)}
                                    >
                                        {isCurrent && (
                                            <Box sx={{
                                                position: 'absolute',
                                                top: 6,
                                                right: 6,
                                                bgcolor: 'success.main',
                                                color: 'white',
                                                borderRadius: 0.75,
                                                px: 0.75,
                                                py: 0.25,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.25,
                                                zIndex: 2,
                                            }}>
                                                <Verified sx={{ fontSize: 11 }} />
                                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>
                                                    ACTIF
                                                </Typography>
                                            </Box>
                                        )}
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                                <Radio
                                                    checked={isSelected}
                                                    value={profile.type}
                                                    size="small"
                                                    sx={{ p: 0 }}
                                                />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>
                                                        {profile.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                                                        {profile.modules.length} modules
                                                    </Typography>
                                                </Box>
                                                {/* Icônes compactes sur mobile */}
                                                <Box sx={{ display: 'flex', gap: 0.3 }}>
                                                    {profile.modules.slice(0, 3).map((moduleCode) => (
                                                        <Box key={moduleCode} sx={{
                                                            width: 24,
                                                            height: 24,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: 0.75,
                                                            bgcolor: isSelected ? 'primary.main' : 'grey.200',
                                                            color: isSelected ? 'white' : 'text.secondary',
                                                            fontSize: 14,
                                                        }}>
                                                            {MODULE_ICONS[moduleCode]}
                                                        </Box>
                                                    ))}
                                                    {profile.modules.length > 3 && (
                                                        <Box sx={{
                                                            width: 24,
                                                            height: 24,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: 0.75,
                                                            bgcolor: 'grey.300',
                                                            fontSize: '0.6rem',
                                                            fontWeight: 700,
                                                            color: 'text.secondary'
                                                        }}>
                                                            +{profile.modules.length - 3}
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>

                        {/* Version Desktop/Tablet - Grille */}
                        <Grid container spacing={1.5} sx={{ display: { xs: 'none', sm: 'flex' } }}>
                            {profileTypes.map((profile) => {
                                const isSelected = selectedProfile === profile.type;
                                const currentType = organizationSettings?.subscription_type;
                                const isCurrent = currentType && profile.type && profile.type === currentType;

                                return (
                                    <Grid item xs={12} sm={6} md={4} key={profile.type}>
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                border: 2,
                                                borderColor: isSelected ? 'primary.main' : (isCurrent ? 'success.main' : 'divider'),
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease-in-out',
                                                position: 'relative',
                                                borderRadius: 2,
                                                bgcolor: isSelected ? 'primary.50' : (isCurrent ? 'success.50' : 'background.paper'),
                                                height: '100%',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    boxShadow: 3,
                                                    transform: 'translateY(-2px)',
                                                },
                                            }}
                                            onClick={() => setSelectedProfile(profile.type)}
                                        >
                                            {isCurrent && (
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: 4,
                                                    right: 4,
                                                    bgcolor: 'success.main',
                                                    color: 'white',
                                                    borderRadius: 1,
                                                    px: 0.5,
                                                    py: 0.25,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.25,
                                                    zIndex: 2,
                                                }}>
                                                    <Verified sx={{ fontSize: 12 }} />
                                                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>
                                                        ACTIF
                                                    </Typography>
                                                </Box>
                                            )}
                                            <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1 }}>
                                                    <Radio
                                                        checked={isSelected}
                                                        value={profile.type}
                                                        size="small"
                                                        sx={{ p: 0, mt: 0.1 }}
                                                    />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{
                                                                fontWeight: 700,
                                                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                                                lineHeight: 1.2,
                                                                mb: 0.25,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {profile.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                                                lineHeight: 1.2,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            {profile.description}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                {/* Icônes modules - Ultra compact */}
                                                <Box sx={{ display: 'flex', gap: 0.4, mb: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                    {profile.modules.slice(0, 4).map((moduleCode) => {
                                                        const metadata = moduleMetadata.find(m => m.code === moduleCode);
                                                        return (
                                                            <Tooltip key={moduleCode} title={metadata?.name || moduleCode} arrow placement="top">
                                                                <Box sx={{
                                                                    width: { xs: 26, sm: 30 },
                                                                    height: { xs: 26, sm: 30 },
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    borderRadius: 1,
                                                                    bgcolor: isSelected ? 'primary.main' : 'grey.100',
                                                                    color: isSelected ? 'white' : 'text.secondary',
                                                                    fontSize: { xs: 16, sm: 18 },
                                                                }}>
                                                                    {MODULE_ICONS[moduleCode] || <DashboardIcon sx={{ fontSize: 'inherit' }} />}
                                                                </Box>
                                                            </Tooltip>
                                                        );
                                                    })}
                                                    {profile.modules.length > 4 && (
                                                        <Tooltip title={`${profile.modules.length - 4} autres modules`} arrow>
                                                            <Box sx={{
                                                                width: { xs: 26, sm: 30 },
                                                                height: { xs: 26, sm: 30 },
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                borderRadius: 1,
                                                                bgcolor: 'grey.200',
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                color: 'text.secondary'
                                                            }}>
                                                                +{profile.modules.length - 4}
                                                            </Box>
                                                        </Tooltip>
                                                    )}
                                                </Box>

                                                {/* Footer ultra-compact */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    pt: 0.75,
                                                    borderTop: '1px solid',
                                                    borderColor: 'divider'
                                                }}>
                                                    <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, color: 'text.secondary', fontWeight: 600 }}>
                                                        {profile.modules.length} modules
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </RadioGroup>

                    {selectedProfile && selectedProfile !== organizationSettings?.subscription_type && (
                        <Alert
                            severity="warning"
                            sx={{
                                mt: 3,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'warning.light'
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                ⚠️ Attention
                            </Typography>
                            <Typography variant="caption">
                                Cette action modifiera les modules pour <strong>tous les utilisateurs</strong> de l'organisation.
                                La page se rechargera automatiquement.
                            </Typography>
                        </Alert>
                    )}
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={() => setUpgradeDialogOpen(false)}
                        disabled={saving}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleChangeSubscription}
                        variant="contained"
                        disabled={!selectedProfile || selectedProfile === organizationSettings?.subscription_type || saving}
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Speed />}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            boxShadow: 3,
                            '&:hover': {
                                boxShadow: 6
                            }
                        }}
                    >
                        {saving ? 'Activation en cours...' : 'Activer ce Profil'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ModuleSettings;
