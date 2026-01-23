import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Container } from '@mui/material';
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import FilterPanel from '../../../components/analytics/FilterPanel';
import TimeRangeSelector from '../../../components/analytics/TimeRangeSelector';
import BarChart from '../../../components/analytics/charts/BarChart';
import LineChart from '../../../components/analytics/charts/LineChart';
import TableChart from '../../../components/analytics/charts/TableChart';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';

const ExamTypesAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [filters, setFilters] = useState({
    start_date: null,
    end_date: null,
    patient_id: null
  });

  useEffect(() => {
    fetchData();
  }, [filters, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await healthcareAnalyticsAPI.getExamTypes({
        ...filters,
        period
      });
      setData(result);
    } catch (error) {
      console.error('Error fetching exam types data:', error);
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

  const testTableColumns = [
    { field: 'test_name', header: 'Nom du Test' },
    { field: 'test_code', header: 'Code' },
    { field: 'count', header: 'Nombre' },
    {
      field: 'revenue',
      header: 'Revenu',
      render: (value) => formatCurrency(value)
    }
  ];

  const categoryTableColumns = [
    { field: 'category', header: 'Catégorie' },
    { field: 'count', header: 'Nombre' },
    {
      field: 'revenue',
      header: 'Revenu',
      render: (value) => formatCurrency(value)
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <TrendingUpIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="error.main">
              Types d'Examens par Période
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analyse temporelle des examens effectués
            </Typography>
          </Box>
        </Box>

        {/* Time Range Selector */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <TimeRangeSelector
            value={period}
            onChange={setPeriod}
            label="Période d'Agrégation"
          />
        </Paper>

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
            {/* Timeline Chart */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <LineChart
                data={data?.timeline || []}
                dataKey="count"
                xAxisKey="date"
                title={`Évolution des Examens (${period})`}
                height={350}
              />
            </Paper>

            {/* Top Tests and Categories */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <BarChart
                    data={data?.by_test_type?.slice(0, 10) || []}
                    dataKey="count"
                    xAxisKey="test_name"
                    title="Top 10 Tests"
                    height={350}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <BarChart
                    data={data?.by_category || []}
                    dataKey="count"
                    xAxisKey="category"
                    title="Examens par Catégorie"
                    height={350}
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Detailed Tables */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <TableChart
                    data={data?.by_test_type || []}
                    columns={testTableColumns}
                    title="Tests Détaillés"
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <TableChart
                    data={data?.by_category || []}
                    columns={categoryTableColumns}
                    title="Catégories Détaillées"
                  />
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ExamTypesAnalytics;
