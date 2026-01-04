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
import { useTranslation } from 'react-i18next';
import LoadingState from '../../components/LoadingState';

function SourcingEventDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['eSourcing', 'common']);

  const { currentEvent, loading } = useSelector((state) => state.eSourcing);

  useEffect(() => {
    dispatch(fetchSourcingEvent(id));
  }, [id, dispatch]);

  const handlePublish = async () => {
    try {
      await dispatch(publishSourcingEvent(id)).unwrap();
      enqueueSnackbar(t('eSourcing:messages.publishSuccess'), { variant: 'success' });
      dispatch(fetchSourcingEvent(id));
    } catch (error) {
      enqueueSnackbar(t('eSourcing:messages.publishError'), { variant: 'error' });
    }
  };

  const handleClose = async () => {
    try {
      await dispatch(closeSourcingEvent(id)).unwrap();
      enqueueSnackbar(t('eSourcing:messages.closeSuccess'), { variant: 'success' });
      dispatch(fetchSourcingEvent(id));
    } catch (error) {
      enqueueSnackbar(t('eSourcing:messages.closeError'), { variant: 'error' });
    }
  };

  const handleCancel = async () => {
    try {
      await dispatch(cancelSourcingEvent(id)).unwrap();
      enqueueSnackbar(t('eSourcing:messages.cancelSuccess'), { variant: 'success' });
      dispatch(fetchSourcingEvent(id));
    } catch (error) {
      enqueueSnackbar(t('eSourcing:messages.cancelError'), { variant: 'error' });
    }
  };

  const handleCopyLink = (publicUrl) => {
    navigator.clipboard.writeText(publicUrl);
    enqueueSnackbar(t('eSourcing:messages.linkCopied'), { variant: 'success' });
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      draft: { label: t('eSourcing:status.draft'), color: 'default' },
      published: { label: t('eSourcing:status.published'), color: 'info' },
      in_progress: { label: t('eSourcing:status.in_progress'), color: 'primary' },
      evaluation: { label: t('eSourcing:status.evaluation'), color: 'warning' },
      awarded: { label: t('eSourcing:status.awarded'), color: 'success' },
      cancelled: { label: t('eSourcing:status.cancelled'), color: 'error' },
      closed: { label: t('eSourcing:status.closed'), color: 'default' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} />;
  };

  const getInvitationStatusLabel = (status) => {
    const labels = {
      sent: t('eSourcing:bidStatus.sent'),
      viewed: t('eSourcing:bidStatus.viewed'),
      accepted: t('eSourcing:bidStatus.accepted'),
      declined: t('eSourcing:bidStatus.declined'),
    };
    return labels[status] || t('eSourcing:bidStatus.pending');
  };

  const getBidStatusLabel = (status) => {
    const labels = {
      submitted: t('eSourcing:bidStatus.submitted'),
      under_review: t('eSourcing:bidStatus.under_review'),
      shortlisted: t('eSourcing:bidStatus.shortlisted'),
      awarded: t('eSourcing:bidStatus.awarded'),
      rejected: t('eSourcing:bidStatus.rejected'),
    };
    return labels[status] || status;
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
    return <LoadingState message={t('eSourcing:messages.loading', 'Chargement de l\'événement...')} />;
  }

  return (
    <Box sx={{
      p: { xs: 0, sm: 2, md: 3 },
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/e-sourcing/events')}
          sx={{ mb: 2 }}
        >
          {t('common:backToList')}
        </Button>
      </Box>

      {/* Actions Mobile - Style mobile app compact */}
      <Box sx={{
        mb: 1.5,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 2,
        py: 1
      }}>
        <Tooltip title={t('common:backToList')}>
          <IconButton
            onClick={() => navigate('/e-sourcing/events')}
            size="small"
            sx={{
              bgcolor: 'grey.50',
              color: 'grey.main',
              width: 36,
              height: 36,
              borderRadius: 2,
              '&:hover': {
                bgcolor: 'grey.main',
                color: 'white',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Typography
          variant="h6"
          noWrap
          sx={{
            flex: 1,
            mx: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {currentEvent.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={t('eSourcing:actions.editEvent')}>
            <IconButton
              onClick={() => navigate(`/e-sourcing/events/${id}/edit`)}
              size="small"
              sx={{
                bgcolor: 'primary.50',
                color: 'primary.main',
                width: 36,
                height: 36,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <Edit sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          {currentEvent.status === 'draft' && (
            <Tooltip title={t('eSourcing:actions.publishEvent')}>
              <IconButton
                onClick={handlePublish}
                size="small"
                sx={{
                  bgcolor: 'success.50',
                  color: 'success.main',
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'success.main',
                    color: 'white',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <Publish sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box sx={{ px: isMobile ? 2 : 0 }}>
        <Grid container spacing={isMobile ? 1.5 : 3}>
          {/* En-tête - Style mobile app */}
          <Grid item xs={12}>
            <Card sx={{
              borderRadius: isMobile ? 2.5 : 2,
              boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
              backdropFilter: isMobile ? 'blur(10px)' : 'none',
              border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: isMobile ? 'translateY(-1px)' : 'none',
                boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.12)' : 'none'
              }
            }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" component="h1" gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
                    {currentEvent.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                    {currentEvent.event_number} • {t('eSourcing:labels.createdBy')} {currentEvent.created_by_name}
                  </Typography>
                </Box>
                <Box>{getStatusChip(currentEvent.status)}</Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Lien public de partage */}
              {currentEvent.public_url && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    🔗 {t('eSourcing:labels.publicEventLink')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('eSourcing:labels.shareWithSuppliers')}
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
                      {t('common:copy')}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Share />}
                      onClick={() => window.open(currentEvent.public_url, '_blank')}
                    >
                      {t('common:open')}
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
                      {t('common:edit')}
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Publish />}
                      onClick={handlePublish}
                    >
                      {t('eSourcing:actions.publish')}
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
                      {t('eSourcing:actions.compareBids')}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Assessment />}
                      onClick={() => navigate(`/e-sourcing/events/${id}/statistics`)}
                    >
                      {t('eSourcing:actions.statistics')}
                    </Button>
                  </>
                )}

                {['published', 'in_progress', 'evaluation'].includes(currentEvent.status) && (
                  <Button
                    variant="outlined"
                    startIcon={<Close />}
                    onClick={handleClose}
                  >
                    {t('eSourcing:actions.close')}
                  </Button>
                )}

                {currentEvent.status !== 'awarded' && currentEvent.status !== 'closed' && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                  >
                    {t('common:cancel')}
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
                {t('eSourcing:labels.description')}
              </Typography>
              <Typography variant="body1" paragraph>
                {currentEvent.description}
              </Typography>

              {currentEvent.requirements && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    {t('eSourcing:labels.requirements')}
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-line' }}>
                    {currentEvent.requirements}
                  </Typography>
                </>
              )}

              {currentEvent.terms_and_conditions && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    {t('eSourcing:labels.termsAndConditions')}
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
                {t('eSourcing:labels.keyInformation')}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('eSourcing:labels.submissionDeadline')}
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(currentEvent.submission_deadline)}
                </Typography>
              </Box>

              {currentEvent.evaluation_deadline && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('eSourcing:labels.evaluationDeadline')}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatDateOnly(currentEvent.evaluation_deadline)}
                  </Typography>
                </Box>
              )}

              {currentEvent.estimated_budget && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('eSourcing:labels.estimatedBudget')}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {parseFloat(currentEvent.estimated_budget).toLocaleString()} $
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('eSourcing:labels.invitedSuppliers')}
                </Typography>
                <Typography variant="h4" color="primary">
                  {currentEvent.invitations?.length || 0}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('eSourcing:labels.submissionsReceived')}
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
                {t('eSourcing:labels.invitedSuppliers')} ({currentEvent.invitations?.length || 0})
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('eSourcing:labels.supplier')}</TableCell>
                      <TableCell>{t('eSourcing:labels.email')}</TableCell>
                      <TableCell>{t('eSourcing:labels.status')}</TableCell>
                      <TableCell>{t('eSourcing:labels.sentOn')}</TableCell>
                      <TableCell>{t('eSourcing:labels.submission')}</TableCell>
                      <TableCell align="right">{t('eSourcing:labels.shareLink')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentEvent.invitations?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {t('eSourcing:labels.noInvitations')}
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
                              label={getInvitationStatusLabel(invitation.status)}
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
                              <Chip label={t('eSourcing:bidStatus.submitted')} color="success" size="small" />
                            ) : (
                              <Chip label={t('eSourcing:bidStatus.pending')} size="small" />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title={t('common:copy')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopyLink(invitation.public_url)}
                                  color="primary"
                                >
                                  <ContentCopy fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('common:open')}>
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
                {t('eSourcing:labels.submissionsReceived')} ({currentEvent.bids?.length || 0})
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('eSourcing:labels.supplier')}</TableCell>
                      <TableCell>{t('eSourcing:labels.totalAmount')}</TableCell>
                      <TableCell>{t('eSourcing:labels.deliveryTime')}</TableCell>
                      <TableCell>{t('eSourcing:labels.score')}</TableCell>
                      <TableCell>{t('eSourcing:labels.status')}</TableCell>
                      <TableCell>{t('eSourcing:labels.submittedOn')}</TableCell>
                      <TableCell align="right">{t('common:actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentEvent.bids?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {t('eSourcing:labels.noSubmissions')}
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
                              label={getBidStatusLabel(bid.status)}
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
                            <Tooltip title={t('common:viewDetails')}>
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
    </Box>
  );
}

export default SourcingEventDetail;
