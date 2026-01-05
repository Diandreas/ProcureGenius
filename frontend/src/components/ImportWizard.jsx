import React, { useState } from 'react';
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
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const steps = ['Upload de fichier', 'Mapping des colonnes', 'Aperçu', 'Importation'];

  // Configuration des types d'importation
  const importConfigs = {
    clients: {
      title: 'Importer des clients',
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
      title: 'Importer des produits',
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
      title: 'Importer des contacts téléphone',
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
        errors: ['Ligne 3: Email invalide']
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
                  Importer des contacts depuis votre téléphone
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Accédez aux contacts de votre téléphone pour les importer directement.
                </Typography>
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<ContactPage />}
                  onClick={handlePhoneContactsImport}
                  disabled={loading}
                  size="large"
                >
                  {loading ? 'Accès aux contacts...' : 'Accéder aux contacts'}
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
                  {isDragActive ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier'}
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Formats supportés: CSV, XLS, XLSX
                </Typography>
                <Button variant="outlined" component="span">
                  Choisir un fichier
                </Button>
              </Box>
            )}

            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Champs requis pour {importType}:
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
              Mappez les colonnes de votre fichier
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Associez chaque colonne de votre fichier avec les champs correspondants
            </Alert>

            <Grid container spacing={2}>
              {csvData[0] && Object.keys(csvData[0]).map(csvColumn => (
                <Grid item xs={12} sm={6} key={csvColumn}>
                  <FormControl fullWidth>
                    <InputLabel>Colonne: {csvColumn}</InputLabel>
                    <Select
                      value={columnMapping[csvColumn] || ''}
                      onChange={(e) => handleColumnMapping(csvColumn, e.target.value)}
                      label={`Colonne: ${csvColumn}`}
                    >
                      <MenuItem value="">
                        <em>Ignorer cette colonne</em>
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
                Retour
              </Button>
              <Button
                variant="contained"
                onClick={() => setActiveStep(2)}
                disabled={!config.requiredFields.every(field =>
                  Object.values(columnMapping).includes(field)
                )}
              >
                Aperçu
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Aperçu des données à importer
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              {csvData.length} enregistrements seront importés
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
                Retour
              </Button>
              <Button variant="contained" onClick={handleImport}>
                Commencer l'importation
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
                  Importation en cours...
                </Typography>
                <LinearProgress variant="determinate" value={importProgress} sx={{ mb: 2 }} />
                <Typography color="text.secondary">
                  {importProgress}% terminé
                </Typography>
              </Box>
            ) : (
              <Box>
                <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Importation terminée !
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2, mb: 3 }}>
                  <Grid item xs={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" color="success.main">
                          {importResults.successful}
                        </Typography>
                        <Typography variant="body2">
                          Succès
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
                          Échecs
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
                          Total
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {importResults.errors.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Erreurs rencontrées:
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
                  Terminer
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
          Annuler
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportWizard;