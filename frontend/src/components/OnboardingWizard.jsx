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
import { useTranslation } from 'react-i18next';
import Mascot from './Mascot';

const steps = [
    'onboarding:wizard.steps.welcome',
    'onboarding:wizard.steps.companyType',
    'onboarding:wizard.steps.useCase',
    'onboarding:wizard.steps.team',
    'onboarding:wizard.steps.modules',
    'onboarding:wizard.steps.done'
];

// Profils prédéfinis
const MODULE_PROFILES = {
    basic: {
        nameKey: 'onboarding:wizard.profiles.basic.name',
        descriptionKey: 'onboarding:wizard.profiles.basic.description',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices'],
    },
    advanced: {
        nameKey: 'onboarding:wizard.profiles.advanced.name',
        descriptionKey: 'onboarding:wizard.profiles.advanced.description',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients', 'e-sourcing', 'contracts'],
    },
    complete: {
        nameKey: 'onboarding:wizard.profiles.complete.name',
        descriptionKey: 'onboarding:wizard.profiles.complete.description',
        modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients', 'e-sourcing', 'contracts'],
    },
};

// Modules disponibles avec icônes et descriptions
const AVAILABLE_MODULES = [
    { id: 'dashboard', nameKey: 'onboarding:wizard.modules.dashboard.name', icon: <DashboardIcon />, descriptionKey: 'onboarding:wizard.modules.dashboard.description' },
    { id: 'suppliers', nameKey: 'onboarding:wizard.modules.suppliers.name', icon: <Business />, descriptionKey: 'onboarding:wizard.modules.suppliers.description' },
    { id: 'purchase-orders', nameKey: 'onboarding:wizard.modules.purchaseOrders.name', icon: <ShoppingCart />, descriptionKey: 'onboarding:wizard.modules.purchaseOrders.description' },
    { id: 'invoices', nameKey: 'onboarding:wizard.modules.invoices.name', icon: <Receipt />, descriptionKey: 'onboarding:wizard.modules.invoices.description' },
    { id: 'products', nameKey: 'onboarding:wizard.modules.products.name', icon: <Inventory />, descriptionKey: 'onboarding:wizard.modules.products.description' },
    { id: 'clients', nameKey: 'onboarding:wizard.modules.clients.name', icon: <People />, descriptionKey: 'onboarding:wizard.modules.clients.description' },
    { id: 'e-sourcing', nameKey: 'onboarding:wizard.modules.eSourcing.name', icon: <CompareArrows />, descriptionKey: 'onboarding:wizard.modules.eSourcing.description' },
    { id: 'contracts', nameKey: 'onboarding:wizard.modules.contracts.name', icon: <Gavel />, descriptionKey: 'onboarding:wizard.modules.contracts.description' },
];

// Rôles : la valeur (enregistrée dans onboarding_data) reste en français,
// seul le libellé affiché est traduit.
const TEAM_ROLES = [
    { value: 'Achats', labelKey: 'onboarding:wizard.team.roles.purchasing' },
    { value: 'Comptabilité', labelKey: 'onboarding:wizard.team.roles.accounting' },
    { value: 'Direction', labelKey: 'onboarding:wizard.team.roles.management' },
    { value: 'Commercial', labelKey: 'onboarding:wizard.team.roles.sales' },
    { value: 'Logistique', labelKey: 'onboarding:wizard.team.roles.logistics' },
];

