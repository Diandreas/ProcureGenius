import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Container } from '@mui/material';
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import FilterPanel from '../../../components/analytics/FilterPanel';
import BarChart from '../../../components/analytics/charts/BarChart';
import LineChart from '../../../components/analytics/charts/LineChart';
import TableChart from '../../../components/analytics/charts/TableChart';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';

const MovementAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: null,
    end_date: null,
    movement_type: null,
    product_id: null
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getMovements(filters);
      setData(result);
    } catch (error) {
      console.error('Error fetching movements data:', error);
    } finally {
      setLoading(false);
    }
  };

  const movementTypeOptions = [
    { value: 'in', label: 'Entrées' },
    { value: 'out', label: 'Sorties' },
    { value: 'adjustment', label: 'Ajustements' },
    { value: 'wastage', label: 'Pertes' }
  ];

  const productTableColumns = [
    { field: 'product_name', header: 'Produit' },
    { field: 'in', header: 'Entrées' },
    { field: 'out', header: 'Sorties' },
    { field: 'adjustment', header: 'Ajustements' },
    { field: 'wastage', header: 'Pertes' },
    {
      field: 'net',
      header: 'Net',
      render: (value) => (
        <Typography
          component="span"
          fontWeight="700"
          color={value > 0 ? 'success.main' : value < 0 ? 'error.main' : 'text.primary'}
        >
          {value > 0 ? '+' : ''}{value}
        </Typography>
      )
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="primary.main">
              Analyse des Mouvements de Stock
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Historique et tendances des entrées/sorties
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          showDateRange={true}
          customFilters={[
            {
              field: 'movement_type',
              label: 'Type de Mouvement',
              type: 'select',
              options: movementTypeOptions
            }
          ]}
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'success.main' }}>
                  <Typography variant="h3" fontWeight="700" color="success.main">
                    {data?.summary?.total_in || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Entrées
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'error.main' }}>
                  <Typography variant="h3" fontWeight="700" color="error.main">
                    {data?.summary?.total_out || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Sorties
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'warning.main' }}>
                  <Typography variant="h3" fontWeight="700" color="warning.main">
                    {data?.summary?.total_wastage || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Pertes
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'primary.main' }}>
                  <Typography
                    variant="h3"
                    fontWeight="700"
                    color={data?.summary?.net_movement >= 0 ? 'success.main' : 'error.main'}
                  >
                    {data?.summary?.net_movement >= 0 ? '+' : ''}{data?.summary?.net_movement || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mouvement Net
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Timeline Chart */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <LineChart
                data={data?.timeline || []}
                dataKey="out"
                xAxisKey="date"
                title="Évolution des Mouvements"
                height={350}
              />
            </Paper>

            {/* Top Products Charts */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <BarChart
                    data={data?.by_product?.slice(0, 10) || []}
                    dataKey="out"
                    xAxisKey="product_name"
                    title="Top 10 Sorties par Produit"
                    height={350}
                    color="#ef4444"
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <BarChart
                    data={data?.by_product?.slice(0, 10) || []}
                    dataKey="in"
                    xAxisKey="product_name"
                    title="Top 10 Entrées par Produit"
                    height={350}
                    color="#10b981"
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Detailed Table */}
            <Paper sx={{ p: 3 }}>
              <TableChart
                data={data?.by_product || []}
                columns={productTableColumns}
                title="Mouvements Détaillés par Produit"
              />
            </Paper>

            {/* Info Box */}
            <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Interprétation:</strong>
                • <strong>Net positif (+)</strong>: Plus d'entrées que de sorties, le stock augmente
                • <strong>Net négatif (-)</strong>: Plus de sorties que d'entrées, le stock diminue
                • Les <strong>pertes</strong> peuvent indiquer des problèmes de qualité, d'expiration ou de gestion
              </Typography>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default MovementAnalytics;
