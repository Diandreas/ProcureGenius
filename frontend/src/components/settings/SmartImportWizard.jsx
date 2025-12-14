/**
 * SmartImportWizard - Module d'importation intelligente des données
 * 
 * Un wizard intuitif et moderne pour importer des données depuis des fichiers
 * Excel/CSV avec mapping automatique intelligent et aperçu en temps réel.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  LinearProgress,
  Chip,
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
  TextField,
  IconButton,
  Stack,
  Divider,
  Fade,
  Zoom,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Business,
  People,
  Inventory,
  LocalShipping,
  Receipt,
  Description,
  AutoAwesome,
  Close,
  ArrowBack,
  ArrowForward,
  Download,
  Refresh,
  Help,
  Info,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import {
  createMigrationJob,
  previewMigrationData,
  configureMigration,
  startMigration,
  fetchMigrationJob,
  fetchMigrationLogs,
  clearPreview,
} from '../../store/slices/migrationSlice';

// Configuration des types d'entités importables
const ENTITY_CONFIGS = {
  suppliers: {
    label: 'Fournisseurs',
    icon: LocalShipping,
    color: '#2563eb',
    description: 'Importez votre liste de fournisseurs avec leurs coordonnées',
    fields: {
      required: ['name'],
      optional: ['email', 'phone', 'address', 'city', 'country', 'contact_name', 'payment_terms', 'notes'],
    },
    suggestedMappings: {
      'nom': 'name',
      'name': 'name',
      'fournisseur': 'name',
      'supplier': 'name',
      'email': 'email',
      'courriel': 'email',
      'mail': 'email',
      'telephone': 'phone',
      'téléphone': 'phone',
      'phone': 'phone',
      'tel': 'phone',
      'adresse': 'address',
      'address': 'address',
      'ville': 'city',
      'city': 'city',
      'pays': 'country',
      'country': 'country',
      'contact': 'contact_name',
      'contact_name': 'contact_name',
    },
  },
  products: {
    label: 'Produits',
    icon: Inventory,
    color: '#059669',
    description: 'Importez votre catalogue de produits avec prix et stocks',
    fields: {
      required: ['name'],
      optional: ['reference', 'sku', 'description', 'unit_price', 'cost_price', 'quantity_in_stock', 'category', 'unit'],
    },
    suggestedMappings: {
      'nom': 'name',
      'name': 'name',
      'produit': 'name',
      'product': 'name',
      'designation': 'name',
      'désignation': 'name',
      'reference': 'reference',
      'référence': 'reference',
      'ref': 'reference',
      'sku': 'sku',
      'code': 'reference',
      'description': 'description',
      'prix': 'unit_price',
      'price': 'unit_price',
      'prix_vente': 'unit_price',
      'prix_unitaire': 'unit_price',
      'unit_price': 'unit_price',
      'cout': 'cost_price',
      'cost': 'cost_price',
      'prix_achat': 'cost_price',
      'stock': 'quantity_in_stock',
      'quantity': 'quantity_in_stock',
      'quantite': 'quantity_in_stock',
      'qté': 'quantity_in_stock',
      'categorie': 'category',
      'category': 'category',
      'unite': 'unit',
      'unit': 'unit',
    },
  },
  clients: {
    label: 'Clients',
    icon: People,
    color: '#7c3aed',
    description: 'Importez votre base de clients avec leurs informations',
    fields: {
      required: ['name'],
      optional: ['email', 'phone', 'address', 'city', 'country', 'contact_name', 'credit_limit', 'notes'],
    },
    suggestedMappings: {
      'nom': 'name',
      'name': 'name',
      'client': 'name',
      'customer': 'name',
      'raison_sociale': 'name',
      'email': 'email',
      'courriel': 'email',
      'mail': 'email',
      'telephone': 'phone',
      'téléphone': 'phone',
      'phone': 'phone',
      'tel': 'phone',
      'adresse': 'address',
      'address': 'address',
      'ville': 'city',
      'city': 'city',
      'pays': 'country',
      'country': 'country',
      'contact': 'contact_name',
    },
  },
  purchase_orders: {
    label: 'Bons de commande',
    icon: Description,
    color: '#ea580c',
    description: 'Importez vos bons de commande existants',
    fields: {
      required: ['supplier_name'],
      optional: ['order_number', 'order_date', 'expected_date', 'status', 'notes'],
    },
    suggestedMappings: {
      'fournisseur': 'supplier_name',
      'supplier': 'supplier_name',
      'numero': 'order_number',
      'order_number': 'order_number',
      'date': 'order_date',
      'order_date': 'order_date',
      'date_livraison': 'expected_date',
      'delivery_date': 'expected_date',
      'statut': 'status',
      'status': 'status',
    },
  },
  invoices: {
    label: 'Factures',
    icon: Receipt,
    color: '#dc2626',
    description: 'Importez vos factures clients',
    fields: {
      required: ['client_name'],
      optional: ['invoice_number', 'invoice_date', 'due_date', 'status', 'total', 'notes'],
    },
    suggestedMappings: {
      'client': 'client_name',
      'customer': 'client_name',
      'numero': 'invoice_number',
      'invoice_number': 'invoice_number',
      'date': 'invoice_date',
      'invoice_date': 'invoice_date',
      'echeance': 'due_date',
      'due_date': 'due_date',
      'statut': 'status',
      'status': 'status',
      'total': 'total',
      'montant': 'total',
    },
  },
};

const STEPS = ['Type de données', 'Fichier source', 'Mapping', 'Aperçu', 'Import'];

/**
 * Carte de sélection d'entité
 */
