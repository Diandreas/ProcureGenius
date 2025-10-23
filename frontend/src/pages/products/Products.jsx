import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Avatar,
  Stack,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  FilterList,
  Inventory,
  Business,
  Warehouse,
  TrendingUp,
  Category,
  Warning,
  Error,
  CheckCircle,
  DesignServices,
} from '@mui/icons-material';
import { productsAPI, warehousesAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

function Products() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [stockFilter, setStockFilter] = useState(''); // Nouveau: filtre de stock
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.list();
      setProducts(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.list();
      setWarehouses(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm ||
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || product.category?.id === categoryFilter;
    const matchesWarehouse = !warehouseFilter || product.warehouse === warehouseFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'available' && product.is_active) ||
      (statusFilter === 'unavailable' && !product.is_active);

    // Nouveau: filtre par statut de stock
    const matchesStock = !stockFilter || (() => {
      if (stockFilter === 'out_of_stock') {
        return product.product_type === 'physical' && product.stock_quantity === 0;
      }
      if (stockFilter === 'low_stock') {
        return product.product_type === 'physical' &&
               product.stock_quantity > 0 &&
               product.stock_quantity <= (product.low_stock_threshold || 10);
      }
      if (stockFilter === 'ok') {
        return product.product_type === 'physical' &&
               product.stock_quantity > (product.low_stock_threshold || 10);
      }
      if (stockFilter === 'services') {
        return product.product_type !== 'physical';
      }
      return true;
    })();

    return matchesSearch && matchesCategory && matchesWarehouse && matchesStatus && matchesStock;
  });

  const ProductCard = ({ product }) => (
    <Card
      onClick={() => navigate(`/products/${product.id}`)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Avatar
            src={product.image}
            variant="rounded"
            sx={{
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              bgcolor: 'primary.main',
              borderRadius: 1,
            }}
          >
            <Inventory />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
              }}
            >
              {product.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.75rem' }}
            >
              {product.sku || product.reference}
            </Typography>
          </Box>
        </Box>

        {/* Prix */}
        <Box
          sx={{
            bgcolor: 'primary.50',
            borderRadius: 1,
            p: 1,
            mb: 1.5,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h6"
            color="primary"
            sx={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.25rem' }}
          >
            {formatCurrency(product.price || product.unit_price)}
          </Typography>
        </Box>

        {/* Infos */}
        <Stack spacing={0.75}>
          {product.supplier_name && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {product.supplier_name}
              </Typography>
            </Box>
          )}

          {product.warehouse_code && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Warehouse sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {product.warehouse_code}
              </Typography>
            </Box>
          )}

          {product.category && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Category sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {product.category.name}
              </Typography>
            </Box>
          )}

          {product.stock_quantity !== null && product.stock_quantity !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Inventory sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                Stock: {product.stock_quantity}
              </Typography>
              {product.stock_quantity === 0 && (
                <Chip
                  label="Rupture"
                  size="small"
                  color="error"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              )}
              {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                <Chip
                  label="Bas"
                  size="small"
                  color="warning"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              )}
            </Box>
          )}
        </Stack>

        {/* Footer */}
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={product.is_active ? 'Actif' : 'Inactif'}
            size="small"
            color={product.is_active ? 'success' : 'default'}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          {product.total_invoices > 0 && (
            <Chip
              icon={<TrendingUp sx={{ fontSize: 14 }} />}
              label={product.total_invoices}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Calculer les statistiques
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const lowStock = products.filter(p => p.product_type === 'physical' && p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold || 10)).length;
  const outOfStock = products.filter(p => p.product_type === 'physical' && p.stock_quantity === 0).length;
  const inStock = products.filter(p => p.product_type === 'physical' && p.stock_quantity > (p.low_stock_threshold || 10)).length;
  const servicesCount = products.filter(p => p.product_type !== 'physical').length;

  // Fonction pour gérer le clic sur les cartes de statistiques
  const handleStockFilterClick = (filterValue) => {
    if (stockFilter === filterValue) {
      setStockFilter(''); // Désactiver le filtre si déjà actif
    } else {
      setStockFilter(filterValue); // Activer le nouveau filtre
    }
  };

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
          Produits
        </Typography>

        {/* Stats Cards - Cliquables pour filtrer */}
        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
          {/* En stock (OK) */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleStockFilterClick('ok')}
              sx={{
                borderRadius: 2,
                bgcolor: 'success.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: stockFilter === 'ok' ? 'success.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'success.main',
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircle sx={{ fontSize: isMobile ? 20 : 24, color: 'success.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="success.main">
                      {inStock}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      En stock
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Stock bas */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleStockFilterClick('low_stock')}
              sx={{
                borderRadius: 2,
                bgcolor: 'warning.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: stockFilter === 'low_stock' ? 'warning.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'warning.main',
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Warning sx={{ fontSize: isMobile ? 20 : 24, color: 'warning.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="warning.main">
                      {lowStock}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Stock bas
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Rupture de stock */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleStockFilterClick('out_of_stock')}
              sx={{
                borderRadius: 2,
                bgcolor: 'error.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: stockFilter === 'out_of_stock' ? 'error.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'error.main',
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Error sx={{ fontSize: isMobile ? 20 : 24, color: 'error.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="error.main">
                      {outOfStock}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Rupture
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Services / Digital */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleStockFilterClick('services')}
              sx={{
                borderRadius: 2,
                bgcolor: 'info.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: stockFilter === 'services' ? 'info.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'info.main',
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <DesignServices sx={{ fontSize: isMobile ? 20 : 24, color: 'info.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="info.main">
                      {servicesCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Services
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Total */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => setStockFilter('')}
              sx={{
                borderRadius: 2,
                bgcolor: stockFilter === '' ? 'primary.100' : 'primary.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: stockFilter === '' ? 'primary.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: 'primary.main',
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Inventory sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="primary">
                      {totalProducts}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      Tous
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Indicateur de filtre actif */}
        {stockFilter && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Filtre actif:
            </Typography>
            <Chip
              label={
                stockFilter === 'ok' ? 'En stock' :
                stockFilter === 'low_stock' ? 'Stock bas' :
                stockFilter === 'out_of_stock' ? 'Rupture de stock' :
                stockFilter === 'services' ? 'Services/Digital' : ''
              }
              onDelete={() => setStockFilter('')}
              color={
                stockFilter === 'ok' ? 'success' :
                stockFilter === 'low_stock' ? 'warning' :
                stockFilter === 'out_of_stock' ? 'error' :
                stockFilter === 'services' ? 'info' : 'default'
              }
              size="small"
            />
          </Box>
        )}
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, borderRadius: 1 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              />
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  bgcolor: showFilters ? 'primary.main' : 'transparent',
                  color: showFilters ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: showFilters ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <FilterList />
              </IconButton>
            </Box>

            {showFilters && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Statut"
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="available">Disponible</MenuItem>
                      <MenuItem value="unavailable">Indisponible</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Catégorie</InputLabel>
                    <Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      label="Catégorie"
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">Toutes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Entrepôt</InputLabel>
                    <Select
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value)}
                      label="Entrepôt"
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      {warehouses.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title="Aucun produit"
          description="Aucun produit ne correspond à vos critères de recherche."
          actionLabel="Nouveau produit"
          onAction={() => navigate('/products/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredProducts.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default Products;
