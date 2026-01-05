import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  IconButton,
  Avatar,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  Edit,
  Inventory,
  Visibility,
  Search,
  FilterList,
  AttachMoney,
  Business,
} from '@mui/icons-material';
import { productsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.list();
      setProducts(response.data.results || response.data);
    } catch (err) {
      setError('Erreur lors du chargement des produits');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityColor = (isAvailable) => {
    return isAvailable ? 'success' : 'error';
  };

  const getAvailabilityLabel = (isAvailable) => {
    return isAvailable ? 'Disponible' : 'Indisponible';
  };

  const getStockStatus = (product) => {
    if (!product.stock_quantity && product.stock_quantity !== 0) return null;

    if (product.stock_quantity === 0) {
      return { label: 'Rupture', color: 'error' };
    } else if (product.stock_quantity <= product.minimum_order_quantity) {
      return { label: 'Stock bas', color: 'warning' };
    } else {
      return { label: 'En stock', color: 'success' };
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || product.category?.id === categoryFilter;

    const matchesStatus = !statusFilter ||
      (statusFilter === 'available' && product.is_available) ||
      (statusFilter === 'unavailable' && !product.is_available) ||
      (statusFilter === 'low_stock' && getStockStatus(product)?.color === 'warning') ||
      (statusFilter === 'out_of_stock' && getStockStatus(product)?.color === 'error');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const MobileProductCard = ({ product }) => {
    const stockStatus = getStockStatus(product);
    return (
      <Card sx={{
        mb: 1.5,
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderColor: 'primary.main',
          background: 'rgba(255, 255, 255, 0.95)'
        }
      }}>
        <CardContent sx={{ p: 1.5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {product.image ? (
                <Avatar
                  src={product.image}
                  sx={{ width: 32, height: 32 }}
                  variant="rounded"
                />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <Inventory fontSize="small" />
                </Avatar>
              )}
              <Box>
                <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {product.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  SKU: {product.sku}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={getAvailabilityLabel(product.is_available)}
              color={getAvailabilityColor(product.is_available)}
              size="small"
              sx={{ fontSize: '0.7rem', height: 20, fontWeight: 500 }}
            />
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business fontSize="small" sx={{ color: 'text.secondary', fontSize: '0.875rem' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {product.supplier?.name || 'N/A'}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {formatCurrency(product.unit_price)}
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory fontSize="small" sx={{ color: 'text.secondary', fontSize: '0.875rem' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {product.stock_quantity !== null ? product.stock_quantity : 'N/A'}
              </Typography>
              {stockStatus && (
                <Chip
                  label={stockStatus.label}
                  color={stockStatus.color}
                  size="small"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {formatDate(product.created_at)}
            </Typography>
          </Box>

          <Divider sx={{ mb: 1.25, opacity: 0.6 }} />

          <Stack direction="row" spacing={0.75} justifyContent="flex-end">
            <IconButton
              size="small"
              onClick={() => navigate(`/products/${product.id}`)}
              sx={{
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                color: 'primary.main',
                width: 28,
                height: 28,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
                }
              }}
            >
              <Visibility fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => navigate(`/products/${product.id}/edit`)}
              sx={{
                bgcolor: 'rgba(66, 66, 66, 0.08)',
                color: 'text.secondary',
                width: 28,
                height: 28,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'secondary.main',
                  color: 'white',
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(66, 66, 66, 0.3)'
                }
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={isMobile ? 2 : 3}>
      {/* Filters */}
      <Card sx={{
        mb: 2.5,
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher par nom, SKU ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: 2
                      }
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: 2
                      }
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Statut"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="available">Disponible</MenuItem>
                  <MenuItem value="unavailable">Indisponible</MenuItem>
                  <MenuItem value="low_stock">Stock bas</MenuItem>
                  <MenuItem value="out_of_stock">Rupture de stock</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Catégorie"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {/* TODO: Add categories from API */}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setStatusFilter('');
                }}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                Effacer
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isMobile ? (
        <Box>
          {filteredProducts.map((product) => (
            <MobileProductCard key={product.id} product={product} />
          ))}
          {filteredProducts.length === 0 && products.length > 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                Aucun produit ne correspond aux filtres
              </Typography>
            </Box>
          )}
          {products.length === 0 && !loading && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                Aucun produit trouvé
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/products/new')}
                sx={{ mt: 2 }}
              >
                Créer le premier produit
              </Button>
            </Box>
          )}
        </Box>
      ) : (
        <Card sx={{
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{
              borderRadius: 0,
              background: 'transparent',
              boxShadow: 'none'
            }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Produit</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Fournisseur</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Prix</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Stock</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Disponibilité</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Date création</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <TableRow key={product.id} hover sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                          transform: 'scale(1.001)'
                        }
                      }}>
                        <TableCell onClick={() => navigate(`/products/${product.id}`)} sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {product.image ? (
                              <Avatar
                                src={product.image}
                                sx={{ width: 40, height: 40 }}
                                variant="rounded"
                              />
                            ) : (
                              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                                <Inventory />
                              </Avatar>
                            )}
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {product.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                SKU: {product.sku}
                              </Typography>
                              {product.category && (
                                <Chip
                                  label={product.category.name}
                                  size="small"
                                  variant="outlined"
                                  sx={{ ml: 1, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          {product.supplier && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Business fontSize="small" color="action" />
                              <Typography
                                variant="body2"
                                color="primary"
                                sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
                                onClick={() => navigate(`/suppliers/${product.supplier.id}`)}
                              >
                                {product.supplier.name}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {formatCurrency(product.unit_price)}
                            </Typography>
                            {product.bulk_price && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Gros: {formatCurrency(product.bulk_price)}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Inventory fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {product.stock_quantity !== null ? product.stock_quantity : 'N/A'}
                            </Typography>
                            {stockStatus && (
                              <Chip
                                label={stockStatus.label}
                                color={stockStatus.color}
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip
                            label={getAvailabilityLabel(product.is_available)}
                            color={getAvailabilityColor(product.is_available)}
                            size="small"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                            {formatDate(product.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/products/${product.id}`)}
                              sx={{
                                bgcolor: 'rgba(25, 118, 210, 0.08)',
                                color: 'primary.main',
                                width: 32,
                                height: 32,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
                                }
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/products/${product.id}/edit`)}
                              sx={{
                                bgcolor: 'rgba(66, 66, 66, 0.08)',
                                color: 'text.secondary',
                                width: 32,
                                height: 32,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                  bgcolor: 'secondary.main',
                                  color: 'white',
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 2px 8px rgba(66, 66, 66, 0.3)'
                                }
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default Products;