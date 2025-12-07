import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Grid,
  Alert,
  CircularProgress,
  Button,
  Divider,
} from '@mui/material';
import { Apps as AppsIcon, Save as SaveIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

const AVAILABLE_MODULES = [
  { code: 'dashboard', name: 'Tableau de bord', description: 'Vue d\'ensemble', always_enabled: true },
  { code: 'invoices', name: 'Facturation', description: 'Gestion des factures', icon: '💰' },
  { code: 'purchase-orders', name: 'Bons de commande', description: 'Achats et commandes', icon: '📦' },
  { code: 'suppliers', name: 'Fournisseurs', description: 'Gestion fournisseurs', icon: '🏢' },
  { code: 'clients', name: 'Clients', description: 'Gestion clients', icon: '👥' },
  { code: 'products', name: 'Produits', description: 'Catalogue produits', icon: '📦' },
  { code: 'contracts', name: 'Contrats', description: 'Gestion des contrats', icon: '📄' },
  { code: 'e-sourcing', name: 'E-Sourcing', description: 'Appels d\'offres', icon: '🎯' },
  { code: 'analytics', name: 'Analytics', description: 'Rapports et analyses', icon: '📊' },
];

const ModulesManager = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [enabledModules, setEnabledModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      console.log('📥 Chargement des modules...');
      const response = await api.get('/accounts/organization/settings/');
      console.log('📦 Modules chargés:', response.data.enabled_modules);
      setEnabledModules(response.data.enabled_modules || []);
    } catch (error) {
      console.error('❌ Erreur chargement modules:', error);
      enqueueSnackbar('Erreur lors du chargement des modules', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (moduleCode) => {
    const module = AVAILABLE_MODULES.find(m => m.code === moduleCode);
    if (module?.always_enabled) return;

    setEnabledModules(prev =>
      prev.includes(moduleCode)
        ? prev.filter(code => code !== moduleCode)
        : [...prev, moduleCode]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des modules:', enabledModules);

      const response = await api.put('/accounts/organization/settings/', {
        enabled_modules: enabledModules
      });

      console.log('✅ Réponse serveur:', response.data);
      enqueueSnackbar('Modules mis à jour avec succès', { variant: 'success' });

      // Force reload to update menu and ModuleContext
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ Erreur sauvegarde modules:', error);
      console.error('Détails:', error.response?.data);
      enqueueSnackbar('Erreur lors de la sauvegarde: ' + (error.response?.data?.error || error.message), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDebug = async () => {
    try {
      // Charger les deux endpoints
      const [orgSettings, userModules] = await Promise.all([
        api.get('/accounts/organization/settings/'),
        api.get('/accounts/modules/')
      ]);

      setDebugInfo({
        orgSettingsModules: orgSettings.data.enabled_modules,
        userModulesData: userModules.data.modules,
        userModulesCodes: userModules.data.module_codes,
      });
    } catch (error) {
      enqueueSnackbar('Erreur lors du debug: ' + error.message, { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AppsIcon color="primary" />
        <Typography variant="h6">Modules actifs</Typography>
      </Box>
      <Divider sx={{ mb: 3 }} />

      <Alert severity="info" sx={{ mb: 3 }}>
        Sélectionnez les modules que vous souhaitez activer pour votre organisation.
        Les changements nécessitent un rechargement de la page.
      </Alert>

      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0' }}>
        <FormGroup>
          <Grid container spacing={2}>
            {AVAILABLE_MODULES.map((module) => {
              const isEnabled = enabledModules.includes(module.code);
              const isAlwaysEnabled = module.always_enabled;

              return (
                <Grid item xs={12} sm={6} md={4} key={module.code}>
                  <Paper
                    elevation={isEnabled ? 2 : 0}
                    sx={{
                      p: 2,
                      border: isEnabled ? '2px solid' : '1px solid',
                      borderColor: isEnabled ? 'primary.main' : '#e0e0e0',
                      backgroundColor: isEnabled ? 'primary.50' : 'transparent',
                      opacity: isAlwaysEnabled ? 0.7 : 1,
                      cursor: isAlwaysEnabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: isAlwaysEnabled ? '#e0e0e0' : 'primary.main',
                      },
                    }}
                    onClick={() => !isAlwaysEnabled && handleToggle(module.code)}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isEnabled}
                          disabled={isAlwaysEnabled}
                          onChange={() => handleToggle(module.code)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {module.icon} {module.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {module.description}
                          </Typography>
                          {isAlwaysEnabled && (
                            <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                              (Toujours activé)
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </FormGroup>
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="outlined"
          color="info"
          onClick={handleDebug}
        >
          🔍 Debug Info
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les modules'}
        </Button>
      </Box>

      {/* Debug Information */}
      {debugInfo && (
        <Paper sx={{ mt: 3, p: 3, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>🔍 Informations de Debug</Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            📦 Modules depuis Organization Settings (sauvegardés):
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, fontFamily: 'monospace' }}>
            {JSON.stringify(debugInfo.orgSettingsModules, null, 2)}
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            📋 Modules depuis User Modules API (utilisés par le menu):
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, fontFamily: 'monospace' }}>
            {JSON.stringify(debugInfo.userModulesCodes, null, 2)}
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            📄 Métadonnées complètes:
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {JSON.stringify(debugInfo.userModulesData, null, 2)}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ModulesManager;
