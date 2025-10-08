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
  Stack,
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
  Publish,
  Close,
  Cancel,
  Assessment,
  CompareArrows,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSourcingEvents,
  deleteSourcingEvent,
  publishSourcingEvent,
  closeSourcingEvent,
  cancelSourcingEvent,
} from '../../store/slices/eSourcingSlice';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function SourcingEvents() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const { events, loading, totalCount } = useSelector((state) => state.eSourcing);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [page, searchTerm, statusFilter]);

  const loadEvents = () => {
    const params = {
      page,
      search: searchTerm,
      status: statusFilter,
    };
    dispatch(fetchSourcingEvents(params));
  };

  const handleMenuClick = (event, sourcingEvent) => {
    setAnchorEl(event.currentTarget);
    setSelectedEvent(sourcingEvent);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleView = () => {
    navigate(`/e-sourcing/events/${selectedEvent.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    navigate(`/e-sourcing/events/${selectedEvent.id}/edit`);
    handleMenuClose();
  };

  const handlePublish = async () => {
    try {
      await dispatch(publishSourcingEvent(selectedEvent.id)).unwrap();
      enqueueSnackbar('Événement publié avec succès', { variant: 'success' });
      loadEvents();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la publication', { variant: 'error' });
    }
    handleMenuClose();
  };

  const handleClose = async () => {
    try {
      await dispatch(closeSourcingEvent(selectedEvent.id)).unwrap();
      enqueueSnackbar('Événement clôturé avec succès', { variant: 'success' });
      loadEvents();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la clôture', { variant: 'error' });
    }
    handleMenuClose();
  };

  const handleCancel = async () => {
    try {
      await dispatch(cancelSourcingEvent(selectedEvent.id)).unwrap();
      enqueueSnackbar('Événement annulé avec succès', { variant: 'success' });
      loadEvents();
    } catch (error) {
      enqueueSnackbar("Erreur lors de l'annulation", { variant: 'error' });
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      await dispatch(deleteSourcingEvent(selectedEvent.id)).unwrap();
      enqueueSnackbar('Événement supprimé avec succès', { variant: 'success' });
      setDeleteDialogOpen(false);
      loadEvents();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    }
  };

  const handleCompareBids = () => {
    navigate(`/e-sourcing/events/${selectedEvent.id}/compare`);
    handleMenuClose();
  };

  const handleStatistics = () => {
    navigate(`/e-sourcing/events/${selectedEvent.id}/statistics`);
    handleMenuClose();
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'default' },
      published: { label: 'Publié', color: 'info' },
      in_progress: { label: 'En cours', color: 'primary' },
      evaluation: { label: 'Évaluation', color: 'warning' },
      awarded: { label: 'Attribué', color: 'success' },
      cancelled: { label: 'Annulé', color: 'error' },
      closed: { label: 'Clôturé', color: 'default' },
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
              Événements de Sourcing
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/e-sourcing/events/new')}
            >
              Nouvel Événement
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
              sx={{ flexGrow: 1 }}
            />

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Statut</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Statut"
                startAdornment={<FilterList sx={{ ml: 1, mr: -0.5 }} />}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="draft">Brouillon</MenuItem>
                <MenuItem value="published">Publié</MenuItem>
                <MenuItem value="in_progress">En cours</MenuItem>
                <MenuItem value="evaluation">Évaluation</MenuItem>
                <MenuItem value="awarded">Attribué</MenuItem>
                <MenuItem value="cancelled">Annulé</MenuItem>
                <MenuItem value="closed">Clôturé</MenuItem>
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
                      <TableCell>Statut</TableCell>
                      <TableCell>Date limite</TableCell>
                      <TableCell>Budget estimé</TableCell>
                      <TableCell align="center">Invitations</TableCell>
                      <TableCell align="center">Soumissions</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                            Aucun événement trouvé
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((event) => (
                        <TableRow key={event.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {event.event_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{event.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Par {event.created_by_name}
                            </Typography>
                          </TableCell>
                          <TableCell>{getStatusChip(event.status)}</TableCell>
                          <TableCell>{formatDate(event.submission_deadline)}</TableCell>
                          <TableCell>
                            {event.estimated_budget
                              ? `${parseFloat(event.estimated_budget).toLocaleString()} $`
                              : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={event.invitations_count || 0} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={event.bids_count || 0} size="small" color="primary" />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuClick(e, event)}
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
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          Voir les détails
        </MenuItem>
        {selectedEvent?.status === 'draft' && (
          <>
            <MenuItem onClick={handleEdit}>
              <Edit fontSize="small" sx={{ mr: 1 }} />
              Modifier
            </MenuItem>
            <MenuItem onClick={handlePublish}>
              <Publish fontSize="small" sx={{ mr: 1 }} />
              Publier
            </MenuItem>
          </>
        )}
        {selectedEvent?.status !== 'draft' && (
          <>
            <MenuItem onClick={handleCompareBids}>
              <CompareArrows fontSize="small" sx={{ mr: 1 }} />
              Comparer les soumissions
            </MenuItem>
            <MenuItem onClick={handleStatistics}>
              <Assessment fontSize="small" sx={{ mr: 1 }} />
              Statistiques
            </MenuItem>
          </>
        )}
        {['published', 'in_progress', 'evaluation'].includes(selectedEvent?.status) && (
          <MenuItem onClick={handleClose}>
            <Close fontSize="small" sx={{ mr: 1 }} />
            Clôturer
          </MenuItem>
        )}
        {selectedEvent?.status !== 'awarded' && selectedEvent?.status !== 'closed' && (
          <MenuItem onClick={handleCancel}>
            <Cancel fontSize="small" sx={{ mr: 1 }} />
            Annuler
          </MenuItem>
        )}
        {selectedEvent?.status === 'draft' && (
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
          Êtes-vous sûr de vouloir supprimer l'événement "{selectedEvent?.event_number}" ?
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

export default SourcingEvents;
