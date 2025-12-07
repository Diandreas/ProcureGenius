/**
 * Page d'onboarding dédiée - Configuration initiale de l'organisation
 * Étapes : Informations entreprise → Paramètres légaux → Modules → Terminé
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Avatar,
  IconButton,
  Alert,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Business,
  Upload,
  CheckCircle,
  Dashboard as DashboardIcon,
  ShoppingCart,
  Receipt,
  Inventory,
  People,
  CompareArrows,
  Gavel,
  Analytics,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import Mascot from '../../components/Mascot';
import api from '../../services/api';

const steps = ['Votre entreprise', 'Paramètres fiscaux', 'Modules', 'Terminé'];

// Modules disponibles
const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Tableau de bord', icon: <DashboardIcon />, required: true },
  { id: 'suppliers', name: 'Fournisseurs', icon: <Business />, recommended: true },
  { id: 'purchase-orders', name: 'Bons de commande', icon: <ShoppingCart />, recommended: true },
  { id: 'invoices', name: 'Factures', icon: <Receipt />, recommended: true },
  { id: 'products', name: 'Produits & Stock', icon: <Inventory /> },
  { id: 'clients', name: 'Clients', icon: <People /> },
  { id: 'e-sourcing', name: 'E-Sourcing (RFQ)', icon: <CompareArrows /> },
  { id: 'contracts', name: 'Contrats', icon: <Gavel /> },
  { id: 'analytics', name: 'Analytics', icon: <Analytics /> },
];

// Régions fiscales
const TAX_REGIONS = [
  { value: 'cameroon', label: 'Cameroun (OHADA)' },
  { value: 'ohada', label: 'Zone OHADA (Afrique francophone)' },
  { value: 'canada', label: 'Canada' },
  { value: 'eu', label: 'Union Européenne' },
  { value: 'usa', label: 'États-Unis' },
  { value: 'international', label: 'International' },
];

function OnboardingSetup() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  const [formData, setFormData] = useState({
    // Étape 1 : Informations entreprise
    companyName: '',
    sector: '',
    logo: null,

    // Étape 2 : Paramètres fiscaux
    taxRegion: 'international',
    companyNiu: '',
    companyRcNumber: '',
    companyTaxNumber: '',
    companyVatNumber: '',
    companyGstNumber: '',
    companyQstNumber: '',
    companyNeq: '',
    defaultCurrency: 'CAD',
    defaultTaxRate: 15,

    // Étape 3 : Modules
    selectedModules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices'],
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModuleToggle = (moduleId) => {
    setFormData(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(moduleId)
        ? prev.selectedModules.filter(id => id !== moduleId && id !== 'dashboard') // Can't remove dashboard
        : [...prev.selectedModules, moduleId]
    }));
  };

  const handleNext = () => {
    // Validation par étape
    if (activeStep === 0) {
      if (!formData.companyName.trim()) {
        enqueueSnackbar('Le nom de l\'entreprise est requis', { variant: 'error' });
        return;
      }
    }

    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // 1. Sauvegarder les paramètres de l'organisation
      const settingsFormData = new FormData();
      settingsFormData.append('company_name', formData.companyName);
      settingsFormData.append('tax_region', formData.taxRegion);
      settingsFormData.append('default_currency', formData.defaultCurrency);
      settingsFormData.append('default_tax_rate', formData.defaultTaxRate);

      if (formData.logo) {
        settingsFormData.append('company_logo', formData.logo);
      }

      // Paramètres fiscaux selon la région
      if (formData.taxRegion === 'cameroon' || formData.taxRegion === 'ohada') {
        if (formData.companyNiu) settingsFormData.append('company_niu', formData.companyNiu);
        if (formData.companyRcNumber) settingsFormData.append('company_rc_number', formData.companyRcNumber);
        if (formData.companyTaxNumber) settingsFormData.append('company_tax_number', formData.companyTaxNumber);
      } else if (formData.taxRegion === 'canada') {
        if (formData.companyNeq) settingsFormData.append('company_neq', formData.companyNeq);
        if (formData.companyGstNumber) settingsFormData.append('company_gst_number', formData.companyGstNumber);
        if (formData.companyQstNumber) settingsFormData.append('company_qst_number', formData.companyQstNumber);
      } else if (formData.taxRegion === 'eu') {
        if (formData.companyVatNumber) settingsFormData.append('company_vat_number', formData.companyVatNumber);
      }

      // Add enabled_modules to sync with Organization
      settingsFormData.append('enabled_modules', JSON.stringify(formData.selectedModules));

      // Use correct endpoint for organization settings
      await api.post('/accounts/organization/settings/', settingsFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 2. Sauvegarder les préférences utilisateur (modules et onboarding complété)
      await api.put('/accounts/preferences/', {
        enabled_modules: formData.selectedModules,
        onboarding_completed: true,
        onboarding_data: {
          completed_at: new Date().toISOString(),
          company_name: formData.companyName,
          tax_region: formData.taxRegion,
          selected_modules: formData.selectedModules,
        },
      });

      // 3. Créer un layout de dashboard par défaut pour ce nouvel utilisateur
      try {
        await api.post('/analytics/layouts/', {
          name: 'default',
          is_default: true,
          layout: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
            { i: 'revenue-chart', x: 0, y: 2, w: 6, h: 3, minW: 4, minH: 3 },
            { i: 'recent-activity', x: 6, y: 2, w: 6, h: 3, minW: 4, minH: 3 },
          ],
          widgets: ['stats', 'revenue-chart', 'recent-activity'],
        });
      } catch (error) {
        console.warn('Could not create default layout:', error);
        // Continue anyway - layout can be created later
      }

      enqueueSnackbar('Configuration terminée avec succès !', { variant: 'success' });

      // Rediriger vers le dashboard avec rechargement complet
      setTimeout(() => {
        window.location.href = '/dashboard'; // Force full page reload to update all state
      }, 1500);

    } catch (error) {
      console.error('Onboarding error:', error);
      enqueueSnackbar('Erreur lors de la sauvegarde. Veuillez réessayer.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Informations entreprise
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Informations sur votre entreprise
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ces informations apparaîtront sur vos documents (factures, bons de commande, etc.)
            </Typography>

            <Grid container spacing={3}>
              {/* Logo */}
              <Grid item xs={12} sx={{ textAlign: 'center' }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="logo-upload"
                  type="file"
                  onChange={handleLogoUpload}
                />
                <label htmlFor="logo-upload">
                  <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                    <Avatar
                      src={logoPreview}
                      sx={{ width: 100, height: 100, mb: 1, bgcolor: 'primary.light' }}
                    >
                      <Business sx={{ fontSize: 50 }} />
                    </Avatar>
                    <Button
                      component="span"
                      variant="outlined"
                      startIcon={<Upload />}
                      size="small"
                    >
                      Ajouter un logo
                    </Button>
                  </Box>
                </label>
              </Grid>

              {/* Nom de l'entreprise */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Nom de l'entreprise"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Ex: ACME Corporation"
                />
              </Grid>

              {/* Secteur d'activité */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Secteur d'activité"
                  value={formData.sector}
                  onChange={(e) => handleChange('sector', e.target.value)}
                  placeholder="Ex: Distribution, Services, Manufacture..."
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Paramètres fiscaux
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Paramètres fiscaux et légaux
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configurez vos paramètres fiscaux selon votre région
            </Typography>

            <Grid container spacing={3}>
              {/* Région fiscale */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Région fiscale</InputLabel>
                  <Select
                    value={formData.taxRegion}
                    onChange={(e) => handleChange('taxRegion', e.target.value)}
                    label="Région fiscale"
                  >
                    {TAX_REGIONS.map(region => (
                      <MenuItem key={region.value} value={region.value}>
                        {region.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Devise */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Devise par défaut</InputLabel>
                  <Select
                    value={formData.defaultCurrency}
                    onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                    label="Devise par défaut"
                  >
                    <MenuItem value="CAD">CAD - Dollar canadien</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="USD">USD - Dollar américain</MenuItem>
                    <MenuItem value="XAF">XAF - Franc CFA (Afrique centrale)</MenuItem>
                    <MenuItem value="XOF">XOF - Franc CFA (Afrique de l'Ouest)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Taux de taxe par défaut */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Taux de taxe par défaut (%)"
                  type="number"
                  value={formData.defaultTaxRate}
                  onChange={(e) => handleChange('defaultTaxRate', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: 0, max: 100 }}
                />
              </Grid>

              {/* Champs conditionnels selon la région */}
              {(formData.taxRegion === 'cameroon' || formData.taxRegion === 'ohada') && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="NIU (Numéro Identifiant Unique)"
                      value={formData.companyNiu}
                      onChange={(e) => handleChange('companyNiu', e.target.value)}
                      placeholder="Ex: M012345678901Z"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Numéro de Registre de Commerce (RC)"
                      value={formData.companyRcNumber}
                      onChange={(e) => handleChange('companyRcNumber', e.target.value)}
                    />
                  </Grid>
                </>
              )}

              {formData.taxRegion === 'canada' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="NEQ (Numéro d'entreprise du Québec)"
                      value={formData.companyNeq}
                      onChange={(e) => handleChange('companyNeq', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Numéro TPS/TVH (GST/HST)"
                      value={formData.companyGstNumber}
                      onChange={(e) => handleChange('companyGstNumber', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Numéro TVQ (QST)"
                      value={formData.companyQstNumber}
                      onChange={(e) => handleChange('companyQstNumber', e.target.value)}
                    />
                  </Grid>
                </>
              )}

              {formData.taxRegion === 'eu' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Numéro de TVA intracommunautaire"
                    value={formData.companyVatNumber}
                    onChange={(e) => handleChange('companyVatNumber', e.target.value)}
                    placeholder="Ex: FR12345678901"
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 2: // Sélection des modules
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Choisissez vos modules
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sélectionnez les fonctionnalités dont vous avez besoin. Vous pourrez les modifier plus tard.
            </Typography>

            <Grid container spacing={2}>
              {AVAILABLE_MODULES.map(module => {
                const isSelected = formData.selectedModules.includes(module.id);
                const isRequired = module.required;
                const isRecommended = module.recommended;

                return (
                  <Grid item xs={12} sm={6} md={4} key={module.id}>
                    <Card
                      sx={{
                        cursor: isRequired ? 'default' : 'pointer',
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'primary.50' : 'background.paper',
                        opacity: isRequired ? 0.7 : 1,
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: isRequired ? 'none' : 'translateY(-2px)',
                          boxShadow: isRequired ? 1 : 3,
                        },
                      }}
                      onClick={() => !isRequired && handleModuleToggle(module.id)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ color: isSelected ? 'primary.main' : 'text.secondary', mr: 1 }}>
                            {module.icon}
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                            {module.name}
                          </Typography>
                          {isSelected && <CheckCircle color="primary" fontSize="small" />}
                        </Box>
                        {isRequired && (
                          <Chip label="Requis" size="small" color="primary" sx={{ mt: 1 }} />
                        )}
                        {!isRequired && isRecommended && (
                          <Chip label="Recommandé" size="small" color="secondary" sx={{ mt: 1 }} />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Vous avez sélectionné {formData.selectedModules.length} module(s). Vous pourrez activer ou désactiver
              des modules à tout moment depuis les paramètres.
            </Alert>
          </Box>
        );

      case 3: // Terminé
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Mascot pose="celebration" animation="bounce" size={150} />
            <Typography variant="h5" sx={{ mt: 3, mb: 2, fontWeight: 700 }}>
              Tout est prêt !
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Votre espace de travail est configuré et prêt à l'emploi.
            </Typography>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration :
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🏢 {formData.companyName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🌍 {TAX_REGIONS.find(r => r.value === formData.taxRegion)?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                💰 {formData.defaultCurrency}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                📦 {formData.selectedModules.length} modules activés
              </Typography>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Mascot pose="happy" animation="float" size={80} />
          <Typography variant="h4" sx={{ mt: 2, fontWeight: 700 }}>
            Configuration de votre espace
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quelques étapes pour personnaliser votre expérience
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={(activeStep / (steps.length - 1)) * 100}
          sx={{ mb: 4, borderRadius: 2, height: 6 }}
        />

        {/* Content */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || loading}
            variant="outlined"
          >
            Retour
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleComplete}
              disabled={loading}
              size="large"
            >
              {loading ? 'Finalisation...' : 'Accéder au dashboard'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              Suivant
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  );
}

export default OnboardingSetup;