const EntityCard = ({ entityKey, config, selected, onClick }) => {
  const theme = useTheme();
  const Icon = config.icon;
  
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 3,
        border: selected 
          ? `2px solid ${config.color}` 
          : '2px solid transparent',
        background: selected 
          ? alpha(config.color, 0.05)
          : 'rgba(255, 255, 255, 0.9)',
        boxShadow: selected 
          ? `0 4px 20px ${alpha(config.color, 0.25)}`
          : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 25px ${alpha(config.color, 0.2)}`,
          borderColor: config.color,
        },
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
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
            background: `linear-gradient(135deg, ${config.color}, ${alpha(config.color, 0.7)})`,
            boxShadow: `0 4px 12px ${alpha(config.color, 0.4)}`,
          }}
        >
          <Icon sx={{ fontSize: 32, color: 'white' }} />
        </Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {config.label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {config.description}
        </Typography>
        {selected && (
          <Chip
            icon={<CheckCircle />}
            label="Sélectionné"
            color="success"
            size="small"
            sx={{ mt: 2 }}
          />
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Zone de drop de fichier
 */
const FileDropzone = ({ onFileAccepted, acceptedFile }) => {
  const theme = useTheme();
  
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0]);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed',
        borderColor: isDragActive 
          ? 'primary.main' 
          : isDragReject 
            ? 'error.main' 
            : acceptedFile 
              ? 'success.main' 
              : 'grey.300',
        borderRadius: 3,
        p: 4,
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragActive 
          ? alpha(theme.palette.primary.main, 0.05)
          : acceptedFile 
            ? alpha(theme.palette.success.main, 0.05)
            : 'white',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          background: alpha(theme.palette.primary.main, 0.02),
        },
      }}
    >
      <input {...getInputProps()} />
      
      {acceptedFile ? (
        <Fade in>
          <Box>
            <InsertDriveFile sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="success.main">
              Fichier sélectionné
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {acceptedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(acceptedFile.size / 1024).toFixed(1)} KB
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ mt: 2 }}
              onClick={(e) => {
                e.stopPropagation();
                onFileAccepted(null);
              }}
            >
              Changer de fichier
            </Button>
          </Box>
        </Fade>
      ) : (
        <Box>
          <CloudUpload sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier'}
          </Typography>
          <Typography color="text.secondary" paragraph>
            ou cliquez pour sélectionner
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Chip label="CSV" size="small" variant="outlined" />
            <Chip label="Excel (.xlsx)" size="small" variant="outlined" />
            <Chip label="Max 10 MB" size="small" variant="outlined" />
          </Stack>
        </Box>
      )}
    </Box>
  );
};

/**
 * Composant principal SmartImportWizard
 */
const SmartImportWizard = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  
  const { currentJob, previewData, availableFields, logs, loading, error } = useSelector(
    (state) => state.migration
  );

  // État local du wizard
  const [activeStep, setActiveStep] = useState(0);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [importName, setImportName] = useState('');
  const [fieldMapping, setFieldMapping] = useState({});
  const [transformationRules, setTransformationRules] = useState({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [hasHeader, setHasHeader] = useState(true);
  const [delimiter, setDelimiter] = useState(',');
  const [pollingInterval, setPollingInterval] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Polling pour le statut du job
  useEffect(() => {
    if (currentJob && currentJob.status === 'running') {
      const interval = setInterval(() => {
        dispatch(fetchMigrationJob(currentJob.id));
        dispatch(fetchMigrationLogs(currentJob.id));
      }, 2000);
      setPollingInterval(interval);
      return () => clearInterval(interval);
    } else if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [currentJob?.status, currentJob?.id, dispatch]);

  // Nettoyage à la fermeture
  useEffect(() => {
    if (!open) {
      resetWizard();
    }
  }, [open]);

  const resetWizard = () => {
    setActiveStep(0);
    setSelectedEntity(null);
    setUploadedFile(null);
    setImportName('');
    setFieldMapping({});
    setTransformationRules({});
    setSkipDuplicates(true);
    setUpdateExisting(false);
    setLocalPreview(null);
    dispatch(clearPreview());
  };

  // Parser CSV local pour l'aperçu rapide
  const parseCSVPreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            data.push(row);
          }
        }

        resolve({ headers, data, totalRows: lines.length - 1 });
      };
      reader.readAsText(file);
    });
  };

  // Suggestion automatique du mapping
  const suggestMapping = (headers) => {
    if (!selectedEntity) return {};
    
    const config = ENTITY_CONFIGS[selectedEntity];
    const suggested = {};
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_');
      
      // Chercher une correspondance dans les suggestions
      for (const [pattern, field] of Object.entries(config.suggestedMappings)) {
        const normalizedPattern = pattern.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        
        if (normalizedHeader.includes(normalizedPattern) || normalizedPattern.includes(normalizedHeader)) {
          suggested[header] = field;
          break;
        }
      }
    });
    
    return suggested;
  };

  // Gestion du changement de fichier
  const handleFileChange = async (file) => {
    setUploadedFile(file);
    
    if (file) {
      setLocalLoading(true);
      try {
        const preview = await parseCSVPreview(file);
        setLocalPreview(preview);
        
        // Suggérer le mapping automatiquement
        const suggestedMap = suggestMapping(preview.headers);
        setFieldMapping(suggestedMap);
        
        // Générer un nom d'import par défaut
        if (!importName) {
          const entityLabel = ENTITY_CONFIGS[selectedEntity]?.label || 'Données';
          const date = new Date().toLocaleDateString('fr-FR');
          setImportName(`Import ${entityLabel} - ${date}`);
        }
      } catch (err) {
        console.error('Error parsing file:', err);
      } finally {
        setLocalLoading(false);
      }
    } else {
      setLocalPreview(null);
    }
  };

  // Gestion du mapping
  const handleMappingChange = (sourceField, destField) => {
    setFieldMapping(prev => {
      if (destField === '') {
        const newMapping = { ...prev };
        delete newMapping[sourceField];
        return newMapping;
      }
      return { ...prev, [sourceField]: destField };
    });
  };

  // Création et lancement de l'import
  const handleStartImport = async () => {
    try {
      setLocalLoading(true);
      
      // Créer le job de migration
      const jobData = {
        name: importName,
        source_type: 'excel_csv',
        entity_type: selectedEntity,
        source_file: uploadedFile,
        has_header: hasHeader,
        delimiter: delimiter,
      };
      
      const result = await dispatch(createMigrationJob(jobData)).unwrap();
      
      // Attendre un peu puis configurer
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Configurer le mapping
      await dispatch(configureMigration({
        id: result.id,
        config: {
          field_mapping: fieldMapping,
          transformation_rules: transformationRules,
          skip_duplicates: skipDuplicates,
          update_existing: updateExisting,
        },
      })).unwrap();
      
      // Démarrer l'import
      await dispatch(startMigration(result.id)).unwrap();
      
      setActiveStep(4);
    } catch (err) {
      console.error('Error starting import:', err);
    } finally {
      setLocalLoading(false);
    }
  };

  // Télécharger un template
  const handleDownloadTemplate = () => {
    if (!selectedEntity) return;
    
    const config = ENTITY_CONFIGS[selectedEntity];
    const allFields = [...config.fields.required, ...config.fields.optional];
    const csvContent = allFields.join(',') + '\n' + 
      allFields.map(f => config.fields.required.includes(f) ? 'valeur_requise' : '').join(',');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${selectedEntity}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Vérifier si on peut passer à l'étape suivante
  const canProceed = () => {
    switch (activeStep) {
      case 0: return selectedEntity !== null;
      case 1: return uploadedFile !== null && importName.trim() !== '';
      case 2: {
        // Vérifier que tous les champs requis sont mappés
        const config = ENTITY_CONFIGS[selectedEntity];
        return config.fields.required.every(field => 
          Object.values(fieldMapping).includes(field)
        );
      }
      case 3: return true;
      default: return false;
    }
  };

  // Navigation
  const handleNext = () => {
    if (activeStep === 3) {
      handleStartImport();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Rendu du contenu de chaque étape
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom textAlign="center">
              Quel type de données souhaitez-vous importer ?
            </Typography>
            <Typography color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
              Sélectionnez le type d'entité pour configurer l'import intelligemment
            </Typography>
            
            <Grid container spacing={2}>
              {Object.entries(ENTITY_CONFIGS).map(([key, config]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <EntityCard
                    entityKey={key}
                    config={config}
                    selected={selectedEntity === key}
                    onClick={() => setSelectedEntity(key)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom textAlign="center">
              Sélectionnez votre fichier source
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <FileDropzone
                  onFileAccepted={handleFileChange}
                  acceptedFile={uploadedFile}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Nom de l'import"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    required
                    size="small"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hasHeader}
                        onChange={(e) => setHasHeader(e.target.checked)}
                      />
                    }
                    label="Le fichier contient des en-têtes"
                  />
                  
                  <TextField
                    fullWidth
                    label="Délimiteur CSV"
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    size="small"
                    select
                  >
                    <MenuItem value=",">Virgule (,)</MenuItem>
                    <MenuItem value=";">Point-virgule (;)</MenuItem>
                    <MenuItem value="\t">Tabulation</MenuItem>
                  </TextField>
                  
                  <Divider />
                  
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={handleDownloadTemplate}
                    size="small"
                  >
                    Télécharger template
                  </Button>
                </Stack>
              </Grid>
            </Grid>
            
            {localLoading && <LinearProgress sx={{ mt: 2 }} />}
          </Box>
        );

      case 2:
        const config = ENTITY_CONFIGS[selectedEntity];
        const allDestFields = [...config.fields.required, ...config.fields.optional];
        
        return (
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                Associez les colonnes de votre fichier
              </Typography>
              <Chip 
                icon={<AutoAwesome />} 
                label="Mapping intelligent actif" 
                color="primary" 
                size="small" 
              />
            </Box>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Colonnes requises</AlertTitle>
              {config.fields.required.map(f => (
                <Chip 
                  key={f} 
                  label={f} 
                  size="small" 
                  color={Object.values(fieldMapping).includes(f) ? 'success' : 'error'}
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Alert>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Colonne source</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Exemple de valeur</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Champ destination</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {localPreview?.headers.map((header) => (
                    <TableRow key={header} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {header}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {localPreview.data[0]?.[header] || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={fieldMapping[header] || ''}
                            onChange={(e) => handleMappingChange(header, e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>Ignorer cette colonne</em>
                            </MenuItem>
                            {allDestFields.map(field => (
                              <MenuItem 
                                key={field} 
                                value={field}
                                disabled={Object.values(fieldMapping).includes(field) && fieldMapping[header] !== field}
                              >
                                {field} {config.fields.required.includes(field) && '*'}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Aperçu de l'import
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      Lignes à importer
                    </Typography>
                    <Typography variant="h3" color="primary.main">
                      {localPreview?.totalRows || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: alpha(theme.palette.success.main, 0.05), borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      Champs mappés
                    </Typography>
                    <Typography variant="h3" color="success.main">
                      {Object.keys(fieldMapping).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: alpha(theme.palette.warning.main, 0.05), borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      Type d'entité
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {ENTITY_CONFIGS[selectedEntity]?.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" gutterBottom>
              Options d'import
            </Typography>
            <Stack direction="row" spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                  />
                }
                label="Ignorer les doublons"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    disabled={!skipDuplicates}
                  />
                }
                label="Mettre à jour les existants"
              />
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" gutterBottom>
              Aperçu des données (5 premières lignes)
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    {Object.entries(fieldMapping).map(([source, dest]) => (
                      <TableCell key={source}>
                        <Typography variant="caption" color="primary.main" display="block">
                          {dest}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({source})
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {localPreview?.data.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{index + 1}</TableCell>
                      {Object.keys(fieldMapping).map((source) => (
                        <TableCell key={source}>
                          {row[source] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 4:
        return (
          <Box textAlign="center">
            {currentJob?.status === 'running' && (
              <Fade in>
                <Box>
                  <CircularProgress size={80} sx={{ mb: 3 }} />
                  <Typography variant="h5" gutterBottom>
                    Import en cours...
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={currentJob.progress_percentage || 0}
                    sx={{ mb: 2, height: 8, borderRadius: 4 }}
                  />
                  <Typography color="text.secondary">
                    {currentJob.processed_rows || 0} / {currentJob.total_rows || 0} lignes traitées
                  </Typography>
                </Box>
              </Fade>
            )}

            {currentJob?.status === 'completed' && (
              <Zoom in>
                <Box>
                  <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom color="success.main">
                    Import terminé avec succès !
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
                    <Grid item xs={4}>
                      <Card sx={{ background: alpha(theme.palette.success.main, 0.1) }}>
                        <CardContent>
                          <Typography variant="h4" color="success.main">
                            {currentJob.success_count || 0}
                          </Typography>
                          <Typography variant="body2">Succès</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card sx={{ background: alpha(theme.palette.error.main, 0.1) }}>
                        <CardContent>
                          <Typography variant="h4" color="error.main">
                            {currentJob.error_count || 0}
                          </Typography>
                          <Typography variant="body2">Erreurs</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card sx={{ background: alpha(theme.palette.warning.main, 0.1) }}>
                        <CardContent>
                          <Typography variant="h4" color="warning.main">
                            {currentJob.skipped_count || 0}
                          </Typography>
                          <Typography variant="body2">Ignorés</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              </Zoom>
            )}

            {currentJob?.status === 'failed' && (
              <Box>
                <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom color="error.main">
                  Erreur lors de l'import
                </Typography>
                <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                  {currentJob.error_message || 'Une erreur inattendue est survenue'}
                </Alert>
              </Box>
            )}

            {!currentJob && !loading && (
              <Box>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="h6" color="text.secondary">
                  Préparation de l'import...
                </Typography>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          minHeight: isMobile ? '100%' : '80vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesome color="primary" />
            <Typography variant="h6">
              Import intelligent de données
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ px: 3, pt: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label, index) => (
            <Step key={label} completed={index < activeStep}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading || localLoading}>
          {activeStep === 4 && currentJob?.status === 'completed' ? 'Fermer' : 'Annuler'}
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        {activeStep > 0 && activeStep < 4 && (
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            disabled={loading || localLoading}
          >
            Précédent
          </Button>
        )}
        
        {activeStep < 4 && (
          <Button
            variant="contained"
            endIcon={activeStep === 3 ? <CloudUpload /> : <ArrowForward />}
            onClick={handleNext}
            disabled={!canProceed() || loading || localLoading}
          >
            {activeStep === 3 ? 'Lancer l\'import' : 'Suivant'}
          </Button>
        )}
        
        {activeStep === 4 && currentJob?.status === 'completed' && (
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={resetWizard}
          >
            Nouvel import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SmartImportWizard;

