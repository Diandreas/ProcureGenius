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
} from '@mui/material';
import { Add, Edit, Inventory } from '@mui/icons-material';
import { productsAPI } from '../../services/api';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const getTypeColor = (type) => {
    const colors = {
      physical: 'primary',
      service: 'success',
      digital: 'secondary'
    };
    return colors[type] || 'default';
  };

  const getTypeLabel = (type) => {
    const labels = {
      physical: 'Physique',
      service: 'Service',
      digital: 'Numérique'
    };
    return labels[type] || type;
  };

  const getStockStatus = (product) => {
    if (product.product_type !== 'physical') return null;

    if (product.stock_quantity === 0) {
      return { label: 'Rupture', color: 'error' };
    } else if (product.stock_quantity <= product.low_stock_threshold) {
      return { label: 'Stock bas', color: 'warning' };
    } else {
      return { label: 'En stock', color: 'success' };
    }
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
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Produits et Services</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/products/create')}
        >
          Nouveau produit
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Prix</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Statut stock</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>{product.reference}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">{product.name}</Typography>
                        {product.description && (
                          <Typography variant="caption" color="textSecondary">
                            {product.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getTypeLabel(product.product_type)}
                          color={getTypeColor(product.product_type)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{product.price} CAD</TableCell>
                      <TableCell>
                        {product.product_type === 'physical' ? (
                          <Box display="flex" alignItems="center">
                            <Inventory fontSize="small" sx={{ mr: 1 }} />
                            {product.stock_quantity}
                          </Box>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {stockStatus && (
                          <Chip
                            label={stockStatus.label}
                            color={stockStatus.color}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => navigate(`/products/${product.id}/edit`)}
                        >
                          Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {products.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                Aucun produit trouvé
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/products/create')}
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