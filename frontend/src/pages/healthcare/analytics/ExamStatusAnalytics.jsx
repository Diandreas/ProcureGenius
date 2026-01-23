import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Container } from '@mui/material';
import { Assessment as AssessmentIcon } from '@mui/icons-material';
import FilterPanel from '../../../components/analytics/FilterPanel';
import BarChart from '../../../components/analytics/charts/BarChart';
import PieChart from '../../../components/analytics/charts/PieChart';
import TableChart from '../../../components/analytics/charts/TableChart';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';

const ExamStatusAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: null,
    end_date: null,
    patient_id: null,
    status: null
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await healthcareAnalyticsAPI.getExamStatus(filters);
      setData(result);
    } catch (error) {
      console.error('Error fetching exam status data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'En Attente' },
    { value: 'sample_collected', label: 'Échantillon Collecté' },
    { value: 'received', label: 'Reçu' },
    { value: 'analyzing', label: 'En Analyse' },
    { value: 'results_entered', label: 'Résultats Saisis' },
    { value: 'verified', label: 'Vérifié' },
    { value: 'results_delivered', label: 'Résultats Livrés' }
  ];

  // Format data for charts
  const statusChartData = data?.summary?.by_status?.map(item => ({
    name: item.status,
    value: item.count
  })) || [];

  const tableColumns = [
    { field: 'patient_name', header: 'Patient' },
    { field: 'total_exams', header: 'Total Examens' },
    { field: 'pending', header: 'En Attente' },
    { field: 'analyzing', header: 'En Analyse' },
    { field: 'completed', header: 'Terminé' },
    { field: 'last_exam_date', header: 'Dernier Examen' }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <AssessmentIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="error.main">
              Statut des Examens par Patient
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Suivi détaillé de l'avancement des examens
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          showDateRange={true}
          showStatus={true}
          statusOptions={statusOptions}
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Summary Stats */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight="700" color="primary.main">
                    {data?.summary?.total_orders || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Examens
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight="700" color="warning.main">
                    {data?.by_patient?.reduce((sum, p) => sum + p.pending, 0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    En Attente
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight="700" color="success.main">
                    {data?.by_patient?.reduce((sum, p) => sum + p.completed, 0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Terminés
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <PieChart
                    data={statusChartData}
                    title="Répartition par Statut"
                    height={350}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <BarChart
                    data={statusChartData}
                    dataKey="value"
                    xAxisKey="name"
                    title="Examens par Statut"
                    height={350}
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Detailed Table */}
            <Paper sx={{ p: 3 }}>
              <TableChart
                data={data?.by_patient || []}
                columns={tableColumns}
                title="Détails par Patient"
              />
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ExamStatusAnalytics;
