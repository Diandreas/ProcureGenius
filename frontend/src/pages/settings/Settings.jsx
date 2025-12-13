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
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Apps as AppsIcon,
  ExpandMore,
  Receipt,
} from '@mui/icons-material';
import Cropper from 'react-easy-crop';

// Import API services
import { settingsAPI } from '../../services/settingsAPI';
import { printTemplatesAPI } from '../../services/printTemplatesAPI';
import { printConfigurationsAPI } from '../../services/printConfigurationsAPI';
import ModulesManager from '../../components/settings/ModulesManager';

// Import Redux
import { changeLanguage } from '../../store/slices/settingsSlice';

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
  const dispatch = useDispatch();
  const { t } = useTranslation(['settings', 'common']);

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

      // Normaliser les données pour s'assurer que tous les champs sont présents
      const normalizedSettings = {
        ...orgResponse.data,
        // S'assurer que taxRegion est présent (peut être tax_region depuis l'API)
        taxRegion: orgResponse.data.taxRegion || orgResponse.data.tax_region || 'international',
        // Normaliser les champs fiscaux
        companyNiu: orgResponse.data.companyNiu || orgResponse.data.company_niu || '',
        companyRcNumber: orgResponse.data.companyRcNumber || orgResponse.data.company_rc_number || '',
        companyRccmNumber: orgResponse.data.companyRccmNumber || orgResponse.data.company_rccm_number || '',
        companyTaxNumber: orgResponse.data.companyTaxNumber || orgResponse.data.company_tax_number || '',
        companyNeq: orgResponse.data.companyNeq || orgResponse.data.company_neq || '',
        companyGstNumber: orgResponse.data.companyGstNumber || orgResponse.data.company_gst_number || '',
        companyQstNumber: orgResponse.data.companyQstNumber || orgResponse.data.company_qst_number || '',
        companyVatNumber: orgResponse.data.companyVatNumber || orgResponse.data.company_vat_number || '',
      };

      setSettings(normalizedSettings);
      setPrintTemplate(templateResponse.data);
      setPrintConfiguration(configResponse.data);

      console.log('Paramètres chargés:', {
        settings: normalizedSettings,
        template: templateResponse.data,
        config: configResponse.data,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      showSnackbar(t('settings:loadingError'), 'error');
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
        // S'assurer que tous les champs sont inclus, même ceux qui sont vides
        const settingsToSave = {
          ...settings,
          // Inclure explicitement tous les champs fiscaux pour éviter qu'ils soient ignorés
          taxRegion: settings.taxRegion || 'international',
          companyNiu: settings.companyNiu || '',
          companyRcNumber: settings.companyRcNumber || '',
          companyRccmNumber: settings.companyRccmNumber || '',
          companyTaxNumber: settings.companyTaxNumber || '',
          companyNeq: settings.companyNeq || '',
          companyGstNumber: settings.companyGstNumber || '',
          companyQstNumber: settings.companyQstNumber || '',
          companyVatNumber: settings.companyVatNumber || '',
        };
        console.log('💾 Sauvegarde des paramètres:', settingsToSave);
        promises.push(settingsAPI.updateAll(settingsToSave));
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

      // Si la devise a changé, déclencher un événement pour rafraîchir tous les composants
      if (settings?.defaultCurrency) {
        window.dispatchEvent(new CustomEvent('currency-changed', {
          detail: { currency: settings.defaultCurrency }
        }));
        console.log('💰 Événement de changement de devise déclenché:', settings.defaultCurrency);
      }

      // Recharger les paramètres après sauvegarde pour s'assurer que tout est à jour
      await loadSettings();

      showSnackbar(t('settings:saveSuccess'), 'success');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showSnackbar(t('settings:saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Met à jour un paramètre d'organisation
   */
  const handleUpdateSetting = async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    // Si c'est la langue qui change, utiliser l'action Redux qui synchronise avec i18n
    // et sauvegarder immédiatement
    if (key === 'language') {
      try {
        await dispatch(changeLanguage(value)).unwrap();
        showSnackbar(t('settings:saveSuccess'), 'success');
      } catch (error) {
        console.error('Error changing language:', error);
        showSnackbar(t('settings:saveError'), 'error');
      }
    }

    // Si c'est la devise qui change, sauvegarder immédiatement et déclencher l'événement
    if (key === 'defaultCurrency') {
      try {
        await settingsAPI.updateAll({ ...settings, [key]: value });
        window.dispatchEvent(new CustomEvent('currency-changed', {
          detail: { currency: value }
        }));
        console.log('💰 Devise mise à jour et événement déclenché:', value);
        showSnackbar(t('settings:saveSuccess'), 'success');
      } catch (error) {
        console.error('Error updating currency:', error);
        showSnackbar(t('settings:saveError'), 'error');
      }
    }
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
   * Extrait la couleur dominante d'un canvas
   */
  const extractDominantColor = (canvas) => {
    try {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Créer un map de couleurs avec leurs fréquences
      const colorMap = {};

      // Échantillonner tous les 10 pixels pour améliorer les performances
      for (let i = 0; i < data.length; i += 40) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Ignorer les pixels transparents et trop proches du blanc/noir
        if (a < 128) continue;
        if (r > 240 && g > 240 && b > 240) continue; // Blanc
        if (r < 15 && g < 15 && b < 15) continue; // Noir

        // Arrondir les couleurs pour regrouper les nuances similaires
        const roundedR = Math.round(r / 10) * 10;
        const roundedG = Math.round(g / 10) * 10;
        const roundedB = Math.round(b / 10) * 10;

        const colorKey = `${roundedR},${roundedG},${roundedB}`;
        colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;
      }

      // Trouver la couleur la plus fréquente
      let dominantColor = null;
      let maxCount = 0;

      for (const [color, count] of Object.entries(colorMap)) {
        if (count > maxCount) {
          maxCount = count;
          dominantColor = color;
        }
      }

      if (dominantColor) {
        const [r, g, b] = dominantColor.split(',').map(Number);
        // Convertir en hex
        const hex = '#' + [r, g, b].map(x => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('');

        console.log('🎨 Couleur dominante extraite:', hex);
        return hex;
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de l\'extraction de couleur:', error);
      return null;
    }
  };

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
          resolve({ blob, canvas });
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
      const result = await createCroppedImage();
      if (result) {
        const { blob, canvas } = result;
        const file = new File([blob], 'logo.jpg', { type: 'image/jpeg' });

        // Extraire la couleur dominante du canvas
        const dominantColor = extractDominantColor(canvas);

        const response = await settingsAPI.uploadLogo(file);

        // Mettre à jour le logo ET la couleur de marque automatiquement
        setSettings((prev) => {
          const updates = { companyLogo: response.data.companyLogo };

          // Appliquer la couleur dominante si elle a été extraite
          if (dominantColor) {
            updates.brandColor = dominantColor;
            showSnackbar(
              t('settings:logoUpdateSuccess') + ' - ' + t('settings:brandColorAutoExtracted', { color: dominantColor }),
              'success'
            );
          } else {
            showSnackbar(t('settings:logoUpdateSuccess'), 'success');
          }

          return { ...prev, ...updates };
        });

        setCropModalOpen(false);
        setImageToCrop(null);
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload du logo:', error);
      showSnackbar(t('settings:logoUploadError'), 'error');
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
    { label: t('settings:tabs.general'), icon: <BusinessIcon /> },
    { label: 'Modules', icon: <AppsIcon /> },
    { label: t('settings:tabs.print'), icon: <PrintIcon /> },
    { label: t('settings:tabs.notifications'), icon: <NotificationsIcon /> },
    { label: t('settings:tabs.appearance'), icon: <AppearanceIcon /> },
    { label: 'Profil', icon: <SecurityIcon /> },
    { label: 'Migration de données', icon: <BackupIcon /> },
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
          {t('settings:errorMessage')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={isMobile ? 1.5 : 3}>
      <Card
        sx={{
          borderRadius: 1,
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Navigation par onglets */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          scrollButtons={false}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: isMobile ? 48 : 64,
            '& .MuiTab-root': {
              minHeight: isMobile ? 48 : 64,
              minWidth: isMobile ? 'auto' : 90,
              padding: isMobile ? '6px 4px' : '12px 16px',
              textTransform: 'none',
              fontSize: '0.95rem',
            },
            '& .MuiTab-iconWrapper': {
              marginBottom: isMobile ? '0 !important' : undefined,
              marginRight: isMobile ? 0 : undefined,
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={isMobile ? '' : tab.label}
              icon={tab.icon}
              iconPosition={isMobile ? 'top' : 'start'}
              sx={{
                '& .MuiSvgIcon-root': {
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                },
              }}
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

          {/* Section Modules */}
          {activeTab === 1 && (
            <ModulesManager />
          )}

          {/* Section Impression */}
          {activeTab === 2 && (
            <PrintSection
              settings={settings}
              printTemplate={printTemplate}
              printConfiguration={printConfiguration}
              onUpdateTemplate={handleUpdateTemplate}
              onUpdateConfiguration={handleUpdateConfiguration}
              onUpdate={handleUpdateSetting}
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

          {/* Section Profil (mot de passe, etc.) */}
          {activeTab === 5 && (
            <ProfileSection
              settings={settings}
              onUpdate={handleUpdateSetting}
            />
          )}

          {/* Section Migration de données */}
          {activeTab === 6 && (
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
              {saving ? t('common:labels.loading') : t('settings:buttons.save')}
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
            <Typography variant="h6">{t('settings:logo.cropImage')}</Typography>
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
            <Typography gutterBottom>{t('settings:logo.zoom')}</Typography>
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
          <Button onClick={handleCropCancel}>{t('settings:logo.cancel')}</Button>
          <Button onClick={handleCropConfirm} variant="contained" startIcon={<SaveIcon />}>
            {t('settings:logo.apply')}
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
const GeneralSection = ({ settings, onUpdate, onFileSelect }) => {
  const { t } = useTranslation(['settings', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('settings:general.title')}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        {/* Informations entreprise */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:general.companyNameLabel')}
            placeholder={t('settings:general.companyNamePlaceholder')}
            value={settings.companyName || ''}
            onChange={(e) => onUpdate('companyName', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:general.email')}
            placeholder={t('settings:general.emailPlaceholder')}
            type="email"
            value={settings.companyEmail || ''}
            onChange={(e) => onUpdate('companyEmail', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:general.phone')}
            placeholder={t('settings:general.phonePlaceholder')}
            value={settings.companyPhone || ''}
            onChange={(e) => onUpdate('companyPhone', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:general.website')}
            placeholder={t('settings:general.websitePlaceholder')}
            value={settings.companyWebsite || ''}
            onChange={(e) => onUpdate('companyWebsite', e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:general.address')}
            placeholder={t('settings:general.addressPlaceholder')}
            multiline
            rows={2}
            value={settings.companyAddress || ''}
            onChange={(e) => onUpdate('companyAddress', e.target.value)}
          />
        </Grid>

        {/* Logo et Branding - Compact */}
        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            {settings.companyLogo && (
              <Box
                component="img"
                src={settings.companyLogo}
                alt="Logo"
                sx={{ maxHeight: 60, maxWidth: 150, objectFit: 'contain' }}
              />
            )}
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              size="small"
            >
              {settings.companyLogo ? 'Changer le logo' : t('settings:logo.choose')}
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
          </Stack>
        </Grid>

        {/* Couleur de marque - Compact */}
        <Grid item xs={12} md={6}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              type="color"
              value={settings.brandColor || '#2563eb'}
              onChange={(e) => onUpdate('brandColor', e.target.value)}
              sx={{ width: 80 }}
            />
            <TextField
              fullWidth
              label="Couleur de marque"
              value={settings.brandColor || '#2563eb'}
              onChange={(e) => onUpdate('brandColor', e.target.value)}
              size="small"
            />
          </Stack>
        </Grid>

        {/* Section Informations légales et fiscales - Accordion */}
        <Grid item xs={12}>
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {t('settings:general.legalInfo')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* Région fiscale */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('settings:general.taxRegion')}</InputLabel>
                    <Select
                      value={settings.taxRegion || 'international'}
                      onChange={(e) => onUpdate('taxRegion', e.target.value)}
                      label={t('settings:general.taxRegion')}
                    >
                      <MenuItem value="international">{t('settings:general.taxRegions.international')}</MenuItem>
                      <MenuItem value="cameroon">{t('settings:general.taxRegions.cameroon')}</MenuItem>
                      <MenuItem value="ohada">{t('settings:general.taxRegions.ohada')}</MenuItem>
                      <MenuItem value="canada">{t('settings:general.taxRegions.canada')}</MenuItem>
                      <MenuItem value="usa">{t('settings:general.taxRegions.usa')}</MenuItem>
                      <MenuItem value="eu">{t('settings:general.taxRegions.eu')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Devise par défaut */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('settings:general.defaultCurrency')}</InputLabel>
                    <Select
                      value={settings.defaultCurrency || 'CAD'}
                      onChange={(e) => onUpdate('defaultCurrency', e.target.value)}
                      label={t('settings:general.defaultCurrency')}
                    >
                      <MenuItem value="CAD">CAD - Dollar canadien</MenuItem>
                      <MenuItem value="USD">USD - Dollar américain</MenuItem>
                      <MenuItem value="EUR">EUR - Euro</MenuItem>
                      <MenuItem value="GBP">GBP - Livre sterling</MenuItem>
                      <MenuItem value="XAF">XAF - Franc CFA (Afrique centrale)</MenuItem>
                      <MenuItem value="XOF">XOF - Franc CFA (Afrique de l'Ouest)</MenuItem>
                      <MenuItem value="MAD">MAD - Dirham marocain</MenuItem>
                      <MenuItem value="TND">TND - Dinar tunisien</MenuItem>
                      <MenuItem value="NGN">NGN - Naira nigérian</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Identifiants fiscaux Cameroun/OHADA */}
                {(settings.taxRegion === 'cameroon' || settings.taxRegion === 'ohada') && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label={t('settings:general.niu')}
                        placeholder="Ex: M123456789"
                        value={settings.companyNiu || ''}
                        onChange={(e) => onUpdate('companyNiu', e.target.value)}
                        helperText={t('settings:general.niuHelper')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label={t('settings:general.rcNumber')}
                        placeholder="Ex: RC/YDE/2024/A/123"
                        value={settings.companyRcNumber || ''}
                        onChange={(e) => onUpdate('companyRcNumber', e.target.value)}
                        helperText={t('settings:general.rcHelper')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label={t('settings:general.rccmNumber')}
                        placeholder="Ex: RCCM/YDE/2024/A/123"
                        value={settings.companyRccmNumber || ''}
                        onChange={(e) => onUpdate('companyRccmNumber', e.target.value)}
                        helperText={t('settings:general.rccmHelper')}
                      />
                    </Grid>
                  </>
                )}

                {/* Identifiants fiscaux Canada */}
                {settings.taxRegion === 'canada' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label={t('settings:general.neq')}
                        placeholder="Ex: 1234567890"
                        value={settings.companyNeq || ''}
                        onChange={(e) => onUpdate('companyNeq', e.target.value)}
                        helperText={t('settings:general.neqHelper')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label={t('settings:general.gstNumber')}
                        placeholder="Ex: 123456789 RT0001"
                        value={settings.companyGstNumber || ''}
                        onChange={(e) => onUpdate('companyGstNumber', e.target.value)}
                        helperText={t('settings:general.gstHelper')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label={t('settings:general.qstNumber')}
                        placeholder="Ex: 1234567890 TQ0001"
                        value={settings.companyQstNumber || ''}
                        onChange={(e) => onUpdate('companyQstNumber', e.target.value)}
                        helperText={t('settings:general.qstHelper')}
                      />
                    </Grid>
                  </>
                )}

                {/* Identifiants fiscaux USA */}
                {settings.taxRegion === 'usa' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t('settings:general.taxNumber')}
                      placeholder="Ex: 12-3456789"
                      value={settings.companyTaxNumber || ''}
                      onChange={(e) => onUpdate('companyTaxNumber', e.target.value)}
                      helperText={t('settings:general.taxNumberHelper')}
                    />
                  </Grid>
                )}

                {/* Identifiants fiscaux UE */}
                {settings.taxRegion === 'eu' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t('settings:general.vatNumber')}
                      placeholder="Ex: FR12345678901"
                      value={settings.companyVatNumber || ''}
                      onChange={(e) => onUpdate('companyVatNumber', e.target.value)}
                      helperText={t('settings:general.vatHelper')}
                    />
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Coordonnées bancaires - Accordion */}
        <Grid item xs={12}>
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {t('settings:general.bankInfo')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('settings:general.bankName')}
                    placeholder={t('settings:general.bankNamePlaceholder')}
                    value={settings.companyBankName || ''}
                    onChange={(e) => onUpdate('companyBankName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('settings:general.bankAccount')}
                    placeholder={t('settings:general.bankAccountPlaceholder')}
                    value={settings.companyBankAccount || ''}
                    onChange={(e) => onUpdate('companyBankAccount', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('settings:general.bankSwift')}
                    placeholder={t('settings:general.bankSwiftPlaceholder')}
                    value={settings.companyBankSwift || ''}
                    onChange={(e) => onUpdate('companyBankSwift', e.target.value)}
                    helperText={t('settings:general.bankSwiftHelper')}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Paramètres de facturation - Accordion */}
        <Grid item xs={12}>
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Receipt sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('settings:billing.title')}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* Taux de taxes */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('settings:billing.gstHstRate')}
                    type="number"
                    value={settings.gstHstRate || 5}
                    onChange={(e) => onUpdate('gstHstRate', parseFloat(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('settings:billing.qstRate')}
                    type="number"
                    value={settings.qstRate || 9.975}
                    onChange={(e) => onUpdate('qstRate', parseFloat(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('settings:billing.defaultTaxRate')}
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
                    label={t('settings:billing.enableTaxCalculation')}
                  />
                </Grid>

                {/* Préfixes */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('settings:billing.invoicePrefix')}
                    value={settings.invoicePrefix || 'FAC-'}
                    onChange={(e) => onUpdate('invoicePrefix', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('settings:billing.poPrefix')}
                    value={settings.poPrefix || 'BC-'}
                    onChange={(e) => onUpdate('poPrefix', e.target.value)}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Section Impression - Templates et configurations
 */
const PrintSection = ({ settings, printTemplate, printConfiguration, onUpdateTemplate, onUpdateConfiguration, onUpdate }) => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('settings:print.title')}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Alert severity="info" sx={{ mb: 3 }}>
        Configuration d'impression pour les factures et documents
      </Alert>

      <Grid container spacing={3}>
        {/* Format de papier */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('settings:print.paperSize')}</InputLabel>
            <Select
              value={settings?.paperSize || 'A4'}
              onChange={(e) => onUpdate('paperSize', e.target.value)}
            >
              <MenuItem value="A4">A4 (210 × 297 mm)</MenuItem>
              <MenuItem value="Letter">Letter (8.5 × 11 in)</MenuItem>
              <MenuItem value="Legal">Legal (8.5 × 14 in)</MenuItem>
              <MenuItem value="A5">A5 (148 × 210 mm)</MenuItem>
              <MenuItem value="thermal_80">Thermique 80mm (Ticket de caisse)</MenuItem>
              <MenuItem value="thermal_58">Thermique 58mm (Ticket de caisse)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Orientation */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('settings:print.orientation')}</InputLabel>
            <Select
              value={settings?.paperOrientation || 'portrait'}
              onChange={(e) => onUpdate('paperOrientation', e.target.value)}
            >
              <MenuItem value="portrait">{t('settings:print.portrait')}</MenuItem>
              <MenuItem value="landscape">{t('settings:print.landscape')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* QR Code */}
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={settings?.includeQrCode ?? true}
                onChange={(e) => onUpdate('includeQrCode', e.target.checked)}
              />
            }
            label="Afficher le QR Code"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -1 }}>
            Ajoute un QR code sur les documents imprimés
          </Typography>
        </Grid>

        {/* Code-barres */}
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={settings?.includeBarcode ?? false}
                onChange={(e) => onUpdate('includeBarcode', e.target.checked)}
              />
            }
            label="Afficher le Code-barres"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -1 }}>
            Ajoute un code-barres sur les documents imprimés
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Section Notifications
 */
const NotificationSection = ({ settings, onUpdate }) => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('settings:notificationsSection.title')}
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
          label={t('settings:notificationsSection.emailNotifications')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.invoiceReminders ?? true}
              onChange={(e) => onUpdate('invoiceReminders', e.target.checked)}
            />
          }
          label={t('settings:notificationsSection.invoiceReminders')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.lowStockAlerts ?? true}
              onChange={(e) => onUpdate('lowStockAlerts', e.target.checked)}
            />
          }
          label={t('settings:notificationsSection.lowStockAlerts')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.orderStatusUpdates ?? true}
              onChange={(e) => onUpdate('orderStatusUpdates', e.target.checked)}
            />
          }
          label={t('settings:notificationsSection.orderStatusUpdates')}
        />
      </Stack>
    </Box>
  );
};

/**
 * Section Apparence
 */
const AppearanceSection = ({ settings, onUpdate }) => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('settings:appearance.title')}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('settings:appearance.theme')}</InputLabel>
            <Select
              value={settings.theme || 'light'}
              onChange={(e) => onUpdate('theme', e.target.value)}
            >
              <MenuItem value="light">{t('settings:appearance.themeLight')}</MenuItem>
              <MenuItem value="dark">{t('settings:appearance.themeDark')}</MenuItem>
              <MenuItem value="auto">{t('settings:appearance.themeAuto')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('settings:general.language')}</InputLabel>
            <Select
              value={settings.language || 'fr'}
              onChange={(e) => onUpdate('language', e.target.value)}
            >
              <MenuItem value="fr">{t('settings:general.languageFr')}</MenuItem>
              <MenuItem value="en">{t('settings:general.languageEn')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('settings:appearance.dateFormat')}</InputLabel>
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
            <InputLabel>{t('settings:appearance.timeFormat')}</InputLabel>
            <Select
              value={settings.timeFormat || '24h'}
              onChange={(e) => onUpdate('timeFormat', e.target.value)}
            >
              <MenuItem value="24h">{t('settings:appearance.timeFormat24')}</MenuItem>
              <MenuItem value="12h">{t('settings:appearance.timeFormat12')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Section Profil - Changement de mot de passe
 */
const ProfileSection = ({ settings, onUpdate }) => {
  const { t } = useTranslation(['settings', 'common']);
  const user = useSelector((state) => state.auth.user);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const hasPassword = user?.has_usable_password; // Assuming backend sends this flag

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitPassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    // TODO: Implémenter le changement de mot de passe
    console.log('Changement de mot de passe:', passwordData);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Profil et Sécurité
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Informations personnelles */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            Informations personnelles
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            value={user?.email || ''}
            disabled
            helperText="L'adresse email est gérée via votre compte"
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Changement de mot de passe */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            {hasPassword ? 'Modifier le mot de passe' : 'Créer un mot de passe'}
          </Typography>
          {!hasPassword && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Vous êtes connecté via Google. Vous pouvez créer un mot de passe pour vous connecter également avec votre email.
            </Alert>
          )}
        </Grid>

        {hasPassword && (
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type={showPasswords ? 'text' : 'password'}
              label="Mot de passe actuel"
              value={passwordData.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
            />
          </Grid>
        )}

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type={showPasswords ? 'text' : 'password'}
            label="Nouveau mot de passe"
            value={passwordData.newPassword}
            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type={showPasswords ? 'text' : 'password'}
            label="Confirmer le mot de passe"
            value={passwordData.confirmPassword}
            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
          />
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                />
              }
              label="Afficher les mots de passe"
            />
            <Button
              variant="contained"
              onClick={handleSubmitPassword}
              disabled={(hasPassword && !passwordData.currentPassword) || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {hasPassword ? 'Changer le mot de passe' : 'Créer le mot de passe'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Section Migration de données (Import/Export)
 */
const DataSection = ({ settings, showSnackbar }) => {
  const { t } = useTranslation(['settings', 'common']);

  const handleExport = (format) => {
    showSnackbar(t('settings:exportInProgress', { format: format.toUpperCase() }), 'info');
    // TODO: Implémenter l'export réel
    setTimeout(() => {
      showSnackbar(t('settings:exportSuccess', { format: format.toUpperCase() }), 'success');
    }, 1500);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      showSnackbar(t('settings:importInProgress', { filename: file.name }), 'info');
      // TODO: Implémenter l'import réel
      setTimeout(() => {
        showSnackbar(t('settings:importSuccess'), 'success');
      }, 1500);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('settings:data.title')}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Section Export */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            {t('settings:data.exportSection.title')}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('settings:data.exportSection.description')}
          </Alert>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => handleExport('json')}
            >
              {t('settings:data.exportSection.exportJson')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('csv')}
            >
              {t('settings:data.exportSection.exportCsv')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('excel')}
            >
              {t('settings:data.exportSection.exportExcel')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('pdf')}
            >
              {t('settings:data.exportSection.exportPdf')}
            </Button>
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Section Import */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            {t('settings:data.importSection.title')}
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('settings:data.importSection.warning')}
          </Alert>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
          >
            {t('settings:data.importSection.chooseFile')}
            <input
              type="file"
              hidden
              accept=".json,.csv,.xlsx"
              onChange={handleImport}
            />
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {t('settings:data.importSection.acceptedFormats')}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Section Migration */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            {t('settings:data.migrationSection.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('settings:data.migrationSection.description')}
          </Typography>
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 0.5, backgroundColor: '#fafafa' }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('settings:data.migrationSection.quickbooks.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('settings:data.migrationSection.quickbooks.description')}
              </Typography>
              <Button variant="outlined" size="small">
                {t('settings:data.migrationSection.quickbooks.configure')}
              </Button>
            </Paper>

            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 0.5, backgroundColor: '#fafafa' }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('settings:data.migrationSection.sage.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('settings:data.migrationSection.sage.description')}
              </Typography>
              <Button variant="outlined" size="small">
                {t('settings:data.migrationSection.sage.configure')}
              </Button>
            </Paper>

            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 0.5, backgroundColor: '#fafafa' }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('settings:data.migrationSection.generic.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('settings:data.migrationSection.generic.description')}
              </Typography>
              <Button variant="outlined" size="small">
                {t('settings:data.migrationSection.generic.configure')}
              </Button>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
