import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
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
  Build,
  CloudDownload,
  PictureAsPdf,
  Print,
  Download,
  Receipt,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { fetchProducts } from '../../store/slices/productsSlice';
import { warehousesAPI } from '../../services/api';
import useCurrency from '../../hooks/useCurrency';
import EmptyState from '../../components/EmptyState';
import { generateProductsBulkReport, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';

// Product type visual configuration
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

function Products() {
  const { t } = useTranslation(['products', 'common']);
  const { format: formatCurrency } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redux state
  const { products, loading, error } = useSelector((state) => state.products);

  // Local state for warehouses (not in Redux yet)
  const [warehouses, setWarehouses] = useState([]);

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [warehouseMode, setWarehouseMode] = useState(false);
  const [reportConfigOpen, setReportConfigOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    dateStart: '',
    dateEnd: '',
    selectedProducts: [],
  });

  useEffect(() => {
    dispatch(fetchProducts());
    fetchWarehouses();
  }, [dispatch]);

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

  const ProductCard = ({ product }) => {
    const typeConfig = TYPE_CONFIG[product.product_type] || TYPE_CONFIG.physical;
    const TypeIcon = typeConfig.icon;

    return (
      <Card
        onClick={() => navigate(`/products/${product.id}`)}
        sx={{
          cursor: 'pointer',
          height: '100%',
          borderRadius: 1,
          borderLeft: `4px solid ${typeConfig.color}`,
          backgroundColor: typeConfig.bgColor,
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: typeConfig.color,
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
                bgcolor: typeConfig.color,
                borderRadius: 1,
              }}
            >
              <TypeIcon />
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
                    display: 'block',
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

            {product.product_type === 'physical' ? (
              product.stock_quantity !== null && product.stock_quantity !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Inventory sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    Stock: {product.stock_quantity}
                  </Typography>
                  {product.stock_quantity === 0 && (
                    <Chip
                      label={t('products:stockStatus.outOfStock')}
                      size="small"
                      color="error"
                      sx={{ fontSize: '0.65rem', height: 18 }}
                    />
                  )}
                  {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                    <Chip
                      label={t('products:stockStatus.low')}
                      size="small"
                      color="warning"
                      sx={{ fontSize: '0.65rem', height: 18 }}
                    />
                  )}
                </Box>
              )
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <TypeIcon sx={{ fontSize: 16, color: typeConfig.color }} />
                <Chip
                  label={typeConfig.label}
                  size="small"
                  sx={{
                    backgroundColor: typeConfig.color,
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </Box>
            )}
          </Stack>

          {/* Footer */}
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={product.is_active ? t('products:status.active') : t('products:status.inactive')}
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
  };

  if (loading && products.length === 0) {
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

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{t('products:messages.loadingError')}</Alert>
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

  const handleGenerateReportClick = () => {
    setReportConfigOpen(true);
  };

  const handleConfigureReport = async () => {
    setReportConfigOpen(false);
    setGeneratingPdf(true);
    setReportDialogOpen(true);

    try {
      const pdfBlob = await generateProductsBulkReport({
        itemIds: reportFilters.selectedProducts.length > 0 ? reportFilters.selectedProducts : undefined,
        dateStart: reportFilters.dateStart || undefined,
        dateEnd: reportFilters.dateEnd || undefined,
        category: categoryFilter || undefined,
      });
      setGeneratedPdfBlob(pdfBlob);
    } catch (error) {
      console.error('Error generating report:', error);
      enqueueSnackbar(t('products:messages.reportError', 'Erreur lors de la génération du rapport'), {
        variant: 'error',
      });
      setReportDialogOpen(false);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleCloseDialog = () => {
    setReportDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  const handlePdfAction = (action) => {
    if (!generatedPdfBlob) return;

    if (action === 'download') {
      downloadPDF(generatedPdfBlob, `rapport-produits-${new Date().getTime()}.pdf`);
      enqueueSnackbar(t('products:messages.pdfDownloadedSuccess', 'PDF téléchargé avec succès'), {
        variant: 'success',
      });
    } else if (action === 'preview') {
      openPDFInNewTab(generatedPdfBlob);
    } else if (action === 'print') {
      const pdfUrl = URL.createObjectURL(generatedPdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
        };
      }
      enqueueSnackbar(t('products:messages.printWindowOpened', 'Fenêtre d\'impression ouverte'), {
        variant: 'success',
      });
    }
    setReportDialogOpen(false);
  };


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
      {/* Header avec titre et bouton PDF */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
          {t('products:title', 'Produits')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {warehouses.length > 0 && (
            <Button
              variant={warehouseMode ? 'contained' : 'outlined'}
              startIcon={<Warehouse />}
              onClick={() => setWarehouseMode(!warehouseMode)}
              size="small"
            >
              {warehouseMode ? t('products:warehouseMode.active', 'Mode entrepôt actif') : t('products:warehouseMode.activate', 'Activer le mode entrepôt')}
            </Button>
          )}
          <Button
            variant="outlined"
            color="success"
            startIcon={<PictureAsPdf />}
            onClick={handleGenerateReportClick}
            disabled={filteredProducts.length === 0}
          >
            {t('products:actions.generateReport', 'Rapport PDF')}
          </Button>
        </Box>
      </Box>

      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        {/* Stats Cards - Cliquables pour filtrer */}
        <Grid container spacing={isMobile ? 1 : 2}>
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
                      {t('products:filters.inStock')}
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
                      {t('products:filters.lowStock')}
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
                      {t('products:filters.outOfStock')}
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
                      {t('products:filters.services')}
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
                      {t('products:filters.all')}
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
              {t('products:filters.activeFilter')}
            </Typography>
            <Chip
              label={
                stockFilter === 'ok' ? t('products:filters.inStock') :
                  stockFilter === 'low_stock' ? t('products:filters.lowStock') :
                    stockFilter === 'out_of_stock' ? t('products:filters.outOfStock') :
                      stockFilter === 'services' ? t('products:filters.services') : ''
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
                placeholder={t('products:search.placeholder')}
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
                    <InputLabel>{t('products:filters.statusLabel')}</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label={t('products:filters.statusLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('products:filters.all')}</MenuItem>
                      <MenuItem value="available">{t('products:status.available')}</MenuItem>
                      <MenuItem value="unavailable">{t('products:status.unavailable')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('products:filters.categoryLabel')}</InputLabel>
                    <Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      label={t('products:filters.categoryLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('products:filters.allCategories')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('products:filters.warehouseLabel')}</InputLabel>
                    <Select
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value)}
                      label={t('products:filters.warehouseLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('products:filters.allWarehouses')}</MenuItem>
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
          title={t('products:messages.noProducts')}
          description={t('products:messages.noProductsDescription')}
          actionLabel={t('products:newProduct')}
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

      {/* Configuration Dialog */}
      <Dialog open={reportConfigOpen} onClose={() => setReportConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('products:report.title', 'Générer un Rapport de Produits')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              📅 Période (optionnel)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Filtrer par période - laisser vide pour tout inclure
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                label="Date de début"
                type="date"
                value={reportFilters.dateStart}
                onChange={(e) => setReportFilters({ ...reportFilters, dateStart: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: reportFilters.dateEnd || undefined }}
              />
              <TextField
                label="Date de fin"
                type="date"
                value={reportFilters.dateEnd}
                onChange={(e) => setReportFilters({ ...reportFilters, dateEnd: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: reportFilters.dateStart || undefined }}
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                📋 Produits à inclure
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {reportFilters.selectedProducts.length > 0
                  ? `${reportFilters.selectedProducts.length} produit(s) sélectionné(s)`
                  : 'Tous les produits filtrés seront inclus'}
              </Typography>

              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    {filteredProducts.map((product) => (
                      <FormControlLabel
                        key={product.id}
                        control={
                          <Checkbox
                            checked={reportFilters.selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedProducts: [...reportFilters.selectedProducts, product.id]
                                });
                              } else {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedProducts: reportFilters.selectedProducts.filter(id => id !== product.id)
                                });
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{product.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {product.sku || '-'} • {formatCurrency(product.sale_price || 0)}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0, py: 0.5 }}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Box>

              {filteredProducts.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedProducts: filteredProducts.map(p => p.id) })}
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedProducts: [] })}
                  >
                    Tout désélectionner
                  </Button>
                </Box>
              )}
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                {reportFilters.selectedProducts.length > 0
                  ? `Un rapport sera généré avec ${reportFilters.selectedProducts.length} produit(s) sélectionné(s)`
                  : `Un rapport sera généré avec tous les produits (${filteredProducts.length})`}
                {(reportFilters.dateStart || reportFilters.dateEnd) && ' pour la période spécifiée'}
                .
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportConfigOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleConfigureReport}
            variant="contained"
            color="success"
            startIcon={<PictureAsPdf />}
          >
            Générer le Rapport
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Actions Dialog */}
      <Dialog open={reportDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('products:dialogs.generatePdf', 'Générer un PDF du rapport')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {generatingPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t('products:labels.generatingLabel', 'Génération du rapport en cours...')}
              </Typography>
            </Box>
          ) : generatedPdfBlob ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('products:messages.reportGenerated', 'Rapport généré avec succès ! Choisissez une action ci-dessous.')}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                {t('products:messages.pdfGenerationHelpText', 'Vous pouvez prévisualiser, télécharger ou imprimer directement le rapport.')}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={generatingPdf}>
            {t('products:buttons.cancel', 'Annuler')}
          </Button>
          {generatedPdfBlob && (
            <>
              <Button
                onClick={() => handlePdfAction('preview')}
                variant="outlined"
                startIcon={<Receipt />}
              >
                {t('products:buttons.preview', 'Aperçu')}
              </Button>
              <Button
                onClick={() => handlePdfAction('print')}
                variant="outlined"
                color="secondary"
                startIcon={<Print />}
              >
                {t('products:buttons.print', 'Imprimer')}
              </Button>
              <Button
                onClick={() => handlePdfAction('download')}
                variant="contained"
                color="success"
                startIcon={<Download />}
              >
                {t('products:buttons.download', 'Télécharger')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Products;