function OnboardingWizard({ open, onComplete }) {
    const { enqueueSnackbar } = useSnackbar();
    const { t } = useTranslation(['onboarding', 'common']);
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

            // Sync with Organization Settings
            await fetch('/api/v1/accounts/organization/settings/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify({
                    subscription_type: formData.selectedProfile,
                    enabled_modules: enabledModules,
                }),
            });

            if (response.ok) {
                enqueueSnackbar(t('onboarding:wizard.messages.success'), { variant: 'success' });
                onComplete(enabledModules);
            } else {
                throw new Error('Erreur lors de la sauvegarde');
            }
        } catch (error) {
            console.error('Onboarding error:', error);
            enqueueSnackbar(t('onboarding:wizard.messages.error'), { variant: 'error' });
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
                            {t('onboarding:wizard.welcome.title')}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4, maxWidth: 600, mx: 'auto' }}>
                            {t('onboarding:wizard.welcome.text')}
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleNext}
                            sx={{ mt: 2 }}
                        >
                            {t('onboarding:actions.start')}
                        </Button>
                    </Box>
                );

            case 1: // Type d'entreprise
                return (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                            {t('onboarding:wizard.company.title')}
                        </Typography>

                        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                {t('onboarding:wizard.company.type')}
                            </Typography>
                            <RadioGroup
                                value={formData.companyType}
                                onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                            >
                                <FormControlLabel value="sme" control={<Radio />} label={t('onboarding:wizard.company.types.sme')} />
                                <FormControlLabel value="large" control={<Radio />} label={t('onboarding:wizard.company.types.large')} />
                                <FormControlLabel value="startup" control={<Radio />} label={t('onboarding:wizard.company.types.startup')} />
                                <FormControlLabel value="nonprofit" control={<Radio />} label={t('onboarding:wizard.company.types.nonprofit')} />
                            </RadioGroup>
                        </FormControl>

                        <TextField
                            fullWidth
                            label={t('onboarding:wizard.company.sector')}
                            placeholder={t('onboarding:wizard.company.sectorPlaceholder')}
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
                            {t('onboarding:wizard.useCase.title')}
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
                                                    {t('onboarding:wizard.useCase.simplePurchases.title')}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {t('onboarding:wizard.useCase.simplePurchases.desc')}
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
                                                    {t('onboarding:wizard.useCase.sourcing.title')}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {t('onboarding:wizard.useCase.sourcing.desc')}
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
                                                    {t('onboarding:wizard.useCase.complete.title')}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {t('onboarding:wizard.useCase.complete.desc')}
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
                            {t('onboarding:wizard.team.title')}
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>{t('onboarding:wizard.team.size')}</InputLabel>
                            <Select
                                value={formData.teamSize}
                                label={t('onboarding:wizard.team.size')}
                                onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                            >
                                <MenuItem value="1-10">{t('onboarding:wizard.team.sizes.small')}</MenuItem>
                                <MenuItem value="11-50">{t('onboarding:wizard.team.sizes.medium')}</MenuItem>
                                <MenuItem value="51-200">{t('onboarding:wizard.team.sizes.large')}</MenuItem>
                                <MenuItem value="200+">{t('onboarding:wizard.team.sizes.xlarge')}</MenuItem>
                            </Select>
                        </FormControl>

                        <Typography variant="subtitle1" gutterBottom>
                            {t('onboarding:wizard.team.rolesTitle')}
                        </Typography>
                        <FormGroup>
                            {TEAM_ROLES.map(({ value: role, labelKey }) => (
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
                                    label={t(labelKey)}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                );

            case 4: // Modules
                return (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                            {t('onboarding:wizard.modulesStep.title')}
                        </Typography>

                        {!formData.isCustom ? (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    {t('onboarding:wizard.modulesStep.profileHint')}
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
                                                            {t(profile.nameKey)}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                            {t(profile.descriptionKey)}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {profile.modules.map((mod) => (
                                                                <Chip key={mod} label={t(AVAILABLE_MODULES.find(m => m.id === mod)?.nameKey)} size="small" />
                                                            ))}
                                                        </Box>
                                                    </CardContent>
                                                </CardActionArea>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Button variant="outlined" onClick={handleCustomToggle} fullWidth>
                                    {t('onboarding:wizard.modulesStep.customize')}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {t('onboarding:wizard.modulesStep.customHint')}
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
                                                        {t(module.nameKey)}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    {t(module.descriptionKey)}
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
                                    {t('onboarding:wizard.modulesStep.backToProfiles')}
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
                            {t('onboarding:wizard.done.title')}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4, maxWidth: 600, mx: 'auto' }}>
                            {t('onboarding:wizard.done.text')}
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleComplete}
                            startIcon={<CheckCircle />}
                        >
                            {t('onboarding:wizard.done.start')}
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
                            <StepLabel>{t(label)}</StepLabel>
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
                            {t('onboarding:actions.previous')}
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={activeStep === steps.length - 1}
                        >
                            {activeStep === steps.length - 2 ? t('onboarding:actions.finish') : t('onboarding:actions.next')}
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default OnboardingWizard;

