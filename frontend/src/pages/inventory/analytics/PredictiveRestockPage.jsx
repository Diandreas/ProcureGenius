import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Grid, Card, CardContent, alpha, IconButton, Button, Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as ShippingIcon,
  Warning as WarningIcon,
  ShoppingCart as OrderIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';

const formatCurrency = (val) => {
  if (!val && val !== 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA';
};

const urgencyConfig = {
  critical: { color: 'error', label: 'Critique', bg: 'error.50' },
  high: { color: 'warning', label: 'Urgent', bg: 'warning.50' },
  medium: { color: 'info', label: 'A surveiller', bg: 'transparent' },
  low: { color: 'success', label: 'OK', bg: 'transparent' },
};

const PredictiveRestockPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getPredictiveRestock();
      setData(result);
    } catch (error) {
      console.error('Error fetching predictive restock:', error);
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
        <ShippingIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="700">
            Restockage Predictif
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Anticipation des ruptures de stock basee sur la consommation et les delais fournisseurs
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '2px solid', borderColor: 'error.main', background: t => alpha(t.palette.error.main, 0.05) }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Critiques</Typography>
              <Typography variant="h3" fontWeight="700" color="error.main">{data?.critical_count || 0}</Typography>
              <Typography variant="caption" color="error.main">Rupture avant livraison possible</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'warning.main', background: t => alpha(t.palette.warning.main, 0.05) }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Urgents</Typography>
              <Typography variant="h3" fontWeight="700" color="warning.main">{data?.high_count || 0}</Typography>
              <Typography variant="caption" color="warning.main">Commander maintenant</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'info.main', background: t => alpha(t.palette.info.main, 0.05) }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">A surveiller</Typography>
              <Typography variant="h3" fontWeight="700" color="info.main">{data?.medium_count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Valeur commande urgente</Typography>
              <Typography variant="h5" fontWeight="700">{formatCurrency(data?.total_recommended_value || 0)}</Typography>
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
              <TableCell align="right">Stock</TableCell>
              <TableCell align="right">Conso/jour</TableCell>
              <TableCell align="right">Jours restants</TableCell>
              <TableCell align="right">Delai livraison</TableCell>
              <TableCell align="right">Rupture prevue</TableCell>
              <TableCell align="center">Urgence</TableCell>
              <TableCell>Message</TableCell>
              <TableCell align="right">Qte recommandee</TableCell>
              <TableCell align="right">Valeur</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.products || []).map(product => {
              const cfg = urgencyConfig[product.urgency] || urgencyConfig.low;
              return (
                <TableRow key={product.product_id} sx={{ bgcolor: cfg.bg }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600">{product.product_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{product.product_reference}</Typography>
                  </TableCell>
                  <TableCell align="right">{product.current_stock}</TableCell>
                  <TableCell align="right">{product.daily_demand}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="600" color={
                      product.days_remaining !== null && product.days_remaining <= 7 ? 'error.main' :
                      product.days_remaining !== null && product.days_remaining <= 14 ? 'warning.main' : 'text.primary'
                    }>
                      {product.days_remaining !== null ? `${product.days_remaining}j` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                      <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      {product.supplier_lead_time}j
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {product.predicted_stockout_date || '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={cfg.label} color={cfg.color} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{product.message}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="600">{product.recommended_order_qty}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(product.recommended_order_value || 0)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default PredictiveRestockPage;
