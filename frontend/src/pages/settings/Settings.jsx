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
} from '@mui/icons-material';

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
  const [activeTab, setActiveTab] = useState(0);
  const [openTaxDialog, setOpenTaxDialog] = useState(false);
  const [openHeaderDialog, setOpenHeaderDialog] = useState(false);
  const [headerPreview, setHeaderPreview] = useState(null);
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
    defaultCurrency: 'CAD',

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
    alert('Paramètres sauvegardés avec succès!');
  };

  const handleHeaderUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image valide');
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Le fichier est trop volumineux (max 5MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Vérifier les proportions recommandées (ratio 2.6:1 pour A4)
          const ratio = img.width / img.height;
          if (ratio < 2.0 || ratio > 4.0) {
            if (!confirm('Les proportions de votre image ne sont pas optimales pour un en-tête de facture (ratio recommandé: 2.6:1). Voulez-vous continuer?')) {
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
    { label: 'Général', icon: <Business /> },
    { label: 'Facturation', icon: <Print /> },
    { label: 'Notifications', icon: <Notifications /> },
    { label: 'Apparence', icon: <Palette /> },
    { label: 'Sécurité', icon: <Security /> },
    { label: 'Sauvegarde', icon: <Backup /> },
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
          Paramètres
        </Typography>
        {!isMobile && (
          <Typography variant="body2" color="text.secondary" sx={{
            fontSize: '0.875rem',
            mt: 0.5
          }}>
            Configurez votre application selon vos besoins
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
            Informations de l'entreprise
          </Typography>
          <Grid container spacing={isMobile ? 1.5 : 2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nom de l'entreprise"
                value={settings.companyName}
                onChange={(e) => handleSettingChange('companyName', e.target.value)}
                {...getTextFieldProps()}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Téléphone"
                value={settings.companyPhone}
                onChange={(e) => handleSettingChange('companyPhone', e.target.value)}
                {...getTextFieldProps()}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={settings.companyEmail}
                onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
                {...getTextFieldProps()}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Site web"
                value={settings.companyWebsite}
                onChange={(e) => handleSettingChange('companyWebsite', e.target.value)}
                {...getTextFieldProps()}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresse"
                multiline
                rows={isMobile ? 2 : 3}
                value={settings.companyAddress}
                onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
                {...getTextFieldProps()}
              />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<FileUpload />}
                  component="label"
                  size="small"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: isMobile ? 1.5 : 2,
                    py: isMobile ? 0.5 : 1,
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  {isMobile ? 'Logo' : 'Télécharger le logo'}
                  <input type="file" hidden accept="image/*" />
                </Button>
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                  Formats acceptés: PNG, JPG, SVG (max 2MB)
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom sx={{
            fontSize: '1.1rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            mb: 2
          }}>
            Paramètres de localisation
          </Typography>
          <Grid container spacing={isMobile ? 2 : 2.5}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth {...getFormControlProps()}>
                <InputLabel>Langue</InputLabel>
                <Select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                >
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth {...getFormControlProps()}>
                <InputLabel>Format de date</InputLabel>
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
              <FormControl fullWidth {...getFormControlProps()}>
                <InputLabel>Format d'heure</InputLabel>
                <Select
                  value={settings.timeFormat}
                  onChange={(e) => handleSettingChange('timeFormat', e.target.value)}
                >
                  <MenuItem value="24h">24 heures</MenuItem>
                  <MenuItem value="12h">12 heures (AM/PM)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Onglet Facturation */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Numérotation des documents
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Préfixe des factures"
                value={settings.invoicePrefix}
                onChange={(e) => handleSettingChange('invoicePrefix', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Préfixe des bons de commande"
                value={settings.poPrefix}
                onChange={(e) => handleSettingChange('poPrefix', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Conditions de paiement par défaut"
                value={settings.invoiceTerms}
                onChange={(e) => handleSettingChange('invoiceTerms', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Devise par défaut</InputLabel>
                <Select
                  value={settings.defaultCurrency}
                  onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
                >
                  <MenuItem value="CAD">CAD - Dollar canadien</MenuItem>
                  <MenuItem value="USD">USD - Dollar américain</MenuItem>
                  <MenuItem value="EUR">EUR - Euro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            Configuration des taxes
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableTaxCalculation}
                    onChange={(e) => handleSettingChange('enableTaxCalculation', e.target.checked)}
                  />
                }
                label="Activer le calcul automatique des taxes"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Taux TPS/TVH (%)"
                type="number"
                value={settings.gstHstRate}
                onChange={(e) => handleSettingChange('gstHstRate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Taux TVQ (%)"
                type="number"
                value={settings.qstRate}
                onChange={(e) => handleSettingChange('qstRate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Taux par défaut (%)"
                type="number"
                value={settings.defaultTaxRate}
                onChange={(e) => handleSettingChange('defaultTaxRate', e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            En-tête de facture
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Configurez l'apparence de l'en-tête de vos factures. Ratio recommandé: 2.6:1 (210mm x 80mm pour A4).
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type d'en-tête</InputLabel>
                <Select
                  value={settings.invoiceHeaderType}
                  onChange={(e) => handleSettingChange('invoiceHeaderType', e.target.value)}
                >
                  <MenuItem value="simple">Simple (texte uniquement)</MenuItem>
                  <MenuItem value="custom">Personnalisé</MenuItem>
                  <MenuItem value="uploaded">Image uploadée</MenuItem>
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
                      Télécharger en-tête
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
                      Supprimer
                    </Button>
                  </Box>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Formats acceptés: PNG, JPG, SVG (max 5MB) - Ratio optimal: 2.6:1
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
                        Aperçu de l'en-tête
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
                          alt="Aperçu en-tête"
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
                    <InputLabel>Position du logo</InputLabel>
                    <Select
                      value={settings.logoPosition}
                      onChange={(e) => handleSettingChange('logoPosition', e.target.value)}
                    >
                      <MenuItem value="left">Gauche</MenuItem>
                      <MenuItem value="center">Centre</MenuItem>
                      <MenuItem value="right">Droite</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Taille du logo</InputLabel>
                    <Select
                      value={settings.logoSize}
                      onChange={(e) => handleSettingChange('logoSize', e.target.value)}
                    >
                      <MenuItem value="small">Petit</MenuItem>
                      <MenuItem value="medium">Moyen</MenuItem>
                      <MenuItem value="large">Grand</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2">Couleur de fond:</Typography>
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
                    <Typography variant="body2">Couleur du texte:</Typography>
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
                    label="Afficher les informations de l'entreprise"
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
                    label="Afficher le logo"
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
                      Aperçu de l'en-tête personnalisé
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
                label="Largeur (mm)"
                type="number"
                value={settings.headerWidth}
                onChange={(e) => handleSettingChange('headerWidth', e.target.value)}
                helperText="Largeur recommandée: 210mm (A4)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hauteur (mm)"
                type="number"
                value={settings.headerHeight}
                onChange={(e) => handleSettingChange('headerHeight', e.target.value)}
                helperText="Hauteur recommandée: 80mm"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            Paramètres d'impression
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Taille du papier</InputLabel>
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
                <InputLabel>Marges</InputLabel>
                <Select
                  value={settings.printMargins}
                  onChange={(e) => handleSettingChange('printMargins', e.target.value)}
                >
                  <MenuItem value="narrow">Étroites</MenuItem>
                  <MenuItem value="normal">Normales</MenuItem>
                  <MenuItem value="wide">Larges</MenuItem>
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
                label="Inclure le code QR sur les documents"
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
                label="Impression en couleur"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Onglet Notifications */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Notifications par email
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Notifications générales"
                secondary="Recevoir les notifications importantes par email"
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
                primary="Rappels de factures"
                secondary="Rappels automatiques pour les factures en retard"
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
                primary="Alertes de stock bas"
                secondary="Notifications quand les produits sont en rupture"
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
                primary="Mises à jour des commandes"
                secondary="Notifications sur les changements de statut des commandes"
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
            Configuration email
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Configurez vos paramètres SMTP pour envoyer des emails automatiques.
          </Alert>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Serveur SMTP"
                placeholder="smtp.gmail.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Port"
                type="number"
                placeholder="587"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email d'expédition"
                type="email"
                placeholder="noreply@procuregenius.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mot de passe"
                type="password"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch />}
                label="Utiliser SSL/TLS"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Onglet Apparence */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" gutterBottom>
            Thème et couleurs
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Thème</InputLabel>
                <Select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                >
                  <MenuItem value="light">Clair</MenuItem>
                  <MenuItem value="dark">Sombre</MenuItem>
                  <MenuItem value="auto">Automatique</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            Couleurs personnalisées
          </Typography>
          <Grid container spacing={3}>
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
                  <Typography variant="body2">Couleur principale</Typography>
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
                  <Typography variant="body2">Couleur secondaire</Typography>
                  <Typography variant="caption" color="textSecondary">#10B981</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Onglet Sécurité */}
        <TabPanel value={activeTab} index={4}>
          <Typography variant="h6" gutterBottom>
            Paramètres de sécurité
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Délai d'expiration de session (minutes)"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tentatives de connexion maximales"
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
                label="Exiger des mots de passe forts"
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
                label="Activer l'authentification à deux facteurs"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            Journal d'audit
          </Typography>
          <Alert severity="info">
            Le journal d'audit enregistre toutes les actions importantes effectuées dans le système.
          </Alert>
        </TabPanel>

        {/* Onglet Sauvegarde */}
        <TabPanel value={activeTab} index={5}>
          <Typography variant="h6" gutterBottom>
            Sauvegarde automatique
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup}
                    onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  />
                }
                label="Activer la sauvegarde automatique"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Fréquence de sauvegarde</InputLabel>
                <Select
                  value={settings.backupFrequency}
                  onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
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
                label="Rétention des sauvegardes (jours)"
                type="number"
                value={settings.backupRetention}
                onChange={(e) => handleSettingChange('backupRetention', e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            Sauvegarde manuelle
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button variant="outlined" startIcon={<Backup />}>
              Créer une sauvegarde maintenant
            </Button>
            <Button variant="outlined" startIcon={<Storage />}>
              Gérer les sauvegardes
            </Button>
            <Button variant="outlined">
              Restaurer depuis une sauvegarde
            </Button>
          </Box>

          <Divider sx={{ my: isMobile ? 2 : 3 }} />

          <Typography variant="h6" gutterBottom>
            Export des données
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            L'export des données peut prendre plusieurs minutes selon la taille de votre base de données.
          </Alert>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button variant="outlined">
              Exporter toutes les données
            </Button>
            <Button variant="outlined">
              Exporter les factures
            </Button>
            <Button variant="outlined">
              Exporter les bons de commande
            </Button>
            <Button variant="outlined">
              Exporter les fournisseurs
            </Button>
          </Box>
        </TabPanel>

        <CardContent sx={{
          background: 'rgba(0,0,0,0.02)',
          borderTop: '1px solid rgba(0,0,0,0.05)'
        }}>
          <Divider sx={{ mb: 2.5, opacity: 0.6 }} />
          <Box display="flex" justifyContent="flex-end" gap={isMobile ? 1 : 2} flexWrap="wrap">
            <Button
              variant="outlined"
              size="small"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                px: isMobile ? 2 : 3,
                py: isMobile ? 0.5 : 1,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }
              }}
            >
              {isMobile ? 'Reset' : 'Réinitialiser'}
            </Button>
            <Button
              variant="contained"
              startIcon={isMobile ? null : <Save />}
              onClick={handleSave}
              size="small"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                px: isMobile ? 2 : 3,
                py: isMobile ? 0.5 : 1,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                }
              }}
            >
              {isMobile ? 'Sauvegarder' : 'Sauvegarder les paramètres'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Settings;