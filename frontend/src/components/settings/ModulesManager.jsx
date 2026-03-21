import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Switch,
  CircularProgress,
  Button,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Apps as AppsIcon,
  Save as SaveIcon,
  Receipt,
  ShoppingCart,
  Business,
  People,
  Inventory,
  Description,
  Gavel,
  BarChart,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

const AVAILABLE_MODULES = [
  { code: 'dashboard', name: 'Tableau de bord', always_enabled: true, IconComponent: AppsIcon },
  { code: 'invoices', name: 'Facturation', IconComponent: Receipt },
  { code: 'purchase-orders', name: 'Bons de commande', IconComponent: ShoppingCart },
  { code: 'suppliers', name: 'Fournisseurs', IconComponent: Business },
  { code: 'clients', name: 'Clients', IconComponent: People },
  { code: 'products', name: 'Produits', IconComponent: Inventory },
  { code: 'contracts', name: 'Contrats', IconComponent: Description },
  { code: 'e-sourcing', name: 'E-Sourcing', IconComponent: Gavel },
  { code: 'analytics', name: 'Analytics', IconComponent: BarChart },
];

const ModulesManager = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [enabledModules, setEnabledModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      console.log('Chargement des modules...');
      const response = await api.get('/accounts/organization/settings/');
      console.log('Modules chargés:', response.data.enabled_modules);
      setEnabledModules(response.data.enabled_modules || []);
    } catch (error) {
      console.error('Erreur chargement modules:', error);
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
      console.log('Sauvegarde des modules:', enabledModules);

      const response = await api.put('/accounts/organization/settings/', {
        enabled_modules: enabledModules
      });

      console.log('Réponse serveur:', response.data);
      enqueueSnackbar('Modules mis à jour avec succès', { variant: 'success' });

      // Force reload to update menu and ModuleContext
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erreur sauvegarde modules:', error);
      console.error('Détails:', error.response?.data);
      enqueueSnackbar('Erreur lors de la sauvegarde: ' + (error.response?.data?.error || error.message), { variant: 'error' });
    } finally {
      setSaving(false);
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AppsIcon color="primary" />
        <Typography variant="h6">Modules actifs</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Activez ou désactivez les modules de votre organisation. Un rechargement sera nécessaire.
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={1}>
        {AVAILABLE_MODULES.map((module) => {
          const isEnabled = enabledModules.includes(module.code);
          const isAlwaysEnabled = module.always_enabled;

          return (
            <Grid item xs={6} md={4} key={module.code}>
              <Box
                onClick={() => !isAlwaysEnabled && handleToggle(module.code)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  border: '1px solid',
                  borderRadius: 2,
                  borderColor: isEnabled ? 'primary.main' : 'divider',
                  bgcolor: isEnabled ? (theme) => alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  opacity: isAlwaysEnabled ? 0.5 : 1,
                  cursor: isAlwaysEnabled ? 'default' : 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  userSelect: 'none',
                }}
              >
                <Switch
                  size="small"
                  checked={isEnabled}
                  disabled={isAlwaysEnabled}
                  onChange={() => handleToggle(module.code)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ flexShrink: 0 }}
                />
                {module.IconComponent && (
                  <module.IconComponent sx={{ fontSize: 16, flexShrink: 0, color: isEnabled ? 'primary.main' : 'text.secondary' }} />
                )}
                <Typography variant="caption" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                  {module.name}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          size="small"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
};

export default ModulesManager;
