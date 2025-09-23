import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Chip,
  Avatar,
  Rating,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Business,
  Email,
  Phone,
  LocationOn,
  Download,
  Upload,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { suppliersAPI } from '../../services/api';
import { parseRating } from '../../utils/formatters';
import { getStatusColor, getStatusLabel } from '../../utils/formatters';

function Suppliers() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [page, searchTerm, statusFilter]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        search: searchTerm,
        status: statusFilter,
      };
      const response = await suppliersAPI.list(params);
      setSuppliers(response.data.results || response.data);
      const count = response.data.count || response.data.length;
      setTotalPages(Math.ceil(count / 20));
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement des fournisseurs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event, supplier) => {
    setAnchorEl(event.currentTarget);
    setSelectedSupplier(supplier);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    navigate(`/suppliers/${selectedSupplier.id}/edit`);
    handleMenuClose();
  };

  const handleDelete = async () => {
    try {
      await suppliersAPI.delete(selectedSupplier.id);
      enqueueSnackbar('Fournisseur supprimé avec succès', { variant: 'success' });
      fetchSuppliers();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      handleMenuClose();
    }
  };

  const handleToggleStatus = async (supplier) => {
    try {
      await suppliersAPI.toggleStatus(supplier.id);
      enqueueSnackbar('Statut modifié avec succès', { variant: 'success' });
      fetchSuppliers();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la modification du statut', { variant: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const response = await suppliersAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'fournisseurs.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      enqueueSnackbar('Export réussi', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'export', { variant: 'error' });
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await suppliersAPI.import(formData);
      enqueueSnackbar('Import réussi', { variant: 'success' });
      fetchSuppliers();
      setImportDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'import', { variant: 'error' });
    }
  };

  if (loading && suppliers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Fournisseurs
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setImportDialogOpen(true)}
          >
            Importer
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Exporter
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/suppliers/new')}
          >
            Nouveau fournisseur
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Rechercher un fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="active">Actif</MenuItem>
                  <MenuItem value="pending">En attente</MenuItem>
                  <MenuItem value="inactive">Inactif</MenuItem>
                  <MenuItem value="blocked">Bloqué</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                }}
              >
                Réinitialiser
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      {suppliers.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <Business sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Aucun fournisseur trouvé
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Commencez par ajouter votre premier fournisseur
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/suppliers/new')}
            >
              Ajouter un fournisseur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={3}>
            {suppliers.map((supplier) => (
              <Grid item xs={12} md={6} lg={4} key={supplier.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {supplier.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="div">
                            {supplier.name}
                          </Typography>
                          <Chip
                            label={getStatusLabel(supplier.status)}
                            color={getStatusColor(supplier.status)}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, supplier)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      {supplier.contact_person && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Contact: {supplier.contact_person}
                        </Typography>
                      )}
                      
                      {supplier.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2">{supplier.email}</Typography>
                        </Box>
                      )}
                      
                      {supplier.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2">{supplier.phone}</Typography>
                        </Box>
                      )}
                      
                      {supplier.city && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">
                            {supplier.city}{supplier.province && `, ${supplier.province}`}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {parseRating(supplier.rating) > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Rating value={parseRating(supplier.rating)} readOnly size="small" />
                        <Typography variant="body2" color="text.secondary">
                          ({parseRating(supplier.rating).toFixed(1)})
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {supplier.is_local && (
                        <Chip label="Local" size="small" color="success" />
                      )}
                      {supplier.is_minority_owned && (
                        <Chip label="Minorité" size="small" color="info" />
                      )}
                      {supplier.is_woman_owned && (
                        <Chip label="Femme" size="small" color="secondary" />
                      )}
                      {supplier.is_indigenous && (
                        <Chip label="Autochtone" size="small" color="warning" />
                      )}
                    </Box>
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(`/suppliers/${supplier.id}`)}
                    >
                      Voir détails
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Modifier
        </MenuItem>
        <MenuItem 
          onClick={() => handleToggleStatus(selectedSupplier)}
        >
          {selectedSupplier?.status === 'active' ? 'Désactiver' : 'Activer'}
        </MenuItem>
        <MenuItem 
          onClick={() => setDeleteDialogOpen(true)}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Supprimer
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le fournisseur "{selectedSupplier?.name}" ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
        <DialogTitle>Importer des fournisseurs</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Le fichier CSV doit contenir les colonnes : name, contact_person, email, phone, address, city, status
          </Alert>
          <input
            type="file"
            accept=".csv"
            onChange={handleImport}
            style={{ display: 'none' }}
            id="import-file"
          />
          <label htmlFor="import-file">
            <Button variant="contained" component="span" fullWidth>
              Sélectionner un fichier CSV
            </Button>
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Annuler</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Suppliers;