import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Inventory,
  AttachMoney,
  Business,
  Warehouse,
  Category,
  LocalShipping,
  Receipt,
  People,
  TrendingUp,
  Info,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { productsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ProductInvoicesTable from '../../components/products/ProductInvoicesTable';
import ProductClientsTable from '../../components/products/ProductClientsTable';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [product, setProduct] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchProduct();
    fetchStatistics();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.get(id);
      setProduct(response.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement du produit', { variant: 'error' });
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await productsAPI.getStatistics(id);
      setStatistics(response.data);
    } catch (error) {
      console.error('Erreur statistiques:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Supprimer ${product.name} ?`)) {
      try {
        await productsAPI.delete(id);
        enqueueSnackbar('Produit supprimé', { variant: 'success' });
        navigate('/products');
      } catch (error) {
        enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!product) {
    return <Alert severity="error">Produit introuvable</Alert>;
  }

  const stockStatus = product.stock_quantity === 0 ? 'error' :
    product.stock_quantity <= 10 ? 'warning' : 'success';

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/products')} size={isMobile ? 'small' : 'medium'}>
            <ArrowBack />
          </IconButton>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ flex: 1 }}>
            {product.name}
          </Typography>
          {!isMobile && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate(`/products/${id}/edit`)}
              >
                Modifier
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDelete}
              >
                Supprimer
              </Button>
            </Stack>
          )}
        </Box>
        {isMobile && (
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate(`/products/${id}/edit`)}
              size="small"
            >
              Modifier
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleDelete}
              size="small"
            >
              Supprimer
            </Button>
          </Stack>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<Info />} label="Infos" iconPosition="start" />
        <Tab icon={<Receipt />} label="Factures" iconPosition="start" />
        <Tab icon={<People />} label="Clients" iconPosition="start" />
      </Tabs>

      {/* Tab: Informations */}
      {activeTab === 0 && (
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Card principale */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Avatar
                    src={product.image}
                    variant="rounded"
                    sx={{
                      width: isMobile ? 80 : 100,
                      height: isMobile ? 80 : 100,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                    }}
                  >
                    <Inventory sx={{ fontSize: isMobile ? 40 : 48 }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" gutterBottom>
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Réf: {product.reference || product.sku}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip
                        label={product.is_active ? 'Actif' : 'Inactif'}
                        color={product.is_active ? 'success' : 'default'}
                        size="small"
                      />
                      {product.category && (
                        <Chip
                          icon={<Category sx={{ fontSize: 16 }} />}
                          label={product.category.name}
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Stack>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Description */}
                {product.description && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.description}
                    </Typography>
                  </Box>
                )}

                {/* Informations détaillées */}
                <Grid container spacing={2}>
                  {product.supplier_name && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Fournisseur
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {product.supplier_name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {product.warehouse_name && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Warehouse sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Entrepôt
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {product.warehouse_code} - {product.warehouse_name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {product.lead_time_days && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShipping sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Délai de livraison
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {product.lead_time_days} jours
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Prix et statistiques */}
            <Grid container spacing={isMobile ? 2 : 3}>
              <Grid item xs={6}>
                <Card sx={{ borderRadius: 1, bgcolor: 'primary.50' }}>
                  <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                    <AttachMoney sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant={isMobile ? 'h5' : 'h4'} color="primary" fontWeight="bold">
                      {formatCurrency(product.price)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Prix de vente
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {product.cost_price > 0 && (
                <Grid item xs={6}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'info.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <AttachMoney sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="info.main" fontWeight="bold">
                        {formatCurrency(product.cost_price)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Prix d'achat
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {statistics?.sales_summary && (
                <>
                  <Grid item xs={6}>
                    <Card sx={{ borderRadius: 1, bgcolor: 'success.50' }}>
                      <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                        <Receipt sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                        <Typography variant={isMobile ? 'h5' : 'h4'} color="success.main" fontWeight="bold">
                          {statistics.sales_summary.total_invoices || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Factures
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6}>
                    <Card sx={{ borderRadius: 1, bgcolor: 'warning.50' }}>
                      <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                        <TrendingUp sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                        <Typography variant={isMobile ? 'h5' : 'h4'} color="warning.main" fontWeight="bold">
                          {formatCurrency(statistics.sales_summary.total_sales_amount || 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Ventes totales
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Stock */}
            {product.stock_quantity !== null && product.stock_quantity !== undefined && (
              <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Inventory sx={{ color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight="600">
                      Stock
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 1,
                      bgcolor: `${stockStatus}.50`,
                    }}
                  >
                    <Typography variant="h3" color={`${stockStatus}.main`} fontWeight="bold">
                      {product.stock_quantity}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {product.stock_quantity === 0 ? 'Rupture de stock' :
                        product.stock_quantity <= 10 ? 'Stock bas' : 'En stock'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  Informations système
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Créé le
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(product.created_at)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Modifié le
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(product.updated_at)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: Factures */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Receipt color="primary" />
            Factures
          </Typography>
          <ProductInvoicesTable
            invoices={statistics?.recent_invoices}
            loading={!statistics}
          />
        </Box>
      )}

      {/* Tab: Clients */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <People color="primary" />
            Clients
          </Typography>
          <ProductClientsTable
            clients={statistics?.top_clients}
            loading={!statistics}
          />
        </Box>
      )}
    </Box>
  );
}

export default ProductDetail;
