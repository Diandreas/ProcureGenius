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
  Tooltip,
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
  History,
  Build,
  CloudDownload,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { productsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import ProductInvoicesTable from '../../components/products/ProductInvoicesTable';
import ProductClientsTable from '../../components/products/ProductClientsTable';
import StockMovementsTab from '../../components/StockMovementsTab';

// Configuration des types de produits (harmonisé avec ProductCard)
const TYPE_CONFIG = {
  physical: {
    color: '#2196F3',
    icon: Inventory,
    label: 'Physique',
    bgColor: 'rgba(33, 150, 243, 0.1)'
  },
  service: {
    color: '#4CAF50',
    icon: Build,
    label: 'Service',
    bgColor: 'rgba(76, 175, 80, 0.1)'
  },
  digital: {
    color: '#9C27B0',
    icon: CloudDownload,
    label: 'Digital',
    bgColor: 'rgba(156, 39, 176, 0.1)'
  },
};

function ProductDetail() {
  const { t } = useTranslation(['products', 'common']);
  const { format: formatCurrency } = useCurrency();
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
      enqueueSnackbar(t('products:messages.loadProductError'), { variant: 'error' });
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
      console.error('Error loading product statistics:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('products:messages.deleteConfirmation', { name: product.name }))) {
      try {
        await productsAPI.delete(id);
        enqueueSnackbar(t('products:messages.productDeleted'), { variant: 'success' });
        navigate('/products');
      } catch (error) {
        enqueueSnackbar(t('products:messages.deleteError'), { variant: 'error' });
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
    return <Alert severity="error">{t('products:messages.productNotFound')}</Alert>;
  }

  const stockStatus = product.stock_quantity === 0 ? 'error' :
    product.stock_quantity <= 10 ? 'warning' : 'success';

  // Configuration du type de produit
  const typeConfig = TYPE_CONFIG[product.product_type] || TYPE_CONFIG.physical;
  const TypeIcon = typeConfig.icon;

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/products')} size={isMobile ? 'small' : 'medium'}>
            <ArrowBack />
          </IconButton>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ flex: 1 }}>
            {product.name}
          </Typography>
          <Tooltip title={t('products:tooltips.editProduct')}>
            <IconButton
              onClick={() => navigate(`/products/${id}/edit`)}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.light',
                  color: 'white',
                }
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('products:tooltips.deleteProduct')}>
            <IconButton
              onClick={handleDelete}
              sx={{
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'white',
                }
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            minWidth: isMobile ? 'auto' : 120,
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            px: isMobile ? 1 : 2,
          }
        }}
      >
        <Tab
          icon={<Info sx={{ fontSize: isMobile ? 18 : 20 }} />}
          label={t('products:tabs.info')}
          iconPosition="start"
        />
        <Tab
          icon={<Receipt sx={{ fontSize: isMobile ? 18 : 20 }} />}
          label={t('products:tabs.invoices')}
          iconPosition="start"
        />
        <Tab
          icon={<People sx={{ fontSize: isMobile ? 18 : 20 }} />}
          label={t('products:tabs.clients')}
          iconPosition="start"
        />
        {/* Afficher l'onglet Stock uniquement pour les produits physiques */}
        {product?.product_type === 'physical' && (
          <Tab
            icon={<History sx={{ fontSize: isMobile ? 18 : 20 }} />}
            label={t('products:tabs.movements')}
            iconPosition="start"
          />
        )}
      </Tabs>

      {/* Tab: Informations */}
      {activeTab === 0 && (
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Card principale - Harmonisée avec ProductCard */}
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                borderRadius: 1,
                mb: isMobile ? 2 : 3,
                borderLeft: `4px solid ${typeConfig.color}`,
                backgroundColor: typeConfig.bgColor,
              }}
            >
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Avatar
                    src={product.image}
                    variant="rounded"
                    sx={{
                      width: isMobile ? 80 : 100,
                      height: isMobile ? 80 : 100,
                      bgcolor: typeConfig.color,
                      borderRadius: 1,
                    }}
                  >
                    <TypeIcon sx={{ fontSize: isMobile ? 40 : 48, color: 'white' }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" gutterBottom>
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('products:labels.reference')}: {product.reference || product.sku}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      {/* Badge TYPE avec couleur et icône */}
                      <Chip
                        icon={<TypeIcon sx={{ color: 'white !important' }} />}
                        label={typeConfig.label}
                        size="small"
                        sx={{
                          backgroundColor: typeConfig.color,
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={product.is_active ? t('products:status.active') : t('products:status.inactive')}
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
                      {t('products:labels.description')}
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
                            {t('products:labels.supplier')}
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
                            {t('products:labels.warehouse')}
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
                            {t('products:labels.leadTime')}
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {product.lead_time_days} {t('products:labels.days')}
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
                      {t('products:stats.sellingPrice')}
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
                        {t('products:stats.costPrice')}
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
                          {t('products:tabs.invoices')}
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
                          {t('products:stats.totalSales')}
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
                      {t('products:labels.stock')}
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
                      {product.stock_quantity === 0 ? t('products:stockStatus.outOfStock') :
                        product.stock_quantity <= 10 ? t('products:stockStatus.low') : t('products:filters.inStock')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t('products:labels.systemInfo')}
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('products:labels.createdOn')}
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(product.created_at)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('products:labels.updatedOn')}
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
            {t('products:tabs.invoices')}
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
            {t('products:tabs.clients')}
          </Typography>
          <ProductClientsTable
            clients={statistics?.top_clients}
            loading={!statistics}
          />
        </Box>
      )}

      {/* Tab: Mouvements de Stock - Affiché uniquement pour les produits physiques */}
      {product?.product_type === 'physical' && activeTab === 3 && (
        <Box>
          <StockMovementsTab productId={id} productType={product?.product_type} />
        </Box>
      )}
    </Box>
  );
}

export default ProductDetail;
