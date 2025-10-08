import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import { ArrowBack, Visibility } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { compareBids } from '../../store/slices/eSourcingSlice';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function BidComparison() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { eventId } = useParams();

  const { bidComparison, loading } = useSelector((state) => state.eSourcing);

  useEffect(() => {
    dispatch(compareBids(eventId));
  }, [eventId, dispatch]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: fr });
  };

  // Grouper les items par référence produit
  const getItemComparison = () => {
    if (!bidComparison?.bids || bidComparison.bids.length === 0) return [];

    const itemMap = new Map();

    bidComparison.bids.forEach((bid) => {
      bid.items.forEach((item) => {
        const key = item.product_reference;
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            product_reference: item.product_reference,
            description: item.description,
            bids: [],
          });
        }

        itemMap.get(key).bids.push({
          supplier: bid.supplier_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          unit_of_measure: item.unit_of_measure,
        });
      });
    });

    return Array.from(itemMap.values());
  };

  const getLowestBidId = () => {
    if (!bidComparison?.bids || bidComparison.bids.length === 0) return null;
    return bidComparison.bids.reduce((lowest, bid) =>
      parseFloat(bid.total_amount) < parseFloat(lowest.total_amount) ? bid : lowest
    ).bid_id;
  };

  const getBestScoreBidId = () => {
    if (!bidComparison?.bids || bidComparison.bids.length === 0) return null;
    const bidsWithScore = bidComparison.bids.filter((bid) => bid.evaluation_score);
    if (bidsWithScore.length === 0) return null;
    return bidsWithScore.reduce((best, bid) =>
      parseFloat(bid.evaluation_score) > parseFloat(best.evaluation_score) ? bid : best
    ).bid_id;
  };

  if (loading || !bidComparison) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const lowestBidId = getLowestBidId();
  const bestScoreBidId = getBestScoreBidId();
  const itemComparison = getItemComparison();

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/e-sourcing/events/${eventId}`)}
        sx={{ mb: 2 }}
      >
        Retour à l'événement
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Comparaison des soumissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {bidComparison.event?.event_number} - {bidComparison.event?.title}
          </Typography>
        </CardContent>
      </Card>

      {/* Résumé des soumissions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Résumé des soumissions ({bidComparison.bids?.length || 0})
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fournisseur</TableCell>
                  <TableCell align="right">Montant total</TableCell>
                  <TableCell align="center">Délai (jours)</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Soumis le</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bidComparison.bids?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        Aucune soumission à comparer
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bidComparison.bids?.map((bid) => (
                    <TableRow
                      key={bid.bid_id}
                      sx={{
                        backgroundColor:
                          bid.bid_id === lowestBidId
                            ? 'success.lighter'
                            : 'inherit',
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {bid.supplier_name}
                        </Typography>
                        {bid.bid_id === lowestBidId && (
                          <Chip label="Prix le plus bas" color="success" size="small" sx={{ mt: 0.5 }} />
                        )}
                        {bid.bid_id === bestScoreBidId && bid.bid_id !== lowestBidId && (
                          <Chip label="Meilleur score" color="primary" size="small" sx={{ mt: 0.5 }} />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {parseFloat(bid.total_amount).toLocaleString()} $
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {bid.delivery_time_days || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {bid.evaluation_score ? (
                          <Chip
                            label={`${bid.evaluation_score}/100`}
                            color={
                              bid.evaluation_score >= 80
                                ? 'success'
                                : bid.evaluation_score >= 60
                                ? 'warning'
                                : 'error'
                            }
                            size="small"
                          />
                        ) : (
                          '-'
                        )}
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
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/e-sourcing/bids/${bid.bid_id}`)}
                        >
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Comparaison par article */}
      {itemComparison.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Comparaison par article
            </Typography>

            {itemComparison.map((item, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  {item.product_reference} - {item.description}
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fournisseur</TableCell>
                        <TableCell align="right">Quantité</TableCell>
                        <TableCell align="right">Prix unitaire</TableCell>
                        <TableCell align="right">Prix total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {item.bids.map((bidItem, bidIndex) => {
                        const isLowest = item.bids.reduce((lowest, b) =>
                          parseFloat(b.unit_price) < parseFloat(lowest.unit_price) ? b : lowest
                        ) === bidItem;

                        return (
                          <TableRow
                            key={bidIndex}
                            sx={{
                              backgroundColor: isLowest ? 'success.lighter' : 'inherit',
                            }}
                          >
                            <TableCell>
                              {bidItem.supplier}
                              {isLowest && (
                                <Chip
                                  label="Meilleur prix"
                                  color="success"
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {bidItem.quantity} {bidItem.unit_of_measure}
                            </TableCell>
                            <TableCell align="right">
                              {parseFloat(bidItem.unit_price).toLocaleString()} $
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {parseFloat(bidItem.total_price).toLocaleString()} $
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default BidComparison;
