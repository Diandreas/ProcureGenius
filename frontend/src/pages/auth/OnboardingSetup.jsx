/**
 * Page d'onboarding dédiée - Configuration initiale de l'organisation
 * Étapes : Entreprise → Fiscal → Modules → Terminé
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
  Alert,
  Paper,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Business,
  CheckCircle,
  Dashboard as DashboardIcon,
  ShoppingCart,
  Receipt,
  Inventory,
  People,
  CompareArrows,
  Gavel,
  Analytics,
  CloudUpload,
  CelebrationOutlined,
  LocationOn,
  AccountBalance,
  SmartToy,
  Description,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

const steps = ['Entreprise', 'Fiscal', 'Modules'];

// Modules disponibles — doit correspondre exactement aux codes dans apps/core/modules.py
const AVAILABLE_MODULES = [
  {
    id: 'dashboard',
    name: 'Tableau de bord',
    description: 'Vue d\'ensemble, statistiques et activité récente',
    icon: <DashboardIcon />,
    required: true,
  },
  {
    id: 'suppliers',
    name: 'Fournisseurs',
    description: 'Gestion de votre base fournisseurs',
    icon: <Business />,
    recommended: true,
  },
  {
    id: 'purchase-orders',
    name: 'Bons de commande',
    description: 'Création et suivi des commandes fournisseurs',
    icon: <ShoppingCart />,
    recommended: true,
    requires: 'suppliers',
  },
  {
    id: 'invoices',
    name: 'Factures',
    description: 'Facturation clients et suivi des paiements',
    icon: <Receipt />,
    recommended: true,
  },
  {
    id: 'clients',
    name: 'Clients',
    description: 'Gestion de votre portefeuille clients',
    icon: <People />,
    recommended: true,
  },
  {
    id: 'products',
    name: 'Produits & Stock',
    description: 'Catalogue produits et gestion des stocks',
    icon: <Inventory />,
  },
  {
    id: 'accounting',
    name: 'Comptabilité',
    description: 'Écritures comptables en partie double, plan comptable',
    icon: <AccountBalance />,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Rapports, analyses et tableaux de bord avancés',
    icon: <Analytics />,
  },
  {
    id: 'contracts',
    name: 'Contrats',
    description: 'Gestion et suivi des contrats fournisseurs',
    icon: <Description />,
    requires: 'suppliers',
  },
  {
    id: 'e-sourcing',
    name: 'E-Sourcing (RFQ)',
    description: 'Appels d\'offres et mise en concurrence des fournisseurs',
    icon: <CompareArrows />,
    requires: 'suppliers',
  },
  {
    id: 'ai-assistant',
    name: 'Assistant IA',
    description: 'Automatisation intelligente de toutes vos tâches',
    icon: <SmartToy />,
  },
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

  // Pre-fill company name from Redux state
  const reduxCompanyName = useSelector(
    (state) =>
      state?.settings?.companyName ||
      state?.auth?.user?.organization?.name ||
      state?.auth?.user?.organization_name ||
      ''
  );

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  const [formData, setFormData] = useState({
    // Étape 0 : Informations entreprise
    companyName: reduxCompanyName,
    address: '',
    logo: null,

    // Étape 1 : Paramètres fiscaux
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

    // Étape 2 : Modules — sélection par défaut recommandée
    selectedModules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'clients'],
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
    const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
    setFormData(prev => {
      const current = prev.selectedModules;
      if (current.includes(moduleId)) {
        // Désactiver ce module + tous ceux qui en dépendent
        const dependents = AVAILABLE_MODULES
          .filter(m => m.requires === moduleId)
          .map(m => m.id);
        return {
          ...prev,
          selectedModules: current.filter(id => id !== moduleId && !dependents.includes(id)),
        };
      } else {
        // Activer ce module + sa dépendance si nécessaire
        const toAdd = [moduleId];
        if (module?.requires && !current.includes(module.requires)) {
          toAdd.push(module.requires);
        }
        return {
          ...prev,
          selectedModules: [...current, ...toAdd],
        };
      }
    });
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!formData.companyName.trim()) {
        enqueueSnackbar("Le nom de l'entreprise est requis", { variant: 'error' });
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
      settingsFormData.append('default_tax_rate', isNaN(formData.defaultTaxRate) ? 0 : formData.defaultTaxRate);

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
      console.log('Onboarding POST data:', Object.fromEntries(settingsFormData));
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

      // Afficher l'écran de célébration
      setActiveStep(3);
    } catch (error) {
      console.error('Onboarding error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Erreur inconnue';
      console.error('Onboarding error detail:', errorMsg, 'Status:', error.response?.status, 'Data:', error.response?.data);
      enqueueSnackbar(`Erreur: ${errorMsg}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = activeStep >= 3 ? 100 : Math.round((activeStep / steps.length) * 100);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Informations entreprise
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
              Votre entreprise
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Ces informations apparaîtront sur vos documents (factures, bons de commande, etc.)
            </Typography>

            <Grid container spacing={3}>
              {/* Logo upload zone */}
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                  Logo de l'entreprise
                </Typography>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="logo-upload"
                  type="file"
                  onChange={handleLogoUpload}
                />
                <label htmlFor="logo-upload" style={{ display: 'block', width: 'fit-content' }}>
                  <Box
                    sx={{
                      width: 180,
                      height: 120,
                      border: '2px dashed',
                      borderColor: logoPreview ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      bgcolor: logoPreview ? 'transparent' : 'action.hover',
                      transition: 'border-color 0.2s, background-color 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'primary.50',
                      },
                    }}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <>
                        <CloudUpload sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
                        <Typography variant="caption" color="text.secondary" align="center" sx={{ px: 1 }}>
                          Cliquez pour ajouter votre logo
                        </Typography>
                      </>
                    )}
                  </Box>
                </label>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.75, display: 'block' }}>
                  (apparaîtra sur vos documents)
                </Typography>
              </Grid>

              {/* Nom de l'entreprise */}
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Nom de l'entreprise"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Ex: ACME Corporation"
                  helperText={reduxCompanyName ? 'Pré-rempli depuis votre inscription' : ''}
                />
              </Grid>

              {/* Adresse */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ville / Pays"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Ex: Douala, Cameroun"
                  InputProps={{
                    startAdornment: (
                      <LocationOn sx={{ color: 'text.disabled', mr: 0.5, fontSize: 20 }} />
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Paramètres fiscaux
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
              Région & Devise
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Configurez vos paramètres fiscaux selon votre région d'activité
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
                    <MenuItem value="CAD">CAD — Dollar canadien</MenuItem>
                    <MenuItem value="EUR">EUR — Euro</MenuItem>
                    <MenuItem value="USD">USD — Dollar américain</MenuItem>
                    <MenuItem value="XAF">XAF — Franc CFA (Afrique centrale)</MenuItem>
                    <MenuItem value="XOF">XOF — Franc CFA (Afrique de l'Ouest)</MenuItem>
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
                  <Grid item xs={12}>
                    <Divider>
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                        Identifiants légaux (OHADA)
                      </Typography>
                    </Divider>
                  </Grid>
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
                  <Grid item xs={12}>
                    <Divider>
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                        Identifiants légaux (Canada)
                      </Typography>
                    </Divider>
                  </Grid>
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
                <>
                  <Grid item xs={12}>
                    <Divider>
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                        Identifiants légaux (UE)
                      </Typography>
                    </Divider>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Numéro de TVA intracommunautaire"
                      value={formData.companyVatNumber}
                      onChange={(e) => handleChange('companyVatNumber', e.target.value)}
                      placeholder="Ex: FR12345678901"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        );

      case 2: // Sélection des modules
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
              Modules
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Sélectionnez les fonctionnalités dont vous avez besoin. Vous pourrez les modifier à tout moment.
            </Typography>

            <Grid container spacing={2}>
              {AVAILABLE_MODULES.map(module => {
                const isSelected = formData.selectedModules.includes(module.id);
                const isRequired = module.required;
                const isRecommended = module.recommended;
                const depName = module.requires
                  ? AVAILABLE_MODULES.find(m => m.id === module.requires)?.name
                  : null;

                return (
                  <Grid item xs={12} sm={6} md={4} key={module.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: isRequired ? 'default' : 'pointer',
                        border: '1.5px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'primary.50' : 'background.paper',
                        transition: 'all 0.15s ease',
                        height: '100%',
                        '&:hover': {
                          borderColor: isRequired ? 'divider' : 'primary.main',
                          transform: isRequired ? 'none' : 'translateY(-2px)',
                          boxShadow: isRequired ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
                        },
                      }}
                      onClick={() => !isRequired && handleModuleToggle(module.id)}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Box
                            sx={{
                              color: isSelected ? 'primary.main' : 'text.secondary',
                              mr: 1.5,
                              mt: 0.25,
                              flexShrink: 0,
                            }}
                          >
                            {module.icon}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {module.name}
                            </Typography>
                            {module.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                                {module.description}
                              </Typography>
                            )}
                            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {isRequired && (
                                <Chip label="Requis" size="small" color="primary" variant="outlined" />
                              )}
                              {!isRequired && isRecommended && (
                                <Chip label="Recommandé" size="small" color="success" variant="outlined" />
                              )}
                              {depName && (
                                <Chip label={`Nécessite : ${depName}`} size="small" color="default" variant="outlined" />
                              )}
                            </Box>
                          </Box>
                          {isSelected && (
                            <CheckCircle color="primary" fontSize="small" sx={{ flexShrink: 0, mt: 0.25, ml: 0.5 }} />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
              <strong>{formData.selectedModules.length} module(s) sélectionné(s).</strong>{' '}
              Vous pourrez activer ou désactiver des modules à tout moment depuis les Paramètres.
            </Alert>
          </Box>
        );

      case 3: // Terminé — écran de célébration
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <CelebrationOutlined sx={{ fontSize: 40, color: 'success.dark' }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Tout est prêt !
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Votre espace de travail est configuré et prêt à l'emploi.
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 2,
                textAlign: 'left',
                maxWidth: 420,
                mx: 'auto',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                Récapitulatif de votre configuration
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Business fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Entreprise
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formData.companyName}
                    </Typography>
                  </Box>
                </Box>

                {formData.address && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <LocationOn fontSize="small" color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Localisation
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formData.address}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AccountBalance fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Région fiscale & devise
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {TAX_REGIONS.find(r => r.value === formData.taxRegion)?.label} — {formData.defaultCurrency}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CheckCircle fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Modules activés
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formData.selectedModules.length} module(s)
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  const isCompletionScreen = activeStep === 3;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Configuration de votre espace
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quelques étapes pour personnaliser votre expérience Procura
          </Typography>
        </Box>

        {/* Stepper + Progress */}
        {!isCompletionScreen && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Étape {activeStep + 1} sur {steps.length}
              </Typography>
              <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                {progressPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{ borderRadius: 4, height: 6, mb: 3 }}
            />
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Content card */}
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Actions */}
        {!isCompletionScreen && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || loading}
              variant="outlined"
              sx={{ minWidth: 100 }}
            >
              Retour
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleComplete}
                disabled={loading}
                size="large"
                sx={{ minWidth: 180 }}
              >
                {loading ? 'Finalisation...' : 'Terminer la configuration'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                Suivant
              </Button>
            )}
          </Box>
        )}

        {/* Completion screen CTA */}
        {isCompletionScreen && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              sx={{ minWidth: 220 }}
              onClick={() => { window.location.href = '/dashboard'; }}
            >
              Accéder au dashboard
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default OnboardingSetup;
