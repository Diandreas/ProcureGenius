import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Container, Chip } from '@mui/material';
import { ReportProblem as RiskIcon } from '@mui/icons-material';
import TableChart from '../../../components/analytics/charts/TableChart';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';

const RiskProductsAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getAtRiskProducts();
      setData(result);
    } catch (error) {
      console.error('Error fetching at-risk products data:', error);
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

  const expiringTableColumns = [
    { field: 'product_name', header: 'Produit' },
    { field: 'product_code', header: 'Code' },
    {
      field: 'days_until_expiry',
      header: 'Jours Avant Expiration',
      render: (value) => (
        <Chip
          label={`${value} jours`}
          color={value <= 10 ? 'error' : value <= 30 ? 'warning' : 'default'}
          size="small"
        />
      )
    },
    {
      field: 'expiry_date',
      header: 'Date d\'Expiration'
    },
    {
      field: 'stock_quantity',
      header: 'Quantité',
      render: (value, row) => `${value} ${row.unit}`
    },
    {
      field: 'estimated_value',
      header: 'Valeur Estimée',
      render: (value) => formatCurrency(value)
    }
  ];

  const slowMovingTableColumns = [
    { field: 'product_name', header: 'Produit' },
    { field: 'product_code', header: 'Code' },
    {
      field: 'last_movement_date',
      header: 'Dernier Mouvement'
    },
    {
      field: 'days_since_movement',
      header: 'Jours Sans Mouvement',
      render: (value) => value ? `${value} jours` : 'Jamais'
    },
    {
      field: 'stock_quantity',
      header: 'Quantité',
      render: (value, row) => `${value} ${row.unit}`
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <RiskIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="warning.main">
              Produits à Risque
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Produits proches expiration et mouvements lents
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'error.main' }}>
                  <Typography variant="h3" fontWeight="700" color="error.main">
                    {data?.summary?.total_expiring || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Produits Expirant Bientôt
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (Dans les 60 prochains jours)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, textAlign: 'center', borderLeft: '4px solid', borderColor: 'warning.main' }}>
                  <Typography variant="h3" fontWeight="700" color="warning.main">
                    {data?.summary?.total_slow_moving || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Produits à Mouvement Lent
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (Pas de mouvement depuis 60+ jours)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Expiring Products */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.main' }}>
              <Typography variant="h6" fontWeight="700" mb={2} color="error.main">
                🔴 Produits Proches de l'Expiration
              </Typography>
              {data?.expired_or_expiring && data.expired_or_expiring.length > 0 ? (
                <>
                  <TableChart
                    data={data.expired_or_expiring}
                    columns={expiringTableColumns}
                  />
                  <Paper sx={{ p: 2, mt: 2, bgcolor: 'warning.50' }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>⚠️ Action Requise:</strong> Ces produits expireront dans les 60 prochains jours.
                      Considérez des promotions, des ventes rapides ou des ajustements de stock pour minimiser les pertes.
                    </Typography>
                  </Paper>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  Aucun produit proche de l'expiration
                </Typography>
              )}
            </Paper>

            {/* Slow Moving Products */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="700" mb={2} color="warning.main">
                🐌 Produits à Mouvement Lent
              </Typography>
              {data?.slow_moving && data.slow_moving.length > 0 ? (
                <>
                  <TableChart
                    data={data.slow_moving}
                    columns={slowMovingTableColumns}
                  />
                  <Paper sx={{ p: 2, mt: 2, bgcolor: 'info.50' }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>💡 Recommandation:</strong> Ces produits n'ont pas eu de mouvement depuis plus de 60 jours.
                      Envisagez de réviser votre stratégie d'approvisionnement, de réduire les quantités commandées ou de retirer ces produits de votre inventaire.
                    </Typography>
                  </Paper>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  Aucun produit à mouvement lent détecté
                </Typography>
              )}
            </Paper>

            {/* General Info */}
            <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Note:</strong> La gestion proactive des produits à risque aide à:
                • Réduire les pertes dues aux expirations
                • Optimiser l'espace de stockage
                • Améliorer la rotation des stocks
                • Libérer le capital immobilisé dans les produits à faible demande
              </Typography>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default RiskProductsAnalytics;
