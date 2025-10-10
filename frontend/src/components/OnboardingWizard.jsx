import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    Stepper,
    Step,
    StepLabel,
    Box,
    Typography,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    RadioGroup,
    FormControlLabel,
    Radio,
    Checkbox,
    FormGroup,
    Grid,
    Card,
    CardActionArea,
    CardContent,
    Paper,
    Chip,
} from '@mui/material';
import {
    Business,
    People,
    Settings,
    CheckCircle,
    ShoppingCart,
    Receipt,
    Inventory,
    CompareArrows,
    Gavel,
    Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import Mascot from './Mascot';

const steps = [
    'Bienvenue',
    'Type d\'entreprise',
    'Cas d\'usage',
    'Équipe',
    'Modules',
    'Terminé'
];

// Profils prédéfinis
const MODULE_PROFILES = {
    basic: {
        name: 'Basique',
        description: 'Pour les achats simples et la facturation',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices'],
    },
    advanced: {
        name: 'Avancé',
        description: 'PME avec sourcing et gestion des contrats',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients', 'e-sourcing', 'contracts'],
    },
    complete: {
        name: 'Complet',
        description: 'Toutes les fonctionnalités pour grandes entreprises',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients', 'e-sourcing', 'contracts'],
    },
};

// Modules disponibles avec icônes et descriptions
const AVAILABLE_MODULES = [
    { id: 'dashboard', name: 'Tableau de bord', icon: <DashboardIcon />, description: 'Vue d\'ensemble et statistiques' },
    { id: 'suppliers', name: 'Fournisseurs', icon: <Business />, description: 'Gestion des fournisseurs' },
    { id: 'purchase-orders', name: 'Bons de commande', icon: <ShoppingCart />, description: 'Gestion des achats' },
    { id: 'invoices', name: 'Factures', icon: <Receipt />, description: 'Facturation et paiements' },
    { id: 'products', name: 'Produits', icon: <Inventory />, description: 'Catalogue produits et stock' },
    { id: 'clients', name: 'Clients', icon: <People />, description: 'Gestion de la clientèle' },
    { id: 'e-sourcing', name: 'E-Sourcing', icon: <CompareArrows />, description: 'Appels d\'offres (RFQ)' },
    { id: 'contracts', name: 'Contrats', icon: <Gavel />, description: 'Gestion des contrats' },
];

function OnboardingWizard({ open, onComplete }) {
    const { enqueueSnackbar } = useSnackbar();
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({
        // Étape 2: Type d'entreprise
        companyType: 'sme',
        sector: '',

        // Étape 3: Cas d'usage
        useCase: 'simple_purchases',

        // Étape 4: Équipe
        teamSize: '1-10',
        mainRoles: [],

        // Étape 5: Modules
        selectedProfile: 'basic',
        customModules: [],
        isCustom: false,
    });

    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const handleComplete = async () => {
        try {
            // Déterminer les modules activés
            const enabledModules = formData.isCustom
                ? formData.customModules
                : MODULE_PROFILES[formData.selectedProfile].modules;

            const onboardingData = {
                companyType: formData.companyType,
                sector: formData.sector,
                useCase: formData.useCase,
                teamSize: formData.teamSize,
                mainRoles: formData.mainRoles,
                selectedProfile: formData.selectedProfile,
                isCustom: formData.isCustom,
            };

            // Appeler l'API pour sauvegarder les préférences
            const response = await fetch('/api/v1/accounts/preferences/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify({
                    enabled_modules: enabledModules,
                    onboarding_completed: true,
                    onboarding_data: onboardingData,
                }),
            });

            if (response.ok) {
                enqueueSnackbar('Configuration terminée avec succès!', { variant: 'success' });
                onComplete(enabledModules);
            } else {
                throw new Error('Erreur lors de la sauvegarde');
            }
        } catch (error) {
            console.error('Onboarding error:', error);
            enqueueSnackbar('Erreur lors de la configuration', { variant: 'error' });
        }
    };

    const handleProfileSelect = (profile) => {
        setFormData({
            ...formData,
            selectedProfile: profile,
            isCustom: false,
            customModules: MODULE_PROFILES[profile].modules,
        });
    };

    const handleCustomToggle = () => {
        setFormData({
            ...formData,
            isCustom: true,
            customModules: formData.customModules.length > 0
                ? formData.customModules
                : MODULE_PROFILES[formData.selectedProfile].modules,
        });
    };

    const handleModuleToggle = (moduleId) => {
        const newModules = formData.customModules.includes(moduleId)
            ? formData.customModules.filter(m => m !== moduleId)
            : [...formData.customModules, moduleId];

        setFormData({ ...formData, customModules: newModules });
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0: // Bienvenue
                return (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                            <Mascot pose="excited" animation="bounce" size={120} />
                        </Box>
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                            Bienvenue sur ProcureGenius! 🎉
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4, maxWidth: 600, mx: 'auto' }}>
                            Je suis ravi de vous accompagner dans la configuration de votre espace.
                            En quelques étapes, nous allons personnaliser l'application selon vos besoins.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleNext}
                            sx={{ mt: 2 }}
                        >
                            Commencer
                        </Button>
                    </Box>
                );

            case 1: // Type d'entreprise
                return (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                            Parlez-nous de votre entreprise
                        </Typography>

                        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Type d'entreprise
                            </Typography>
                            <RadioGroup
                                value={formData.companyType}
                                onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                            >
                                <FormControlLabel value="sme" control={<Radio />} label="PME (Petite et Moyenne Entreprise)" />
                                <FormControlLabel value="large" control={<Radio />} label="Grande entreprise" />
                                <FormControlLabel value="startup" control={<Radio />} label="Startup" />
                                <FormControlLabel value="nonprofit" control={<Radio />} label="Organisation à but non lucratif" />
                            </RadioGroup>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Secteur d'activité"
                            placeholder="Ex: Technologie, Commerce, Services..."
                            value={formData.sector}
                            onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                            sx={{ mb: 2 }}
                        />
                    </Box>
                );

            case 2: // Cas d'usage
                return (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                            Quel est votre besoin principal?
                        </Typography>

                        <FormControl component="fieldset" fullWidth>
                            <RadioGroup
                                value={formData.useCase}
                                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                            >
                                <Paper sx={{ p: 2, mb: 2, cursor: 'pointer' }} elevation={formData.useCase === 'simple_purchases' ? 3 : 1}>
                                    <FormControlLabel
                                        value="simple_purchases"
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    Achats simples et facturation
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Gérer les fournisseurs, créer des bons de commande et suivre les factures
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ width: '100%' }}
                                    />
                                </Paper>

                                <Paper sx={{ p: 2, mb: 2, cursor: 'pointer' }} elevation={formData.useCase === 'sourcing' ? 3 : 1}>
                                    <FormControlLabel
                                        value="sourcing"
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    E-Sourcing et appels d'offres
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Comparer les offres fournisseurs, gérer les RFQ et optimiser les achats
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ width: '100%' }}
                                    />
                                </Paper>

                                <Paper sx={{ p: 2, cursor: 'pointer' }} elevation={formData.useCase === 'complete' ? 3 : 1}>
                                    <FormControlLabel
                                        value="complete"
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    Gestion complète
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Toutes les fonctionnalités: achats, stocks, contrats, facturation, analytics
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ width: '100%' }}
                                    />
                                </Paper>
                            </RadioGroup>
                        </FormControl>
                    </Box>
                );

            case 3: // Équipe
                return (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                            Votre équipe
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Taille de l'équipe</InputLabel>
                            <Select
                                value={formData.teamSize}
                                label="Taille de l'équipe"
                                onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                            >
                                <MenuItem value="1-10">1-10 employés</MenuItem>
                                <MenuItem value="11-50">11-50 employés</MenuItem>
                                <MenuItem value="51-200">51-200 employés</MenuItem>
                                <MenuItem value="200+">Plus de 200 employés</MenuItem>
                            </Select>
                        </FormControl>

                        <Typography variant="subtitle1" gutterBottom>
                            Rôles principaux dans votre équipe
                        </Typography>
                        <FormGroup>
                            {['Achats', 'Comptabilité', 'Direction', 'Commercial', 'Logistique'].map((role) => (
                                <FormControlLabel
                                    key={role}
                                    control={
                                        <Checkbox
                                            checked={formData.mainRoles.includes(role)}
                                            onChange={(e) => {
                                                const newRoles = e.target.checked
                                                    ? [...formData.mainRoles, role]
                                                    : formData.mainRoles.filter(r => r !== role);
                                                setFormData({ ...formData, mainRoles: newRoles });
                                            }}
                                        />
                                    }
                                    label={role}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                );

            case 4: // Modules
                return (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                            Choisissez vos modules
                        </Typography>

                        {!formData.isCustom ? (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Sélectionnez un profil prédéfini ou personnalisez vos modules
                                </Typography>

                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    {Object.entries(MODULE_PROFILES).map(([key, profile]) => (
                                        <Grid item xs={12} md={4} key={key}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    border: formData.selectedProfile === key ? 2 : 0,
                                                    borderColor: 'primary.main',
                                                }}
                                            >
                                                <CardActionArea onClick={() => handleProfileSelect(key)} sx={{ height: '100%', p: 2 }}>
                                                    <CardContent>
                                                        <Typography variant="h6" gutterBottom>
                                                            {profile.name}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                            {profile.description}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {profile.modules.map((mod) => (
                                                                <Chip key={mod} label={AVAILABLE_MODULES.find(m => m.id === mod)?.name} size="small" />
                                                            ))}
                                                        </Box>
                                                    </CardContent>
                                                </CardActionArea>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Button variant="outlined" onClick={handleCustomToggle} fullWidth>
                                    Personnaliser les modules
                                </Button>
                            </>
                        ) : (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Sélectionnez les modules que vous souhaitez utiliser
                                </Typography>

                                <Grid container spacing={2}>
                                    {AVAILABLE_MODULES.map((module) => (
                                        <Grid item xs={12} sm={6} key={module.id}>
                                            <Paper
                                                sx={{
                                                    p: 2,
                                                    cursor: 'pointer',
                                                    border: formData.customModules.includes(module.id) ? 2 : 1,
                                                    borderColor: formData.customModules.includes(module.id) ? 'primary.main' : 'divider',
                                                    '&:hover': { borderColor: 'primary.light' },
                                                }}
                                                onClick={() => handleModuleToggle(module.id)}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <Checkbox
                                                        checked={formData.customModules.includes(module.id)}
                                                        sx={{ mr: 1 }}
                                                    />
                                                    <Box sx={{ mr: 1, color: 'primary.main' }}>{module.icon}</Box>
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                        {module.name}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    {module.description}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Button
                                    variant="text"
                                    onClick={() => setFormData({ ...formData, isCustom: false })}
                                    sx={{ mt: 2 }}
                                >
                                    Retour aux profils prédéfinis
                                </Button>
                            </>
                        )}
                    </Box>
                );

            case 5: // Terminé
                return (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                            <Mascot pose="thumbup" animation="bounce" size={120} />
                        </Box>
                        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                            Configuration terminée! 🎉
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4, maxWidth: 600, mx: 'auto' }}>
                            Votre espace est prêt. Vous pouvez toujours modifier ces paramètres dans les réglages.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleComplete}
                            startIcon={<CheckCircle />}
                        >
                            Commencer à utiliser ProcureGenius
                        </Button>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog
            open={open}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { minHeight: '70vh' }
            }}
        >
            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Box sx={{ minHeight: 400 }}>
                    {renderStepContent()}
                </Box>

                {activeStep !== 0 && activeStep !== 5 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                        <Button
                            onClick={handleBack}
                            disabled={activeStep === 0}
                        >
                            Précédent
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={activeStep === steps.length - 1}
                        >
                            {activeStep === steps.length - 2 ? 'Terminer' : 'Suivant'}
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default OnboardingWizard;

