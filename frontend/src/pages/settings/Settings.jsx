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
  const [aspectRatio, setAspectRatio] = useState(null); // null = libre, 1 = carré, 16/9 = paysage, etc.

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
        setAspectRatio(null); // Défaut : recadrage libre
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
    setAspectRatio(null);
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

  // Configuration des onglets - Fusionnés pour tablette
  const tabs = [
    { label: t('settings:tabs.general'), icon: <BusinessIcon /> },
    { label: 'Modules', icon: <AppsIcon /> },
    { label: t('settings:tabs.print'), icon: <PrintIcon /> },
    { label: 'Mail', icon: <EmailIcon /> },
    { label: 'Migration', icon: <BackupIcon /> },
    { label: 'Profil', icon: <PersonIcon /> },
  ];

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
    <Box p={{ xs: 1.5, sm: 2, md: 3 }}>
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
          variant={isMobile ? 'fullWidth' : 'fullWidth'}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: { xs: 48, sm: 56, md: 64 },
            '& .MuiTab-root': {
              minHeight: { xs: 48, sm: 56, md: 64 },
              minWidth: 0,
              padding: { xs: '6px 4px', sm: '8px 12px', md: '12px 16px' },
              textTransform: 'none',
              fontSize: { xs: '0.7rem', sm: '0.85rem', md: '0.95rem' },
              flex: 1,
            },
            '& .MuiTab-iconWrapper': {
              marginBottom: isMobile ? '2px !important' : undefined,
              marginRight: isMobile ? 0 : '8px',
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              icon={tab.icon}
              iconPosition={isMobile ? 'top' : 'start'}
              sx={{
                '& .MuiSvgIcon-root': {
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.4rem' },
                },
              }}
            />
          ))}
        </Tabs>

        {/* Contenu de la section active */}
        <Box p={{ xs: 2, sm: 2.5, md: 3 }}>
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

          {/* Section Notifications - Fusionné (Notifications + Email) */}
          {activeTab === 3 && (
            <>
              <NotificationSection
                settings={settings}
                onUpdate={handleUpdateSetting}
              />
              <Divider sx={{ my: 4 }} />
              <EmailSection
                settings={settings}
                showSnackbar={showSnackbar}
              />
              <Divider sx={{ my: 4 }} />
              <Paper
                onClick={() => navigate('/settings/reports')}
                sx={{
                  p: 3, display: 'flex', alignItems: 'center', gap: 2,
                  cursor: 'pointer', border: '1px solid', borderColor: 'divider',
                  borderRadius: 2, transition: 'all 0.2s ease',
                  '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' }
                }}
              >
                <EmailIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="700">Rapports Periodiques</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configurez les rapports automatiques par email (hebdomadaire, bi-hebdo, mensuel)
                  </Typography>
                </Box>
              </Paper>
            </>
          )}

          {/* Section Migration de données */}
          {activeTab === 4 && (
            <DataSection
              settings={settings}
              showSnackbar={showSnackbar}
            />
          )}

          {/* Section Profil - Fusionné (Profil + Apparence) */}
          {activeTab === 5 && (
            <>
              <ProfileSection
                settings={settings}
                onUpdate={handleUpdateSetting}
              />
              <Divider sx={{ my: 4 }} />
              <AppearanceSection
                settings={settings}
                onUpdate={handleUpdateSetting}
              />
            </>
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
                aspect={aspectRatio || undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography gutterBottom sx={{ fontWeight: 600 }}>Format du recadrage</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant={aspectRatio === null ? "contained" : "outlined"}
                size="small"
                onClick={() => setAspectRatio(null)}
              >
                Libre
              </Button>
              <Button
                variant={aspectRatio === 1 ? "contained" : "outlined"}
                size="small"
                onClick={() => setAspectRatio(1)}
              >
                Carré (1:1)
              </Button>
              <Button
                variant={aspectRatio === 16/9 ? "contained" : "outlined"}
                size="small"
                onClick={() => setAspectRatio(16/9)}
              >
                Paysage (16:9)
              </Button>
              <Button
                variant={aspectRatio === 4/3 ? "contained" : "outlined"}
                size="small"
                onClick={() => setAspectRatio(4/3)}
              >
                Standard (4:3)
              </Button>
              <Button
                variant={aspectRatio === 3/2 ? "contained" : "outlined"}
                size="small"
                onClick={() => setAspectRatio(3/2)}
              >
                Photo (3:2)
              </Button>
            </Stack>
          </Box>
          <Box sx={{ mt: 2 }}>
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
                sx={{ maxHeight: 120, maxWidth: 300, objectFit: 'contain' }}
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
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);

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
        {/* Changement de mot de passe */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            Modifier le mot de passe
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type={showPasswords ? 'text' : 'password'}
            label="Mot de passe actuel"
            value={passwordData.currentPassword}
            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
          />
        </Grid>

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
              disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              Changer le mot de passe
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
      {/* Section Import - Mise en avant */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CloudUploadIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Importer des données
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Importez facilement vos données depuis des fichiers Excel ou CSV.
          Notre système détecte automatiquement les colonnes et suggère le mapping.
        </Alert>

        <Grid container spacing={2}>
          {importTypes.map((type) => (
            <Grid item xs={12} sm={4} key={type.key}>
              <Paper
                onClick={() => navigate('/settings/import')}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 3,
                  border: '2px solid transparent',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${type.color}20`,
                    borderColor: type.color,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    background: `linear-gradient(135deg, ${type.color}, ${type.color}cc)`,
                    color: 'white',
                  }}
                >
                  {type.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {type.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {type.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box textAlign="center" mt={3}>
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudUploadIcon />}
            onClick={() => navigate('/settings/import')}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #2563eb, #1e40af)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
              },
            }}
          >
            Ouvrir l'assistant d'import
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Section Export */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FileDownloadIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Exporter vos données
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          Exportez vos données pour sauvegarde ou migration vers un autre système.
        </Typography>

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {hasModule('suppliers') && (
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={16} /> : <LocalShippingIcon />}
              onClick={handleExportSuppliers}
              disabled={exporting}
            >
              Exporter Fournisseurs (CSV)
            </Button>
          )}
          {hasModule('clients') && (
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={16} /> : <PeopleIcon />}
              onClick={handleExportClients}
              disabled={exporting}
            >
              Exporter Clients (CSV)
            </Button>
          )}
          {hasModule('products') && (
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={16} /> : <InventoryIcon />}
              onClick={handleExportProducts}
              disabled={exporting}
            >
              Exporter Produits (CSV)
            </Button>
          )}
        </Stack>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Section Historique */}
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <HistoryIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Historique des imports
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          Consultez l'historique de vos imports et leur statut.
        </Typography>

        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => navigate('/migration/jobs')}
        >
          Voir l'historique complet
        </Button>
      </Box>
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
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Configuration SMTP
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configurez les paramètres SMTP pour envoyer des emails (factures, notifications, etc.)
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Serveur SMTP"
            value={emailConfig?.smtp_host || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
            placeholder="smtp.gmail.com"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Port SMTP"
            type="number"
            value={emailConfig?.smtp_port || 587}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Nom d'utilisateur"
            value={emailConfig?.smtp_username || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value })}
            placeholder="votre@email.com"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Mot de passe"
            type="password"
            value={emailConfig?.smtp_password || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
            placeholder="••••••••"
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={emailConfig?.use_tls !== false}
                  onChange={(e) => setEmailConfig({ ...emailConfig, use_tls: e.target.checked })}
                />
              }
              label="Utiliser TLS"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={emailConfig?.use_ssl || false}
                  onChange={(e) => setEmailConfig({ ...emailConfig, use_ssl: e.target.checked })}
                />
              }
              label="Utiliser SSL"
            />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
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
            label="Nom expéditeur"
            value={emailConfig?.default_from_name || ''}
            onChange={(e) => setEmailConfig({ ...emailConfig, default_from_name: e.target.value })}
            placeholder="Votre Entreprise"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip
          label={emailConfig?.is_verified ? 'Vérifié' : 'Non vérifié'}
          color={emailConfig?.is_verified ? 'success' : 'default'}
          icon={emailConfig?.is_verified ? <CheckCircle /> : undefined}
        />
        {emailConfig?.last_verified_at && (
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            Dernière vérification: {new Date(emailConfig.last_verified_at).toLocaleString()}
          </Typography>
        )}
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          mt: 3,
          flexWrap: 'wrap',
          alignItems: { xs: 'stretch', sm: 'center' }
        }}
      >
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          fullWidth={isMobile}
        >
          Sauvegarder
        </Button>
        <Button
          variant="outlined"
          onClick={handleVerify}
          disabled={testing}
          startIcon={testing ? <CircularProgress size={16} /> : <CheckCircle />}
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
          sx={{
            flex: { xs: '1 1 100%', sm: '1 1 auto' },
            maxWidth: { xs: '100%', sm: 300 }
          }}
        />
        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={testing || !testEmail}
          startIcon={testing ? <CircularProgress size={16} /> : <EmailIcon />}
          fullWidth={isMobile}
        >
          Envoyer test
        </Button>
      </Stack>
    </Box>
  );
};

export default Settings;
