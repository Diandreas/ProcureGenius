import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Publish,
  Close,
  Cancel,
  CompareArrows,
  Assessment,
  Send,
  Visibility,
  ContentCopy,
  Share,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSourcingEvent,
  publishSourcingEvent,
  closeSourcingEvent,
  cancelSourcingEvent,
} from '../../store/slices/eSourcingSlice';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function SourcingEventDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const { currentEvent, loading } = useSelector((state) => state.eSourcing);

  useEffect(() => {
    dispatch(fetchSourcingEvent(id));
  }, [id, dispatch]);

  const handlePublish = async () => {
    try {
      await dispatch(publishSourcingEvent(id)).unwrap();
      enqueueSnackbar('Événement publié avec succès', { variant: 'success' });
      dispatch(fetchSourcingEvent(id));
    } catch (error) {
      enqueueSnackbar('Erreur lors de la publication', { variant: 'error' });
    }
  };

  const handleClose = async () => {
    try {
      await dispatch(closeSourcingEvent(id)).unwrap();
      enqueueSnackbar('Événement clôturé avec succès', { variant: 'success' });
      dispatch(fetchSourcingEvent(id));
    } catch (error) {
      enqueueSnackbar('Erreur lors de la clôture', { variant: 'error' });
    }
  };

  const handleCancel = async () => {
    try {
      await dispatch(cancelSourcingEvent(id)).unwrap();
      enqueueSnackbar('Événement annulé avec succès', { variant: 'success' });
      dispatch(fetchSourcingEvent(id));
    } catch (error) {
      enqueueSnackbar("Erreur lors de l'annulation", { variant: 'error' });
    }
  };

  const handleCopyLink = (publicUrl) => {
    navigator.clipboard.writeText(publicUrl);
    enqueueSnackbar('Lien copié dans le presse-papiers', { variant: 'success' });
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
    return <Chip label={config.label} color={config.color} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  if (loading || !currentEvent) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/e-sourcing/events')}
        sx={{ mb: 2 }}
      >
        Retour à la liste
      </Button>

      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" component="h1" gutterBottom>
                    {currentEvent.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentEvent.event_number} • Créé par {currentEvent.created_by_name}
                  </Typography>
                </Box>
                <Box>{getStatusChip(currentEvent.status)}</Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Lien public de partage */}
              {currentEvent.public_url && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    🔗 Lien public de l'événement
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Partagez ce lien avec n'importe quel fournisseur pour recevoir des offres :
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        p: 1,
                        bgcolor: 'white',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {currentEvent.public_url}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={() => handleCopyLink(currentEvent.public_url)}
                    >
                      Copier
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Share />}
                      onClick={() => window.open(currentEvent.public_url, '_blank')}
                    >
                      Ouvrir
                    </Button>
                  </Stack>
                </Box>
              )}

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {currentEvent.status === 'draft' && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => navigate(`/e-sourcing/events/${id}/edit`)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Publish />}
                      onClick={handlePublish}
                    >
                      Publier
                    </Button>
                  </>
                )}

                {currentEvent.status !== 'draft' && (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<CompareArrows />}
                      onClick={() => navigate(`/e-sourcing/events/${id}/compare`)}
                    >
                      Comparer les soumissions
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Assessment />}
                      onClick={() => navigate(`/e-sourcing/events/${id}/statistics`)}
                    >
                      Statistiques
                    </Button>
                  </>
                )}

                {['published', 'in_progress', 'evaluation'].includes(currentEvent.status) && (
                  <Button
                    variant="outlined"
                    startIcon={<Close />}
                    onClick={handleClose}
                  >
                    Clôturer
                  </Button>
                )}

                {currentEvent.status !== 'awarded' && currentEvent.status !== 'closed' && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                  >
                    Annuler
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations générales */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {currentEvent.description}
              </Typography>

              {currentEvent.requirements && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Exigences
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-line' }}>
                    {currentEvent.requirements}
                  </Typography>
                </>
              )}

              {currentEvent.terms_and_conditions && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Termes et conditions
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-line' }}>
                    {currentEvent.terms_and_conditions}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Informations clés */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations clés
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Date limite de soumission
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(currentEvent.submission_deadline)}
                </Typography>
              </Box>

              {currentEvent.evaluation_deadline && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Date limite d'évaluation
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatDateOnly(currentEvent.evaluation_deadline)}
                  </Typography>
                </Box>
              )}

              {currentEvent.estimated_budget && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Budget estimé
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {parseFloat(currentEvent.estimated_budget).toLocaleString()} $
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Fournisseurs invités
                </Typography>
                <Typography variant="h4" color="primary">
                  {currentEvent.invitations?.length || 0}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Soumissions reçues
                </Typography>
                <Typography variant="h4" color="success.main">
                  {currentEvent.bids?.length || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Invitations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Fournisseurs invités ({currentEvent.invitations?.length || 0})
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fournisseur</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Envoyé le</TableCell>
                      <TableCell>Soumission</TableCell>
                      <TableCell align="right">Lien de partage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentEvent.invitations?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            Aucune invitation
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentEvent.invitations?.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell>{invitation.supplier_name}</TableCell>
                          <TableCell>{invitation.supplier_email}</TableCell>
                          <TableCell>
                            <Chip
                              label={
                                invitation.status === 'sent'
                                  ? 'Envoyé'
                                  : invitation.status === 'viewed'
                                  ? 'Vu'
                                  : invitation.status === 'accepted'
                                  ? 'Accepté'
                                  : invitation.status === 'declined'
                                  ? 'Refusé'
                                  : 'En attente'
                              }
                              size="small"
                              color={
                                invitation.status === 'accepted'
                                  ? 'success'
                                  : invitation.status === 'declined'
                                  ? 'error'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{formatDate(invitation.sent_at)}</TableCell>
                          <TableCell>
                            {invitation.has_bid ? (
                              <Chip label="Soumis" color="success" size="small" />
                            ) : (
                              <Chip label="En attente" size="small" />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Copier le lien">
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopyLink(invitation.public_url)}
                                  color="primary"
                                >
                                  <ContentCopy fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Ouvrir le lien">
                                <IconButton
                                  size="small"
                                  onClick={() => window.open(invitation.public_url, '_blank')}
                                  color="primary"
                                >
                                  <Share fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Soumissions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Soumissions reçues ({currentEvent.bids?.length || 0})
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fournisseur</TableCell>
                      <TableCell>Montant total</TableCell>
                      <TableCell>Délai (jours)</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Soumis le</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentEvent.bids?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            Aucune soumission
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentEvent.bids?.map((bid) => (
                        <TableRow key={bid.id}>
                          <TableCell>{bid.supplier_name}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {parseFloat(bid.total_amount).toLocaleString()} $
                            </Typography>
                          </TableCell>
                          <TableCell>{bid.delivery_time_days || '-'}</TableCell>
                          <TableCell>
                            {bid.evaluation_score ? `${bid.evaluation_score}/100` : '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                bid.status === 'submitted'
                                  ? 'Soumis'
                                  : bid.status === 'under_review'
                                  ? 'En révision'
                                  : bid.status === 'shortlisted'
                                  ? 'Présélectionné'
                                  : bid.status === 'awarded'
                                  ? 'Retenu'
                                  : bid.status === 'rejected'
                                  ? 'Rejeté'
                                  : bid.status
                              }
                              size="small"
                              color={
                                bid.status === 'awarded'
                                  ? 'success'
                                  : bid.status === 'rejected'
                                  ? 'error'
                                  : bid.status === 'shortlisted'
                                  ? 'warning'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{formatDate(bid.submitted_at)}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Voir les détails">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/e-sourcing/bids/${bid.id}`)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SourcingEventDetail;
