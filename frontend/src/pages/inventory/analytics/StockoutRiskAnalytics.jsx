import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Container, Chip, LinearProgress } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import TableChart from '../../../components/analytics/charts/TableChart';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';

const StockoutRiskAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getStockoutRisk();
      setData(result);
    } catch (error) {
      console.error('Error fetching stockout risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 70) return 'error';
    if (score >= 40) return 'warning';
    return 'success';
  };

  const tableColumns = [
    { field: 'product_name', header: 'Produit' },
    { field: 'product_code', header: 'Code' },
    {
      field: 'current_stock',
      header: 'Stock Actuel',
      render: (value, row) => `${value} ${row.unit}`
    },
    {
      field: 'avg_daily_usage',
      header: 'Usage/Jour',
      render: (value, row) => `${value} ${row.unit}`
    },
    {
      field: 'days_until_stockout',
      header: 'Jours Restants',
      render: (value) => value ? `${value} jours` : 'N/A'
    },
    {
      field: 'risk_score',
      header: 'Score de Risque',
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${value}%`}
            color={getRiskColor(value)}
            size="small"
          />
          <LinearProgress
            variant="determinate"
            value={value}
            sx={{ width: 60, height: 8, borderRadius: 1 }}
            color={getRiskColor(value)}
          />
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <WarningIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="error.main">
              Analyse Risque de Rupture
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Identification des produits à risque de rupture de stock
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'error.main' }}>
                  <Typography variant="h3" fontWeight="700" color="error.main">
                    {data?.summary?.total_high_risk || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Risque Élevé (≥70%)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'warning.main' }}>
                  <Typography variant="h3" fontWeight="700" color="warning.main">
                    {data?.summary?.total_medium_risk || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Risque Moyen (40-69%)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'success.main' }}>
                  <Typography variant="h3" fontWeight="700" color="success.main">
                    {data?.summary?.total_low_risk || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Risque Faible (&lt;40%)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* High Risk Products */}
            {data?.high_risk && data.high_risk.length > 0 && (
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.main' }}>
                <Typography variant="h6" fontWeight="700" mb={2} color="error.main">
                  ⚠️ Produits à Risque Élevé
                </Typography>
                <TableChart
                  data={data.high_risk}
                  columns={tableColumns}
                />
              </Paper>
            )}

            {/* Medium Risk Products */}
            {data?.medium_risk && data.medium_risk.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="700" mb={2} color="warning.main">
                  ⚡ Produits à Risque Moyen
                </Typography>
                <TableChart
                  data={data.medium_risk}
                  columns={tableColumns}
                />
              </Paper>
            )}

            {/* Low Risk Products */}
            {data?.low_risk && data.low_risk.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="700" mb={2} color="success.main">
                  ✓ Produits à Risque Faible
                </Typography>
                <TableChart
                  data={data.low_risk}
                  columns={tableColumns}
                />
              </Paper>
            )}

            {/* Info Box */}
            <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Calcul du Score de Risque:</strong> Le score combine le nombre de jours avant rupture (70%) et le ratio stock actuel/seuil minimum (30%).
                Un score de 100% indique une rupture imminente, 0% indique un stock très sûr.
              </Typography>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default StockoutRiskAnalytics;
