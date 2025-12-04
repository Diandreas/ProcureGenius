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
        showSnackbar(t('settings:logoUpdateSuccess'), 'success');

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
    { label: t('settings:tabs.billing'), icon: <BillingIcon /> },
    { label: t('settings:tabs.print'), icon: <PrintIcon /> },
    { label: t('settings:tabs.notifications'), icon: <NotificationsIcon /> },
    { label: t('settings:tabs.appearance'), icon: <AppearanceIcon /> },
    { label: t('settings:tabs.security'), icon: <SecurityIcon /> },
    { label: t('settings:tabs.backup'), icon: <BackupIcon /> },
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
    <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      {/* Prévisualisation réaliste de l'en-tête */}
      <Grid item xs={12}>
        <Paper
          elevation={0}
          sx={{
            p: isMobile ? 1.5 : 3,
            border: '1px solid #e0e0e0',
            borderRadius: 0.5,
            backgroundColor: '#fafafa',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: isMobile ? 1 : 2,
              textAlign: 'center',
              color: '#666',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontSize: isMobile ? '0.6rem' : '0.75rem',
            }}
          >
            {t('settings:general.preview')}
          </Typography>
          <Box sx={{ borderBottom: `${isMobile ? 2 : 3}px solid ${settings.brandColor || '#2563eb'}`, pb: isMobile ? 1 : 2, mb: isMobile ? 1 : 2 }}>
            <Stack
              direction={isMobile ? 'column' : 'row'}
              spacing={isMobile ? 1 : 3}
              alignItems={isMobile ? 'center' : 'flex-start'}
              justifyContent="space-between"
            >
              <Box flex={1} sx={{ width: '100%', textAlign: isMobile ? 'center' : 'left' }}>
                {settings.companyLogo && (
                  <Box
                    component="img"
                    src={settings.companyLogo}
                    alt="Logo"
                    sx={{
                      maxHeight: isMobile ? 30 : 60,
                      maxWidth: isMobile ? 100 : 150,
                      objectFit: 'contain',
                      mb: isMobile ? 0.5 : 1,
                      mx: isMobile ? 'auto' : 0,
                    }}
                  />
                )}
                <Typography
                  variant={isMobile ? 'caption' : 'subtitle1'}
                  fontWeight="bold"
                  sx={{ mb: isMobile ? 0.25 : 0.5, color: settings.brandColor || '#2563eb', fontSize: isMobile ? '0.75rem' : undefined }}
                >
                  {settings.companyName || t('settings:general.companyNamePlaceholder')}
                </Typography>
                {settings.companyAddress && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      whiteSpace: 'pre-line',
                      fontSize: isMobile ? '0.6rem' : '0.75rem',
                      lineHeight: isMobile ? 1.2 : 1.5,
                    }}
                  >
                    {settings.companyAddress}
                  </Typography>
                )}
                <Stack
                  direction={isMobile ? 'column' : 'row'}
                  spacing={isMobile ? 0.25 : 1}
                  sx={{ mt: isMobile ? 0.25 : 0.5 }}
                  flexWrap="wrap"
                  alignItems={isMobile ? 'center' : 'flex-start'}
                >
                  {settings.companyPhone && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>
                      {isMobile ? 'Tel: ' : t('settings:general.phoneLabel') + ': '}{settings.companyPhone}
                    </Typography>
                  )}
                  {settings.companyEmail && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>
                      {!isMobile && '• '}{settings.companyEmail}
                    </Typography>
                  )}
                </Stack>
              </Box>
              <Box
                textAlign={isMobile ? 'center' : 'right'}
                sx={{ width: isMobile ? '100%' : 'auto', mt: isMobile ? 1 : 0 }}
              >
                <Typography
                  variant={isMobile ? 'body1' : 'h4'}
                  fontWeight="bold"
                  sx={{
                    letterSpacing: 1,
                    color: settings.brandColor || '#2563eb',
                    fontSize: isMobile ? '0.9rem' : undefined,
                  }}
                >
                  {t('settings:general.invoicePreview')}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{ mt: isMobile ? 0.25 : 1, fontSize: isMobile ? '0.7rem' : undefined }}
                >
                  {t('settings:general.invoiceNumber')} FAC-2025-001
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: isMobile ? '0.6rem' : undefined }}
                >
                  {t('settings:general.dateLabel')}: {new Date().toLocaleDateString(t('common:locale'))}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              textAlign: 'center',
              fontStyle: 'italic',
              fontSize: isMobile ? '0.6rem' : '0.75rem',
            }}
          >
            {t('settings:general.previewHelper')}
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label={t('settings:general.companyNameLabel')}
          placeholder={t('settings:general.companyNamePlaceholder')}
          value={settings.companyName || ''}
          onChange={(e) => onUpdate('companyName', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
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
          label={t('settings:general.phone')}
          placeholder={t('settings:general.phonePlaceholder')}
          value={settings.companyPhone || ''}
          onChange={(e) => onUpdate('companyPhone', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label={t('settings:general.website')}
          placeholder={t('settings:general.websitePlaceholder')}
          value={settings.companyWebsite || ''}
          onChange={(e) => onUpdate('companyWebsite', e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('settings:general.address')}
          placeholder={t('settings:general.addressPlaceholder')}
          multiline
          rows={3}
          value={settings.companyAddress || ''}
          onChange={(e) => onUpdate('companyAddress', e.target.value)}
        />
      </Grid>

      {/* Upload du logo avec cropping */}
      <Grid item xs={12}>
        <Paper elevation={0} sx={{ p: 2, border: '1px dashed #bdbdbd', borderRadius: 0.5, backgroundColor: '#fafafa' }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="subtitle2">{t('settings:logo.title')}</Typography>
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
              {t('settings:logo.choose')}
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
              {t('settings:logo.helper')}
            </Typography>
          </Stack>
        </Paper>
      </Grid>

      {/* Sélecteur de couleur de marque */}
      <Grid item xs={12}>
        <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, border: '1px solid #e0e0e0', borderRadius: 0.5, backgroundColor: '#fafafa' }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={600}>
              {t('settings:appearance.brandColor')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('settings:appearance.brandColorHelper')}
            </Typography>
            <Stack
              direction={isMobile ? 'column' : 'row'}
              spacing={isMobile ? 2 : 3}
              alignItems={isMobile ? 'stretch' : 'center'}
            >
              <Box sx={{ width: isMobile ? '100%' : 'auto' }}>
                <TextField
                  type="color"
                  value={settings.brandColor || '#2563eb'}
                  onChange={(e) => onUpdate('brandColor', e.target.value)}
                  fullWidth={isMobile}
                  sx={{
                    width: isMobile ? '100%' : 100,
                    '& input': {
                      height: isMobile ? 50 : 60,
                      cursor: 'pointer',
                      border: '2px solid #ddd',
                      borderRadius: 1,
                    }
                  }}
                />
              </Box>
              <Box flex={1} sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label={t('settings:appearance.brandColorCode')}
                  value={settings.brandColor || '#2563eb'}
                  onChange={(e) => onUpdate('brandColor', e.target.value)}
                  placeholder={t('settings:appearance.brandColorCodePlaceholder')}
                  helperText={t('settings:appearance.brandColorCodeHelper')}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('settings:appearance.presetColors')}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                {[
                  { name: t('settings:appearance.colors.blue'), color: '#2563eb' },
                  { name: t('settings:appearance.colors.purple'), color: '#7c3aed' },
                  { name: t('settings:appearance.colors.green'), color: '#059669' },
                  { name: t('settings:appearance.colors.red'), color: '#dc2626' },
                  { name: t('settings:appearance.colors.orange'), color: '#ea580c' },
                  { name: t('settings:appearance.colors.pink'), color: '#db2777' },
                  { name: t('settings:appearance.colors.indigo'), color: '#4f46e5' },
                  { name: t('settings:appearance.colors.black'), color: '#1f2937' },
                ].map((preset) => (
                  <Button
                    key={preset.color}
                    size={isMobile ? 'small' : 'medium'}
                    variant={settings.brandColor === preset.color ? 'contained' : 'outlined'}
                    onClick={() => onUpdate('brandColor', preset.color)}
                    sx={{
                      minWidth: 'auto',
                      px: isMobile ? 1 : 1.5,
                      py: isMobile ? 0.25 : 0.5,
                      fontSize: isMobile ? '0.7rem' : '0.875rem',
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
};

/**
 * Section Facturation - Taxation et facturation
 */
const BillingSection = ({ settings, onUpdate }) => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('settings:billing.title')}
      </Typography>
      <Divider sx={{ mb: 3 }} />

    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label={t('settings:billing.gstHstRate')}
          type="number"
          value={settings.gstHstRate || 5}
          onChange={(e) => onUpdate('gstHstRate', parseFloat(e.target.value))}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label={t('settings:billing.qstRate')}
          type="number"
          value={settings.qstRate || 9.975}
          onChange={(e) => onUpdate('qstRate', parseFloat(e.target.value))}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
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

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label={t('settings:billing.invoicePrefix')}
          value={settings.invoicePrefix || 'FAC-'}
          onChange={(e) => onUpdate('invoicePrefix', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label={t('settings:billing.poPrefix')}
          value={settings.poPrefix || 'BC-'}
          onChange={(e) => onUpdate('poPrefix', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>{t('settings:billing.defaultCurrency')}</InputLabel>
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
        {t('settings:print.infoMessage')}
      </Alert>

      <Typography variant="subtitle2" gutterBottom>
        {t('settings:print.documentHeader')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('settings:print.primaryColor')}
            type="color"
            value={printTemplate?.primaryColor || '#0066cc'}
            onChange={(e) => onUpdateTemplate('primaryColor', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={settings?.includeQrCode ?? true}
                onChange={(e) => onUpdate('includeQrCode', e.target.checked)}
              />
            }
            label={t('settings:print.showQrCode')}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" gutterBottom>
        {t('settings:print.paperConfiguration')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
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
      </Grid>

      <Typography variant="subtitle2" gutterBottom>
        {t('settings:print.additionalOptions')}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={settings?.printColors ?? true}
                onChange={(e) => onUpdate('printColors', e.target.checked)}
              />
            }
            label={t('settings:print.printColors')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('settings:print.printMargins')}
            type="number"
            value={settings?.printMargins || 12}
            onChange={(e) => onUpdate('printMargins', parseInt(e.target.value))}
            helperText={t('settings:print.printMarginsHelper')}
            InputProps={{
              endAdornment: <span>mm</span>
            }}
          />
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
 * Section Sécurité
 */
const SecuritySection = ({ settings, onUpdate }) => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('settings:security.title')}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('settings:security.sessionTimeoutLabel')}
            type="number"
            value={settings.sessionTimeout || 30}
            onChange={(e) => onUpdate('sessionTimeout', parseInt(e.target.value))}
            helperText={t('settings:security.sessionTimeoutHelper')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('settings:security.loginAttemptsLabel')}
            type="number"
            value={settings.loginAttempts || 5}
            onChange={(e) => onUpdate('loginAttempts', parseInt(e.target.value))}
            helperText={t('settings:security.loginAttemptsHelper')}
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
            label={t('settings:security.requireStrongPasswordsLabel')}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -1 }}>
            {t('settings:security.requireStrongPasswordsHelper')}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableTwoFactor ?? false}
                onChange={(e) => onUpdate('enableTwoFactor', e.target.checked)}
              />
            }
            label={t('settings:security.enableTwoFactorLabel')}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -1 }}>
            {t('settings:security.enableTwoFactorHelper')}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Section Sauvegarde
 */
const BackupSection = ({ settings, onUpdate }) => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('settings:backup.title')}
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
            label={t('settings:backup.autoBackupLabel')}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -1 }}>
            {t('settings:backup.autoBackupHelper')}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={!settings.autoBackup}>
            <InputLabel>{t('settings:backup.frequencyLabel')}</InputLabel>
            <Select
              value={settings.backupFrequency || 'daily'}
              onChange={(e) => onUpdate('backupFrequency', e.target.value)}
            >
              <MenuItem value="hourly">{t('settings:backup.frequencies.hourly')}</MenuItem>
              <MenuItem value="daily">{t('settings:backup.frequencies.daily')}</MenuItem>
              <MenuItem value="weekly">{t('settings:backup.frequencies.weekly')}</MenuItem>
              <MenuItem value="monthly">{t('settings:backup.frequencies.monthly')}</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('settings:backup.frequencyHelper')}
            </Typography>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('settings:backup.retentionLabel')}
            type="number"
            value={settings.backupRetention || 30}
            onChange={(e) => onUpdate('backupRetention', parseInt(e.target.value))}
            disabled={!settings.autoBackup}
            helperText={t('settings:backup.retentionHelper')}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

/**
 * Section Import/Export et Migration de données
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
