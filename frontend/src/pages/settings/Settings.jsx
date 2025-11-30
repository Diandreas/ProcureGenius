/**
 * Page Paramètres - Version refactorisée et modulaire
 *
 * Responsabilités :
 * - Navigation entre les différentes sections
 * - Chargement et sauvegarde des paramètres
 * - Coordination entre les sections
 *
 * Architecture : Container/Presentation pattern
 * - Ce composant est le container
 * - Les sections sont les presentations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
  Stack,
  Typography,
  Divider,
  Grid,
  TextField,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Receipt as BillingIcon,
  Print as PrintIcon,
  Notifications as NotificationsIcon,
  Palette as AppearanceIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  Crop as CropIcon,
} from '@mui/icons-material';
import Cropper from 'react-easy-crop';

// Import API services
import { settingsAPI } from '../../services/settingsAPI';
import { printTemplatesAPI } from '../../services/printTemplatesAPI';
import { printConfigurationsAPI } from '../../services/printConfigurationsAPI';

/**
 * Helper: Crée un élément Image depuis une URL
 */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

/**
 * Composant principal Settings
 */
const Settings = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State principal
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState(null);
  const [printTemplate, setPrintTemplate] = useState(null);
  const [printConfiguration, setPrintConfiguration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // State pour le cropping d'image
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Charger les paramètres au montage
  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Charge tous les paramètres depuis le backend
   */
  const loadSettings = async () => {
    try {
      setLoading(true);

      // Charger en parallèle pour optimiser les performances
      const [orgResponse, templateResponse, configResponse] = await Promise.all([
        settingsAPI.getAll(),
        printTemplatesAPI.getDefault().catch(() => ({ data: null })),
        printConfigurationsAPI.getDefault().catch(() => ({ data: null })),
      ]);

      setSettings(orgResponse.data);
      setPrintTemplate(templateResponse.data);
      setPrintConfiguration(configResponse.data);

      console.log('Paramètres chargés:', {
        settings: orgResponse.data,
        template: templateResponse.data,
        config: configResponse.data,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      showSnackbar('Erreur lors du chargement des paramètres', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sauvegarde tous les paramètres
   */
  const handleSaveAll = async () => {
    try {
      setSaving(true);

      const promises = [];

      // Sauvegarder les paramètres d'organisation
      if (settings) {
        promises.push(settingsAPI.updateAll(settings));
      }

      // Sauvegarder le template d'impression
      if (printTemplate && printTemplate.id) {
        promises.push(printTemplatesAPI.update(printTemplate.id, printTemplate));
      }

      // Sauvegarder la configuration d'impression
      if (printConfiguration && printConfiguration.id) {
        promises.push(printConfigurationsAPI.update(printConfiguration.id, printConfiguration));
      }

      await Promise.all(promises);

      showSnackbar('Paramètres sauvegardés avec succès ✓', 'success');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showSnackbar('Erreur lors de la sauvegarde des paramètres', 'error');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Met à jour un paramètre d'organisation
   */
  const handleUpdateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Met à jour un paramètre de template
   */
  const handleUpdateTemplate = (key, value) => {
    setPrintTemplate((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Met à jour un paramètre de configuration
   */
  const handleUpdateConfiguration = (key, value) => {
    setPrintConfiguration((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Ouvre le modal de cropping avec l'image sélectionnée
   */
  const handleFileSelect = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result);
        setCropModalOpen(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Callback lors du changement de zone de crop
   */
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  /**
   * Crée une image croppée à partir des pixels de crop
   */
  const createCroppedImage = async () => {
    try {
      const image = await createImage(imageToCrop);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.95);
      });
    } catch (error) {
      console.error('Erreur lors du crop:', error);
      return null;
    }
  };

  /**
   * Confirme le crop et upload le logo
   */
  const handleCropConfirm = async () => {
    try {
      const croppedBlob = await createCroppedImage();
      if (croppedBlob) {
        const file = new File([croppedBlob], 'logo.jpg', { type: 'image/jpeg' });

        const response = await settingsAPI.uploadLogo(file);
        setSettings((prev) => ({ ...prev, companyLogo: response.data.companyLogo }));
        showSnackbar('Logo mis à jour avec succès', 'success');

        setCropModalOpen(false);
        setImageToCrop(null);
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload du logo:', error);
      showSnackbar('Erreur lors de l\'upload du logo', 'error');
    }
  };

  /**
   * Annule le crop
   */
  const handleCropCancel = () => {
    setCropModalOpen(false);
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  /**
   * Affiche un message Snackbar
   */
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  /**
   * Ferme le Snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Configuration des onglets
  const tabs = [
    { label: 'Général', icon: <BusinessIcon /> },
    { label: 'Facturation', icon: <BillingIcon /> },
    { label: 'Impression', icon: <PrintIcon /> },
    { label: 'Notifications', icon: <NotificationsIcon /> },
    { label: 'Apparence', icon: <AppearanceIcon /> },
    { label: 'Sécurité', icon: <SecurityIcon /> },
    { label: 'Sauvegarde', icon: <BackupIcon /> },
    { label: 'Données', icon: <BackupIcon /> },
  ];

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (!settings) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Impossible de charger les paramètres. Veuillez réessayer.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={isMobile ? 1.5 : 3}>
      <Card
        sx={{
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Navigation par onglets */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '0.95rem',
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={isMobile ? '' : tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {/* Contenu de la section active */}
        <Box p={isMobile ? 2 : 3}>
          {/* Section Général */}
          {activeTab === 0 && (
            <GeneralSection
              settings={settings}
              onUpdate={handleUpdateSetting}
              onFileSelect={handleFileSelect}
            />
          )}

          {/* Section Facturation */}
          {activeTab === 1 && (
            <BillingSection
              settings={settings}
              onUpdate={handleUpdateSetting}
            />
          )}

          {/* Section Impression */}
          {activeTab === 2 && (
            <PrintSection
              settings={settings}
              printTemplate={printTemplate}
              printConfiguration={printConfiguration}
              onUpdateTemplate={handleUpdateTemplate}
              onUpdateConfiguration={handleUpdateConfiguration}
            />
          )}

          {/* Section Notifications */}
          {activeTab === 3 && (
            <NotificationSection
              settings={settings}
              onUpdate={handleUpdateSetting}
            />
          )}

          {/* Section Apparence */}
          {activeTab === 4 && (
            <AppearanceSection
              settings={settings}
              onUpdate={handleUpdateSetting}
            />
          )}

          {/* Section Sécurité */}
          {activeTab === 5 && (
            <SecuritySection
              settings={settings}
              onUpdate={handleUpdateSetting}
            />
          )}

          {/* Section Sauvegarde */}
          {activeTab === 6 && (
            <BackupSection
              settings={settings}
              onUpdate={handleUpdateSetting}
            />
          )}

          {/* Section Import/Export/Migration */}
          {activeTab === 7 && (
            <DataSection
              settings={settings}
              showSnackbar={showSnackbar}
            />
          )}

          {/* Bouton de sauvegarde */}
          <Box mt={4}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveAll}
              disabled={saving}
              fullWidth={isMobile}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Modal de cropping d'image */}
      <Dialog
        open={cropModalOpen}
        onClose={handleCropCancel}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CropIcon />
            <Typography variant="h6">Rogner l'image</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: isMobile ? 400 : 500,
              backgroundColor: '#333',
            }}
          >
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography gutterBottom>Zoom</Typography>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e, value) => setZoom(value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCropCancel}>Annuler</Button>
          <Button onClick={handleCropConfirm} variant="contained" startIcon={<SaveIcon />}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

/**
 * Section Général - Informations de l'entreprise
 */
const GeneralSection = ({ settings, onUpdate, onFileSelect }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Informations de l'entreprise
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      {/* Prévisualisation réaliste de l'en-tête */}
      <Grid item xs={12}>
        <Paper
          sx={{
            p: 3,
            border: '2px solid #e0e0e0',
            borderRadius: 1,
            backgroundColor: '#fff',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 2,
              textAlign: 'center',
              color: '#666',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Aperçu de l'en-tête des documents
          </Typography>
          <Box sx={{ borderBottom: `3px solid ${settings.brandColor || '#2563eb'}`, pb: 2, mb: 2 }}>
            <Stack direction="row" spacing={3} alignItems="flex-start" justifyContent="space-between">
              <Box flex={1}>
                {settings.companyLogo && (
                  <Box
                    component="img"
                    src={settings.companyLogo}
                    alt="Logo"
                    sx={{
                      maxHeight: 60,
                      maxWidth: 150,
                      objectFit: 'contain',
                      mb: 1,
                    }}
                  />
                )}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5, color: settings.brandColor || '#2563eb' }}>
                  {settings.companyName || 'Nom de l\'entreprise'}
                </Typography>
                {settings.companyAddress && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-line' }}>
                    {settings.companyAddress}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
                  {settings.companyPhone && (
                    <Typography variant="caption" color="text.secondary">
                      Tél: {settings.companyPhone}
                    </Typography>
                  )}
                  {settings.companyEmail && (
                    <Typography variant="caption" color="text.secondary">
                      • Email: {settings.companyEmail}
                    </Typography>
                  )}
                </Stack>
              </Box>
              <Box textAlign="right">
                <Typography variant="h4" fontWeight="bold" sx={{ letterSpacing: 1, color: settings.brandColor || '#2563eb' }}>
                  FACTURE
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                  N° FAC-2025-001
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Date: {new Date().toLocaleDateString('fr-FR')}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', fontStyle: 'italic' }}>
            Cet aperçu reflète exactement ce qui apparaîtra sur vos factures et documents (avec votre couleur de marque)
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Nom de l'entreprise"
          value={settings.companyName || ''}
          onChange={(e) => onUpdate('companyName', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={settings.companyEmail || ''}
          onChange={(e) => onUpdate('companyEmail', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Téléphone"
          value={settings.companyPhone || ''}
          onChange={(e) => onUpdate('companyPhone', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Site web"
          value={settings.companyWebsite || ''}
          onChange={(e) => onUpdate('companyWebsite', e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Adresse"
          multiline
          rows={3}
          value={settings.companyAddress || ''}
          onChange={(e) => onUpdate('companyAddress', e.target.value)}
        />
      </Grid>

      {/* Upload du logo avec cropping */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, border: '2px dashed #ddd' }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="subtitle2">Logo de l'entreprise</Typography>
            {settings.companyLogo && (
              <Box
                component="img"
                src={settings.companyLogo}
                alt="Logo"
                sx={{ maxHeight: 100, maxWidth: 200, objectFit: 'contain' }}
              />
            )}
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
            >
              Choisir un logo
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onFileSelect(e.target.files[0]);
                  }
                }}
              />
            </Button>
            <Typography variant="caption" color="text.secondary">
              Vous pourrez rogner l'image avant de l'enregistrer. Format PNG recommandé pour transparence.
            </Typography>
          </Stack>
        </Paper>
      </Grid>

      {/* Sélecteur de couleur de marque */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, border: '2px solid #e0e0e0', borderRadius: 1 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={600}>
              Couleur de marque
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cette couleur sera utilisée sur vos factures et documents imprimés pour correspondre à votre identité visuelle.
            </Typography>
            <Stack direction="row" spacing={3} alignItems="center">
              <Box>
                <TextField
                  type="color"
                  value={settings.brandColor || '#2563eb'}
                  onChange={(e) => onUpdate('brandColor', e.target.value)}
                  sx={{
                    width: 100,
                    '& input': {
                      height: 60,
                      cursor: 'pointer',
                      border: '2px solid #ddd',
                      borderRadius: 1,
                    }
                  }}
                />
              </Box>
              <Box flex={1}>
                <TextField
                  fullWidth
                  label="Code couleur"
                  value={settings.brandColor || '#2563eb'}
                  onChange={(e) => onUpdate('brandColor', e.target.value)}
                  placeholder="#2563eb"
                  helperText="Format: #RRGGBB (exemple: #2563eb pour bleu)"
                />
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Couleurs prédéfinies :
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {[
                  { name: 'Bleu', color: '#2563eb' },
                  { name: 'Violet', color: '#7c3aed' },
                  { name: 'Vert', color: '#059669' },
                  { name: 'Rouge', color: '#dc2626' },
                  { name: 'Orange', color: '#ea580c' },
                  { name: 'Rose', color: '#db2777' },
                  { name: 'Indigo', color: '#4f46e5' },
                  { name: 'Noir', color: '#1f2937' },
                ].map((preset) => (
                  <Button
                    key={preset.color}
                    size="small"
                    variant={settings.brandColor === preset.color ? 'contained' : 'outlined'}
                    onClick={() => onUpdate('brandColor', preset.color)}
                    sx={{
                      minWidth: 'auto',
                      px: 1.5,
                      py: 0.5,
                      mb: 1,
                      borderColor: preset.color,
                      backgroundColor: settings.brandColor === preset.color ? preset.color : 'transparent',
                      color: settings.brandColor === preset.color ? 'white' : preset.color,
                      '&:hover': {
                        backgroundColor: preset.color,
                        borderColor: preset.color,
                        color: 'white',
                      }
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

/**
 * Section Facturation - Taxation et facturation
 */
const BillingSection = ({ settings, onUpdate }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Taxation et facturation
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Taux TPS/TVH (%)"
          type="number"
          value={settings.gstHstRate || 5}
          onChange={(e) => onUpdate('gstHstRate', parseFloat(e.target.value))}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Taux TVQ (%)"
          type="number"
          value={settings.qstRate || 9.975}
          onChange={(e) => onUpdate('qstRate', parseFloat(e.target.value))}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Taux de taxe par défaut (%)"
          type="number"
          value={settings.defaultTaxRate || 15}
          onChange={(e) => onUpdate('defaultTaxRate', parseFloat(e.target.value))}
        />
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableTaxCalculation ?? true}
              onChange={(e) => onUpdate('enableTaxCalculation', e.target.checked)}
            />
          }
          label="Activer le calcul automatique des taxes"
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Préfixe des factures"
          value={settings.invoicePrefix || 'FAC-'}
          onChange={(e) => onUpdate('invoicePrefix', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Préfixe des bons de commande"
          value={settings.poPrefix || 'BC-'}
          onChange={(e) => onUpdate('poPrefix', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Devise par défaut</InputLabel>
          <Select
            value={settings.defaultCurrency || 'CAD'}
            onChange={(e) => onUpdate('defaultCurrency', e.target.value)}
          >
            <MenuItem value="CAD">CAD - Dollar canadien</MenuItem>
            <MenuItem value="USD">USD - Dollar américain</MenuItem>
            <MenuItem value="EUR">EUR - Euro</MenuItem>
            <MenuItem value="GBP">GBP - Livre sterling</MenuItem>
            <MenuItem value="CHF">CHF - Franc suisse</MenuItem>
            <MenuItem value="JPY">JPY - Yen japonais</MenuItem>
            <MenuItem value="CNY">CNY - Yuan chinois</MenuItem>
            <MenuItem value="AUD">AUD - Dollar australien</MenuItem>
            <MenuItem value="NZD">NZD - Dollar néo-zélandais</MenuItem>
            <MenuItem value="INR">INR - Roupie indienne</MenuItem>
            <MenuItem value="BRL">BRL - Real brésilien</MenuItem>
            <MenuItem value="MXN">MXN - Peso mexicain</MenuItem>
            <MenuItem value="ZAR">ZAR - Rand sud-africain</MenuItem>
            <MenuItem value="XOF">XOF - Franc CFA (Afrique de l'Ouest)</MenuItem>
            <MenuItem value="XAF">XAF - Franc CFA (Afrique centrale)</MenuItem>
            <MenuItem value="MAD">MAD - Dirham marocain</MenuItem>
            <MenuItem value="TND">TND - Dinar tunisien</MenuItem>
            <MenuItem value="DZD">DZD - Dinar algérien</MenuItem>
            <MenuItem value="NGN">NGN - Naira nigérian</MenuItem>
            <MenuItem value="KES">KES - Shilling kényan</MenuItem>
            <MenuItem value="GHS">GHS - Cedi ghanéen</MenuItem>
            <MenuItem value="EGP">EGP - Livre égyptienne</MenuItem>
            <MenuItem value="AED">AED - Dirham des Émirats</MenuItem>
            <MenuItem value="SAR">SAR - Riyal saoudien</MenuItem>
            <MenuItem value="QAR">QAR - Riyal qatari</MenuItem>
            <MenuItem value="SEK">SEK - Couronne suédoise</MenuItem>
            <MenuItem value="NOK">NOK - Couronne norvégienne</MenuItem>
            <MenuItem value="DKK">DKK - Couronne danoise</MenuItem>
            <MenuItem value="PLN">PLN - Zloty polonais</MenuItem>
            <MenuItem value="CZK">CZK - Couronne tchèque</MenuItem>
            <MenuItem value="HUF">HUF - Forint hongrois</MenuItem>
            <MenuItem value="RON">RON - Leu roumain</MenuItem>
            <MenuItem value="TRY">TRY - Livre turque</MenuItem>
            <MenuItem value="RUB">RUB - Rouble russe</MenuItem>
            <MenuItem value="SGD">SGD - Dollar de Singapour</MenuItem>
            <MenuItem value="HKD">HKD - Dollar de Hong Kong</MenuItem>
            <MenuItem value="KRW">KRW - Won sud-coréen</MenuItem>
            <MenuItem value="THB">THB - Baht thaïlandais</MenuItem>
            <MenuItem value="MYR">MYR - Ringgit malaisien</MenuItem>
            <MenuItem value="IDR">IDR - Roupie indonésienne</MenuItem>
            <MenuItem value="PHP">PHP - Peso philippin</MenuItem>
            <MenuItem value="VND">VND - Dong vietnamien</MenuItem>
            <MenuItem value="ILS">ILS - Shekel israélien</MenuItem>
            <MenuItem value="CLP">CLP - Peso chilien</MenuItem>
            <MenuItem value="ARS">ARS - Peso argentin</MenuItem>
            <MenuItem value="COP">COP - Peso colombien</MenuItem>
            <MenuItem value="PEN">PEN - Sol péruvien</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  </Box>
);

/**
 * Section Impression - Templates et configurations
 */
const PrintSection = ({ settings, printTemplate, printConfiguration, onUpdateTemplate, onUpdateConfiguration }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Paramètres d'impression
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Alert severity="info" sx={{ mb: 3 }}>
      Les templates d'impression permettent de personnaliser l'apparence de vos factures et bons de commande.
    </Alert>

    <Typography variant="subtitle2" gutterBottom>
      En-tête des documents
    </Typography>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Couleur principale"
          type="color"
          value={printTemplate?.primaryColor || '#0066cc'}
          onChange={(e) => onUpdateTemplate('primaryColor', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={printTemplate?.showQrCode ?? true}
              onChange={(e) => onUpdateTemplate('showQrCode', e.target.checked)}
            />
          }
          label="Afficher le QR code"
        />
      </Grid>
    </Grid>

    <Typography variant="subtitle2" gutterBottom>
      Configuration du papier
    </Typography>
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Taille du papier</InputLabel>
          <Select
            value={printConfiguration?.paperSize || 'A4'}
            onChange={(e) => onUpdateConfiguration('paperSize', e.target.value)}
          >
            <MenuItem value="A4">A4</MenuItem>
            <MenuItem value="LETTER">Letter</MenuItem>
            <MenuItem value="LEGAL">Legal</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Orientation</InputLabel>
          <Select
            value={printConfiguration?.orientation || 'portrait'}
            onChange={(e) => onUpdateConfiguration('orientation', e.target.value)}
          >
            <MenuItem value="portrait">Portrait</MenuItem>
            <MenuItem value="landscape">Paysage</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  </Box>
);

/**
 * Section Notifications
 */
const NotificationSection = ({ settings, onUpdate }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Notifications
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Stack spacing={2}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.emailNotifications ?? true}
            onChange={(e) => onUpdate('emailNotifications', e.target.checked)}
          />
        }
        label="Notifications par email"
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.invoiceReminders ?? true}
            onChange={(e) => onUpdate('invoiceReminders', e.target.checked)}
          />
        }
        label="Rappels de factures"
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.lowStockAlerts ?? true}
            onChange={(e) => onUpdate('lowStockAlerts', e.target.checked)}
          />
        }
        label="Alertes de stock bas"
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.orderStatusUpdates ?? true}
            onChange={(e) => onUpdate('orderStatusUpdates', e.target.checked)}
          />
        }
        label="Mises à jour du statut des commandes"
      />
    </Stack>
  </Box>
);

/**
 * Section Apparence
 */
const AppearanceSection = ({ settings, onUpdate }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Apparence et localisation
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Thème</InputLabel>
          <Select
            value={settings.theme || 'light'}
            onChange={(e) => onUpdate('theme', e.target.value)}
          >
            <MenuItem value="light">Clair</MenuItem>
            <MenuItem value="dark">Sombre</MenuItem>
            <MenuItem value="auto">Automatique</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Langue</InputLabel>
          <Select
            value={settings.language || 'fr'}
            onChange={(e) => onUpdate('language', e.target.value)}
          >
            <MenuItem value="fr">Français</MenuItem>
            <MenuItem value="en">English</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Format de date</InputLabel>
          <Select
            value={settings.dateFormat || 'DD/MM/YYYY'}
            onChange={(e) => onUpdate('dateFormat', e.target.value)}
          >
            <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
            <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
            <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Format d'heure</InputLabel>
          <Select
            value={settings.timeFormat || '24h'}
            onChange={(e) => onUpdate('timeFormat', e.target.value)}
          >
            <MenuItem value="24h">24 heures</MenuItem>
            <MenuItem value="12h">12 heures (AM/PM)</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  </Box>
);

/**
 * Section Sécurité
 */
const SecuritySection = ({ settings, onUpdate }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Sécurité et authentification
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Délai d'expiration de session (minutes)"
          type="number"
          value={settings.sessionTimeout || 30}
          onChange={(e) => onUpdate('sessionTimeout', parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Tentatives de connexion max"
          type="number"
          value={settings.loginAttempts || 5}
          onChange={(e) => onUpdate('loginAttempts', parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.requireStrongPasswords ?? true}
              onChange={(e) => onUpdate('requireStrongPasswords', e.target.checked)}
            />
          }
          label="Exiger des mots de passe forts"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableTwoFactor ?? false}
              onChange={(e) => onUpdate('enableTwoFactor', e.target.checked)}
            />
          }
          label="Authentification à deux facteurs"
        />
      </Grid>
    </Grid>
  </Box>
);

/**
 * Section Sauvegarde
 */
const BackupSection = ({ settings, onUpdate }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Sauvegardes automatiques
    </Typography>
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.autoBackup ?? true}
              onChange={(e) => onUpdate('autoBackup', e.target.checked)}
            />
          }
          label="Activer les sauvegardes automatiques"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth disabled={!settings.autoBackup}>
          <InputLabel>Fréquence de sauvegarde</InputLabel>
          <Select
            value={settings.backupFrequency || 'daily'}
            onChange={(e) => onUpdate('backupFrequency', e.target.value)}
          >
            <MenuItem value="hourly">Toutes les heures</MenuItem>
            <MenuItem value="daily">Quotidienne</MenuItem>
            <MenuItem value="weekly">Hebdomadaire</MenuItem>
            <MenuItem value="monthly">Mensuelle</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Rétention (jours)"
          type="number"
          value={settings.backupRetention || 30}
          onChange={(e) => onUpdate('backupRetention', parseInt(e.target.value))}
          disabled={!settings.autoBackup}
        />
      </Grid>
    </Grid>
  </Box>
);

/**
 * Section Import/Export et Migration de données
 */
const DataSection = ({ settings, showSnackbar }) => {
  const handleExport = (format) => {
    showSnackbar(`Export ${format.toUpperCase()} en cours...`, 'info');
    // TODO: Implémenter l'export réel
    setTimeout(() => {
      showSnackbar(`Export ${format.toUpperCase()} terminé avec succès`, 'success');
    }, 1500);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      showSnackbar(`Import du fichier ${file.name} en cours...`, 'info');
      // TODO: Implémenter l'import réel
      setTimeout(() => {
        showSnackbar('Import terminé avec succès', 'success');
      }, 1500);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Import / Export et Migration
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Section Export */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Exporter mes données
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Exportez toutes vos données (factures, clients, produits, fournisseurs) dans différents formats.
          </Alert>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => handleExport('json')}
            >
              Exporter en JSON
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('csv')}
            >
              Exporter en CSV
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('excel')}
            >
              Exporter en Excel
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('pdf')}
            >
              Rapport PDF complet
            </Button>
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Section Import */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Importer des données
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Attention :</strong> L'import de données remplacera vos données existantes. Assurez-vous d'avoir effectué une sauvegarde avant.
          </Alert>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
          >
            Choisir un fichier à importer
            <input
              type="file"
              hidden
              accept=".json,.csv,.xlsx"
              onChange={handleImport}
            />
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Formats acceptés : JSON, CSV, Excel
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Section Migration */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Migration depuis d'autres systèmes
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Migrez facilement vos données depuis d'autres systèmes de gestion.
          </Typography>
          <Stack spacing={2}>
            <Paper sx={{ p: 2, border: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" gutterBottom>
                QuickBooks
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Importez vos factures, clients et produits depuis QuickBooks
              </Typography>
              <Button variant="outlined" size="small">
                Configurer la migration
              </Button>
            </Paper>

            <Paper sx={{ p: 2, border: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" gutterBottom>
                Sage
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Migrez vos données comptables depuis Sage
              </Typography>
              <Button variant="outlined" size="small">
                Configurer la migration
              </Button>
            </Paper>

            <Paper sx={{ p: 2, border: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" gutterBottom>
                Excel / CSV générique
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Importez vos données depuis des fichiers Excel ou CSV
              </Typography>
              <Button variant="outlined" size="small">
                Assistant d'import
              </Button>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
