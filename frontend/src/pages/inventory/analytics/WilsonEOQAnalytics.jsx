import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Grid, Card, CardContent, alpha, Tooltip, IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Calculate as CalcIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as OrderIcon
} from '@mui/icons-material';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';

const formatCurrency = (val) => {
  if (!val && val !== 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
};

const urgencyColors = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

const urgencyLabels = {
  critical: 'Critique',
  high: 'Urgent',
  medium: 'A surveiller',
  low: 'OK',
};

const WilsonEOQAnalytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getEOQDashboard();
      setData(result);
    } catch (error) {
      console.error('Error fetching EOQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <CalcIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="700">
            Analyse Wilson QEC
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quantite Economique de Commande - Optimisation des stocks
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', background: t => alpha(t.palette.error.main, 0.05) }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Critiques</Typography>
              <Typography variant="h3" fontWeight="700" color="error.main">{data?.critical_count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', background: t => alpha(t.palette.warning.main, 0.05) }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Urgents</Typography>
              <Typography variant="h3" fontWeight="700" color="warning.main">{data?.high_count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', background: t => alpha(t.palette.info.main, 0.05) }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">A surveiller</Typography>
              <Typography variant="h3" fontWeight="700" color="info.main">{data?.medium_count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', background: t => alpha(t.palette.success.main, 0.05) }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">A commander</Typography>
              <Typography variant="h3" fontWeight="700" color="success.main">{data?.should_order_count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Products Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Produit</TableCell>
              <TableCell align="right">Stock actuel</TableCell>
              <TableCell align="right">QEC (Q*)</TableCell>
              <TableCell align="right">Point de commande</TableCell>
              <TableCell align="right">Stock securite</TableCell>
              <TableCell align="right">Demande/jour</TableCell>
              <TableCell align="right">Jours restants</TableCell>
              <TableCell align="center">Score</TableCell>
              <TableCell align="center">Urgence</TableCell>
              <TableCell align="center">Commander ?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.products || []).map(product => (
              <TableRow
                key={product.product_id}
                sx={{
                  bgcolor: product.urgency === 'critical' ? 'error.50' :
                           product.urgency === 'high' ? 'warning.50' : 'inherit'
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="600">{product.product_name}</Typography>
                  <Typography variant="caption" color="text.secondary">{product.product_reference}</Typography>
                </TableCell>
                <TableCell align="right">{product.current_stock}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight="600">{product.eoq?.eoq || '-'}</Typography>
                </TableCell>
                <TableCell align="right">{product.reorder_point?.reorder_point || '-'}</TableCell>
                <TableCell align="right">{product.reorder_point?.safety_stock || '-'}</TableCell>
                <TableCell align="right">{product.reorder_point?.daily_demand || '0'}</TableCell>
                <TableCell align="right">
                  <Typography
                    fontWeight="600"
                    color={
                      product.days_until_stockout <= 7 ? 'error.main' :
                      product.days_until_stockout <= 14 ? 'warning.main' : 'text.primary'
                    }
                  >
                    {product.days_until_stockout >= 999 ? '-' : `${product.days_until_stockout}j`}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={product.score?.total_score || 0}
                    size="small"
                    color={product.score?.total_score >= 70 ? 'error' : product.score?.total_score >= 40 ? 'warning' : 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={urgencyLabels[product.urgency] || product.urgency}
                    color={urgencyColors[product.urgency] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {product.should_order ? (
                    <Tooltip title={`Commander ${product.recommended_order_qty} unites`}>
                      <OrderIcon color="error" />
                    </Tooltip>
                  ) : (
                    <CheckIcon color="success" sx={{ opacity: 0.5 }} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default WilsonEOQAnalytics;
