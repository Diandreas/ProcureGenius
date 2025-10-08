import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  Visibility,
  Settings,
  PlayArrow,
  CheckCircle,
} from '@mui/icons-material';
import {
  createMigrationJob,
  previewMigrationData,
  configureMigration,
  startMigration,
  fetchMigrationJob,
  fetchMigrationLogs,
  clearPreview,
} from '../../store/slices/migrationSlice';

const steps = ['Téléverser le fichier', 'Aperçu et mapping', 'Configuration', 'Import'];

function MigrationWizard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { currentJob, previewData, availableFields, logs, loading, error } = useSelector(
    (state) => state.migration
  );

  // Get entity type from URL params if available
  const entityTypeFromUrl = searchParams.get('type') || 'suppliers';

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    source_type: 'excel_csv',
    entity_type: entityTypeFromUrl,
    source_file: null,
    has_header: true,
    delimiter: ',',
    file_encoding: 'utf-8',
  });
  const [fieldMapping, setFieldMapping] = useState({});
  const [transformationRules, setTransformationRules] = useState({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Poll for job status when running
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, source_file: file });
    }
  };

  const handleStep1Submit = async () => {
    try {
      const result = await dispatch(createMigrationJob(formData)).unwrap();
      setActiveStep(1);
      // Auto-generate preview
      await dispatch(previewMigrationData(result.id)).unwrap();
    } catch (err) {
      console.error('Error creating job:', err);
    }
  };

  const handleStep2Submit = async () => {
    setActiveStep(2);
  };

  const handleStep3Submit = async () => {
    try {
      await dispatch(
        configureMigration({
          id: currentJob.id,
          config: {
            field_mapping: fieldMapping,
            transformation_rules: transformationRules,
            skip_duplicates: skipDuplicates,
            update_existing: updateExisting,
          },
        })
      ).unwrap();
      setActiveStep(3);
      // Start import
      await dispatch(startMigration(currentJob.id)).unwrap();
    } catch (err) {
      console.error('Error starting migration:', err);
    }
  };

  const handleFieldMappingChange = (sourceField, destField) => {
    setFieldMapping({ ...fieldMapping, [sourceField]: destField });
  };

  const handleTransformationChange = (field, type) => {
    if (type) {
      setTransformationRules({ ...transformationRules, [field]: { type } });
    } else {
      const newRules = { ...transformationRules };
      delete newRules[field];
      setTransformationRules(newRules);
    }
  };

  const getSourceFields = () => {
    if (!previewData || previewData.length === 0) return [];
    return Object.keys(previewData[0].data);
  };

  const getEntityTypeLabel = (type) => {
    const labels = {
      suppliers: 'Fournisseurs',
      products: 'Produits',
      clients: 'Clients',
      purchase_orders: 'Bons de commande',
      invoices: 'Factures',
    };
    return labels[type] || type;
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Téléverser le fichier source
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nom de l'import"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Type de source</InputLabel>
            <Select
              value={formData.source_type}
              onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
              label="Type de source"
            >
              <MenuItem value="excel_csv">Excel / CSV</MenuItem>
              <MenuItem value="quickbooks" disabled>
                QuickBooks (Bientôt disponible)
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Type d'entité</InputLabel>
            <Select
              value={formData.entity_type}
              onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
              label="Type d'entité"
            >
              <MenuItem value="suppliers">Fournisseurs</MenuItem>
              <MenuItem value="products">Produits</MenuItem>
              <MenuItem value="clients">Clients</MenuItem>
              <MenuItem value="purchase_orders">Bons de commande</MenuItem>
              <MenuItem value="invoices">Factures</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUpload />}
            fullWidth
          >
            {formData.source_file ? formData.source_file.name : 'Sélectionner un fichier'}
            <input type="file" hidden onChange={handleFileChange} accept=".xlsx,.xls,.csv" />
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.has_header}
                onChange={(e) => setFormData({ ...formData, has_header: e.target.checked })}
              />
            }
            label="Le fichier contient des en-têtes"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Délimiteur (pour CSV)"
            value={formData.delimiter}
            onChange={(e) => setFormData({ ...formData, delimiter: e.target.value })}
            disabled={formData.source_type !== 'excel_csv'}
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleStep1Submit}
          disabled={!formData.name || !formData.source_file || loading}
          startIcon={<Visibility />}
        >
          Générer l'aperçu
        </Button>
      </Box>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Aperçu des données et mapping des champs
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            {previewData?.length || 0} lignes affichées sur {currentJob?.total_rows || 0} total
          </Alert>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Mapping des champs
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Champ source</TableCell>
                  <TableCell>Champ destination</TableCell>
                  <TableCell>Transformation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getSourceFields().map((sourceField) => (
                  <TableRow key={sourceField}>
                    <TableCell>{sourceField}</TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={fieldMapping[sourceField] || ''}
                          onChange={(e) =>
                            handleFieldMappingChange(sourceField, e.target.value)
                          }
                        >
                          <MenuItem value="">-- Ignorer --</MenuItem>
                          {availableFields?.map((field) => (
                            <MenuItem key={field} value={field}>
                              {field}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={transformationRules[sourceField]?.type || ''}
                          onChange={(e) =>
                            handleTransformationChange(sourceField, e.target.value)
                          }
                          disabled={!fieldMapping[sourceField]}
                        >
                          <MenuItem value="">Aucune</MenuItem>
                          <MenuItem value="uppercase">MAJUSCULES</MenuItem>
                          <MenuItem value="lowercase">minuscules</MenuItem>
                          <MenuItem value="capitalize">Capitaliser</MenuItem>
                          <MenuItem value="strip">Enlever espaces</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="subtitle2" gutterBottom>
            Aperçu des données
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  {getSourceFields().map((field) => (
                    <TableCell key={field}>{field}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData?.map((row) => (
                  <TableRow key={row.row_number}>
                    <TableCell>{row.row_number}</TableCell>
                    {getSourceFields().map((field) => (
                      <TableCell key={field}>{row.data[field]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setActiveStep(0)}>Retour</Button>
        <Button
          variant="contained"
          onClick={handleStep2Submit}
          disabled={Object.keys(fieldMapping).length === 0}
          startIcon={<Settings />}
        >
          Configurer
        </Button>
      </Box>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configuration de l'import
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
            }
            label="Ignorer les doublons"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                disabled={!skipDuplicates}
              />
            }
            label="Mettre à jour les enregistrements existants"
          />
        </Grid>
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Résumé:</strong>
            </Typography>
            <Typography variant="body2">
              • {currentJob?.total_rows || 0} lignes à importer
            </Typography>
            <Typography variant="body2">
              • {Object.keys(fieldMapping).length} champs mappés
            </Typography>
            <Typography variant="body2">
              • Type: {getEntityTypeLabel(formData.entity_type)}
            </Typography>
          </Alert>
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setActiveStep(1)}>Retour</Button>
        <Button
          variant="contained"
          onClick={handleStep3Submit}
          disabled={loading}
          startIcon={<PlayArrow />}
          color="success"
        >
          Démarrer l'import
        </Button>
      </Box>
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Import en cours
      </Typography>
      {currentJob?.status === 'running' && (
        <>
          <LinearProgress
            variant="determinate"
            value={currentJob.progress_percentage}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Progression: {currentJob.processed_rows} / {currentJob.total_rows} lignes (
            {currentJob.progress_percentage.toFixed(1)}%)
          </Typography>
        </>
      )}
      {currentJob?.status === 'completed' && (
        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
          Import terminé avec succès!
        </Alert>
      )}
      {currentJob?.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erreur lors de l'import: {currentJob.error_message}
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Succès
              </Typography>
              <Typography variant="h4" color="success.main">
                {currentJob?.success_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Erreurs
              </Typography>
              <Typography variant="h4" color="error.main">
                {currentJob?.error_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Ignorés
              </Typography>
              <Typography variant="h4" color="warning.main">
                {currentJob?.skipped_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Typography variant="subtitle2" gutterBottom>
        Journal d'import
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Ligne</TableCell>
              <TableCell>Niveau</TableCell>
              <TableCell>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow key={index}>
                <TableCell>{log.row_number}</TableCell>
                <TableCell>
                  <Chip
                    label={log.level}
                    size="small"
                    color={
                      log.level === 'success'
                        ? 'success'
                        : log.level === 'error'
                        ? 'error'
                        : 'warning'
                    }
                  />
                </TableCell>
                <TableCell>{log.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {currentJob?.status === 'completed' && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={() => navigate('/migration/jobs')}>
            Voir tous les imports
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Assistant d'import de données
      </Typography>
      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {activeStep === 0 && renderStep1()}
          {activeStep === 1 && renderStep2()}
          {activeStep === 2 && renderStep3()}
          {activeStep === 3 && renderStep4()}
        </CardContent>
      </Card>
    </Box>
  );
}

export default MigrationWizard;
