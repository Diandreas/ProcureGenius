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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
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
  Pagination,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  PlayArrow,
  Stop,
  Autorenew,
  Warning,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchContracts,
  deleteContract,
  approveContract,
  activateContract,
  terminateContract,
} from '../../store/slices/contractsSlice';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function Contracts() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const { contracts, loading, totalCount } = useSelector((state) => state.contracts);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadContracts();
  }, [page, searchTerm, statusFilter, typeFilter]);

  const loadContracts = () => {
    const params = {
      page,
      search: searchTerm,
      status: statusFilter,
      contract_type: typeFilter,
    };
    dispatch(fetchContracts(params));
  };

  const handleMenuClick = (event, contract) => {
    setAnchorEl(event.currentTarget);
    setSelectedContract(contract);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleView = () => {
    navigate(`/contracts/${selectedContract.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    navigate(`/contracts/${selectedContract.id}/edit`);
    handleMenuClose();
  };

  const handleApprove = async () => {
    try {
      await dispatch(approveContract({ id: selectedContract.id, notes: '' })).unwrap();
      enqueueSnackbar('Contrat approuvé avec succès', { variant: 'success' });
      loadContracts();
    } catch (error) {
      enqueueSnackbar("Erreur lors de l'approbation", { variant: 'error' });
    }
    handleMenuClose();
  };

  const handleActivate = async () => {
    try {
      await dispatch(activateContract(selectedContract.id)).unwrap();
      enqueueSnackbar('Contrat activé avec succès', { variant: 'success' });
      loadContracts();
    } catch (error) {
      enqueueSnackbar("Erreur lors de l'activation", { variant: 'error' });
    }
    handleMenuClose();
  };

  const handleTerminate = async () => {
    try {
      await dispatch(terminateContract(selectedContract.id)).unwrap();
      enqueueSnackbar('Contrat résilié avec succès', { variant: 'success' });
      loadContracts();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la résiliation', { variant: 'error' });
    }
    handleMenuClose();
  };

  const handleRenew = () => {
    navigate(`/contracts/${selectedContract.id}/renew`);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      await dispatch(deleteContract(selectedContract.id)).unwrap();
      enqueueSnackbar('Contrat supprimé avec succès', { variant: 'success' });
      setDeleteDialogOpen(false);
      loadContracts();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    }
  };

  const getStatusChip = (status, isExpiringSoon, isExpired) => {
    if (isExpired) {
      return <Chip label="Expiré" color="error" size="small" />;
    }
    if (isExpiringSoon) {
      return <Chip label="Expire bientôt" color="warning" size="small" icon={<Warning />} />;
    }

    const statusConfig = {
      draft: { label: 'Brouillon', color: 'default' },
      pending_review: { label: 'En révision', color: 'info' },
      pending_approval: { label: 'En attente', color: 'warning' },
      approved: { label: 'Approuvé', color: 'success' },
      active: { label: 'Actif', color: 'primary' },
      expiring_soon: { label: 'Expire bientôt', color: 'warning' },
      expired: { label: 'Expiré', color: 'error' },
      terminated: { label: 'Résilié', color: 'error' },
      renewed: { label: 'Renouvelé', color: 'default' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1">
              Contrats
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/contracts/new')}
            >
              Nouveau Contrat
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, minWidth: 250 }}
            />

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Statut</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Statut"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="draft">Brouillon</MenuItem>
                <MenuItem value="active">Actif</MenuItem>
                <MenuItem value="expiring_soon">Expire bientôt</MenuItem>
                <MenuItem value="expired">Expiré</MenuItem>
                <MenuItem value="approved">Approuvé</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Type"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="purchase">Achat</MenuItem>
                <MenuItem value="service">Service</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="lease">Location</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Numéro</TableCell>
                      <TableCell>Titre</TableCell>
                      <TableCell>Fournisseur</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Début</TableCell>
                      <TableCell>Fin</TableCell>
                      <TableCell>Valeur</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                            Aucun contrat trouvé
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      contracts.map((contract) => (
                        <TableRow key={contract.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {contract.contract_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{contract.title}</Typography>
                          </TableCell>
                          <TableCell>{contract.supplier_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={
                                contract.contract_type === 'purchase'
                                  ? 'Achat'
                                  : contract.contract_type === 'service'
                                  ? 'Service'
                                  : contract.contract_type === 'maintenance'
                                  ? 'Maintenance'
                                  : contract.contract_type === 'lease'
                                  ? 'Location'
                                  : contract.contract_type
                              }
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {getStatusChip(
                              contract.status,
                              contract.is_expiring_soon,
                              contract.is_expired
                            )}
                          </TableCell>
                          <TableCell>{formatDate(contract.start_date)}</TableCell>
                          <TableCell>
                            {formatDate(contract.end_date)}
                            {contract.days_until_expiry !== null && contract.days_until_expiry >= 0 && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                ({contract.days_until_expiry} jours)
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {parseFloat(contract.total_value).toLocaleString()} {contract.currency}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuClick(e, contract)}
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalCount > 20 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={Math.ceil(totalCount / 20)}
                    page={page}
                    onChange={(e, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Menu contextuel */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          Voir les détails
        </MenuItem>
        {selectedContract?.status === 'draft' && (
          <>
            <MenuItem onClick={handleEdit}>
              <Edit fontSize="small" sx={{ mr: 1 }} />
              Modifier
            </MenuItem>
            <MenuItem onClick={handleApprove}>
              <CheckCircle fontSize="small" sx={{ mr: 1 }} />
              Approuver
            </MenuItem>
          </>
        )}
        {selectedContract?.status === 'approved' && (
          <MenuItem onClick={handleActivate}>
            <PlayArrow fontSize="small" sx={{ mr: 1 }} />
            Activer
          </MenuItem>
        )}
        {selectedContract?.status === 'active' && (
          <>
            <MenuItem onClick={handleRenew}>
              <Autorenew fontSize="small" sx={{ mr: 1 }} />
              Renouveler
            </MenuItem>
            <MenuItem onClick={handleTerminate}>
              <Stop fontSize="small" sx={{ mr: 1 }} />
              Résilier
            </MenuItem>
          </>
        )}
        {selectedContract?.status === 'draft' && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Supprimer
          </MenuItem>
        )}
      </Menu>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          Êtes-vous sûr de vouloir supprimer le contrat "{selectedContract?.contract_number}" ?
          Cette action est irréversible.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Contracts;
