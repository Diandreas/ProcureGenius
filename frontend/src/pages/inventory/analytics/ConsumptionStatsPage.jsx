import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, CircularProgress, Grid, Card, CardContent,
  alpha, IconButton, FormControl, InputLabel, Select, MenuItem, Chip,
  Autocomplete, TextField
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  ShowChart as ChartIcon
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';
import api from '../../../services/api';

const trendConfig = {
  increasing: { icon: TrendingUpIcon, color: 'error.main', label: 'En hausse' },
  decreasing: { icon: TrendingDownIcon, color: 'success.main', label: 'En baisse' },
  stable: { icon: TrendingFlatIcon, color: 'info.main', label: 'Stable' },
  insufficient_data: { icon: TrendingFlatIcon, color: 'text.secondary', label: 'Donnees insuffisantes' },
};

const ConsumptionStatsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [period, setPeriod] = useState('weekly');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchStats();
    }
  }, [selectedProduct, period]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/?product_type=physical&page_size=500');
      setProducts(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStats = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getConsumptionStats({
        product_id: selectedProduct.id,
        period
      });
      setData(result);
    } catch (error) {
      console.error('Error fetching consumption stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const trend = data ? trendConfig[data.consumption_trend] || trendConfig.insufficient_data : null;
  const TrendIcon = trend?.icon || TrendingFlatIcon;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <ChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="700">
            Statistiques de Consommation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analyse des tendances de consommation par produit
          </Typography>
        </Box>
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={products}
              getOptionLabel={(option) => `${option.name} (${option.reference || 'N/A'})`}
              value={selectedProduct}
              onChange={(e, val) => setSelectedProduct(val)}
              renderInput={(params) => (
                <TextField {...params} label="Selectionner un produit" size="small" />
              )}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Periode</InputLabel>
              <Select value={period} label="Periode" onChange={e => setPeriod(e.target.value)}>
                <MenuItem value="weekly">Hebdomadaire</MenuItem>
                <MenuItem value="monthly">Mensuel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {!selectedProduct && (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">
            Selectionnez un produit pour voir ses statistiques de consommation
          </Typography>
        </Paper>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {data && !loading && (
        <>
          {/* KPI Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Conso. semaine</Typography>
                  <Typography variant="h4" fontWeight="700">{data.avg_weekly_consumption}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Conso. mois</Typography>
                  <Typography variant="h4" fontWeight="700">{data.avg_monthly_consumption}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Stock actuel</Typography>
                  <Typography variant="h4" fontWeight="700">{data.current_stock}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Tendance</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendIcon sx={{ color: trend?.color, fontSize: 28 }} />
                    <Typography variant="h6" fontWeight="700" color={trend?.color}>
                      {trend?.label}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Chart */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="600" mb={2}>
              Consommation {period === 'weekly' ? 'hebdomadaire' : 'mensuelle'} - {data.product_name}
            </Typography>
            {data.breakdown && data.breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.breakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={val => {
                      const d = new Date(val);
                      return period === 'weekly'
                        ? `S${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString('fr-FR', { month: 'short' })}`
                        : d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={val => new Date(val).toLocaleDateString('fr-FR')}
                    formatter={(value) => [`${value} unites`, 'Consommation']}
                  />
                  <Bar dataKey="quantity" fill="#2563eb" name="Consommation" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" textAlign="center" py={4}>
                Aucune donnee de consommation pour ce produit
              </Typography>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
};

export default ConsumptionStatsPage;
