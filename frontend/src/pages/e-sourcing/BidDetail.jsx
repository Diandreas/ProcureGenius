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
} from '@mui/material';
import { ArrowBack, Edit, CheckCircle, Cancel } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function BidDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();

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
      enqueueSnackbar('Erreur lors du chargement de la soumission', { variant: 'error' });
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
      enqueueSnackbar('Soumission mise à jour avec succès', { variant: 'success' });
      fetchBidDetails();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la mise à jour', { variant: 'error' });
      console.error('Error updating bid:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      submitted: { label: 'Soumis', color: 'info' },
      under_review: { label: 'En révision', color: 'warning' },
      shortlisted: { label: 'Présélectionné', color: 'primary' },
      awarded: { label: 'Retenu', color: 'success' },
      rejected: { label: 'Rejeté', color: 'error' },
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
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/e-sourcing/events/${bid.sourcing_event}`)}
        sx={{ mb: 2 }}
      >
        Retour à l'événement
      </Button>

      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" component="h1" gutterBottom>
                    Soumission de {bid.supplier_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bid.supplier_email}
                  </Typography>
                </Box>
                <Box>{getStatusChip(bid.status)}</Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Montant total
                  </Typography>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {parseFloat(bid.total_amount).toLocaleString()} $
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Délai de livraison
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {bid.delivery_time_days || '-'} jours
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Soumis le
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Détails de la soumission
              </Typography>

              {bid.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Notes du fournisseur
                  </Typography>
                  <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-line' }}>
                    {bid.notes}
                  </Typography>
                </Box>
              )}

              {bid.technical_proposal && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Proposition technique
                  </Typography>
                  <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-line' }}>
                    {bid.technical_proposal}
                  </Typography>
                </Box>
              )}

              {bid.warranty_terms && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Conditions de garantie
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {bid.warranty_terms}
                  </Typography>
                </Box>
              )}

              {bid.payment_terms && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Conditions de paiement
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {bid.payment_terms}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Articles proposés
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Article</TableCell>
                      <TableCell align="right">Quantité</TableCell>
                      <TableCell align="right">Prix unitaire</TableCell>
                      <TableCell align="right">Total</TableCell>
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
                          Total
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Évaluation
              </Typography>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="Statut"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="submitted">Soumis</MenuItem>
                  <MenuItem value="under_review">En révision</MenuItem>
                  <MenuItem value="shortlisted">Présélectionné</MenuItem>
                  <MenuItem value="awarded">Retenu</MenuItem>
                  <MenuItem value="rejected">Rejeté</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  type="number"
                  label="Score d'évaluation"
                  value={evaluationScore}
                  onChange={(e) => setEvaluationScore(e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  helperText="Score sur 100"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes d'évaluation"
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
                  Mettre à jour l'évaluation
                </Button>
              </Box>

              {bid.evaluation_score && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Score actuel
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
  );
}

export default BidDetail;
