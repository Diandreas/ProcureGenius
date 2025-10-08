import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
    const labels = {
      pending: 'En attente',
      running: 'En cours',
      completed: 'Terminé',
      failed: 'Échoué',
      cancelled: 'Annulé',
    };
    return labels[status] || status;
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

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Imports de données</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/migration/wizard')}
        >
          Nouvel import
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Rechercher..."
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
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="pending">En attente</MenuItem>
                  <MenuItem value="running">En cours</MenuItem>
                  <MenuItem value="completed">Terminé</MenuItem>
                  <MenuItem value="failed">Échoué</MenuItem>
                  <MenuItem value="cancelled">Annulé</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Type d'entité</InputLabel>
                <Select
                  value={filters.entity_type}
                  onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                  label="Type d'entité"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="suppliers">Fournisseurs</MenuItem>
                  <MenuItem value="products">Produits</MenuItem>
                  <MenuItem value="clients">Clients</MenuItem>
                  <MenuItem value="purchase_orders">Bons de commande</MenuItem>
                  <MenuItem value="invoices">Factures</MenuItem>
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
              <TableCell>Nom</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Progression</TableCell>
              <TableCell align="right">Succès</TableCell>
              <TableCell align="right">Erreurs</TableCell>
              <TableCell align="right">Ignorés</TableCell>
              <TableCell>Date de création</TableCell>
              <TableCell align="center">Actions</TableCell>
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
                    Aucun import trouvé. Cliquez sur "Nouvel import" pour commencer.
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
                      title="Voir les détails"
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
          {totalCount} import{totalCount > 1 ? 's' : ''} au total
        </Typography>
      </Box>
    </Box>
  );
}

export default MigrationJobs;
