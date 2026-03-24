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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { suppliersAPI, clientsAPI, productsAPI } from '../../services/api';
import Cropper from 'react-easy-crop';
import { useModules } from '../../contexts/ModuleContext';

// Import API services
import { settingsAPI } from '../../services/settingsAPI';
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
  { value: 'square',    label: 'Carré',    aspect: 1,         hint: '1:1' },
  { value: 'landscape', label: 'Paysage',  aspect: 4,         hint: '4:1' },
  { value: 'portrait',  label: 'Portrait', aspect: 3 / 4,     hint: '3:4' },
  { value: 'original',  label: 'Original', aspect: undefined,  hint: 'libre' },
];

/**
 * Composant principal Settings
 */
const Settings = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
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

  // Navigation items — groupés par thème
  const NAV_GROUPS = [
    {
      label: 'Entreprise',
      items: [
        { id: 0, label: t('settings:tabs.general'), icon: <BusinessIcon fontSize="small" />, description: 'Nom, coordonnées, logo' },
        { id: 1, label: 'Modules', icon: <AppsIcon fontSize="small" />, description: 'Activer / désactiver les modules' },
      ],
    },
    {
      label: 'Personnalisation',
      items: [
        { id: 2, label: t('settings:tabs.print'), icon: <PrintIcon fontSize="small" />, description: 'Format, templates documents' },
        { id: 3, label: 'Notifications', icon: <NotificationsIcon fontSize="small" />, description: 'Alertes email et push' },
        { id: 4, label: 'Email / SMTP', icon: <EmailIcon fontSize="small" />, description: 'Serveur d\'envoi d\'emails' },
      ],
    },
    {
      label: 'Compte',
      items: [
        { id: 5, label: 'Profil & Sécurité', icon: <PersonIcon fontSize="small" />, description: 'Informations personnelles, mot de passe' },
        { id: 6, label: 'Apparence', icon: <AppearanceIcon fontSize="small" />, description: 'Langue, thème, formats' },
        { id: 7, label: 'Données', icon: <BackupIcon fontSize="small" />, description: 'Import, export, migration' },
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
        <Typography variant="h5" fontWeight={700}>Paramètres</Typography>
        <Typography variant="body2" color="text.secondary">
          Gérez votre organisation, vos préférences et votre compte.
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

        {/* Logo et Branding */}
        <Grid item xs={12}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Logo &amp; Marque
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
                  {fmt.label} <Box component="span" sx={{ opacity: 0.6, ml: 0.5 }}>{fmt.hint}</Box>
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
                    Aperçu
                  </Typography>
                )}
              </Box>
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
              label="Couleur de marque"
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
          <Grid container spacing={2}>
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
              <MenuItem value="thermal_80">Thermique 80mm (Ticket de caisse)</MenuItem>
              <MenuItem value="thermal_58">Thermique 58mm (Ticket de caisse)</MenuItem>
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
            label="Afficher le QR Code"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -0.5 }}>
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
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -0.5 }}>
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
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1.5}>
        Alertes in-app
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

  // Mot de passe
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    fetch('/api/v1/accounts/profile/', { headers: { Authorization: `Token ${token}` } })
      .then(r => r.json())
      .then(data => setProfileData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
      }));
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
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setProfileSuccess('Profil mis à jour avec succès.');
    } catch (e) {
      setProfileError(e.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSubmitPassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwError('Les mots de passe ne correspondent pas.');
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
      if (!res.ok) throw new Error(data.error || 'Erreur');
      if (data.token) localStorage.setItem('authToken', data.token);
      setPwSuccess('Mot de passe modifié avec succès.');
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
        Informations personnelles
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label="Prénom" value={profileData.first_name}
            onChange={(e) => setProfileData(p => ({ ...p, first_name: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label="Nom" value={profileData.last_name}
            onChange={(e) => setProfileData(p => ({ ...p, last_name: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label="Adresse email" type="email" value={profileData.email}
            onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label="Téléphone" value={profileData.phone}
            onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))} />
        </Grid>
        {profileSuccess && <Grid item xs={12}><Alert severity="success" sx={{ py: 0 }}>{profileSuccess}</Alert></Grid>}
        {profileError && <Grid item xs={12}><Alert severity="error" sx={{ py: 0 }}>{profileError}</Alert></Grid>}
        <Grid item xs={12}>
          <Button variant="contained" size="small" onClick={handleProfileSave} disabled={profileLoading}>
            {profileLoading ? <CircularProgress size={16} /> : 'Enregistrer le profil'}
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Changement de mot de passe */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Modifier le mot de passe
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" type={showPasswords ? 'text' : 'password'} label="Mot de passe actuel"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" type={showPasswords ? 'text' : 'password'} label="Nouveau mot de passe"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" type={showPasswords ? 'text' : 'password'} label="Confirmer le mot de passe"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} />
        </Grid>
        {pwSuccess && <Grid item xs={12}><Alert severity="success" sx={{ py: 0 }}>{pwSuccess}</Alert></Grid>}
        {pwError && <Grid item xs={12}><Alert severity="error" sx={{ py: 0 }}>{pwError}</Alert></Grid>}
        <Grid item xs={12}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <FormControlLabel
              control={<Switch size="small" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} />}
              label={<Typography variant="body2">Afficher les mots de passe</Typography>}
            />
            <Button variant="contained" size="small" onClick={handleSubmitPassword}
              disabled={pwLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}>
              {pwLoading ? <CircularProgress size={16} /> : 'Changer le mot de passe'}
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
      label: 'Fournisseurs',
      icon: <LocalShippingIcon sx={{ fontSize: 36 }} />,
      color: '#2563eb',
      description: 'Importez votre liste de fournisseurs',
    },
    {
      key: 'products',
      label: 'Produits',
      icon: <InventoryIcon sx={{ fontSize: 36 }} />,
      color: '#059669',
      description: 'Importez votre catalogue produits',
    },
    {
      key: 'clients',
      label: 'Clients',
      icon: <PeopleIcon sx={{ fontSize: 36 }} />,
      color: '#7c3aed',
      description: 'Importez votre base clients',
    },
  ];

  // Export générique
  const handleExport = async (type, apiMethod, filename) => {
    try {
      setExporting(true);
      showSnackbar(`Export ${type} en cours...`, 'info');

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

      showSnackbar(`Export ${type} terminé avec succès !`, 'success');
    } catch (error) {
      console.error(`Erreur export ${type}:`, error);
      let errorMessage = `Erreur lors de l'export ${type}`;

      if (error.response?.status === 403) {
        errorMessage = 'Vous n\'avez pas les permissions nécessaires pour exporter. Vérifiez que le module correspondant est activé.';
      } else if (error.response?.status === 500) {
        errorMessage = `Erreur serveur lors de l'export ${type}. Veuillez réessayer ou contacter le support.`;
      } else if (error.response?.status) {
        errorMessage = `Erreur ${error.response.status} lors de l'export ${type}`;
      }

      showSnackbar(errorMessage, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Handlers spécifiques
  const handleExportSuppliers = () => handleExport('fournisseurs', suppliersAPI.exportCSV, 'fournisseurs');
  const handleExportClients = () => handleExport('clients', clientsAPI.exportCSV, 'clients');
  const handleExportProducts = () => handleExport('produits', productsAPI.exportCSV, 'produits');

  return (
    <Box>
      {/* Import */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Importer des données
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
        Ouvrir l'assistant d'import
      </Button>

      <Divider sx={{ my: 3 }} />

      {/* Export */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Exporter vos données
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
            Fournisseurs (CSV)
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
            Clients (CSV)
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
            Produits (CSV)
          </Button>
        )}
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* Historique */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Historique des imports
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Button
        variant="outlined"
        size="small"
        startIcon={<HistoryIcon />}
        onClick={() => navigate('/migration/jobs')}
      >
        Voir l'historique complet
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
        showSnackbar('Erreur lors du chargement de la configuration email', 'error');
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
        showSnackbar('Configuration email sauvegardée', 'success');
        // Recharger la configuration pour mettre à jour configExists
        await fetchEmailConfig();
      } else {
        showSnackbar(data.error || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch (error) {
      console.error('Error saving email config:', error);
      showSnackbar('Erreur lors de la sauvegarde', 'error');
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
        showSnackbar(`Email de test envoyé à ${testEmail}`, 'success');
        fetchEmailConfig();
      } else {
        showSnackbar(data.error || 'Erreur lors de l\'envoi', 'error');
      }
    } catch (error) {
      console.error('Error testing email:', error);
      showSnackbar('Erreur lors de l\'envoi du test', 'error');
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
        showSnackbar('Connexion SMTP vérifiée avec succès', 'success');
        fetchEmailConfig();
      } else {
        showSnackbar(data.error || 'Erreur de connexion', 'error');
      }
    } catch (error) {
      console.error('Error verifying email config:', error);
      showSnackbar('Erreur lors de la vérification', 'error');
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
        Configuration SMTP
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Serveur SMTP"
            value={emailConfig?.smtp_host || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
            placeholder="smtp.gmail.com"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Port SMTP"
            type="number"
            value={emailConfig?.smtp_port || 587}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Nom d'utilisateur"
            value={emailConfig?.smtp_username || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value })}
            placeholder="votre@email.com"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Mot de passe"
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
              label={<Typography variant="body2">Utiliser TLS</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={emailConfig?.use_ssl || false}
                  onChange={(e) => setEmailConfig({ ...emailConfig, use_ssl: e.target.checked })}
                />
              }
              label={<Typography variant="body2">Utiliser SSL</Typography>}
            />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Email expéditeur"
            type="email"
            value={emailConfig?.default_from_email || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, default_from_email: e.target.value })}
            placeholder="noreply@votredomaine.com"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Nom expéditeur"
            value={emailConfig?.default_from_name || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, default_from_name: e.target.value })}
            placeholder="Votre Entreprise"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" mb={2}>
        <Chip
          size="small"
          label={emailConfig?.is_verified ? 'Vérifié' : 'Non vérifié'}
          color={emailConfig?.is_verified ? 'success' : 'default'}
          icon={emailConfig?.is_verified ? <CheckCircle /> : undefined}
        />
        {emailConfig?.last_verified_at && (
          <Typography variant="caption" color="text.secondary">
            Dernière vérification: {new Date(emailConfig.last_verified_at).toLocaleString()}
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
          Sauvegarder
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={handleVerify}
          disabled={testing}
          startIcon={testing ? <CircularProgress size={14} /> : <CheckCircle />}
          fullWidth={isMobile}
        >
          Vérifier la connexion
        </Button>
        <TextField
          size="small"
          label="Email de test"
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
          Envoyer test
        </Button>
      </Stack>
    </Box>
  );
};

export default Settings;
