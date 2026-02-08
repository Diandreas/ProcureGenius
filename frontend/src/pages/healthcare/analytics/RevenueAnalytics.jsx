import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Container } from '@mui/material';
import { AttachMoney as MoneyIcon } from '@mui/icons-material';
import FilterPanel from '../../../components/analytics/FilterPanel';
import BarChart from '../../../components/analytics/charts/BarChart';
import PieChart from '../../../components/analytics/charts/PieChart';
import TableChart from '../../../components/analytics/charts/TableChart';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';
import BackButton from '../../../components/navigation/BackButton';

const RevenueAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: null,
    end_date: null
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await healthcareAnalyticsAPI.getRevenue(filters);
      setData(result);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Format data for module chart
  const moduleChartData = data?.by_module?.map(item => ({
    name: item.module === 'laboratory' ? 'Laboratoire' : 'Consultation',
    revenue: item.revenue
  })) || [];

  const moduleTableColumns = [
    {
      field: 'module',
      header: 'Module',
      render: (value) => value === 'laboratory' ? 'Laboratoire' : 'Consultation'
    },
    { field: 'count', header: 'Nombre' },
    {
      field: 'revenue',
      header: 'Revenu Total',
      render: (value) => formatCurrency(value)
    },
    {
      field: 'avg_amount',
      header: 'Montant Moyen',
      render: (value) => formatCurrency(value)
    }
  ];

  const serviceTableColumns = [
    { field: 'service', header: 'Service/Catégorie' },
    { field: 'count', header: 'Nombre' },
    {
      field: 'revenue',
      header: 'Revenu Total',
      render: (value) => formatCurrency(value)
    },
    {
      field: 'avg_amount',
      header: 'Montant Moyen',
      render: (value) => formatCurrency(value)
    }
  ];

  const productTableColumns = [
    { field: 'product_name', header: 'Produit/Test' },
    { field: 'count', header: 'Nombre' },
    {
      field: 'revenue',
      header: 'Revenu Total',
      render: (value) => formatCurrency(value)
    }
  ];

  // Calculate totals
  const totalRevenue = data?.by_module?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const totalCount = data?.by_module?.reduce((sum, item) => sum + item.count, 0) || 0;
  const avgAmount = totalCount > 0 ? totalRevenue / totalCount : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        <Breadcrumbs />
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <BackButton />
          <MoneyIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="error.main">
              Analyse des Revenus
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revenus par module, service et produit
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          showDateRange={true}
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="700" color="success.main">
                    {formatCurrency(totalRevenue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revenu Total
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="700" color="primary.main">
                    {totalCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="700" color="info.main">
                    {formatCurrency(avgAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Montant Moyen
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Revenue by Module */}
            <Typography variant="h6" fontWeight="700" mb={2} mt={3}>
              Revenus par Module
            </Typography>
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <PieChart
                    data={moduleChartData}
                    dataKey="revenue"
                    title="Répartition par Module"
                    height={350}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <TableChart
                    data={data?.by_module || []}
                    columns={moduleTableColumns}
                    title="Détails par Module"
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Revenue by Service */}
            <Typography variant="h6" fontWeight="700" mb={2} mt={3}>
              Revenus par Service/Catégorie
            </Typography>
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <BarChart
                    data={data?.by_service?.slice(0, 10) || []}
                    dataKey="revenue"
                    xAxisKey="service"
                    title="Top 10 Services"
                    height={350}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <TableChart
                    data={data?.by_service || []}
                    columns={serviceTableColumns}
                    title="Tous les Services"
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Top Products */}
            <Typography variant="h6" fontWeight="700" mb={2} mt={3}>
              Top Produits/Tests
            </Typography>
            <Paper sx={{ p: 3 }}>
              <TableChart
                data={data?.top_products || []}
                columns={productTableColumns}
                title="Top 10 Produits Générateurs de Revenus"
              />
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default RevenueAnalytics;
