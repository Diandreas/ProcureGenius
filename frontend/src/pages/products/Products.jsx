import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
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
import { alpha } from '@mui/material/styles';
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
  AutoAwesome,
  AttachMoney,
  Add,
  Edit,
  Delete,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { fetchProducts } from '../../store/slices/productsSlice';
import { warehousesAPI } from '../../services/api';
import { useHeader } from '../../contexts/HeaderContext';
import useCurrency from '../../hooks/useCurrency';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { generateProductsBulkReport, downloadPDF, openPDFInNewTab, generateProductReportPDF } from '../../services/pdfReportService';

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
  const { setPageHeader } = useHeader();

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

  const fetchWarehousesData = useCallback(async () => {
    try {
      const response = await warehousesAPI.list();
      setWarehouses(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchProducts());
    fetchWarehousesData();
  }, [dispatch, fetchWarehousesData]);

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

  // Tous les hooks doivent être appelés avant tout return conditionnel
  const handleGenerateReportClick = useCallback(() => {
    setReportConfigOpen(true);
  }, []);

  // Set the page header via Context
  useEffect(() => {
    setPageHeader({
      title: t('products:title', 'Produits'),
      // Action pour le bouton mobile à gauche
      action: {
        label: t('navigation:topBar.new', 'Nouveau'),
        icon: <Inventory />,
        onClick: () => navigate('/products/new'),
        color: 'primary',
        variant: 'contained'
      },
      // Actions pour le desktop à droite
      actions: (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Inventory />}
          onClick={() => navigate('/products/new')}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            px: { xs: 2, sm: 3 },
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
          }}
        >
          {t('products:newProduct', 'Nouveau produit')}
        </Button>
      )
    });
    return () => setPageHeader({ title: '', actions: null });
  }, [t, navigate, theme.palette.primary.main, setPageHeader]);

  // Enregistrer la fonction de rapport dans la top nav bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('register-report-action', {
      detail: {
        onClick: handleGenerateReportClick,
        label: t('products:actions.generateReport', 'Rapport PDF'),
      }
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('clear-report-action'));
    };
  }, [handleGenerateReportClick, t]);

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

  const ProductCard = ({ product, index }) => {
    const typeConfig = TYPE_CONFIG[product.product_type] || TYPE_CONFIG.physical;
    const TypeIcon = typeConfig.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          duration: 0.4,
          delay: index * 0.05,
          ease: [0.6, 0.05, 0.01, 0.9]
        }}
        whileHover={{
          boxShadow: `0 20px 60px ${alpha(typeConfig.color, 0.2)}`
        }}
        style={{ height: '100%' }}
      >
        <Card
          onClick={() => navigate(`/products/${product.id}`)}
          sx={{
            cursor: 'pointer',
            height: '100%',
            borderRadius: 3,
            background: theme => `linear-gradient(145deg,
              ${alpha(theme.palette.background.paper, 0.95)} 0%,
              ${alpha(typeConfig.color, 0.03)} 50%,
              ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            boxShadow: theme => `0 4px 20px ${alpha(typeConfig.color, 0.08)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'box-shadow 0.3s ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${typeConfig.color}, ${alpha(typeConfig.color, 0.5)})`,
              borderRadius: '3px 3px 0 0',
              boxShadow: `0 2px 8px ${alpha(typeConfig.color, 0.3)}`
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at top right, ${alpha(typeConfig.color, 0.05)} 0%, transparent 70%)`,
              pointerEvents: 'none'
            }
          }}
        >
        <CardContent sx={{ p: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', gap: isMobile ? 1 : 1.5, mb: isMobile ? 1 : 1.5 }}>
            <Avatar
              src={product.image}
              variant="rounded"
              sx={{
                width: isMobile ? 36 : 56,
                height: isMobile ? 36 : 56,
                bgcolor: typeConfig.color,
                borderRadius: 1,
              }}
            >
              <TypeIcon sx={{ fontSize: isMobile ? 20 : 28 }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 0.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  fontSize: isMobile ? '0.75rem' : '0.95rem',
                  lineHeight: 1.2
                }}
              >
                {product.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
              >
                {product.sku || product.reference}
              </Typography>
            </Box>
          </Box>

          {/* Prix & Valeur */}
          <Box
            sx={{
              bgcolor: 'primary.50',
              borderRadius: 1,
              p: isMobile ? 0.75 : 1,
              mb: isMobile ? 1 : 1.5,
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <Typography
              variant="subtitle1"
              color="primary"
              sx={{ fontWeight: 700, fontSize: isMobile ? '0.9rem' : '1.25rem' }}
            >
              {formatCurrency(product.price || product.unit_price)}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, alignItems: 'center', mt: -0.5 }}>
              {product.product_type === 'physical' && product.stock_quantity > 0 && (
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontSize: isMobile ? '0.55rem' : '0.7rem' }}
                >
                  Val: {formatCurrency((product.price || product.unit_price) * product.stock_quantity)}
                </Typography>
              )}
              {product.margin_percent !== undefined && product.margin_percent !== null && (
                <Chip 
                  label={`${product.margin_percent}%`}
                  size="small"
                  color="success"
                  variant="soft"
                  sx={{ 
                    height: 14, 
                    fontSize: '0.6rem',
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: 'success.dark',
                    fontWeight: 700
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Infos */}
          <Stack spacing={0.5}>
            {!isMobile && product.supplier_name && (
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
                <Warehouse sx={{ fontSize: isMobile ? 14 : 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                  {product.warehouse_code}
                </Typography>
              </Box>
            )}

            {product.product_type === 'physical' ? (
              product.stock_quantity !== null && product.stock_quantity !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Inventory sx={{ fontSize: isMobile ? 14 : 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 600 }}>
                    {product.stock_quantity}
                  </Typography>
                  {product.stock_quantity === 0 && (
                    <Chip
                      label={isMobile ? "0" : t('products:stockStatus.outOfStock')}
                      size="small"
                      color="error"
                      sx={{ fontSize: '0.6rem', height: 16 }}
                    />
                  )}
                  {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                    <Chip
                      label={isMobile ? "!" : t('products:stockStatus.low')}
                      size="small"
                      color="warning"
                      sx={{ fontSize: '0.6rem', height: 16 }}
                    />
                  )}
                </Box>
              )
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <TypeIcon sx={{ fontSize: isMobile ? 14 : 16, color: typeConfig.color }} />
                <Chip
                  label={typeConfig.label}
                  size="small"
                  sx={{
                    backgroundColor: typeConfig.color,
                    color: 'white',
                    fontSize: isMobile ? '0.6rem' : '0.7rem',
                    height: isMobile ? 18 : 20
                  }}
                />
              </Box>
            )}
          </Stack>

          {/* Footer */}
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={product.is_active ? (isMobile ? "✓" : t('products:status.active')) : (isMobile ? "✗" : t('products:status.inactive'))}
              size="small"
              color={product.is_active ? 'success' : 'default'}
              sx={{ fontSize: isMobile ? '0.6rem' : '0.7rem', height: isMobile ? 16 : 20 }}
            />
            
            {/* Sales Stat */}
            {product.total_sales_amount > 0 && (
              <Chip
                icon={<AttachMoney sx={{ fontSize: '10px !important' }} />}
                label={isMobile ? formatCurrency(product.total_sales_amount).slice(0, 5) : `${t('common:labels.sales', 'Ventes')}: ${formatCurrency(product.total_sales_amount)}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.6rem', height: isMobile ? 16 : 20, color: 'primary.main', borderColor: alpha(theme.palette.primary.main, 0.3) }}
              />
            )}

            {/* AI Insights Chips - Reduits sur mobile */}
            {(product.ai_insights || []).slice(0, isMobile ? 1 : undefined).map((insight, idx) => (
              <Chip
                key={idx}
                icon={<AutoAwesome sx={{ fontSize: '10px !important' }} />}
                label={insight.label}
                size="small"
                color={insight.type === 'error' ? 'error' : (insight.type === 'warning' ? 'warning' : 'success')}
                variant="outlined"
                sx={{ 
                  fontSize: '0.6rem', 
                  height: isMobile ? 16 : 20,
                  borderColor: theme => alpha(theme.palette[insight.type === 'error' ? 'error' : (insight.type === 'warning' ? 'warning' : 'success')].main, 0.5),
                  bgcolor: theme => alpha(theme.palette[insight.type === 'error' ? 'error' : (insight.type === 'warning' ? 'warning' : 'success')].main, 0.05),
                }}
              />
            ))}
          </Box>

          {/* Mobile Actions Overlay - Compact */}
          {isMobile && (
            <Box 
              sx={{ 
                mt: 1.5, 
                pt: 1.5, 
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  size="small"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const blob = await generateProductReportPDF(product);
                    openPDFInNewTab(blob);
                  }}
                  sx={{ 
                    bgcolor: alpha(theme.palette.success.main, 0.1), 
                    color: 'success.main',
                    width: 32,
                    height: 32
                  }}
                >
                  <PictureAsPdf sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/products/${product.id}/edit`);
                  }}
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1), 
                    color: 'primary.main',
                    width: 32,
                    height: 32
                  }}
                >
                  <Edit sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    // On pourrait ouvrir un dialogue ici, mais on simplifie pour le "wow"
                    enqueueSnackbar("Fonction de suppression protégée en démo", { variant: 'info' });
                  }}
                  sx={{ 
                    bgcolor: alpha(theme.palette.error.main, 0.1), 
                    color: 'error.main',
                    width: 32,
                    height: 32
                  }}
                >
                  <Delete sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
      </motion.div>
    );
  };

  if (loading && products.length === 0) {
    return <LoadingState message={t('products:messages.loading', 'Chargement des produits...')} />;
  }

  if (error) {
    return (
      <ErrorState
        title={t('products:messages.loadingError', 'Erreur de chargement')}
        message={t('products:messages.loadingErrorDescription', 'Impossible de charger les produits. Veuillez réessayer.')}
        showHome={false}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Calculer les statistiques
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const lowStock = products.filter(p => p.product_type === 'physical' && p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold || 10)).length;
  const outOfStock = products.filter(p => p.product_type === 'physical' && p.stock_quantity === 0).length;
  const inStock = products.filter(p => p.product_type === 'physical' && p.stock_quantity > (p.low_stock_threshold || 10)).length;
  const servicesCount = products.filter(p => p.product_type !== 'physical').length;

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Mode entrepôt - si disponible */}
      {warehouses.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant={warehouseMode ? 'contained' : 'outlined'}
            startIcon={<Warehouse />}
            onClick={() => setWarehouseMode(!warehouseMode)}
            size="small"
          >
            {warehouseMode ? t('products:warehouseMode.active', 'Mode entrepôt actif') : t('products:warehouseMode.activate', 'Activer le mode entrepôt')}
          </Button>
        </Box>
      )}

      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        {/* Stats Cards - Cliquables pour filtrer - Design Compact et Moderne */}
        <Grid container spacing={isMobile ? 0.75 : 1.5}>
          {/* En stock (OK) */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleStockFilterClick('ok')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: stockFilter === 'ok' ? 'success.main' : theme => alpha(theme.palette.success.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.success.main, 0.3)}`,
                  borderColor: 'success.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(stockFilter === 'ok' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.success.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack direction="column" alignItems="center" spacing={isMobile ? 0.5 : 0.75}>
                  <CheckCircle sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'success.main',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'success.main',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {inStock}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: isMobile ? '0.625rem' : '0.7rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.2
                    }}
                  >
                    {t('products:filters.inStock')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Stock bas */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleStockFilterClick('low_stock')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: stockFilter === 'low_stock' ? 'warning.main' : theme => alpha(theme.palette.warning.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.warning.main, 0.3)}`,
                  borderColor: 'warning.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(stockFilter === 'low_stock' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.warning.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.warning.main}, ${alpha(theme.palette.warning.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack direction="column" alignItems="center" spacing={isMobile ? 0.5 : 0.75}>
                  <Warning sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'warning.main',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'warning.main',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {lowStock}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: isMobile ? '0.625rem' : '0.7rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.2
                    }}
                  >
                    {t('products:filters.lowStock')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Rupture de stock */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleStockFilterClick('out_of_stock')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: stockFilter === 'out_of_stock' ? 'error.main' : theme => alpha(theme.palette.error.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.error.main, 0.3)}`,
                  borderColor: 'error.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(stockFilter === 'out_of_stock' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.error.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.error.main}, ${alpha(theme.palette.error.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack direction="column" alignItems="center" spacing={isMobile ? 0.5 : 0.75}>
                  <Error sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'error.main',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'error.main',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {outOfStock}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: isMobile ? '0.625rem' : '0.7rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.2
                    }}
                  >
                    {t('products:filters.outOfStock')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Services / Digital */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleStockFilterClick('services')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: stockFilter === 'services' ? 'info.main' : theme => alpha(theme.palette.info.main, 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.info.main, 0.3)}`,
                  borderColor: 'info.main'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(stockFilter === 'services' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.info.main, 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.info.main}, ${alpha(theme.palette.info.light, 0.8)})`,
                    borderRadius: '2px 2px 0 0'
                  }
                })
              }}
            >
              <CardContent sx={{ 
                p: isMobile ? 1 : 1.5, 
                '&:last-child': { pb: isMobile ? 1 : 1.5 },
                textAlign: 'center'
              }}>
                <Stack direction="column" alignItems="center" spacing={isMobile ? 0.5 : 0.75}>
                  <DesignServices sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'info.main',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'info.main',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {servicesCount}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: isMobile ? '0.625rem' : '0.7rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.2
                    }}
                  >
                    {t('products:filters.services')}
                  </Typography>
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

      {/* Search & Filters - Design Neumorphique Amélioré */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: theme => theme.palette.mode === 'dark'
            ? '4px 4px 12px rgba(0,0,0,0.4), -2px -2px 10px rgba(255,255,255,0.05)'
            : '6px 6px 16px rgba(0,0,0,0.1), -4px -4px 12px rgba(255,255,255,0.9)',
          border: theme => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              alignItems: 'stretch',
            }}>
              <TextField
                size="small"
                placeholder={isMobile ? t('products:search.placeholder_mobile', 'Chercher...') : t('products:search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: isMobile ? 20 : 24 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    height: 40,
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: theme => alpha(theme.palette.primary.main, 0.1) + ' 0px 0px 0px 2px',
                    },
                    '&.Mui-focused': {
                      boxShadow: theme => alpha(theme.palette.primary.main, 0.2) + ' 0px 0px 0px 3px',
                    }
                  }
                }}
              />
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  bgcolor: showFilters ? 'primary.main' : 'transparent',
                  color: showFilters ? 'white' : 'inherit',
                  borderRadius: 2,
                  minWidth: 40,
                  height: 40,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: showFilters
                    ? theme => `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`
                    : 'none',
                  '&:hover': {
                    bgcolor: showFilters ? 'primary.dark' : 'action.hover',
                    transform: 'scale(1.05)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  }
                }}
              >
                <FilterList />
              </IconButton>
            </Box>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{t('products:filters.statusLabel')}</InputLabel>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label={t('products:filters.statusLabel')}
                        sx={{
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: theme => alpha(theme.palette.primary.main, 0.1) + ' 0px 0px 0px 2px',
                          },
                        }}
                      >
                        <MenuItem value="">{t('products:filters.all')}</MenuItem>
                        <MenuItem value="available">{t('products:status.available')}</MenuItem>
                        <MenuItem value="unavailable">{t('products:status.unavailable')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{t('products:filters.categoryLabel')}</InputLabel>
                      <Select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        label={t('products:filters.categoryLabel')}
                        sx={{
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: theme => alpha(theme.palette.primary.main, 0.1) + ' 0px 0px 0px 2px',
                          },
                        }}
                      >
                        <MenuItem value="">{t('products:filters.allCategories')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{t('products:filters.warehouseLabel')}</InputLabel>
                      <Select
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        label={t('products:filters.warehouseLabel')}
                        sx={{
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: theme => alpha(theme.palette.primary.main, 0.1) + ' 0px 0px 0px 2px',
                          },
                        }}
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
              </motion.div>
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
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, index) => (
              <Grid item xs={6} sm={6} md={4} lg={3} key={product.id}>
                <ProductCard product={product} index={index} />
              </Grid>
            ))}
          </AnimatePresence>
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
