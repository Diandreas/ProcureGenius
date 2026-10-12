import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Tab,
  Tabs,
  Alert,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Save,
  Business,
  Notifications,
  Security,
  Palette,
  Language,
  Print,
  Email,
  Storage,
  Backup,
  Add,
  Edit,
  Delete,
  FileUpload,
  CloudUpload,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ImportWizard from '../../components/ImportWizard';

function TabPanel({ children, value, index, ...other }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: isMobile ? 1.5 : 3 }}>{children}</Box>}
    </div>
  );
}

function Settings() {
  const { t } = useTranslation(['settings', 'common']);
  const [activeTab, setActiveTab] = useState(0);
  const [openTaxDialog, setOpenTaxDialog] = useState(false);
  const [openHeaderDialog, setOpenHeaderDialog] = useState(false);
  const [headerPreview, setHeaderPreview] = useState(null);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importType, setImportType] = useState('clients');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Helper function for responsive TextField styling
  const getTextFieldProps = () => ({
    size: isMobile ? 'small' : 'medium',
    sx: {
      '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: 2
          }
        },
        '&.Mui-focused': {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: 2
          }
        }
      }
    }
  });

  // Helper function for responsive FormControl styling
  const getFormControlProps = () => ({
    size: isMobile ? 'small' : 'medium',
    sx: {
      borderRadius: 2,
      '& .MuiOutlinedInput-notchedOutline': {
        transition: 'all 0.2s ease-in-out',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'primary.main',
        borderWidth: 2
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'primary.main',
        borderWidth: 2
      }
    }
  });
  const [settings, setSettings] = useState({
    // Paramètres généraux
    companyName: 'ProcureGenius Inc.',
    companyAddress: '123 Rue Principal, Montréal, QC H1A 1A1',
    companyPhone: '(514) 123-4567',
    companyEmail: 'contact@procuregenius.com',
    companyWebsite: 'www.procuregenius.com',
    companyLogo: '',

    // Paramètres de taxation
    defaultTaxRate: 15,
    gstHstRate: 5,
    qstRate: 9.975,
    enableTaxCalculation: true,

    // Paramètres de facturation
    invoicePrefix: 'FAC-',
    poPrefix: 'BC-',
    invoiceTerms: 'Net 30',
    defaultCurrency: 'XAF',

    // Paramètres de notification
    emailNotifications: true,
    invoiceReminders: true,
    lowStockAlerts: true,
    orderStatusUpdates: true,

    // Paramètres d'affichage
    theme: 'light',
    language: 'fr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',

    // Paramètres de sécurité
    sessionTimeout: 30,
    requireStrongPasswords: true,
    enableTwoFactor: false,
    loginAttempts: 5,

    // Paramètres d'impression
    paperSize: 'A4',
    printMargins: 'normal',
    includeQRCode: true,
    printColors: true,

    // Paramètres de sauvegarde
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30,

    // Paramètres d'en-tête de facture
    invoiceHeaderType: 'custom', // 'simple', 'custom', 'uploaded'
    invoiceHeaderTemplate: null,
    headerWidth: 210, // mm (A4 width)
    headerHeight: 80, // mm
    headerBackground: '#ffffff',
    headerTextColor: '#000000',
    showCompanyInfo: true,
    showLogo: true,
    logoPosition: 'left', // 'left', 'center', 'right'
    logoSize: 'medium', // 'small', 'medium', 'large'
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Ici vous pourriez ajouter la logique pour sauvegarder les paramètres
    console.log('Sauvegarde des paramètres:', settings);
    alert(t('settings:legacySettings.saveSuccess'));
  };

  const handleHeaderUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert(t('settings:legacySettings.invalidImage'));
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(t('settings:legacySettings.fileTooLarge'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Vérifier les proportions recommandées (ratio 2.6:1 pour A4)
          const ratio = img.width / img.height;
          if (ratio < 2.0 || ratio > 4.0) {
            if (!confirm(t('settings:legacySettings.ratioConfirm'))) {
              return;
            }
          }

          setHeaderPreview(e.target.result);
          handleSettingChange('invoiceHeaderTemplate', e.target.result);
          handleSettingChange('invoiceHeaderType', 'uploaded');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const generateCustomHeader = () => {
    // Ici vous pourriez ouvrir un éditeur d'en-tête personnalisé
    setOpenHeaderDialog(true);
  };

  const resetHeader = () => {
    setHeaderPreview(null);
    handleSettingChange('invoiceHeaderTemplate', null);
    handleSettingChange('invoiceHeaderType', 'simple');
  };

  const tabs = [
    { label: t('settings:tabs.general'), icon: <Business /> },
    { label: t('settings:tabs.billing'), icon: <Print /> },
    { label: t('settings:tabs.notifications'), icon: <Notifications /> },
    { label: t('settings:tabs.appearance'), icon: <Palette /> },
    { label: t('settings:tabs.security'), icon: <Security /> },
    { label: t('settings:tabs.backup'), icon: <Backup /> },
    { label: t('settings:legacySettings.importTab'), icon: <CloudUpload /> },
  ];

  return (
    <Box p={isMobile ? 1.5 : 3}>
      {/* Header */}
      <Box sx={{ mb: isMobile ? 1.5 : 2.5 }}>
        <Typography variant="h4" sx={{
          fontSize: { xs: '1.5rem', md: '2.25rem' },
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          color: 'text.primary'
        }}>
          {t('settings:title')}
        </Typography>
        {!isMobile && (
          <Typography variant="body2" color="text.secondary" sx={{
            fontSize: '0.875rem',
            mt: 0.5
          }}>
            {t('settings:legacySettings.subtitle')}
          </Typography>
        )}
      </Box>

      <Card sx={{
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        <Box sx={{
          borderBottom: 1,
          borderColor: 'divider',
          background: 'rgba(0,0,0,0.02)'
        }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: isMobile ? 48 : 60,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                transition: 'all 0.2s ease-in-out',
                px: isMobile ? 1 : 2,
                py: isMobile ? 0.5 : 1,
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)'
                }
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={isMobile ? null : tab.icon}
                label={isMobile ? tab.label.substring(0, 8) : tab.label}
                iconPosition="start"
                sx={{
                  minHeight: isMobile ? 48 : 60,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  px: isMobile ? 1 : 2
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Onglet Général */}
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h6" gutterBottom sx={{
            fontSize: isMobile ? '1rem' : '1.1rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            mb: isMobile ? 1 : 2
          }}>
            {t('settings:general.title')}
          </Typography>
          <Grid container spacing={isMobile ? 1.5 : 2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:general.companyNameLabel')}
                value={settings.companyName}
                onChange={(e) => handleSettingChange('companyName', e.target.value)}
                {...getTextFieldProps()}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:general.phone')}
                value={settings.companyPhone}
                onChange={(e) => handleSettingChange('companyPhone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:general.emailLabel')}
                type="email"
                value={settings.companyEmail}
                onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:general.website')}
                value={settings.companyWebsite}
                onChange={(e) => handleSettingChange('companyWebsite', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('settings:general.address')}
                multiline
                rows={3}
                value={settings.companyAddress}
                onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<FileUpload />}
                  component="label"
                >
                  {t('settings:legacySettings.uploadLogo')}
                  <input type="file" hidden accept="image/*" />
                </Button>
                <Typography variant="body2" color="textSecondary">
                  {t('settings:legacySettings.logoFormats')}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.localization')}
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:general.language')}</InputLabel>
                <Select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                >
                  <MenuItem value="fr">{t('settings:general.languageFr')}</MenuItem>
                  <MenuItem value="en">{t('settings:general.languageEn')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:appearance.dateFormat')}</InputLabel>
                <Select
                  value={settings.dateFormat}
                  onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
                >
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:appearance.timeFormat')}</InputLabel>
                <Select
                  value={settings.timeFormat}
                  onChange={(e) => handleSettingChange('timeFormat', e.target.value)}
                >
                  <MenuItem value="24h">{t('settings:appearance.timeFormat24')}</MenuItem>
                  <MenuItem value="12h">{t('settings:appearance.timeFormat12')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Onglet Facturation */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.documentNumbering')}
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:billing.invoicePrefix')}
                value={settings.invoicePrefix}
                onChange={(e) => handleSettingChange('invoicePrefix', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:billing.poPrefix')}
                value={settings.poPrefix}
                onChange={(e) => handleSettingChange('poPrefix', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:legacySettings.defaultPaymentTerms')}
                value={settings.invoiceTerms}
                onChange={(e) => handleSettingChange('invoiceTerms', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:general.defaultCurrency')}</InputLabel>
                <Select
                  value={settings.defaultCurrency}
                  onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
                >
                  <MenuItem value="CAD">CAD - {t('settings:currencies.CAD')}</MenuItem>
                  <MenuItem value="USD">USD - {t('settings:currencies.USD')}</MenuItem>
                  <MenuItem value="EUR">EUR - {t('settings:currencies.EUR')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.taxConfiguration')}
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableTaxCalculation}
                    onChange={(e) => handleSettingChange('enableTaxCalculation', e.target.checked)}
                  />
                }
                label={t('settings:billing.enableTaxCalculation')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('settings:billing.gstHstRate')}
                type="number"
                value={settings.gstHstRate}
                onChange={(e) => handleSettingChange('gstHstRate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('settings:billing.qstRate')}
                type="number"
                value={settings.qstRate}
                onChange={(e) => handleSettingChange('qstRate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('settings:legacySettings.defaultRate')}
                type="number"
                value={settings.defaultTaxRate}
                onChange={(e) => handleSettingChange('defaultTaxRate', e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.invoiceHeader')}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('settings:legacySettings.invoiceHeaderInfo')}
          </Alert>

          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:legacySettings.headerType')}</InputLabel>
                <Select
                  value={settings.invoiceHeaderType}
                  onChange={(e) => handleSettingChange('invoiceHeaderType', e.target.value)}
                >
                  <MenuItem value="simple">{t('settings:legacySettings.headerTypes.simple')}</MenuItem>
                  <MenuItem value="custom">{t('settings:legacySettings.headerTypes.custom')}</MenuItem>
                  <MenuItem value="uploaded">{t('settings:legacySettings.headerTypes.uploaded')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {settings.invoiceHeaderType === 'uploaded' && (
              <>
                <Grid item xs={12}>
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<FileUpload />}
                      component="label"
                    >
                      {t('settings:legacySettings.uploadHeader')}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleHeaderUpload}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={resetHeader}
                      disabled={!settings.invoiceHeaderTemplate}
                    >
                      {t('common:buttons.delete')}
                    </Button>
                  </Box>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {t('settings:legacySettings.headerFormats')}
                  </Typography>
                </Grid>

                {(headerPreview || settings.invoiceHeaderTemplate) && (
                  <Grid item xs={12}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2,
                        border: '2px dashed #ddd',
                        textAlign: 'center',
                        backgroundColor: '#f9f9f9'
                      }}
                    >
                      <Typography variant="subtitle2" gutterBottom>
                        {t('settings:legacySettings.headerPreview')}
                      </Typography>
                      <Box
                        sx={{
                          width: '100%',
                          maxWidth: 600,
                          height: 150,
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          overflow: 'hidden',
                          margin: '0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: settings.headerBackground
                        }}
                      >
                        <img
                          src={headerPreview || settings.invoiceHeaderTemplate}
                          alt={t('settings:legacySettings.headerPreviewAlt')}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </>
            )}

            {settings.invoiceHeaderType === 'custom' && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('settings:legacySettings.logoPosition')}</InputLabel>
                    <Select
                      value={settings.logoPosition}
                      onChange={(e) => handleSettingChange('logoPosition', e.target.value)}
                    >
                      <MenuItem value="left">{t('settings:legacySettings.positions.left')}</MenuItem>
                      <MenuItem value="center">{t('settings:legacySettings.positions.center')}</MenuItem>
                      <MenuItem value="right">{t('settings:legacySettings.positions.right')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('settings:legacySettings.logoSize')}</InputLabel>
                    <Select
                      value={settings.logoSize}
                      onChange={(e) => handleSettingChange('logoSize', e.target.value)}
                    >
                      <MenuItem value="small">{t('settings:legacySettings.sizes.small')}</MenuItem>
                      <MenuItem value="medium">{t('settings:legacySettings.sizes.medium')}</MenuItem>
                      <MenuItem value="large">{t('settings:legacySettings.sizes.large')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2">{t('settings:legacySettings.backgroundColor')}</Typography>
                    <input
                      type="color"
                      value={settings.headerBackground}
                      onChange={(e) => handleSettingChange('headerBackground', e.target.value)}
                      style={{ width: 50, height: 30, border: 'none', borderRadius: 4 }}
                    />
                    <Typography variant="caption">{settings.headerBackground}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2">{t('settings:legacySettings.textColor')}</Typography>
                    <input
                      type="color"
                      value={settings.headerTextColor}
                      onChange={(e) => handleSettingChange('headerTextColor', e.target.value)}
                      style={{ width: 50, height: 30, border: 'none', borderRadius: 4 }}
                    />
                    <Typography variant="caption">{settings.headerTextColor}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.showCompanyInfo}
                        onChange={(e) => handleSettingChange('showCompanyInfo', e.target.checked)}
                      />
                    }
                    label={t('settings:legacySettings.showCompanyInfo')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.showLogo}
                        onChange={(e) => handleSettingChange('showLogo', e.target.checked)}
                      />
                    }
                    label={t('settings:legacySettings.showLogo')}
                  />
                </Grid>

                {/* Aperçu de l'en-tête personnalisé */}
                <Grid item xs={12}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      border: '2px dashed #ddd',
                      backgroundColor: '#f9f9f9'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom textAlign="center">
                      {t('settings:legacySettings.customHeaderPreview')}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 600,
                        height: 120,
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 2,
                        backgroundColor: settings.headerBackground,
                        color: settings.headerTextColor,
                        position: 'relative'
                      }}
                    >
                      {settings.showLogo && (
                        <Box
                          sx={{
                            width: settings.logoSize === 'small' ? 40 : settings.logoSize === 'medium' ? 60 : 80,
                            height: settings.logoSize === 'small' ? 40 : settings.logoSize === 'medium' ? 60 : 80,
                            backgroundColor: '#e0e0e0',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            order: settings.logoPosition === 'right' ? 2 : 0,
                            marginLeft: settings.logoPosition === 'center' ? 'auto' : 0,
                            marginRight: settings.logoPosition === 'center' ? 'auto' : settings.logoPosition === 'right' ? 0 : 2
                          }}
                        >
                          LOGO
                        </Box>
                      )}
                      {settings.showCompanyInfo && (
                        <Box
                          sx={{
                            flex: 1,
                            textAlign: settings.logoPosition === 'center' ? 'center' : settings.logoPosition === 'right' ? 'left' : 'right'
                          }}
                        >
                          <Typography variant="h6" sx={{ fontSize: '14px', fontWeight: 'bold' }}>
                            {settings.companyName}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '10px' }}>
                            {settings.companyEmail} • {settings.companyPhone}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:legacySettings.width')}
                type="number"
                value={settings.headerWidth}
                onChange={(e) => handleSettingChange('headerWidth', e.target.value)}
                helperText={t('settings:legacySettings.widthHelper')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:legacySettings.height')}
                type="number"
                value={settings.headerHeight}
                onChange={(e) => handleSettingChange('headerHeight', e.target.value)}
                helperText={t('settings:legacySettings.heightHelper')}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:print.title')}
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:print.paperSize')}</InputLabel>
                <Select
                  value={settings.paperSize}
                  onChange={(e) => handleSettingChange('paperSize', e.target.value)}
                >
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="Letter">Letter</MenuItem>
                  <MenuItem value="Legal">Legal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:print.margins')}</InputLabel>
                <Select
                  value={settings.printMargins}
                  onChange={(e) => handleSettingChange('printMargins', e.target.value)}
                >
                  <MenuItem value="narrow">{t('settings:legacySettings.marginOptions.narrow')}</MenuItem>
                  <MenuItem value="normal">{t('settings:legacySettings.marginOptions.normal')}</MenuItem>
                  <MenuItem value="wide">{t('settings:legacySettings.marginOptions.wide')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.includeQRCode}
                    onChange={(e) => handleSettingChange('includeQRCode', e.target.checked)}
                  />
                }
                label={t('settings:legacySettings.includeQrCode')}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.printColors}
                    onChange={(e) => handleSettingChange('printColors', e.target.checked)}
                  />
                }
                label={t('settings:legacySettings.printColors')}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Onglet Notifications */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            {t('settings:notificationsSection.emailNotifications')}
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary={t('settings:legacySettings.notifications.general')}
                secondary={t('settings:legacySettings.notifications.generalHelper')}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t('settings:notificationsSection.invoiceReminders')}
                secondary={t('settings:legacySettings.notifications.invoiceRemindersHelper')}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.invoiceReminders}
                  onChange={(e) => handleSettingChange('invoiceReminders', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t('settings:notificationsSection.lowStockAlerts')}
                secondary={t('settings:legacySettings.notifications.lowStockHelper')}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.lowStockAlerts}
                  onChange={(e) => handleSettingChange('lowStockAlerts', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText
                primary={t('settings:legacySettings.notifications.orderUpdates')}
                secondary={t('settings:legacySettings.notifications.orderUpdatesHelper')}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={settings.orderStatusUpdates}
                  onChange={(e) => handleSettingChange('orderStatusUpdates', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.emailConfig')}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('settings:legacySettings.emailConfigInfo')}
          </Alert>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:emailConfig.smtpHost')}
                placeholder="smtp.gmail.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:legacySettings.port')}
                type="number"
                placeholder="587"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:legacySettings.senderEmail')}
                type="email"
                placeholder="noreply@procuregenius.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:emailConfig.password')}
                type="password"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch />}
                label={t('settings:legacySettings.useSslTls')}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Onglet Apparence */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.themeAndColors')}
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:appearance.theme')}</InputLabel>
                <Select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                >
                  <MenuItem value="light">{t('settings:appearance.themeLight')}</MenuItem>
                  <MenuItem value="dark">{t('settings:appearance.themeDark')}</MenuItem>
                  <MenuItem value="auto">{t('settings:appearance.themeAuto')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.customColors')}
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: '#4F46E5',
                    borderRadius: 1,
                    border: '2px solid #e0e0e0'
                  }}
                />
                <Box>
                  <Typography variant="body2">{t('settings:print.primaryColor')}</Typography>
                  <Typography variant="caption" color="textSecondary">#4F46E5</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: '#10B981',
                    borderRadius: 1,
                    border: '2px solid #e0e0e0'
                  }}
                />
                <Box>
                  <Typography variant="body2">{t('settings:legacySettings.secondaryColor')}</Typography>
                  <Typography variant="caption" color="textSecondary">#10B981</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Onglet Sécurité */}
        <TabPanel value={activeTab} index={4}>
          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.securitySettings')}
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:security.sessionTimeoutLabel')}
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:legacySettings.loginAttempts')}
                type="number"
                value={settings.loginAttempts}
                onChange={(e) => handleSettingChange('loginAttempts', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.requireStrongPasswords}
                    onChange={(e) => handleSettingChange('requireStrongPasswords', e.target.checked)}
                  />
                }
                label={t('settings:security.requireStrongPasswordsLabel')}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableTwoFactor}
                    onChange={(e) => handleSettingChange('enableTwoFactor', e.target.checked)}
                  />
                }
                label={t('settings:legacySettings.enableTwoFactor')}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:security.auditLog')}
          </Typography>
          <Alert severity="info">
            {t('settings:legacySettings.auditLogInfo')}
          </Alert>
        </TabPanel>

        {/* Onglet Sauvegarde */}
        <TabPanel value={activeTab} index={5}>
          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.autoBackup')}
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup}
                    onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  />
                }
                label={t('settings:legacySettings.enableAutoBackup')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('settings:backup.frequencyLabel')}</InputLabel>
                <Select
                  value={settings.backupFrequency}
                  onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                >
                  <MenuItem value="hourly">{t('settings:backup.frequencies.hourly')}</MenuItem>
                  <MenuItem value="daily">{t('settings:backup.frequencies.daily')}</MenuItem>
                  <MenuItem value="weekly">{t('settings:backup.frequencies.weekly')}</MenuItem>
                  <MenuItem value="monthly">{t('settings:backup.frequencies.monthly')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings:legacySettings.backupRetention')}
                type="number"
                value={settings.backupRetention}
                onChange={(e) => handleSettingChange('backupRetention', e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.manualBackup')}
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button variant="outlined" startIcon={<Backup />}>
              {t('settings:legacySettings.createBackupNow')}
            </Button>
            <Button variant="outlined" startIcon={<Storage />}>
              {t('settings:legacySettings.manageBackups')}
            </Button>
            <Button variant="outlined">
              {t('settings:legacySettings.restoreFromBackup')}
            </Button>
          </Box>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.dataExport')}
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('settings:legacySettings.dataExportWarning')}
          </Alert>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button variant="outlined">
              {t('settings:legacySettings.exportAll')}
            </Button>
            <Button variant="outlined">
              {t('settings:legacySettings.exportInvoices')}
            </Button>
            <Button variant="outlined">
              {t('settings:legacySettings.exportPurchaseOrders')}
            </Button>
            <Button variant="outlined">
              {t('settings:legacySettings.exportSuppliers')}
            </Button>
          </Box>
        </TabPanel>

        {/* Onglet Importation */}
        <TabPanel value={activeTab} index={6}>
          <Typography variant="h6" gutterBottom>
            {t('settings:data.importSection.title')}
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('settings:legacySettings.importInfo')}
          </Alert>

          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  cursor: 'pointer',
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => {
                  setImportType('clients');
                  setOpenImportDialog(true);
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Business sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {t('settings:legacySettings.importClients')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings:legacySettings.importClientsDesc')}
                  </Typography>
                  <Chip
                    label="Excel, CSV"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                  border: '2px solid transparent',
                  '&:hover': { borderColor: 'success.main' }
                }}
                onClick={() => {
                  setImportType('products');
                  setOpenImportDialog(true);
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Storage sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {t('settings:legacySettings.importProducts')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings:legacySettings.importProductsDesc')}
                  </Typography>
                  <Chip
                    label="Excel, CSV"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                  border: '2px solid transparent',
                  '&:hover': { borderColor: 'info.main' }
                }}
                onClick={() => {
                  setImportType('contacts');
                  setOpenImportDialog(true);
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Email sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {t('settings:legacySettings.phoneContacts')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings:legacySettings.phoneContactsDesc')}
                  </Typography>
                  <Chip
                    label={t('settings:general.phone')}
                    size="small"
                    color="info"
                    variant="outlined"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.importTemplates')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('settings:legacySettings.importTemplatesDesc')}
          </Typography>

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<FileUpload />}
              onClick={() => {
                // Créer un template CSV pour les clients
                const csvContent = "name,email,phone,address,city,postal_code,country\nJean Dupont,jean@example.com,0123456789,123 Rue Principal,Montréal,H1A 1A1,Canada\nMarie Martin,marie@example.com,0987654321,456 Rue Secondaire,Québec,G1A 1A1,Canada";
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'template_clients.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              }}
            >
              {t('settings:legacySettings.clientsTemplate')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileUpload />}
              onClick={() => {
                // Créer un template CSV pour les produits
                const csvContent = "name,reference,description,price,category,stock,unit\nProduit A,PRD-001,Description du produit A,29.99,Électronique,100,pcs\nProduit B,PRD-002,Description du produit B,15.50,Accessoires,50,pcs";
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'template_produits.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              }}
            >
              {t('settings:legacySettings.productsTemplate')}
            </Button>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom>
            {t('settings:legacySettings.importHistory')}
          </Typography>
          <Alert severity="warning">
            {t('settings:legacySettings.importHistoryComingSoon')}
          </Alert>
        </TabPanel>

        <CardContent>
          <Divider sx={{ mb: 3 }} />
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button variant="outlined">
              {t('settings:buttons.reset')}
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
            >
              {t('settings:legacySettings.saveSettings')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Import Wizard Dialog */}
      <ImportWizard
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        importType={importType}
      />
    </Box>
  );
}

export default Settings;