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
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Produits ({filteredProducts.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/products/new')}
        >
          Nouveau produit
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher par nom, SKU ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
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
              >
                Effacer
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell>Fournisseur</TableCell>
                  <TableCell>Prix</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Disponibilité</TableCell>
                  <TableCell>Date création</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <TableRow key={product.id} hover sx={{ cursor: 'pointer' }}>
                      <TableCell onClick={() => navigate(`/products/${product.id}`)}>
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
                            <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                              {product.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              SKU: {product.sku}
                            </Typography>
                            {product.category && (
                              <Chip
                                label={product.category.name}
                                size="small"
                                variant="outlined"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {product.supplier && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Business fontSize="small" color="action" />
                            <Typography
                              variant="body2"
                              color="primary"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/suppliers/${product.supplier.id}`)}
                            >
                              {product.supplier.name}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(product.unit_price)}
                          </Typography>
                          {product.bulk_price && (
                            <Typography variant="caption" color="text.secondary">
                              Gros: {formatCurrency(product.bulk_price)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Inventory fontSize="small" color="action" />
                          <Typography variant="body2">
                            {product.stock_quantity !== null ? product.stock_quantity : 'N/A'}
                          </Typography>
                          {stockStatus && (
                            <Chip
                              label={stockStatus.label}
                              color={stockStatus.color}
                              size="small"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getAvailabilityLabel(product.is_available)}
                          color={getAvailabilityColor(product.is_available)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(product.created_at)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/products/${product.id}`)}
                            color="primary"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                            color="primary"
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
        </CardContent>
      </Card>
    </Box>
  );
}

export default Products;