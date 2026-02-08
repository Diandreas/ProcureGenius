import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Container } from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import FilterPanel from '../../../components/analytics/FilterPanel';
import BarChart from '../../../components/analytics/charts/BarChart';
import PieChart from '../../../components/analytics/charts/PieChart';
import TableChart from '../../../components/analytics/charts/TableChart';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';
import BackButton from '../../../components/navigation/BackButton';

const DemographicAnalytics = () => {
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
      const result = await healthcareAnalyticsAPI.getDemographics(filters);
      setData(result);
    } catch (error) {
      console.error('Error fetching demographics data:', error);
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

  // Format data for gender chart
  const genderChartData = data?.by_gender?.map(item => ({
    name: item.gender === 'M' ? 'Homme' : item.gender === 'F' ? 'Femme' : 'Non Spécifié',
    value: item.count
  })) || [];

  // Format data for age group chart
  const ageGroupChartData = data?.by_age_group?.map(item => ({
    name: item.age_group,
    count: item.count,
    revenue: item.revenue
  })) || [];

  const genderTableColumns = [
    {
      field: 'gender',
      header: 'Genre',
      render: (value) => value === 'M' ? 'Homme' : value === 'F' ? 'Femme' : 'Non Spécifié'
    },
    { field: 'count', header: 'Nombre d\'Examens' },
    {
      field: 'revenue',
      header: 'Revenu Total',
      render: (value) => formatCurrency(value)
    }
  ];

  const ageGroupTableColumns = [
    { field: 'age_group', header: 'Groupe d\'Âge' },
    { field: 'count', header: 'Nombre d\'Examens' },
    {
      field: 'revenue',
      header: 'Revenu Total',
      render: (value) => formatCurrency(value)
    }
  ];

  const combinedTableColumns = [
    {
      field: 'gender',
      header: 'Genre',
      render: (value) => value === 'M' ? 'Homme' : value === 'F' ? 'Femme' : 'Non Spécifié'
    },
    { field: 'age_group', header: 'Groupe d\'Âge' },
    { field: 'count', header: 'Examens' },
    {
      field: 'revenue',
      header: 'Revenu',
      render: (value) => formatCurrency(value)
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        <Breadcrumbs />
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <BackButton />
          <PeopleIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="error.main">
              Analyse Démographique
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Examens par genre et groupe d'âge
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
            {/* Gender Analysis */}
            <Typography variant="h6" fontWeight="700" mb={2} mt={3}>
              Répartition par Genre
            </Typography>
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <PieChart
                    data={genderChartData}
                    title="Examens par Genre"
                    height={350}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <TableChart
                    data={data?.by_gender || []}
                    columns={genderTableColumns}
                    title="Détails par Genre"
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Age Group Analysis */}
            <Typography variant="h6" fontWeight="700" mb={2} mt={3}>
              Répartition par Groupe d'Âge
            </Typography>
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <BarChart
                    data={ageGroupChartData}
                    dataKey="count"
                    xAxisKey="name"
                    title="Examens par Groupe d'Âge"
                    height={350}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <TableChart
                    data={data?.by_age_group || []}
                    columns={ageGroupTableColumns}
                    title="Détails par Âge"
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Combined Analysis */}
            <Typography variant="h6" fontWeight="700" mb={2} mt={3}>
              Analyse Combinée (Genre × Âge)
            </Typography>
            <Paper sx={{ p: 3 }}>
              <TableChart
                data={data?.by_gender_and_age || []}
                columns={combinedTableColumns}
                title="Répartition Détaillée Genre × Âge"
              />
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default DemographicAnalytics;
