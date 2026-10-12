import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
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
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

const steps = ['upload', 'previewMapping', 'configuration', 'import'];

function MigrationWizard() {
  const { t } = useTranslation(['dataImport', 'common']);
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
    const labels = ['suppliers', 'products', 'clients', 'purchase_orders', 'invoices'];
    return labels.includes(type) ? t(`dataImport:entities.${type}`) : type;
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('dataImport:migration.step1.title')}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label={t('dataImport:migration.step1.importName')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('dataImport:migration.step1.sourceType')}</InputLabel>
            <Select
              value={formData.source_type}
              onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
              label={t('dataImport:migration.step1.sourceType')}
            >
              <MenuItem value="excel_csv">Excel / CSV</MenuItem>
              <MenuItem value="quickbooks" disabled>
                {t('dataImport:migration.step1.quickbooksSoon')}
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('dataImport:migration.step1.entityType')}</InputLabel>
            <Select
              value={formData.entity_type}
              onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
              label={t('dataImport:migration.step1.entityType')}
            >
              <MenuItem value="suppliers">{t('dataImport:entities.suppliers')}</MenuItem>
              <MenuItem value="products">{t('dataImport:entities.products')}</MenuItem>
              <MenuItem value="clients">{t('dataImport:entities.clients')}</MenuItem>
              <MenuItem value="purchase_orders">{t('dataImport:entities.purchase_orders')}</MenuItem>
              <MenuItem value="invoices">{t('dataImport:entities.invoices')}</MenuItem>
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
            {formData.source_file ? formData.source_file.name : t('dataImport:migration.step1.selectFile')}
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
            label={t('dataImport:migration.step1.hasHeaders')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('dataImport:migration.step1.delimiter')}
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
          {t('dataImport:migration.step1.generatePreview')}
        </Button>
      </Box>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('dataImport:migration.step2.title')}
      </Typography>
      {loading ? (
        <LoadingState message={t('dataImport:migration.step2.analyzing')} size={60} />
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('dataImport:migration.step2.rowsShown', { shown: previewData?.length || 0, total: currentJob?.total_rows || 0 })}
          </Alert>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            {t('dataImport:migration.step2.fieldMapping')}
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('dataImport:migration.step2.sourceField')}</TableCell>
                  <TableCell>{t('dataImport:migration.step2.destField')}</TableCell>
                  <TableCell>{t('dataImport:migration.step2.transformation')}</TableCell>
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
                          <MenuItem value="">{t('dataImport:migration.step2.ignore')}</MenuItem>
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
                          <MenuItem value="">{t('dataImport:migration.step2.transforms.none')}</MenuItem>
                          <MenuItem value="uppercase">{t('dataImport:migration.step2.transforms.uppercase')}</MenuItem>
                          <MenuItem value="lowercase">{t('dataImport:migration.step2.transforms.lowercase')}</MenuItem>
                          <MenuItem value="capitalize">{t('dataImport:migration.step2.transforms.capitalize')}</MenuItem>
                          <MenuItem value="strip">{t('dataImport:migration.step2.transforms.strip')}</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="subtitle2" gutterBottom>
            {t('dataImport:migration.step2.dataPreview')}
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
        <Button onClick={() => setActiveStep(0)}>{t('dataImport:actions.back')}</Button>
        <Button
          variant="contained"
          onClick={handleStep2Submit}
          disabled={Object.keys(fieldMapping).length === 0}
          startIcon={<Settings />}
        >
          {t('dataImport:migration.step2.configure')}
        </Button>
      </Box>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('dataImport:migration.step3.title')}
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
            label={t('dataImport:migration.step3.skipDuplicates')}
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
            label={t('dataImport:migration.step3.updateExisting')}
          />
        </Grid>
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>{t('dataImport:migration.step3.summary')}</strong>
            </Typography>
            <Typography variant="body2">
              • {t('dataImport:migration.step3.rowsToImport', { rows: currentJob?.total_rows || 0 })}
            </Typography>
            <Typography variant="body2">
              • {t('dataImport:migration.step3.mappedFields', { fields: Object.keys(fieldMapping).length })}
            </Typography>
            <Typography variant="body2">
              • {t('dataImport:migration.step3.type', { type: getEntityTypeLabel(formData.entity_type) })}
            </Typography>
          </Alert>
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setActiveStep(1)}>{t('dataImport:actions.back')}</Button>
        <Button
          variant="contained"
          onClick={handleStep3Submit}
          disabled={loading}
          startIcon={<PlayArrow />}
          color="success"
        >
          {t('dataImport:migration.step3.start')}
        </Button>
      </Box>
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('dataImport:migration.step4.title')}
      </Typography>
      {currentJob?.status === 'running' && (
        <>
          <LinearProgress
            variant="determinate"
            value={currentJob.progress_percentage}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('dataImport:migration.step4.progress', {
              processed: currentJob.processed_rows,
              total: currentJob.total_rows,
              percent: currentJob.progress_percentage.toFixed(1),
            })}
          </Typography>
        </>
      )}
      {currentJob?.status === 'completed' && (
        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
          {t('dataImport:migration.step4.completed')}
        </Alert>
      )}
      {currentJob?.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('dataImport:migration.step4.failed', { message: currentJob.error_message })}
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('dataImport:results.success')}
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
                {t('dataImport:results.errors')}
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
                {t('dataImport:results.skipped')}
              </Typography>
              <Typography variant="h4" color="warning.main">
                {currentJob?.skipped_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Typography variant="subtitle2" gutterBottom>
        {t('dataImport:migration.step4.log')}
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>{t('dataImport:migration.step4.columns.row')}</TableCell>
              <TableCell>{t('dataImport:migration.step4.columns.level')}</TableCell>
              <TableCell>{t('dataImport:migration.step4.columns.message')}</TableCell>
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
            {t('dataImport:migration.step4.viewAll')}
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('dataImport:migration.title')}
      </Typography>
      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((stepKey) => (
              <Step key={stepKey}>
                <StepLabel>{t(`dataImport:migration.steps.${stepKey}`)}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {error && (
            <ErrorState
              title={t('dataImport:migration.errorTitle')}
              message={error}
              showHome={false}
              onRetry={() => window.location.reload()}
            />
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
