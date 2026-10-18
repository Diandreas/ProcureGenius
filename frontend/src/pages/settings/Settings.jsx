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
  Chip,
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
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  FileDownload as FileDownloadIcon,
  History as HistoryIcon,
  Email as EmailIcon,
  CheckCircle,
  Warning,
  Person as PersonIcon,
  ChevronRight,
  CreditCard as CreditCardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api, { suppliersAPI, clientsAPI, productsAPI } from '../../services/api';
import subscriptionAPI from '../../services/subscriptionAPI';
import SubscriptionStatus from '../../components/SubscriptionStatus';
import BillingPanel from '../../components/settings/BillingPanel';
import Cropper from 'react-easy-crop';
import { useModules } from '../../contexts/ModuleContext';

// Import API services
import { settingsAPI } from '../../services/settingsAPI';
import { refreshOrgTaxSettings } from '../../hooks/useOrgTaxSettings';
import { printTemplatesAPI } from '../../services/printTemplatesAPI';
import { printConfigurationsAPI } from '../../services/printConfigurationsAPI';
import ModulesManager from '../../components/settings/ModulesManager';
import PushNotificationSettings from '../../components/settings/PushNotificationSettings';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

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

const LOGO_FORMATS = [
  { value: 'square',    labelKey: 'settings:logo.formatOptions.square',    aspect: 1,         hint: '1:1' },
  { value: 'landscape', labelKey: 'settings:logo.formatOptions.landscape', aspect: 4,         hint: '4:1' },
  { value: 'portrait',  labelKey: 'settings:logo.formatOptions.portrait',  aspect: 3 / 4,     hint: '3:4' },
  { value: 'original',  labelKey: 'settings:logo.formatOptions.original',  aspect: undefined,  hintKey: 'settings:logo.formatOptions.freeHint' },
];

/**
 * Composant principal Settings
 */
