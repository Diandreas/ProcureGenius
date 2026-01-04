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
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ArrowBack, Edit, CheckCircle, Cancel } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

function BidDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['eSourcing', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [bid, setBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [evaluationScore, setEvaluationScore] = useState('');
  const [evaluationNotes, setEvaluationNotes] = useState('');

  useEffect(() => {
    fetchBidDetails();
  }, [id]);

  const fetchBidDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/e-sourcing/bids/${id}/`);
      setBid(response.data);
      setNewStatus(response.data.status);
      setEvaluationScore(response.data.evaluation_score || '');
      setEvaluationNotes(response.data.evaluation_notes || '');
    } catch (error) {
      enqueueSnackbar(t('eSourcing:bidDetail.loadError'), { variant: 'error' });
      console.error('Error fetching bid:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBid = async () => {
    try {
      setUpdating(true);
      await api.patch(`/e-sourcing/bids/${id}/`, {
        status: newStatus,
        evaluation_score: evaluationScore || null,
        evaluation_notes: evaluationNotes,
      });
      enqueueSnackbar(t('eSourcing:bidDetail.updateSuccess'), { variant: 'success' });
      fetchBidDetails();
    } catch (error) {
      enqueueSnackbar(t('eSourcing:bidDetail.updateError'), { variant: 'error' });
      console.error('Error updating bid:', error);
    } finally {
      setUpdating(false);
    }
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

  const getStatusChip = (status) => {
    const statusConfig = {
      submitted: { label: getBidStatusLabel(status), color: 'info' },
      under_review: { label: getBidStatusLabel(status), color: 'warning' },
      shortlisted: { label: getBidStatusLabel(status), color: 'primary' },
      awarded: { label: getBidStatusLabel(status), color: 'success' },
      rejected: { label: getBidStatusLabel(status), color: 'error' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  if (loading || !bid) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
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
          onClick={() => navigate(`/e-sourcing/events/${bid.sourcing_event}`)}
          sx={{ mb: 2 }}
        >
          {t('eSourcing:bidComparison.backToEvent')}
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
        <Tooltip title={t('eSourcing:bidComparison.backToEvent')}>
          <IconButton
            onClick={() => navigate(`/e-sourcing/events/${bid.sourcing_event}`)}
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
          {t('eSourcing:bidDetail.title', { supplier: bid.supplier_name })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={t('eSourcing:bidDetail.editBid')}>
            <IconButton
              onClick={() => navigate(`/e-sourcing/bids/${id}/edit`)}
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
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" component="h1" gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
                      {t('eSourcing:bidDetail.title', { supplier: bid.supplier_name })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                      {bid.supplier_email}
                    </Typography>
                  </Box>
                  <Box>{getStatusChip(bid.status)}</Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      {t('eSourcing:labels.totalAmount')}
                    </Typography>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {parseFloat(bid.total_amount).toLocaleString()} $
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      {t('eSourcing:bidDetail.deliveryTime')}
                    </Typography>
                    <Typography variant="h6" fontWeight="medium">
                      {bid.delivery_time_days || '-'} {t('eSourcing:bidDetail.days')}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      {t('eSourcing:labels.submittedOn')}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDate(bid.submitted_at)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Détails de la soumission */}
          <Grid item xs={12} md={8}>
            <Card sx={{
              borderRadius: isMobile ? 2.5 : 2,
              boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
              backdropFilter: isMobile ? 'blur(10px)' : 'none',
              border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('eSourcing:bidDetail.submissionDetails')}
                </Typography>

                {bid.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('eSourcing:bidDetail.supplierNotes')}
                    </Typography>
                    <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-line' }}>
                      {bid.notes}
                    </Typography>
                  </Box>
                )}

                {bid.technical_proposal && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('eSourcing:bidDetail.technicalProposal')}
                    </Typography>
                    <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-line' }}>
                      {bid.technical_proposal}
                    </Typography>
                  </Box>
                )}

                {bid.warranty_terms && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('eSourcing:bidDetail.warrantyTerms')}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {bid.warranty_terms}
                    </Typography>
                  </Box>
                )}

                {bid.payment_terms && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('eSourcing:bidDetail.paymentTerms')}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {bid.payment_terms}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  {t('eSourcing:bidDetail.proposedItems')}
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('eSourcing:bidDetail.item')}</TableCell>
                        <TableCell align="right">{t('eSourcing:bidComparison.quantity')}</TableCell>
                        <TableCell align="right">{t('eSourcing:bidComparison.unitPrice')}</TableCell>
                        <TableCell align="right">{t('common:labels.total')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bid.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.description}
                            </Typography>
                            {item.specifications && (
                              <Typography variant="caption" color="text.secondary">
                                {item.specifications}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {parseFloat(item.unit_price).toLocaleString()} $
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {(parseFloat(item.unit_price) * parseFloat(item.quantity)).toLocaleString()} $
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <Typography variant="subtitle1" fontWeight="bold">
                            {t('common:labels.total')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle1" fontWeight="bold" color="primary">
                            {parseFloat(bid.total_amount).toLocaleString()} $
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Évaluation */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              borderRadius: isMobile ? 2.5 : 2,
              boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
              backdropFilter: isMobile ? 'blur(10px)' : 'none',
              border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('eSourcing:bidDetail.evaluation')}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    select
                    label={t('eSourcing:labels.status')}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value="submitted">{getBidStatusLabel('submitted')}</MenuItem>
                    <MenuItem value="under_review">{getBidStatusLabel('under_review')}</MenuItem>
                    <MenuItem value="shortlisted">{getBidStatusLabel('shortlisted')}</MenuItem>
                    <MenuItem value="awarded">{getBidStatusLabel('awarded')}</MenuItem>
                    <MenuItem value="rejected">{getBidStatusLabel('rejected')}</MenuItem>
                  </TextField>

                  <TextField
                    fullWidth
                    type="number"
                    label={t('eSourcing:bidDetail.evaluationScore')}
                    value={evaluationScore}
                    onChange={(e) => setEvaluationScore(e.target.value)}
                    inputProps={{ min: 0, max: 100, step: 1 }}
                    helperText={t('eSourcing:bidDetail.scoreOutOf100')}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label={t('eSourcing:bidDetail.evaluationNotes')}
                    value={evaluationNotes}
                    onChange={(e) => setEvaluationNotes(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={updating ? <CircularProgress size={20} /> : <CheckCircle />}
                    onClick={handleUpdateBid}
                    disabled={updating}
                  >
                    {t('eSourcing:bidDetail.updateEvaluation')}
                  </Button>
                </Box>

                {bid.evaluation_score && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('eSourcing:bidDetail.currentScore')}
                    </Typography>
                    <Typography variant="h3" color="primary" fontWeight="bold">
                      {bid.evaluation_score}/100
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default BidDetail;
