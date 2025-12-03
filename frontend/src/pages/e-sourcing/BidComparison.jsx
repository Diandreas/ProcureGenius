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
import { useTranslation } from 'react-i18next';

function BidComparison() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { eventId } = useParams();
  const { t } = useTranslation(['eSourcing', 'common']);

  const { bidComparison, loading } = useSelector((state) => state.eSourcing);

  useEffect(() => {
    dispatch(compareBids(eventId));
  }, [eventId, dispatch]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: fr });
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
        {t('eSourcing:bidComparison.backToEvent')}
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            {t('eSourcing:bidComparison.title')}
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
            {t('eSourcing:bidComparison.submissionsSummary', { count: bidComparison.bids?.length || 0 })}
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('eSourcing:labels.supplier')}</TableCell>
                  <TableCell align="right">{t('eSourcing:labels.totalAmount')}</TableCell>
                  <TableCell align="center">{t('eSourcing:labels.deliveryTime')}</TableCell>
                  <TableCell align="center">{t('eSourcing:labels.score')}</TableCell>
                  <TableCell>{t('eSourcing:labels.status')}</TableCell>
                  <TableCell>{t('eSourcing:labels.submittedOn')}</TableCell>
                  <TableCell align="right">{t('common:labels.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bidComparison.bids?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        {t('eSourcing:bidComparison.noSubmissionsToCompare')}
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
                          <Chip label={t('eSourcing:bidComparison.lowestPrice')} color="success" size="small" sx={{ mt: 0.5 }} />
                        )}
                        {bid.bid_id === bestScoreBidId && bid.bid_id !== lowestBidId && (
                          <Chip label={t('eSourcing:bidComparison.bestScore')} color="primary" size="small" sx={{ mt: 0.5 }} />
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
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/e-sourcing/bids/${bid.bid_id}`)}
                        >
                          {t('common:buttons.details')}
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
              {t('eSourcing:bidComparison.itemComparison')}
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
                        <TableCell>{t('eSourcing:labels.supplier')}</TableCell>
                        <TableCell align="right">{t('eSourcing:bidComparison.quantity')}</TableCell>
                        <TableCell align="right">{t('eSourcing:bidComparison.unitPrice')}</TableCell>
                        <TableCell align="right">{t('eSourcing:bidComparison.totalPrice')}</TableCell>
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
                                  label={t('eSourcing:bidComparison.bestPrice')}
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
