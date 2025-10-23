import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Autocomplete,
  IconButton,
  Box,
  Typography,
  Chip,
  Tabs,
  Tab,
  Alert,
  Tooltip,
} from '@mui/material';
import { Add, Search, Inventory, Build } from '@mui/icons-material';
import {
  getProductTypeIcon,
  getStockStatusColor,
  getStockStatusLabel,
  canAddProductToInvoice,
  filterProductsByType,
} from '../../utils/productHelpers';
import { formatCurrency } from '../../utils/formatters';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`product-tabpanel-${index}`}
      aria-labelledby={`product-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function ProductSelectionDialog({
  open,
  onClose,
  products,
  newItem,
  setNewItem,
  onAddItem,
  onCreateProduct,
  editingItemIndex,
}) {
  const [tabValue, setTabValue] = useState(0);
  const [stockError, setStockError] = useState('');

  // Séparer les produits par type
  const physicalProducts = useMemo(
    () => filterProductsByType(products, 'physical'),
    [products]
  );

  const servicesAndDigital = useMemo(
    () =>
      products.filter(
        (p) => p.product_type === 'service' || p.product_type === 'digital'
      ),
    [products]
  );

  const handleProductSelect = (product) => {
    if (product) {
      // Vérifier la disponibilité
      const { canAdd, reason } = canAddProductToInvoice(product, newItem.quantity || 1);
      if (!canAdd) {
        setStockError(reason);
      } else {
        setStockError('');
      }

      setNewItem((prev) => ({
        ...prev,
        product: product,
        description: product.name,
        unit_price: product.price || 0,
        product_reference: product.reference || '',
      }));
    } else {
      setStockError('');
    }
  };

  const handleQuantityChange = (quantity) => {
    setNewItem((prev) => ({ ...prev, quantity }));

    // Re-vérifier le stock si un produit est sélectionné
    if (newItem.product) {
      const { canAdd, reason } = canAddProductToInvoice(newItem.product, quantity);
      setStockError(canAdd ? '' : reason);
    }
  };

  const handleSubmit = () => {
    if (stockError) {
      return; // Ne pas permettre la soumission si erreur de stock
    }
    onAddItem();
    setStockError('');
  };

  const renderProductOption = (props, option) => {
    const { key, ...otherProps } = props;
    const { canAdd, reason } = canAddProductToInvoice(option, newItem.quantity || 1);
    const isDisabled = !canAdd;

    return (
      <Tooltip title={isDisabled ? reason : ''} key={key}>
        <Box
          component="li"
          {...otherProps}
          sx={{
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            '&:hover': {
              backgroundColor: isDisabled ? 'transparent' : 'action.hover',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography sx={{ fontSize: '1.5rem', mr: 1 }}>
              {getProductTypeIcon(option.product_type)}
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1">{option.name}</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Réf: {option.reference}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • {formatCurrency(option.price)}
                </Typography>
                {option.product_type === 'physical' && (
                  <Chip
                    label={getStockStatusLabel(
                      option.stock_status,
                      option.stock_quantity
                    )}
                    size="small"
                    color={getStockStatusColor(option.stock_status)}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Tooltip>
    );
  };

  const isFormValid =
    newItem.description &&
    newItem.quantity > 0 &&
    newItem.unit_price >= 0 &&
    !stockError;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {editingItemIndex >= 0 ? "Modifier l'article" : 'Ajouter un article'}
      </DialogTitle>
      <DialogContent>
        {/* Tabs pour séparer Produits et Services */}
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<Inventory />}
            label={`Produits physiques (${physicalProducts.length})`}
            iconPosition="start"
          />
          <Tab
            icon={<Build />}
            label={`Services & Digital (${servicesAndDigital.length})`}
            iconPosition="start"
          />
        </Tabs>

        <Grid container spacing={2}>
          {/* Tab Panel 1: Produits physiques */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Autocomplete
                    options={physicalProducts}
                    getOptionLabel={(option) => option.name || ''}
                    value={newItem.product}
                    onChange={(event, newValue) => handleProductSelect(newValue)}
                    fullWidth
                    getOptionDisabled={(option) =>
                      !canAddProductToInvoice(option, newItem.quantity || 1).canAdd
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Rechercher un produit"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <Search sx={{ mr: 1, color: 'action.active' }} />
                          ),
                        }}
                      />
                    )}
                    renderOption={renderProductOption}
                  />
                  <IconButton
                    onClick={onCreateProduct}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    <Add />
                  </IconButton>
                </Box>
              </Grid>

              {stockError && (
                <Grid item xs={12}>
                  <Alert severity="error">{stockError}</Alert>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Référence produit"
                  value={newItem.product_reference}
                  onChange={(e) =>
                    setNewItem({ ...newItem, product_reference: e.target.value })
                  }
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantité"
                  type="number"
                  required
                  value={newItem.quantity}
                  onChange={(e) =>
                    handleQuantityChange(parseInt(e.target.value) || 1)
                  }
                  inputProps={{ min: 1 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  required
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prix unitaire HT"
                  type="number"
                  required
                  value={newItem.unit_price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })
                  }
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    bgcolor: 'success.50',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                    {formatCurrency((newItem.quantity || 0) * (newItem.unit_price || 0))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total ligne
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab Panel 2: Services & Digital */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Autocomplete
                    options={servicesAndDigital}
                    getOptionLabel={(option) => option.name || ''}
                    value={newItem.product}
                    onChange={(event, newValue) => handleProductSelect(newValue)}
                    fullWidth
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Rechercher un service"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <Search sx={{ mr: 1, color: 'action.active' }} />
                          ),
                        }}
                      />
                    )}
                    renderOption={renderProductOption}
                  />
                  <IconButton
                    onClick={onCreateProduct}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    <Add />
                  </IconButton>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Référence service"
                  value={newItem.product_reference}
                  onChange={(e) =>
                    setNewItem({ ...newItem, product_reference: e.target.value })
                  }
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantité"
                  type="number"
                  required
                  value={newItem.quantity}
                  onChange={(e) =>
                    handleQuantityChange(parseInt(e.target.value) || 1)
                  }
                  inputProps={{ min: 1 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  required
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prix unitaire HT"
                  type="number"
                  required
                  value={newItem.unit_price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })
                  }
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    bgcolor: 'success.50',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                    {formatCurrency((newItem.quantity || 0) * (newItem.unit_price || 0))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total ligne
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isFormValid}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          {editingItemIndex >= 0 ? 'Modifier' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProductSelectionDialog;
