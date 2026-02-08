import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Container, Chip } from '@mui/material';
import { ShoppingCart as ShoppingCartIcon, Warning as WarningIcon } from '@mui/icons-material';
import TableChart from '../../../components/analytics/charts/TableChart';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';
import LoadingState from '../../../components/LoadingState';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';
import BackButton from '../../../components/navigation/BackButton';

const ReorderAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getReorderQuantities();
      setData(result);
    } catch (error) {
      console.error('Error fetching reorder data:', error);
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

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const tableColumns = [
    {
      field: 'urgency',
      header: 'Urgence',
      render: (value) => (
        <Chip
          label={value === 'high' ? 'URGENT' : value === 'medium' ? 'MOYEN' : 'FAIBLE'}
          color={getUrgencyColor(value)}
          size="small"
        />
      )
    },
    { field: 'product_name', header: 'Produit' },
    { field: 'product_code', header: 'Code' },
    {
      field: 'current_stock',
      header: 'Stock Actuel',
      render: (value, row) => `${value} ${row.unit}`
    },
    {
      field: 'low_stock_threshold',
      header: 'Seuil',
      render: (value, row) => `${value} ${row.unit}`
    },
    {
      field: 'avg_daily_usage',
      header: 'Usage Quotidien Moy.',
      render: (value, row) => `${value} ${row.unit}/jour`
    },
    {
      field: 'days_until_stockout',
      header: 'Jours Avant Rupture',
      render: (value) => value ? `${value} jours` : 'N/A'
    },
    {
      field: 'recommended_order_qty',
      header: 'Qté Recommandée',
      render: (value, row) => `${value} ${row.unit}`
    },
    {
      field: 'recommended_order_value',
      header: 'Valeur Commande',
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
          <ShoppingCartIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" fontWeight="700" color="primary.main">
              Quantités à Commander
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Calcul des quantités de réapprovisionnement basé sur l'usage
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Summary */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.main' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6" fontWeight="700">
                  Résumé des Besoins
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Produits à Commander
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="primary.main">
                    {data?.summary?.total_products_low || 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Valeur Totale Commande
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="success.main">
                    {formatCurrency(data?.summary?.total_recommended_order_value || 0)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Urgence Élevée
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="error.main">
                    {data?.summary?.high_urgency_count || 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Urgence Moyenne
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="warning.main">
                    {data?.summary?.medium_urgency_count || 0}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Products Table */}
            <Paper sx={{ p: 3 }}>
              <TableChart
                data={data?.products_to_reorder || []}
                columns={tableColumns}
                title="Produits à Commander (Triés par Urgence)"
              />
            </Paper>

            {/* Info Box */}
            <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Note:</strong> Les quantités recommandées sont calculées pour un approvisionnement de 60 jours basé sur l'usage moyen des 30 derniers jours.
                L'urgence est déterminée par le nombre de jours avant rupture de stock.
              </Typography>
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ReorderAnalytics;
