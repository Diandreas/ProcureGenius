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
  Grid,
  Avatar,
  useMediaQuery,
  useTheme,
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
  Description,
  PlayCircle,
  CheckCircle,
  Lock,
  List,
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
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';

function SourcingEvents() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { events, loading, totalCount } = useSelector((state) => state.eSourcing);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [page, setPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [page, searchTerm, statusFilter, quickFilter]);

  const loadEvents = () => {
    const params = {
      page,
      search: searchTerm,
      status: quickFilter || statusFilter,
    };
    dispatch(fetchSourcingEvents(params));
  };

  const handleQuickFilterClick = (filterValue) => {
    if (quickFilter === filterValue) {
      setQuickFilter('');
    } else {
      setQuickFilter(filterValue);
    }
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

  // Statistiques
  const totalEvents = events.length;
  const draftEvents = events.filter(e => e.status === 'draft').length;
  const publishedEvents = events.filter(e => e.status === 'published').length;
  const activeEvents = events.filter(e => e.status === 'in_progress').length;
  const closedEvents = events.filter(e => e.status === 'closed').length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats Cards - Clickable Filters */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
          Événements de Sourcing
        </Typography>

        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
          {/* Brouillons */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('draft')}
              sx={{
                borderRadius: 2,
                bgcolor: 'grey.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'draft' ? 'grey.600' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'grey.600'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Description sx={{ fontSize: isMobile ? 20 : 24, color: 'grey.600' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="grey.700">
                      {draftEvents}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Brouillons
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Publiés */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('published')}
              sx={{
                borderRadius: 2,
                bgcolor: 'info.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'published' ? 'info.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'info.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Publish sx={{ fontSize: isMobile ? 20 : 24, color: 'info.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="info.main">
                      {publishedEvents}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Publiés
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* En cours */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('in_progress')}
              sx={{
                borderRadius: 2,
                bgcolor: 'success.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'in_progress' ? 'success.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'success.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PlayCircle sx={{ fontSize: isMobile ? 20 : 24, color: 'success.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="success.main">
                      {activeEvents}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      En cours
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Clôturés */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('closed')}
              sx={{
                borderRadius: 2,
                bgcolor: 'grey.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'closed' ? 'grey.600' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'grey.600'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Lock sx={{ fontSize: isMobile ? 20 : 24, color: 'grey.600' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="grey.700">
                      {closedEvents}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Clôturés
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Tous */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('')}
              sx={{
                borderRadius: 2,
                bgcolor: 'primary.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === '' ? 'primary.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <List sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="primary.main">
                      {totalEvents}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Tous
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter Indicator */}
        {quickFilter && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Filtre actif:</Typography>
            <Chip
              label={
                quickFilter === 'draft' ? 'Brouillons' :
                quickFilter === 'published' ? 'Publiés' :
                quickFilter === 'in_progress' ? 'En cours' :
                quickFilter === 'closed' ? 'Clôturés' : ''
              }
              onDelete={() => setQuickFilter('')}
              color={
                quickFilter === 'draft' ? 'default' :
                quickFilter === 'published' ? 'info' :
                quickFilter === 'in_progress' ? 'success' :
                quickFilter === 'closed' ? 'default' : 'primary'
              }
              size="small"
            />
          </Box>
        )}
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
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
            <LoadingState message="Chargement des événements de sourcing..." />
          ) : events.length === 0 ? (
            <EmptyState
              title="Aucun événement de sourcing"
              description="Créez votre premier événement RFQ pour comparer les offres de vos fournisseurs et obtenir les meilleurs prix."
              mascotPose="thinking"
              actionLabel="Nouvel événement"
              onAction={() => navigate('/e-sourcing/events/new')}
            />
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
                    {events.map((event) => (
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
                    }
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
