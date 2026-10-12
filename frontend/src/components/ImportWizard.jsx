import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  TableChart,
  CheckCircle,
  Error,
  People,
  Inventory,
  Smartphone,
  ContactPage,
  GetApp,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const ImportWizard = ({ open, onClose, importType = 'clients' }) => {
  const { t } = useTranslation(['dataImport', 'common']);
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    t('dataImport:legacy.steps.upload'),
    t('dataImport:legacy.steps.mapping'),
    t('dataImport:legacy.steps.preview'),
    t('dataImport:legacy.steps.importing'),
  ];

  // Configuration des types d'importation
  const importConfigs = {
    clients: {
      title: t('dataImport:legacy.titles.clients'),
      icon: <People />,
      color: 'primary',
      requiredFields: ['name', 'email'],
      optionalFields: ['phone', 'address', 'city', 'postal_code', 'country'],
      sampleData: [
        { name: 'Jean Dupont', email: 'jean@example.com', phone: '0123456789' },
        { name: 'Marie Martin', email: 'marie@example.com', phone: '0987654321' }
      ]
    },
    products: {
      title: t('dataImport:legacy.titles.products'),
      icon: <Inventory />,
      color: 'success',
      requiredFields: ['name', 'reference'],
      optionalFields: ['description', 'price', 'category', 'stock', 'unit'],
      sampleData: [
        { name: 'Produit A', reference: 'PRD-001', price: '29.99' },
        { name: 'Produit B', reference: 'PRD-002', price: '15.50' }
      ]
    },
    contacts: {
      title: t('dataImport:legacy.titles.contacts'),
      icon: <Smartphone />,
      color: 'info',
      requiredFields: ['name', 'phone'],
      optionalFields: ['email', 'company', 'notes'],
      sampleData: [
        { name: 'Contact 1', phone: '+33123456789', email: 'contact1@example.com' },
        { name: 'Contact 2', phone: '+33987654321', email: 'contact2@example.com' }
      ]
    }
  };

  const config = importConfigs[importType];

  // Gestionnaire de drop de fichiers
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      parseCSV(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  // Parser CSV/Excel
  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];

      for (let i = 1; i < Math.min(lines.length, 11); i++) { // Première 10 lignes pour aperçu
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }

      setCsvData(data);
      setActiveStep(1);
    };
    reader.readAsText(file);
  };

  // Gestion du mapping des colonnes
  const handleColumnMapping = (csvColumn, targetField) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: targetField
    }));
  };

  // Aperçu des contacts téléphone (simulation)
  const handlePhoneContactsImport = () => {
    setLoading(true);
    // Simulation d'accès aux contacts
    setTimeout(() => {
      const mockContacts = [
        { name: 'Jean Dupont', phone: '+33123456789', email: 'jean@example.com' },
        { name: 'Marie Martin', phone: '+33987654321', email: 'marie@example.com' },
        { name: 'Pierre Durand', phone: '+33555666777', email: 'pierre@example.com' },
        { name: 'Sophie Leroy', phone: '+33888999000', email: 'sophie@example.com' },
      ];
      setCsvData(mockContacts);
      setLoading(false);
      setActiveStep(2);
    }, 2000);
  };

  // Processus d'importation
  const handleImport = async () => {
    setLoading(true);
    setActiveStep(3);

    try {
      // Simulation du processus d'importation
      for (let i = 0; i <= 100; i += 10) {
        setImportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Simulation des résultats
      const results = {
        successful: csvData.length - 1,
        failed: 1,
        total: csvData.length,
        errors: [t('dataImport:legacy.mockLineError')]
      };

      setImportResults(results);
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setUploadedFile(null);
    setCsvData([]);
    setColumnMapping({});
    setImportProgress(0);
    setImportResults(null);
    setLoading(false);
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            {importType === 'contacts' ? (
              <Box textAlign="center" py={4}>
                <Smartphone sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('dataImport:legacy.contacts.title')}
                </Typography>
                <Typography color="text.secondary" paragraph>
                  {t('dataImport:legacy.contacts.description')}
                </Typography>
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<ContactPage />}
                  onClick={handlePhoneContactsImport}
                  disabled={loading}
                  size="large"
                >
                  {loading ? t('dataImport:legacy.contacts.accessing') : t('dataImport:legacy.contacts.access')}
                </Button>
              </Box>
            ) : (
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDragActive ? 'primary.50' : 'background.paper'
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? t('dataImport:legacy.dropHere') : t('dataImport:legacy.dragDrop')}
                </Typography>
                <Typography color="text.secondary" paragraph>
                  {t('dataImport:legacy.supportedFormats')}
                </Typography>
                <Button variant="outlined" component="span">
                  {t('dataImport:legacy.chooseFile')}
                </Button>
              </Box>
            )}

            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                {t('dataImport:legacy.requiredFieldsFor', { type: importType })}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {config.requiredFields.map(field => (
                  <Chip key={field} label={field} color="error" size="small" />
                ))}
                {config.optionalFields.map(field => (
                  <Chip key={field} label={field} color="default" variant="outlined" size="small" />
                ))}
              </Box>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('dataImport:legacy.mapTitle')}
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              {t('dataImport:legacy.mapInfo')}
            </Alert>

            <Grid container spacing={2}>
              {csvData[0] && Object.keys(csvData[0]).map(csvColumn => (
                <Grid item xs={12} sm={6} key={csvColumn}>
                  <FormControl fullWidth>
                    <InputLabel>{t('dataImport:legacy.columnLabel', { column: csvColumn })}</InputLabel>
                    <Select
                      value={columnMapping[csvColumn] || ''}
                      onChange={(e) => handleColumnMapping(csvColumn, e.target.value)}
                      label={t('dataImport:legacy.columnLabel', { column: csvColumn })}
                    >
                      <MenuItem value="">
                        <em>{t('dataImport:legacy.ignoreColumn')}</em>
                      </MenuItem>
                      {[...config.requiredFields, ...config.optionalFields].map(field => (
                        <MenuItem key={field} value={field}>
                          {field} {config.requiredFields.includes(field) && '*'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>

            <Box mt={3} display="flex" justifyContent="space-between">
              <Button onClick={() => setActiveStep(0)}>
                {t('dataImport:actions.back')}
              </Button>
              <Button
                variant="contained"
                onClick={() => setActiveStep(2)}
                disabled={!config.requiredFields.every(field =>
                  Object.values(columnMapping).includes(field)
                )}
              >
                {t('dataImport:legacy.preview')}
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('dataImport:legacy.previewTitle')}
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              {t('dataImport:legacy.recordsToImport', { count: csvData.length })}
            </Alert>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[...config.requiredFields, ...config.optionalFields]
                      .filter(field => Object.values(columnMapping).includes(field) || importType === 'contacts')
                      .map(field => (
                      <TableCell key={field}>{field}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {[...config.requiredFields, ...config.optionalFields]
                        .filter(field => Object.values(columnMapping).includes(field) || importType === 'contacts')
                        .map(field => (
                        <TableCell key={field}>
                          {importType === 'contacts' ? row[field] :
                           row[Object.keys(columnMapping).find(key => columnMapping[key] === field)] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={3} display="flex" justifyContent="space-between">
              <Button onClick={() => setActiveStep(importType === 'contacts' ? 0 : 1)}>
                {t('dataImport:actions.back')}
              </Button>
              <Button variant="contained" onClick={handleImport}>
                {t('dataImport:legacy.startImport')}
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box textAlign="center">
            {!importResults ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t('dataImport:legacy.inProgress')}
                </Typography>
                <LinearProgress variant="determinate" value={importProgress} sx={{ mb: 2 }} />
                <Typography color="text.secondary">
                  {t('dataImport:legacy.percentDone', { percent: importProgress })}
                </Typography>
              </Box>
            ) : (
              <Box>
                <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('dataImport:legacy.completed')}
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2, mb: 3 }}>
                  <Grid item xs={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" color="success.main">
                          {importResults.successful}
                        </Typography>
                        <Typography variant="body2">
                          {t('dataImport:legacy.success')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" color="error.main">
                          {importResults.failed}
                        </Typography>
                        <Typography variant="body2">
                          {t('dataImport:legacy.failures')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" color="primary.main">
                          {importResults.total}
                        </Typography>
                        <Typography variant="body2">
                          {t('dataImport:legacy.total')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {importResults.errors.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('dataImport:legacy.errorsEncountered')}
                    </Typography>
                    {importResults.errors.map((error, index) => (
                      <Typography key={index} variant="body2">
                        • {error}
                      </Typography>
                    ))}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  onClick={handleClose}
                  sx={{ mt: 3 }}
                >
                  {t('dataImport:legacy.finish')}
                </Button>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {config.icon}
          {config.title}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('dataImport:actions.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportWizard;