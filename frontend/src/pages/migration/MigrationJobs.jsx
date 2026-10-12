import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  LinearProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Add,
  Search,
  Visibility,
  CloudUpload,
  CheckCircle,
  Error,
  Cancel,
  HourglassEmpty,
} from '@mui/icons-material';
import { fetchMigrationJobs } from '../../store/slices/migrationSlice';

function MigrationJobs() {
  const { t } = useTranslation(['dataImport', 'common']);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { jobs, loading, totalCount } = useSelector((state) => state.migration);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    entity_type: '',
  });

  useEffect(() => {
    dispatch(fetchMigrationJobs(filters));
  }, [dispatch, filters]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'cancelled':
        return <Cancel color="warning" />;
      case 'running':
        return <HourglassEmpty color="primary" />;
      default:
        return <CloudUpload color="action" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'warning';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    const labels = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    return labels.includes(status) ? t(`dataImport:status.${status}`) : status;
  };

  const getEntityTypeLabel = (type) => {
    const labels = ['suppliers', 'products', 'clients', 'purchase_orders', 'invoices'];
    return labels.includes(type) ? t(`dataImport:entities.${type}`) : type;
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('dataImport:jobs.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/settings/import')}
        >
          {t('dataImport:actions.newImport')}
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder={t('dataImport:jobs.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('dataImport:jobs.status')}</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label={t('dataImport:jobs.status')}
                >
                  <MenuItem value="">{t('dataImport:jobs.all')}</MenuItem>
                  <MenuItem value="pending">{t('dataImport:status.pending')}</MenuItem>
                  <MenuItem value="running">{t('dataImport:status.running')}</MenuItem>
                  <MenuItem value="completed">{t('dataImport:status.completed')}</MenuItem>
                  <MenuItem value="failed">{t('dataImport:status.failed')}</MenuItem>
                  <MenuItem value="cancelled">{t('dataImport:status.cancelled')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('dataImport:jobs.entityType')}</InputLabel>
                <Select
                  value={filters.entity_type}
                  onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                  label={t('dataImport:jobs.entityType')}
                >
                  <MenuItem value="">{t('dataImport:jobs.all')}</MenuItem>
                  <MenuItem value="suppliers">{t('dataImport:entities.suppliers')}</MenuItem>
                  <MenuItem value="products">{t('dataImport:entities.products')}</MenuItem>
                  <MenuItem value="clients">{t('dataImport:entities.clients')}</MenuItem>
                  <MenuItem value="purchase_orders">{t('dataImport:entities.purchase_orders')}</MenuItem>
                  <MenuItem value="invoices">{t('dataImport:entities.invoices')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('dataImport:jobs.columns.name')}</TableCell>
              <TableCell>{t('dataImport:jobs.columns.type')}</TableCell>
              <TableCell>{t('dataImport:jobs.columns.status')}</TableCell>
              <TableCell>{t('dataImport:jobs.columns.progress')}</TableCell>
              <TableCell align="right">{t('dataImport:results.success')}</TableCell>
              <TableCell align="right">{t('dataImport:results.errors')}</TableCell>
              <TableCell align="right">{t('dataImport:results.skipped')}</TableCell>
              <TableCell>{t('dataImport:jobs.columns.createdAt')}</TableCell>
              <TableCell align="center">{t('dataImport:jobs.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {t('dataImport:jobs.empty')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>{job.name}</TableCell>
                  <TableCell>{getEntityTypeLabel(job.entity_type)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(job.status)}
                      <Chip
                        label={getStatusLabel(job.status)}
                        size="small"
                        color={getStatusColor(job.status)}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={job.progress_percentage}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {job.progress_percentage.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main">
                      {job.success_count}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="error.main">
                      {job.error_count}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      {job.skipped_count}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(job.created_at).toLocaleString('fr-CA')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/migration/jobs/${job.id}`)}
                      title={t('dataImport:jobs.viewDetails')}
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('dataImport:jobs.total', { count: totalCount })}
        </Typography>
      </Box>
    </Box>
  );
}

export default MigrationJobs;