const Settings = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
  const [logoFormat, setLogoFormat] = useState('original');

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
      refreshOrgTaxSettings(); // taux et régime de TVA utilisés par les achats et les dépenses

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

        console.log(' Couleur dominante extraite:', hex);
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

  // Navigation items — groupés par thème
  const NAV_GROUPS = [
    {
      label: t('settings:nav.groups.company'),
      items: [
        { id: 0, label: t('settings:tabs.general'), icon: <BusinessIcon fontSize="small" />, description: t('settings:nav.general.description') },
        { id: 1, label: t('settings:nav.modules.label'), icon: <AppsIcon fontSize="small" />, description: t('settings:nav.modules.description') },
      ],
    },
    {
      label: t('settings:nav.groups.customization'),
      items: [
        { id: 2, label: t('settings:tabs.print'), icon: <PrintIcon fontSize="small" />, description: t('settings:nav.print.description') },
        { id: 3, label: t('settings:nav.notifications.label'), icon: <NotificationsIcon fontSize="small" />, description: t('settings:nav.notifications.description') },
        { id: 4, label: t('settings:nav.email.label'), icon: <EmailIcon fontSize="small" />, description: t('settings:nav.email.description') },
      ],
    },
    {
      label: t('settings:nav.groups.account'),
      items: [
        { id: 8, label: t('settings:nav.subscription.label'), icon: <CreditCardIcon fontSize="small" />, description: t('settings:nav.subscription.description') },
        { id: 5, label: t('settings:nav.profile.label'), icon: <PersonIcon fontSize="small" />, description: t('settings:nav.profile.description') },
        { id: 6, label: t('settings:nav.appearance.label'), icon: <AppearanceIcon fontSize="small" />, description: t('settings:nav.appearance.description') },
        { id: 7, label: t('settings:nav.data.label'), icon: <BackupIcon fontSize="small" />, description: t('settings:nav.data.description') },
      ],
    },
  ];

  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === activeTab) || allItems[0];

  // Loading state
  if (loading) {
    return <LoadingState message={t('settings:loading', 'Chargement des paramètres...')} />;
  }

  // Error state
  if (!settings) {
    return (
      <ErrorState
        title={t('settings:errorMessage', 'Erreur de chargement')}
        message={t('settings:errorDescription', 'Impossible de charger les paramètres. Veuillez réessayer.')}
        showHome={false}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <Box p={{ xs: 2, sm: 2, md: 3 }}>
      {/* Header page */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>{t('settings:title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('settings:pageSubtitle')}
        </Typography>
      </Box>

      {/* Sélecteur mobile — select compact */}
      {isMobile && (
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <Select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            renderValue={(val) => {
              const item = allItems.find(i => i.id === val);
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {item?.icon}
                  <Typography variant="body2" fontWeight={600}>{item?.label}</Typography>
                </Box>
              );
            }}
          >
            {NAV_GROUPS.map((group) => [
              <MenuItem disabled key={group.label} sx={{ opacity: 1, py: 0.5 }}>
                <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.65rem' }}>
                  {group.label}
                </Typography>
              </MenuItem>,
              ...group.items.map((item) => (
                <MenuItem key={item.id} value={item.id} sx={{ gap: 1.5 }}>
                  <Box sx={{ color: 'text.secondary', display: 'flex' }}>{item.icon}</Box>
                  {item.label}
                </MenuItem>
              )),
            ])}
          </Select>
        </FormControl>
      )}

      {/* Layout : sidebar + content sur md+ */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>

        {/* ── Sidebar (sm+) ── */}
        {!isMobile && (
          <Box sx={{ width: 210, flexShrink: 0, position: 'sticky', top: 80 }}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
              }}
            >
              {NAV_GROUPS.map((group, gi) => (
                <Box key={gi}>
                  {gi > 0 && <Divider />}
                  <Box px={2} pt={gi === 0 ? 2 : 1.5} pb={0.5}>
                    <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                      {group.label}
                    </Typography>
                  </Box>
                  {group.items.map((item) => (
                    <Box
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mx: 1,
                        mb: 0.25,
                        px: 1.5,
                        py: 0.9,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        bgcolor: activeTab === item.id ? 'primary.50' : 'transparent',
                        color: activeTab === item.id ? 'primary.main' : 'text.secondary',
                        fontWeight: activeTab === item.id ? 600 : 400,
                        transition: 'background 0.12s',
                        '&:hover': {
                          bgcolor: activeTab === item.id ? 'primary.100' : 'action.hover',
                          color: activeTab === item.id ? 'primary.main' : 'text.primary',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', color: 'inherit' }}>{item.icon}</Box>
                      <Typography variant="body2" fontWeight="inherit" color="inherit" noWrap>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                  {gi === NAV_GROUPS.length - 1 && <Box pb={1.5} />}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ── Main content ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            {/* Section header — simple, pas de fond coloré */}
            <Box
              sx={{
                px: { xs: 2.5, md: 3 },
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box sx={{ color: 'primary.main', display: 'flex' }}>{activeItem.icon}</Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>{activeItem.label}</Typography>
                <Typography variant="caption" color="text.secondary">{activeItem.description}</Typography>
              </Box>
            </Box>

            {/* Section content */}
            <Box p={{ xs: 2, sm: 2.5, md: 3 }}>
              {activeTab === 0 && (
                <GeneralSection
                  settings={settings}
                  onUpdate={handleUpdateSetting}
                  onFileSelect={handleFileSelect}
                  logoFormat={logoFormat}
                  setLogoFormat={setLogoFormat}
                />
              )}
              {activeTab === 1 && <ModulesManager />}
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
              {activeTab === 3 && (
                <>
                  <NotificationSection settings={settings} onUpdate={handleUpdateSetting} />
                  <Divider sx={{ my: 4 }} />
                  <PushNotificationSettings />
                </>
              )}
              {activeTab === 4 && (
                <EmailSection settings={settings} showSnackbar={showSnackbar} />
              )}
              {activeTab === 5 && (
                <>
                  <ProfileSection settings={settings} onUpdate={handleUpdateSetting} />
                  <Divider sx={{ my: 4 }} />
                  {/* Changement mot de passe inclus dans ProfileSection */}
                </>
              )}
              {activeTab === 6 && (
                <AppearanceSection settings={settings} onUpdate={handleUpdateSetting} />
              )}
              {activeTab === 7 && (
                <DataSection settings={settings} showSnackbar={showSnackbar} />
              )}
              {activeTab === 8 && <BillingPanel />}

              {/* Bouton de sauvegarde (masqué pour onglets sans save global) */}
              {[0, 2, 6].includes(activeTab) && (
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
              )}
            </Box>
          </Box>
        </Box>
      </Box>

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
                aspect={LOGO_FORMATS.find(f => f.value === logoFormat)?.aspect}
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

      {/* Snackbar */}
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
const GeneralSection = ({ settings, onUpdate, onFileSelect, logoFormat, setLogoFormat }) => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Box>
      <Grid container spacing={{ xs: 1.25, md: 2 }}>
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
        {/* Téléphone + Site web côte à côte sur mobile pour compacter */}
        <Grid item xs={6} md={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:general.phone')}
            placeholder={t('settings:general.phonePlaceholder')}
            value={settings.companyPhone || ''}
            onChange={(e) => onUpdate('companyPhone', e.target.value)}
          />
        </Grid>
        <Grid item xs={6} md={6}>
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

        {/* Logo et Branding */}
        <Grid item xs={12}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('settings:general.logoAndBrand')}
            </Typography>
            <Divider />
            <Stack direction="row" spacing={1} flexWrap="wrap" pt={0.5}>
              {LOGO_FORMATS.map((fmt) => (
                <Box
                  key={fmt.value}
                  onClick={() => setLogoFormat(fmt.value)}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    border: '1.5px solid',
                    borderColor: logoFormat === fmt.value ? 'primary.main' : 'divider',
                    bgcolor: logoFormat === fmt.value ? 'primary.50' : 'transparent',
                    color: logoFormat === fmt.value ? 'primary.main' : 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                  }}
                >
                  {t(fmt.labelKey)} <Box component="span" sx={{ opacity: 0.6, ml: 0.5 }}>{fmt.hintKey ? t(fmt.hintKey) : fmt.hint}</Box>
                </Box>
              ))}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: logoFormat === 'landscape' ? 160 : logoFormat === 'portrait' ? 72 : 80,
                  height: logoFormat === 'landscape' ? 40 : logoFormat === 'portrait' ? 96 : 80,
                  borderRadius: 1.5,
                  border: '2px dashed',
                  borderColor: settings.companyLogo ? 'transparent' : 'divider',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: settings.companyLogo ? 'transparent' : 'action.hover',
                  flexShrink: 0,
                }}
              >
                {settings.companyLogo ? (
                  <Box
                    component="img"
                    src={settings.companyLogo}
                    alt="Logo"
                    sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Typography variant="caption" color="text.disabled" textAlign="center" px={1}>
                    {t('settings:general.logoPreview')}
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                size="small"
              >
                {settings.companyLogo ? t('settings:logo.change') : t('settings:logo.choose')}
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
          </Stack>
        </Grid>

        {/* Couleur de marque */}
        <Grid item xs={12} md={6}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="color"
              value={settings.brandColor || '#2563eb'}
              onChange={(e) => onUpdate('brandColor', e.target.value)}
              sx={{ width: 56, '& .MuiInputBase-root': { height: 36 } }}
            />
            <TextField
              fullWidth
              size="small"
              label={t('settings:appearance.brandColor')}
              value={settings.brandColor || '#2563eb'}
              onChange={(e) => onUpdate('brandColor', e.target.value)}
            />
          </Stack>
        </Grid>

        {/* Informations légales et fiscales */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings:general.legalInfo')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={{ xs: 1.25, md: 2 }}>
            <Grid item xs={12} md={6}>
              <CountrySelect
                value={settings.country || ''}
                onChange={(c) => {
                  onUpdate('country', c.code);
                  // le pays propose sa devise, sa TVA, sa région fiscale et son fuseau ; tout reste modifiable
                  onUpdate('defaultCurrency', c.currency);
                  onUpdate('defaultTaxRate', c.vat_rate);
                  onUpdate('taxRegion', c.tax_region);
                  onUpdate('timezone', c.timezone);
                }}
              />
            </Grid>
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('settings:general.defaultCurrency')}</InputLabel>
                <Select
                  value={settings.defaultCurrency || 'XAF'}
                  onChange={(e) => onUpdate('defaultCurrency', e.target.value)}
                  label={t('settings:general.defaultCurrency')}
                >
                  <MenuItem value="CAD">CAD - {t('settings:currencies.CAD')}</MenuItem>
                  <MenuItem value="USD">USD - {t('settings:currencies.USD')}</MenuItem>
                  <MenuItem value="EUR">EUR - {t('settings:currencies.EUR')}</MenuItem>
                  <MenuItem value="GBP">GBP - {t('settings:currencies.GBP')}</MenuItem>
                  <MenuItem value="XAF">XAF - {t('settings:currencies.XAF')}</MenuItem>
                  <MenuItem value="XOF">XOF - {t('settings:currencies.XOF')}</MenuItem>
                  <MenuItem value="MAD">MAD - {t('settings:currencies.MAD')}</MenuItem>
                  <MenuItem value="TND">TND - {t('settings:currencies.TND')}</MenuItem>
                  <MenuItem value="NGN">NGN - {t('settings:currencies.NGN')}</MenuItem>
                  <MenuItem value="GNF">GNF - {t('settings:currencies.GNF')}</MenuItem>
                  <MenuItem value="CDF">CDF - {t('settings:currencies.CDF')}</MenuItem>
                  <MenuItem value="DZD">DZD - {t('settings:currencies.DZD')}</MenuItem>
                  <MenuItem value="CHF">CHF - {t('settings:currencies.CHF')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {(settings.taxRegion === 'cameroon' || settings.taxRegion === 'ohada') && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('settings:general.niu')}
                    placeholder={t('settings:general.examplePlaceholder', { value: 'M123456789' })}
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
                    placeholder={t('settings:general.examplePlaceholder', { value: 'RC/YDE/2024/A/123' })}
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
                    placeholder={t('settings:general.examplePlaceholder', { value: 'RCCM/YDE/2024/A/123' })}
                    value={settings.companyRccmNumber || ''}
                    onChange={(e) => onUpdate('companyRccmNumber', e.target.value)}
                    helperText={t('settings:general.rccmHelper')}
                  />
                </Grid>
              </>
            )}
            {settings.taxRegion === 'canada' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('settings:general.neq')}
                    placeholder={t('settings:general.examplePlaceholder', { value: '1234567890' })}
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
                    placeholder={t('settings:general.examplePlaceholder', { value: '123456789 RT0001' })}
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
                    placeholder={t('settings:general.examplePlaceholder', { value: '1234567890 TQ0001' })}
                    value={settings.companyQstNumber || ''}
                    onChange={(e) => onUpdate('companyQstNumber', e.target.value)}
                    helperText={t('settings:general.qstHelper')}
                  />
                </Grid>
              </>
            )}
            {settings.taxRegion === 'usa' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('settings:general.taxNumber')}
                  placeholder={t('settings:general.examplePlaceholder', { value: '12-3456789' })}
                  value={settings.companyTaxNumber || ''}
                  onChange={(e) => onUpdate('companyTaxNumber', e.target.value)}
                  helperText={t('settings:general.taxNumberHelper')}
                />
              </Grid>
            )}
            {settings.taxRegion === 'eu' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('settings:general.vatNumber')}
                  placeholder={t('settings:general.examplePlaceholder', { value: 'FR12345678901' })}
                  value={settings.companyVatNumber || ''}
                  onChange={(e) => onUpdate('companyVatNumber', e.target.value)}
                  helperText={t('settings:general.vatHelper')}
                />
              </Grid>
            )}
          </Grid>
        </Grid>

        {/* Coordonnées bancaires */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings:general.bankInfo')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
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
        </Grid>

        {/* Paramètres de facturation */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings:billing.title')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {/* TPS/TVH et TVQ : Canada seulement */}
            {(settings.country === 'CA' || settings.taxRegion === 'canada') && (
              <>
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
              </>
            )}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label={t('settings:billing.defaultTaxRate')}
                type="number"
                value={settings.defaultTaxRate ?? 0}
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
            <VatRegimeFields settings={settings} onUpdate={onUpdate} />
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label={t('settings:billing.invoicePrefix')}
                value={settings.invoicePrefix || 'FAC-'}
                onChange={(e) => onUpdate('invoicePrefix', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label={t('settings:billing.poPrefix')}
                value={settings.poPrefix || 'BC-'}
                onChange={(e) => onUpdate('poPrefix', e.target.value)}
              />
            </Grid>
          </Grid>
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
      <Grid container spacing={2}>
        {/* Format de papier */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('settings:print.paperSize')}</InputLabel>
            <Select
              value={settings?.paperSize || 'A4'}
              onChange={(e) => onUpdate('paperSize', e.target.value)}
              label={t('settings:print.paperSize')}
            >
              <MenuItem value="A4">A4 (210 × 297 mm)</MenuItem>
              <MenuItem value="Letter">Letter (8.5 × 11 in)</MenuItem>
              <MenuItem value="Legal">Legal (8.5 × 14 in)</MenuItem>
              <MenuItem value="A5">A5 (148 × 210 mm)</MenuItem>
              <MenuItem value="thermal_80">{t('settings:print.thermal80')}</MenuItem>
              <MenuItem value="thermal_58">{t('settings:print.thermal58')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Orientation */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('settings:print.orientation')}</InputLabel>
            <Select
              value={settings?.paperOrientation || 'portrait'}
              onChange={(e) => onUpdate('paperOrientation', e.target.value)}
              label={t('settings:print.orientation')}
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
            label={t('settings:print.showQrCodeLabel')}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -0.5 }}>
            {t('settings:print.showQrCodeHelper')}
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
            label={t('settings:print.showBarcode')}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -0.5 }}>
            {t('settings:print.showBarcodeHelper')}
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
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1.5}>
        {t('settings:notificationsSection.inAppAlerts')}
      </Typography>
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
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('settings:appearance.theme')}</InputLabel>
            <Select
              value={settings.theme || 'light'}
              onChange={(e) => onUpdate('theme', e.target.value)}
              label={t('settings:appearance.theme')}
            >
              <MenuItem value="light">{t('settings:appearance.themeLight')}</MenuItem>
              <MenuItem value="dark">{t('settings:appearance.themeDark')}</MenuItem>
              <MenuItem value="auto">{t('settings:appearance.themeAuto')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('settings:general.language')}</InputLabel>
            <Select
              value={settings.language || 'fr'}
              onChange={(e) => onUpdate('language', e.target.value)}
              label={t('settings:general.language')}
            >
              <MenuItem value="fr">{t('settings:general.languageFr')}</MenuItem>
              <MenuItem value="en">{t('settings:general.languageEn')}</MenuItem>
              <MenuItem value="de">Deutsch</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('settings:appearance.dateFormat')}</InputLabel>
            <Select
              value={settings.dateFormat || 'DD/MM/YYYY'}
              onChange={(e) => onUpdate('dateFormat', e.target.value)}
              label={t('settings:appearance.dateFormat')}
            >
              <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
              <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
              <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('settings:appearance.timeFormat')}</InputLabel>
            <Select
              value={settings.timeFormat || '24h'}
              onChange={(e) => onUpdate('timeFormat', e.target.value)}
              label={t('settings:appearance.timeFormat')}
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
 * Section Profil - Informations personnelles + Changement de mot de passe
 */
const ProfileSection = ({ settings, onUpdate }) => {
  const { t } = useTranslation(['settings', 'common']);
  const token = localStorage.getItem('authToken');

  // Infos personnelles
  const [profileData, setProfileData] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [hasUsablePassword, setHasUsablePassword] = useState(true);

  // Mot de passe
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    fetch('/api/v1/accounts/profile/', { headers: { Authorization: `Token ${token}` } })
      .then(r => r.json())
      .then(data => {
        setProfileData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
        // Détecter Social Login (pas de mot de passe local)
        if (data.has_usable_password === false) {
          setHasUsablePassword(false);
        }
      });
  }, []);

  const handleProfileSave = async () => {
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await fetch('/api/v1/accounts/profile/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('settings:profile.genericError'));
      setProfileSuccess(t('settings:profile.updateSuccess'));
    } catch (e) {
      setProfileError(e.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSubmitPassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwError(t('settings:profile.passwordMismatch'));
      return;
    }
    setPwLoading(true);
    setPwError('');
    setPwSuccess('');
    try {
      const res = await fetch('/api/v1/auth/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ current_password: passwordData.currentPassword, new_password: passwordData.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('settings:profile.genericError'));
      if (data.token) localStorage.setItem('authToken', data.token);
      setPwSuccess(t('settings:profile.passwordChanged'));
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setPwError(e.message);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <Box>
      {/* Informations personnelles */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {t('settings:profile.personalInfo')}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label={t('settings:profile.firstName')} value={profileData.first_name}
            onChange={(e) => setProfileData(p => ({ ...p, first_name: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label={t('settings:profile.lastName')} value={profileData.last_name}
            onChange={(e) => setProfileData(p => ({ ...p, last_name: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label={t('settings:profile.email')} type="email" value={profileData.email}
            onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label={t('settings:profile.phone')} value={profileData.phone}
            onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))} />
        </Grid>
        {profileSuccess && <Grid item xs={12}><Alert severity="success" sx={{ py: 0 }}>{profileSuccess}</Alert></Grid>}
        {profileError && <Grid item xs={12}><Alert severity="error" sx={{ py: 0 }}>{profileError}</Alert></Grid>}
        <Grid item xs={12}>
          <Button variant="contained" size="small" onClick={handleProfileSave} disabled={profileLoading}>
            {profileLoading ? <CircularProgress size={16} /> : t('settings:profile.saveProfile')}
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Changement de mot de passe */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {t('settings:profile.changePasswordTitle')}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {!hasUsablePassword && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('settings:profile.googleInfo')}
        </Alert>
      )}
      <Grid container spacing={2}>
        {hasUsablePassword && (
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" type={showPasswords ? 'text' : 'password'} label={t('settings:profile.currentPassword')}
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} />
        </Grid>
        )}
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" type={showPasswords ? 'text' : 'password'} label={t('settings:profile.newPassword')}
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" type={showPasswords ? 'text' : 'password'} label={t('settings:profile.confirmPassword')}
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} />
        </Grid>
        {pwSuccess && <Grid item xs={12}><Alert severity="success" sx={{ py: 0 }}>{pwSuccess}</Alert></Grid>}
        {pwError && <Grid item xs={12}><Alert severity="error" sx={{ py: 0 }}>{pwError}</Alert></Grid>}
        <Grid item xs={12}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <FormControlLabel
              control={<Switch size="small" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} />}
              label={<Typography variant="body2">{t('settings:profile.showPasswords')}</Typography>}
            />
            <Button variant="contained" size="small" onClick={handleSubmitPassword}
              disabled={pwLoading || (hasUsablePassword && !passwordData.currentPassword) || !passwordData.newPassword || !passwordData.confirmPassword}>
              {pwLoading ? <CircularProgress size={16} /> : t('settings:profile.changePassword')}
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
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const { hasModule } = useModules();

  // Types d'import disponibles
  const importTypes = [
    {
      key: 'suppliers',
      label: t('settings:dataSection.importTypes.suppliers.label'),
      icon: <LocalShippingIcon sx={{ fontSize: 36 }} />,
      color: '#2563eb',
      description: t('settings:dataSection.importTypes.suppliers.description'),
    },
    {
      key: 'products',
      label: t('settings:dataSection.importTypes.products.label'),
      icon: <InventoryIcon sx={{ fontSize: 36 }} />,
      color: '#059669',
      description: t('settings:dataSection.importTypes.products.description'),
    },
    {
      key: 'clients',
      label: t('settings:dataSection.importTypes.clients.label'),
      icon: <PeopleIcon sx={{ fontSize: 36 }} />,
      color: '#7c3aed',
      description: t('settings:dataSection.importTypes.clients.description'),
    },
  ];

  // Export générique
  const handleExport = async (type, apiMethod, filename) => {
    try {
      setExporting(true);
      showSnackbar(t('settings:dataSection.exportInProgress', { type }), 'info');

      const response = await apiMethod();

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSnackbar(t('settings:dataSection.exportSuccess', { type }), 'success');
    } catch (error) {
      console.error(`Erreur export ${type}:`, error);
      let errorMessage = t('settings:dataSection.exportError', { type });

      if (error.response?.status === 403) {
        errorMessage = t('settings:dataSection.exportForbidden');
      } else if (error.response?.status === 500) {
        errorMessage = t('settings:dataSection.exportServerError', { type });
      } else if (error.response?.status) {
        errorMessage = t('settings:dataSection.exportHttpError', { status: error.response.status, type });
      }

      showSnackbar(errorMessage, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Handlers spécifiques
  const handleExportSuppliers = () => handleExport(t('settings:dataSection.exportTypes.suppliers'), suppliersAPI.exportCSV, 'fournisseurs');
  const handleExportClients = () => handleExport(t('settings:dataSection.exportTypes.clients'), clientsAPI.exportCSV, 'clients');
  const handleExportProducts = () => handleExport(t('settings:dataSection.exportTypes.products'), productsAPI.exportCSV, 'produits');

  return (
    <Box>
      {/* Import */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {t('settings:data.importSection.title')}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2} mb={2}>
        {importTypes.map((type) => (
          <Grid item xs={12} sm={4} key={type.key}>
            <Paper
              onClick={() => navigate('/settings/import')}
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: type.color,
                  bgcolor: `${type.color}08`,
                },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  bgcolor: `${type.color}18`,
                  color: type.color,
                }}
              >
                {React.cloneElement(type.icon, { sx: { fontSize: 20 } })}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {type.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {type.description}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Button
        variant="contained"
        size="small"
        startIcon={<CloudUploadIcon />}
        onClick={() => navigate('/settings/import')}
      >
        {t('settings:dataSection.openImportWizard')}
      </Button>

      <Divider sx={{ my: 3 }} />

      {/* Export */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {t('settings:dataSection.exportTitle')}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {hasModule('suppliers') && (
          <Button
            variant="outlined"
            size="small"
            startIcon={exporting ? <CircularProgress size={14} /> : <LocalShippingIcon />}
            onClick={handleExportSuppliers}
            disabled={exporting}
          >
            {t('settings:dataSection.exportSuppliersCsv')}
          </Button>
        )}
        {hasModule('clients') && (
          <Button
            variant="outlined"
            size="small"
            startIcon={exporting ? <CircularProgress size={14} /> : <PeopleIcon />}
            onClick={handleExportClients}
            disabled={exporting}
          >
            {t('settings:dataSection.exportClientsCsv')}
          </Button>
        )}
        {hasModule('products') && (
          <Button
            variant="outlined"
            size="small"
            startIcon={exporting ? <CircularProgress size={14} /> : <InventoryIcon />}
            onClick={handleExportProducts}
            disabled={exporting}
          >
            {t('settings:dataSection.exportProductsCsv')}
          </Button>
        )}
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* Historique */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {t('settings:dataSection.importHistory')}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Button
        variant="outlined"
        size="small"
        startIcon={<HistoryIcon />}
        onClick={() => navigate('/migration/jobs')}
      >
        {t('settings:dataSection.viewFullHistory')}
      </Button>
    </Box>
  );
};

// Email Section Component
const EmailSection = ({ settings, showSnackbar }) => {
  const { t } = useTranslation(['settings', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [emailConfig, setEmailConfig] = useState(null);
  const [configExists, setConfigExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/accounts/email-config/', {
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Configuration n'existe pas encore, c'est normal
          setEmailConfig({
            smtp_host: '',
            smtp_port: 587,
            smtp_username: '',
            smtp_password: '',
            use_tls: true,
            use_ssl: false,
            default_from_email: '',
            default_from_name: '',
          });
          setConfigExists(false);
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.exists && data.config) {
        setEmailConfig(data.config);
        setConfigExists(true);
        setTestEmail(data.config.default_from_email || '');
      } else {
        // Configuration n'existe pas encore
        setEmailConfig({
          smtp_host: '',
          smtp_port: 587,
          smtp_username: '',
          smtp_password: '',
          use_tls: true,
          use_ssl: false,
          default_from_email: '',
          default_from_name: '',
        });
        setConfigExists(false);
      }
    } catch (error) {
      console.error('Error fetching email config:', error);
      // Ne pas afficher d'erreur si c'est juste que la config n'existe pas
      if (!error.message.includes('404')) {
        showSnackbar(t('settings:emailConfig.loadError'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Utiliser configExists au lieu de emailConfig pour déterminer la méthode
      const method = configExists ? 'PATCH' : 'POST';
      const body = {
        smtp_host: (emailConfig?.smtp_host || '').trim(),
        smtp_port: emailConfig?.smtp_port || 587,
        smtp_username: (emailConfig?.smtp_username || '').trim(),
        // Supprimer tous les espaces du mot de passe (important pour Gmail App Password)
        smtp_password: (emailConfig?.smtp_password || '').replace(/\s+/g, ''),
        use_tls: emailConfig?.use_tls !== false,
        use_ssl: emailConfig?.use_ssl || false,
        default_from_email: (emailConfig?.default_from_email || '').trim(),
        default_from_name: (emailConfig?.default_from_name || '').trim(),
      };

      const response = await fetch('/api/v1/accounts/email-config/', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success || response.ok) {
        showSnackbar(t('settings:emailConfig.saved'), 'success');
        // Recharger la configuration pour mettre à jour configExists
        await fetchEmailConfig();
      } else {
        showSnackbar(data.error || t('settings:emailConfig.saveError'), 'error');
      }
    } catch (error) {
      console.error('Error saving email config:', error);
      showSnackbar(t('settings:emailConfig.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const response = await fetch('/api/v1/accounts/email-config/test/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ test_email: testEmail }),
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar(t('settings:emailConfig.testSent', { email: testEmail }), 'success');
        fetchEmailConfig();
      } else {
        showSnackbar(data.error || t('settings:emailConfig.sendError'), 'error');
      }
    } catch (error) {
      console.error('Error testing email:', error);
      showSnackbar(t('settings:emailConfig.testError'), 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleVerify = async () => {
    try {
      setTesting(true);
      const response = await fetch('/api/v1/accounts/email-config/verify/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        showSnackbar(t('settings:emailConfig.verifySuccess'), 'success');
        fetchEmailConfig();
      } else {
        showSnackbar(data.error || t('settings:emailConfig.connectionError'), 'error');
      }
    } catch (error) {
      console.error('Error verifying email config:', error);
      showSnackbar(t('settings:emailConfig.verifyError'), 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!emailConfig) {
    setEmailConfig({
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      use_tls: true,
      use_ssl: false,
      default_from_email: '',
      default_from_name: '',
    });
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {t('settings:emailConfig.smtpTitle')}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:emailConfig.smtpHost')}
            value={emailConfig?.smtp_host || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
            placeholder="smtp.gmail.com"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:emailConfig.smtpPort')}
            type="number"
            value={emailConfig?.smtp_port || 587}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:emailConfig.username')}
            value={emailConfig?.smtp_username || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value })}
            placeholder={t('settings:emailConfig.usernamePlaceholder')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:emailConfig.password')}
            type="password"
            value={emailConfig?.smtp_password || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
            placeholder="••••••••"
          />
        </Grid>
        <Grid item xs={12}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={emailConfig?.use_tls !== false}
                  onChange={(e) => setEmailConfig({ ...emailConfig, use_tls: e.target.checked })}
                />
              }
              label={<Typography variant="body2">{t('settings:emailConfig.useTls')}</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={emailConfig?.use_ssl || false}
                  onChange={(e) => setEmailConfig({ ...emailConfig, use_ssl: e.target.checked })}
                />
              }
              label={<Typography variant="body2">{t('settings:emailConfig.useSsl')}</Typography>}
            />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:emailConfig.fromEmail')}
            type="email"
            value={emailConfig?.default_from_email || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, default_from_email: e.target.value })}
            placeholder={t('settings:emailConfig.fromEmailPlaceholder')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label={t('settings:emailConfig.fromName')}
            value={emailConfig?.default_from_name || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, default_from_name: e.target.value })}
            placeholder={t('settings:emailConfig.fromNamePlaceholder')}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" mb={2}>
        <Chip
          size="small"
          label={emailConfig?.is_verified ? t('settings:emailConfig.verified') : t('settings:emailConfig.notVerified')}
          color={emailConfig?.is_verified ? 'success' : 'default'}
          icon={emailConfig?.is_verified ? <CheckCircle /> : undefined}
        />
        {emailConfig?.last_verified_at && (
          <Typography variant="caption" color="text.secondary">
            {t('settings:emailConfig.lastVerified', { date: new Date(emailConfig.last_verified_at).toLocaleString() })}
          </Typography>
        )}
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
      >
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
          fullWidth={isMobile}
        >
          {t('settings:emailConfig.save')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={handleVerify}
          disabled={testing}
          startIcon={testing ? <CircularProgress size={14} /> : <CheckCircle />}
          fullWidth={isMobile}
        >
          {t('settings:emailConfig.verifyConnection')}
        </Button>
        <TextField
          size="small"
          label={t('settings:emailConfig.testEmail')}
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' }, maxWidth: { xs: '100%', sm: 260 } }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleTest}
          disabled={testing || !testEmail}
          startIcon={testing ? <CircularProgress size={14} /> : <EmailIcon />}
          fullWidth={isMobile}
        >
          {t('settings:emailConfig.sendTest')}
        </Button>
      </Stack>
    </Box>
  );
};

// Régime de TVA : petite entreprise exonérée, fréquence de déclaration, taux du pays
let paysCache = null;
const chargerPays = () => {
  if (!paysCache) {
    paysCache = api.get('/accounts/countries/').then((r) => r.data.countries || []).catch(() => { paysCache = null; return []; });
  }
  return paysCache;
};

export function VatRegimeFields({ settings, onUpdate }) {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const [countries, setCountries] = useState([]);
  useEffect(() => { chargerPays().then(setCountries); }, []);
  const country = (settings.country || '').toUpperCase();
  const profil = countries.find((c) => c.code === country);
  const rates = profil?.vat_rates || [];
  const hintKey = ['DE', 'AT'].includes(country) ? 'smallBusinessHintDE'
    : ['FR', 'BE', 'LU'].includes(country) ? 'smallBusinessHintFR'
      : country === 'CH' ? 'smallBusinessHintCH' : 'smallBusinessHint';
  const fmt = (r) => `${Number(r).toLocaleString(undefined, { maximumFractionDigits: 3 })} %`;
  let countryName = profil?.name || country;
  if (country && i18n.language && !i18n.language.startsWith('fr')) {
    try { countryName = new Intl.DisplayNames([i18n.language], { type: 'region' }).of(country) || countryName; } catch { /* nom français */ }
  }
  return (
    <>
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(settings.vatExemptSmallBusiness)}
              onChange={(e) => onUpdate('vatExemptSmallBusiness', e.target.checked)}
            />
          }
          label={t('settings:vat.smallBusiness')}
        />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: { xs: 0, sm: 6 } }}>
          {t(`settings:vat.${hintKey}`)}
        </Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth size="small">
          <InputLabel>{t('settings:vat.filingPeriod')}</InputLabel>
          <Select
            value={settings.vatFilingPeriod || 'quarterly'}
            label={t('settings:vat.filingPeriod')}
            onChange={(e) => onUpdate('vatFilingPeriod', e.target.value)}
          >
            {['monthly', 'quarterly', 'yearly'].map((p) => (
              <MenuItem key={p} value={p}>{t(`settings:vat.periods.${p}`)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      {rates.length > 0 && (
        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">
              {t('settings:vat.countryRates', { country: countryName })}
            </Typography>
            {rates.map((r) => (
              <Chip
                key={r}
                size="small"
                label={fmt(r)}
                color={Number(r) === Number(settings.defaultTaxRate) ? 'primary' : 'default'}
                onClick={() => onUpdate('defaultTaxRate', Number(r))}
              />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">{t('settings:vat.countryRatesHint')}</Typography>
        </Grid>
      )}
    </>
  );
}

// Pays de l'organisation : liste servie par l'API (apps/core/countries.py)
function CountrySelect({ value, onChange }) {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const [countries, setCountries] = useState([]);
  useEffect(() => {
    api.get('/accounts/countries/').then((r) => setCountries(r.data.countries || [])).catch(() => {});
  }, []);
  // Les noms renvoyés par l'API sont en français : en anglais, on les traduit à partir du code ISO
  const countryName = (c) => {
    if (!i18n.language || i18n.language.startsWith('fr')) return c.name;
    try {
      return new Intl.DisplayNames([i18n.language], { type: 'region' }).of(c.code) || c.name;
    } catch {
      return c.name;
    }
  };
  return (
    <FormControl fullWidth size="small">
      <InputLabel>{t('common:labels.country')}</InputLabel>
      <Select
        value={countries.some((c) => c.code === value) ? value : ''}
        label={t('common:labels.country')}
        onChange={(e) => { const c = countries.find((x) => x.code === e.target.value); if (c) onChange(c); }}
      >
        {countries.map((c) => <MenuItem key={c.code} value={c.code}>{countryName(c)}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

export default Settings;
