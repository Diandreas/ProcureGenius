import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Paper,
  Collapse,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Inventory as InventoryIcon,
  Business as SupplierIcon,
  Warehouse as WarehouseIcon,
  Category as CategoryIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as InStockIcon,
  DesignServices,
  Build,
  CloudDownload,
  PictureAsPdf,
  Print,
  Download,
  Receipt,
  EventBusy as ExpiredIcon,
  Schedule as ScheduleIcon,
  LocalPharmacy as PharmacyIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  TrendingUp,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { fetchProducts } from '../../store/slices/productsSlice';
import { warehousesAPI, productsAPI } from '../../services/api';
import useCurrency from '../../hooks/useCurrency';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { generateProductsBulkReport, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';
import { formatDate } from '../../utils/formatters';

// Product type visual configuration
const TYPE_CONFIG = {
  physical: { color: '#2196F3', icon: InventoryIcon, label: 'Physique' },
  service: { color: '#4CAF50', icon: Build, label: 'Service' },
  digital: { color: '#9C27B0', icon: CloudDownload, label: 'Digital' },
};

// ─── StatCard Component (reprend le design InventoryList) ─────────────────────
const StatCard = ({ title, count, subtitle, icon: Icon, color, filterKey, activeFilter, onClick }) => {
  const isActive = activeFilter === filterKey;
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <Card
        onClick={() => onClick(filterKey)}
        sx={{
          cursor: 'pointer',
          borderRadius: 3,
          height: '100%',
          background: `linear-gradient(135deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.04)} 100%)`,
          border: '2px solid',
          borderColor: isActive ? color : 'transparent',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          '&::before': isActive ? {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 3,
            background: color,
          } : {},
          '&:hover': {
            borderColor: color,
            boxShadow: `0 8px 24px ${alpha(color, 0.2)}`
          }
        }}
      >
        <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
          <Icon sx={{ fontSize: 30, color, mb: 0.5, opacity: 0.9 }} />
          <Typography variant="h4" fontWeight="800" sx={{ color, mb: 0.3, fontSize: { xs: '1.5rem', md: '1.8rem' } }}>
            {count}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.8rem' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
              {subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
function Products() {
  const { t } = useTranslation(['products', 'common']);
  const { format: formatCurrency } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { products, loading, error } = useSelector((state) => state.products);
  const [warehouses, setWarehouses] = useState([]);
  const [batchStats, setBatchStats] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('');   // quick filter (stat cards)
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [expirationFilter, setExpirationFilter] = useState('');
  const [registeredAfter, setRegisteredAfter] = useState('');
  const [registeredBefore, setRegisteredBefore] = useState('');
  const [expirationAfter, setExpirationAfter] = useState('');
  const [expirationBefore, setExpirationBefore] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Report state
  const [reportConfigOpen, setReportConfigOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reportFilters, setReportFilters] = useState({ dateStart: '', dateEnd: '', selectedProducts: [] });

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
    productsAPI.getBatchStats().then(r => setBatchStats(r.data)).catch(() => {});
  }, [dispatch, fetchWarehousesData]);

  // Register report action in top nav
  const handleGenerateReportClick = useCallback(() => setReportConfigOpen(true), []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('register-report-action', {
      detail: { onClick: handleGenerateReportClick, label: t('products:actions.generateReport', 'Rapport PDF') }
    }));
    return () => window.dispatchEvent(new CustomEvent('clear-report-action'));
  }, [handleGenerateReportClick, t]);

  // Derive categories from products
  const categories = useMemo(() => {
    const map = new Map();
    products.forEach(p => { if (p.category) map.set(p.category.id, p.category); });
    return Array.from(map.values());
  }, [products]);

  const hasActiveFilters = stockFilter || categoryFilter || statusFilter || warehouseFilter ||
    expirationFilter || registeredAfter || registeredBefore || expirationAfter || expirationBefore;

  const clearAllFilters = () => {
    setStockFilter('');
    setCategoryFilter('');
    setStatusFilter('');
    setWarehouseFilter('');
    setExpirationFilter('');
    setRegisteredAfter('');
    setRegisteredBefore('');
    setExpirationAfter('');
    setExpirationBefore('');
  };

  const handleStockFilterClick = (filterKey) => {
    setStockFilter(prev => prev === filterKey ? '' : filterKey);
  };

  // Helper: get stock color for a product
  const getStockColor = (product) => {
    if (product.product_type !== 'physical') return TYPE_CONFIG[product.product_type]?.color || theme.palette.primary.main;
    const daysUntil = product.expiration_date
      ? Math.floor((new Date(product.expiration_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    if (daysUntil !== null && daysUntil < 0) return theme.palette.error.dark;
    if (product.stock_quantity <= 0) return theme.palette.error.main;
    if (product.stock_quantity <= (product.low_stock_threshold || 10)) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const getExpirationChip = (product) => {
    if (product.product_type !== 'physical') return null;
    // Utilise days_until_expiration batch-aware si dispo, sinon expiration_date du produit
    const daysUntil = product.days_until_expiration !== undefined && product.days_until_expiration !== null
      ? product.days_until_expiration
      : (product.expiration_date
          ? Math.floor((new Date(product.expiration_date) - new Date()) / 86400000)
          : null);
    if (daysUntil === null) return null;
    if (daysUntil < 0) return { label: `Périmé (${Math.abs(daysUntil)}j)`, color: 'error', variant: 'filled' };
    if (daysUntil <= 30) return { label: `Expire dans ${daysUntil}j`, color: 'warning', variant: 'filled' };
    if (daysUntil <= 90) return { label: `Expire dans ${daysUntil}j`, color: 'info', variant: 'outlined' };
    return { label: product.expiration_date ? formatDate(product.expiration_date) : `${daysUntil}j`, color: 'default', variant: 'outlined' };
  };

  // Filtered products
  const filteredProducts = useMemo(() => products.filter(product => {
    const matchesSearch = !searchTerm ||
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || product.category?.id === categoryFilter;
    const matchesWarehouse = !warehouseFilter || product.warehouse === warehouseFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'available' && product.is_active) ||
      (statusFilter === 'unavailable' && !product.is_active);

    // Utilise is_expired/days_until_expiration (batch-aware depuis le backend)
    const daysUntil = product.days_until_expiration;
    const isExpiredProduct = product.is_expired;

    const matchesStock = !stockFilter || (() => {
      if (stockFilter === 'out_of_stock') return product.product_type === 'physical' && product.stock_quantity <= 0;
      if (stockFilter === 'low_stock') return product.product_type === 'physical' && product.stock_quantity > 0 && product.stock_quantity <= (product.low_stock_threshold || 10);
      if (stockFilter === 'ok') return product.product_type === 'physical' && product.stock_quantity > (product.low_stock_threshold || 10);
      if (stockFilter === 'services') return product.product_type !== 'physical';
      // expired: utilise is_expired (batch-aware) ou expiration_date si pas de lots
      if (stockFilter === 'expired') {
        if (product.product_type !== 'physical') return false;
        if (isExpiredProduct !== undefined && isExpiredProduct !== null) return isExpiredProduct;
        if (!product.expiration_date) return false;
        return Math.floor((new Date(product.expiration_date) - new Date()) / 86400000) < 0;
      }
      if (stockFilter === 'expiring_soon') {
        if (product.product_type !== 'physical') return false;
        // Utilise days_until_expiration (batch-aware) si disponible
        if (daysUntil !== undefined && daysUntil !== null) return daysUntil >= 0 && daysUntil <= 30;
        if (!product.expiration_date) return false;
        const d = Math.floor((new Date(product.expiration_date) - new Date()) / 86400000);
        return d >= 0 && d <= 30;
      }
      if (stockFilter === 'expiring_soon_60') {
        if (product.product_type !== 'physical') return false;
        if (daysUntil !== undefined && daysUntil !== null) return daysUntil > 30 && daysUntil <= 60;
        if (!product.expiration_date) return false;
        const d = Math.floor((new Date(product.expiration_date) - new Date()) / 86400000);
        return d > 30 && d <= 60;
      }
      return true;
    })();

    const matchesExpiration = !expirationFilter || (() => {
      if (product.product_type !== 'physical') return expirationFilter === 'no_date' ? (!product.expiration_date && daysUntil === null) : false;
      if (expirationFilter === 'expired') {
        if (isExpiredProduct !== undefined && isExpiredProduct !== null) return isExpiredProduct;
        return product.expiration_date && Math.floor((new Date(product.expiration_date) - new Date()) / 86400000) < 0;
      }
      if (expirationFilter === 'expiring_soon') {
        if (daysUntil !== undefined && daysUntil !== null) return daysUntil >= 0 && daysUntil <= 30;
        if (!product.expiration_date) return false;
        const d = Math.floor((new Date(product.expiration_date) - new Date()) / 86400000);
        return d >= 0 && d <= 30;
      }
      if (expirationFilter === 'valid') {
        if (daysUntil !== undefined && daysUntil !== null) return daysUntil > 30;
        if (!product.expiration_date) return false;
        return Math.floor((new Date(product.expiration_date) - new Date()) / 86400000) > 30;
      }
      if (expirationFilter === 'no_date') return !product.expiration_date && daysUntil === null;
      return true;
    })();

    // Date range filters
    if (registeredAfter && product.created_at) {
      if (new Date(product.created_at) < new Date(registeredAfter)) return false;
    }
    if (registeredBefore && product.created_at) {
      if (new Date(product.created_at) > new Date(registeredBefore + 'T23:59:59')) return false;
    }
    if (expirationAfter && product.expiration_date) {
      if (new Date(product.expiration_date) < new Date(expirationAfter)) return false;
    }
    if (expirationBefore && product.expiration_date) {
      if (new Date(product.expiration_date) > new Date(expirationBefore)) return false;
    }

    return matchesSearch && matchesCategory && matchesWarehouse && matchesStatus && matchesStock && matchesExpiration;
  }), [products, searchTerm, categoryFilter, warehouseFilter, statusFilter, stockFilter, expirationFilter, registeredAfter, registeredBefore, expirationAfter, expirationBefore]);

  // ─── Report handlers ───────────────────────────────────────────────────────
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
    } catch (err) {
      console.error('Error generating report:', err);
      enqueueSnackbar(t('products:messages.reportError'), { variant: 'error' });
      setReportDialogOpen(false);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePdfAction = (action) => {
    if (!generatedPdfBlob) return;
    if (action === 'download') {
      downloadPDF(generatedPdfBlob, `rapport-produits-${Date.now()}.pdf`);
      enqueueSnackbar(t('products:messages.pdfDownloadedSuccess'), { variant: 'success' });
    } else if (action === 'preview') {
      openPDFInNewTab(generatedPdfBlob);
    } else if (action === 'print') {
      const url = URL.createObjectURL(generatedPdfBlob);
      const w = window.open(url, '_blank');
      if (w) w.onload = () => { w.print(); setTimeout(() => URL.revokeObjectURL(url), 100); };
      enqueueSnackbar(t('products:messages.printWindowOpened'), { variant: 'success' });
    }
    setReportDialogOpen(false);
  };

  const handleExportExcel = async () => {
    try {
      const response = await productsAPI.exportExcel();
      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventaire-${dayjs().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('Export téléchargé avec succès', { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar("Erreur lors de l'export", { variant: 'error' });
    }
  };

  // ─── ProductCard ───────────────────────────────────────────────────────────
  const ProductCard = ({ product, index }) => {
    const stockColor = getStockColor(product);
    const expirationChip = getExpirationChip(product);
    const typeConfig = TYPE_CONFIG[product.product_type] || TYPE_CONFIG.physical;
    const TypeIcon = typeConfig.icon;
    const isPhysical = product.product_type === 'physical';
    const isOut = isPhysical && product.stock_quantity <= 0;
    const isLow = isPhysical && product.stock_quantity > 0 && product.stock_quantity <= (product.low_stock_threshold || 10);
    const isExpired = expirationChip?.color === 'error';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.4, delay: index * 0.04, ease: [0.6, 0.05, 0.01, 0.9] }}
        whileHover={{ boxShadow: `0 20px 60px ${alpha(stockColor, 0.2)}` }}
        style={{ height: '100%' }}
      >
        <Card
          onClick={() => navigate(`/products/${product.id}`)}
          sx={{
            cursor: 'pointer',
            height: '100%',
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(stockColor, 0.03)} 50%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            boxShadow: `0 4px 20px ${alpha(stockColor, 0.08)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'box-shadow 0.3s ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 4,
              background: isExpired
                ? `repeating-linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.main} 8px, ${alpha(theme.palette.error.main, 0.3)} 8px, ${alpha(theme.palette.error.main, 0.3)} 16px)`
                : `linear-gradient(90deg, ${stockColor}, ${alpha(stockColor, 0.5)})`,
              borderRadius: '3px 3px 0 0',
              boxShadow: `0 2px 8px ${alpha(stockColor, 0.3)}`
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: `radial-gradient(circle at top right, ${alpha(stockColor, 0.05)} 0%, transparent 70%)`,
              pointerEvents: 'none'
            }
          }}
        >
          <CardContent sx={{ p: 2 }}>
            {/* Header: Avatar + Name */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
              <Avatar
                src={product.image}
                variant="rounded"
                sx={{
                  width: isMobile ? 48 : 52,
                  height: isMobile ? 48 : 52,
                  bgcolor: stockColor,
                  borderRadius: 2,
                  boxShadow: `0 4px 12px ${alpha(stockColor, 0.3)}`
                }}
              >
                <TypeIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    mb: 0.3,
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
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {product.sku || product.reference}
                </Typography>
              </Box>
            </Box>

            {/* Price */}
            <Box sx={{ mb: 1.5, py: 1, px: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatCurrency(product.price || product.unit_price || 0)}
              </Typography>
            </Box>

            {/* Info Stack */}
            <Stack spacing={0.8} sx={{ mb: 1.5 }}>
              {/* Stock info for physical */}
              {isPhysical && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InventoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    Stock: <strong style={{ color: stockColor }}>{product.stock_quantity ?? 0}</strong>
                  </Typography>
                  {isOut ? (
                    <Chip label="RUPTURE" size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                  ) : isLow ? (
                    <Chip label="BAS" size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                  ) : (
                    <Chip label="OK" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
                  )}
                </Box>
              )}

              {/* Supplier */}
              {product.supplier_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SupplierIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {product.supplier_name}
                  </Typography>
                </Box>
              )}

              {/* Category */}
              {product.category && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CategoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {product.category.name}
                  </Typography>
                </Box>
              )}

              {/* Threshold for physical */}
              {isPhysical && product.low_stock_threshold && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Seuil: <strong>{product.low_stock_threshold}</strong>
                  </Typography>
                </Box>
              )}

              {/* Expiration chip */}
              {expirationChip && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ExpiredIcon sx={{ fontSize: 16, color: isExpired ? 'error.main' : 'text.secondary' }} />
                  <Chip
                    label={expirationChip.label}
                    color={expirationChip.color}
                    variant={expirationChip.variant}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                  />
                </Box>
              )}

              {/* Type chip for non-physical */}
              {!isPhysical && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TypeIcon sx={{ fontSize: 16, color: typeConfig.color }} />
                  <Chip
                    label={typeConfig.label}
                    size="small"
                    sx={{ bgcolor: typeConfig.color, color: 'white', fontSize: '0.7rem', height: 20, fontWeight: 600 }}
                  />
                </Box>
              )}

              {/* Lab consumable badge */}
              {product.is_lab_consumable && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label="Consommable Labo"
                    size="small"
                    sx={{ bgcolor: '#7c3aed', color: 'white', fontSize: '0.65rem', height: 20, fontWeight: 700 }}
                  />
                </Box>
              )}
            </Stack>

            {/* Stock Level Bar for physical */}
            {isPhysical && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                  <Typography variant="caption" color="text.secondary">Niveau de stock</Typography>
                  <Typography variant="caption" fontWeight="bold" sx={{ color: stockColor }}>
                    {product.stock_quantity ?? 0} / {(product.low_stock_threshold || 10) * 2}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, ((product.stock_quantity ?? 0) / ((product.low_stock_threshold || 10) * 2)) * 100)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(stockColor, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      background: `linear-gradient(90deg, ${stockColor}, ${alpha(stockColor, 0.7)})`,
                    }
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ─── Early returns ─────────────────────────────────────────────────────────
  if (loading && products.length === 0) {
    return <LoadingState message={t('products:messages.loading', 'Chargement des produits...')} />;
  }
  if (error) {
    return (
      <ErrorState
        title={t('products:messages.loadingError')}
        message={t('products:messages.loadingErrorDescription', 'Impossible de charger les produits.')}
        showHome={false}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // ─── Stats ────────────────────────────────────────────────────────────────
  const totalProducts = products.length;
  const inStockCount = products.filter(p => p.product_type === 'physical' && p.stock_quantity > (p.low_stock_threshold || 10)).length;
  const lowStockCount = products.filter(p => p.product_type === 'physical' && p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold || 10)).length;
  const outStockCount = products.filter(p => p.product_type === 'physical' && p.stock_quantity <= 0).length;
  // Use batch-level expiry when available (more accurate than product-level expiration_date)
  const expiredCount = batchStats ? batchStats.expired_batches : products.filter(p => p.product_type === 'physical' && p.expiration_date && Math.floor((new Date(p.expiration_date) - new Date()) / 86400000) < 0).length;
  const expiringSoonCount = batchStats ? batchStats.expiring_soon_30 : products.filter(p => {
    if (p.product_type !== 'physical' || (!p.expiration_date && p.days_until_expiration === null)) return false;
    const d = p.days_until_expiration !== null ? p.days_until_expiration : Math.floor((new Date(p.expiration_date) - new Date()) / 86400000);
    return d >= 0 && d <= 30;
  }).length;
  const expiringSoon60Count = batchStats ? batchStats.expiring_soon_60 : products.filter(p => {
    if (p.product_type !== 'physical' || (!p.expiration_date && p.days_until_expiration === null)) return false;
    const d = p.days_until_expiration !== null ? p.days_until_expiration : Math.floor((new Date(p.expiration_date) - new Date()) / 86400000);
    return d > 30 && d <= 60;
  }).length;
  const totalStockValue = products.reduce((sum, p) => sum + ((p.stock_quantity || 0) * parseFloat(p.price || p.unit_price || 0)), 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: isMobile ? 2 : 3, minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography
            variant="h4"
            fontWeight="800"
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <InventoryIcon sx={{ color: theme.palette.primary.main, fontSize: 36 }} />
            {t('products:title', 'Stock')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestion des produits, stocks et péremptions
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Download />}
            onClick={handleExportExcel}
            sx={{ borderRadius: 3, px: 2.5, py: 1.5, fontWeight: 600 }}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/products/new')}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1.5,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              boxShadow: `0 8px 20px -4px ${alpha(theme.palette.primary.main, 0.5)}`,
              '&:hover': { boxShadow: `0 12px 28px -6px ${alpha(theme.palette.primary.main, 0.6)}` }
            }}
          >
            {t('products:newProduct')}
          </Button>
        </Stack>
      </Stack>

      {/* 6 Stat Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            title="Total"
            count={totalProducts}
            icon={InventoryIcon}
            color={theme.palette.primary.main}
            filterKey=""
            activeFilter={stockFilter}
            onClick={handleStockFilterClick}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            title={t('products:filters.inStock')}
            count={inStockCount}
            icon={InStockIcon}
            color={theme.palette.success.main}
            filterKey="ok"
            activeFilter={stockFilter}
            onClick={handleStockFilterClick}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            title={t('products:filters.lowStock')}
            count={lowStockCount}
            icon={WarningIcon}
            color={theme.palette.warning.main}
            filterKey="low_stock"
            activeFilter={stockFilter}
            onClick={handleStockFilterClick}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            title={t('products:filters.outOfStock')}
            count={outStockCount}
            icon={ErrorIcon}
            color={theme.palette.error.main}
            filterKey="out_of_stock"
            activeFilter={stockFilter}
            onClick={handleStockFilterClick}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            title="Lots périmés"
            count={expiredCount}
            subtitle={batchStats ? 'par lots' : 'par produit'}
            icon={ExpiredIcon}
            color="#b71c1c"
            filterKey="expired"
            activeFilter={stockFilter}
            onClick={handleStockFilterClick}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            title="Expire < 30j"
            count={expiringSoonCount}
            subtitle={batchStats ? 'lots actifs' : 'produits'}
            icon={ScheduleIcon}
            color={theme.palette.warning.dark}
            filterKey="expiring_soon"
            activeFilter={stockFilter}
            onClick={handleStockFilterClick}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            title="Expire 30-60j"
            count={expiringSoon60Count}
            subtitle={batchStats ? 'lots actifs' : 'produits'}
            icon={ScheduleIcon}
            color={theme.palette.info.main}
            filterKey="expiring_soon_60"
            activeFilter={stockFilter}
            onClick={handleStockFilterClick}
          />
        </Grid>
      </Grid>

      {/* Search & Filters Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <InputAdornment position="start" sx={{ pl: 1 }}>
          <SearchIcon color="action" />
        </InputAdornment>
        <TextField
          fullWidth
          variant="standard"
          placeholder={t('products:search.placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ disableUnderline: true }}
          sx={{ '& input': { fontSize: '0.95rem' } }}
        />
        <Tooltip title="Filtres avancés">
          <IconButton
            onClick={() => setShowFilters(!showFilters)}
            sx={{
              bgcolor: showFilters ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              color: showFilters ? 'primary.main' : 'text.secondary',
            }}
          >
            <FilterListIcon />
          </IconButton>
        </Tooltip>
        {hasActiveFilters && (
          <Tooltip title="Effacer les filtres">
            <IconButton onClick={clearAllFilters} color="error" size="small">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Paper>

      {/* Advanced Filters Panel */}
      <Collapse in={showFilters}>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon fontSize="small" />
            Filtres avancés
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('products:filters.statusLabel')}</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label={t('products:filters.statusLabel')}>
                  <MenuItem value="">{t('products:filters.all')}</MenuItem>
                  <MenuItem value="available">{t('products:status.available')}</MenuItem>
                  <MenuItem value="unavailable">{t('products:status.unavailable')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('products:filters.categoryLabel')}</InputLabel>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} label={t('products:filters.categoryLabel')}>
                  <MenuItem value="">{t('products:filters.allCategories')}</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('products:filters.warehouseLabel')}</InputLabel>
                <Select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} label={t('products:filters.warehouseLabel')}>
                  <MenuItem value="">{t('products:filters.allWarehouses')}</MenuItem>
                  {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.code}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut péremption</InputLabel>
                <Select value={expirationFilter} onChange={(e) => setExpirationFilter(e.target.value)} label="Statut péremption">
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="expired">Périmés</MenuItem>
                  <MenuItem value="expiring_soon">Expire bientôt (&lt;30j)</MenuItem>
                  <MenuItem value="valid">Valide (&gt;30j)</MenuItem>
                  <MenuItem value="no_date">Sans date de péremption</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                <DatePicker
                  label="Péremption après"
                  value={expirationAfter ? dayjs(expirationAfter) : null}
                  onChange={(d) => setExpirationAfter(d ? d.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  format="DD/MM/YYYY"
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                <DatePicker
                  label="Péremption avant"
                  value={expirationBefore ? dayjs(expirationBefore) : null}
                  onChange={(d) => setExpirationBefore(d ? d.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  format="DD/MM/YYYY"
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                <DatePicker
                  label="Créé après"
                  value={registeredAfter ? dayjs(registeredAfter) : null}
                  onChange={(d) => setRegisteredAfter(d ? d.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  format="DD/MM/YYYY"
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                <DatePicker
                  label="Créé avant"
                  value={registeredBefore ? dayjs(registeredBefore) : null}
                  onChange={(d) => setRegisteredBefore(d ? d.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  format="DD/MM/YYYY"
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
          {stockFilter && (
            <Chip
              label={
                stockFilter === 'ok' ? t('products:filters.inStock') :
                stockFilter === 'low_stock' ? t('products:filters.lowStock') :
                stockFilter === 'out_of_stock' ? t('products:filters.outOfStock') :
                stockFilter === 'services' ? t('products:filters.services') :
                stockFilter === 'expired' ? 'Périmés' : 'Expire bientôt'
              }
              onDelete={() => setStockFilter('')}
              color="primary"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
          {expirationFilter && (
            <Chip
              label={`Péremption: ${expirationFilter === 'expired' ? 'Périmés' : expirationFilter === 'expiring_soon' ? 'Bientôt' : expirationFilter === 'valid' ? 'Valide' : 'Sans date'}`}
              onDelete={() => setExpirationFilter('')}
              color="secondary"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
          {categoryFilter && (
            <Chip label={`Catégorie: ${categories.find(c => c.id === categoryFilter)?.name || categoryFilter}`} onDelete={() => setCategoryFilter('')} size="small" />
          )}
          {statusFilter && (
            <Chip label={`Statut: ${statusFilter === 'available' ? 'Actif' : 'Inactif'}`} onDelete={() => setStatusFilter('')} size="small" />
          )}
          {warehouseFilter && (
            <Chip label={`Entrepôt: ${warehouses.find(w => w.id === warehouseFilter)?.code || warehouseFilter}`} onDelete={() => setWarehouseFilter('')} size="small" />
          )}
          {expirationAfter && <Chip label={`Exp. après: ${expirationAfter}`} onDelete={() => setExpirationAfter('')} size="small" />}
          {expirationBefore && <Chip label={`Exp. avant: ${expirationBefore}`} onDelete={() => setExpirationBefore('')} size="small" />}
          {registeredAfter && <Chip label={`Créé après: ${registeredAfter}`} onDelete={() => setRegisteredAfter('')} size="small" />}
          {registeredBefore && <Chip label={`Créé avant: ${registeredBefore}`} onDelete={() => setRegisteredBefore('')} size="small" />}
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
            {filteredProducts.length} résultat{filteredProducts.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title={t('products:messages.noProducts')}
          description={t('products:messages.noProductsDescription')}
          actionLabel={t('products:newProduct')}
          onAction={() => navigate('/products/new')}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <Grid container spacing={2.5}>
            {filteredProducts.map((product, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <ProductCard product={product} index={index} />
              </Grid>
            ))}
          </Grid>
        </AnimatePresence>
      )}

      {/* Footer Summary */}
      {filteredProducts.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <strong>{filteredProducts.length}</strong> produit{filteredProducts.length !== 1 ? 's' : ''} affiché{filteredProducts.length !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Valeur totale du stock: <strong style={{ color: theme.palette.success.main }}>{formatCurrency(totalStockValue)}</strong>
          </Typography>
        </Paper>
      )}

      {/* Report Config Dialog */}
      <Dialog open={reportConfigOpen} onClose={() => setReportConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('products:report.title', 'Générer un Rapport de Produits')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">📅 Période (optionnel)</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                label="Date de début" type="date" value={reportFilters.dateStart}
                onChange={(e) => setReportFilters({ ...reportFilters, dateStart: e.target.value })}
                fullWidth size="small" InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Date de fin" type="date" value={reportFilters.dateEnd}
                onChange={(e) => setReportFilters({ ...reportFilters, dateEnd: e.target.value })}
                fullWidth size="small" InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>📋 Produits à inclure</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              {reportFilters.selectedProducts.length > 0
                ? `${reportFilters.selectedProducts.length} produit(s) sélectionné(s)`
                : 'Tous les produits filtrés seront inclus'}
            </Typography>
            <Box sx={{ maxHeight: 250, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
              <FormControl component="fieldset" fullWidth>
                <FormGroup>
                  {filteredProducts.map((product) => (
                    <FormControlLabel
                      key={product.id}
                      control={
                        <Checkbox
                          checked={reportFilters.selectedProducts.includes(product.id)}
                          onChange={(e) => {
                            const sel = reportFilters.selectedProducts;
                            setReportFilters({
                              ...reportFilters,
                              selectedProducts: e.target.checked
                                ? [...sel, product.id]
                                : sel.filter(id => id !== product.id)
                            });
                          }}
                        />
                      }
                      label={<Box><Typography variant="body2">{product.name}</Typography><Typography variant="caption" color="text.secondary">{product.sku || '-'}</Typography></Box>}
                      sx={{ width: '100%', m: 0, py: 0.5 }}
                    />
                  ))}
                </FormGroup>
              </FormControl>
            </Box>
            {filteredProducts.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button size="small" onClick={() => setReportFilters({ ...reportFilters, selectedProducts: filteredProducts.map(p => p.id) })}>Tout sélectionner</Button>
                <Button size="small" onClick={() => setReportFilters({ ...reportFilters, selectedProducts: [] })}>Tout désélectionner</Button>
              </Box>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                {reportFilters.selectedProducts.length > 0
                  ? `Rapport avec ${reportFilters.selectedProducts.length} produit(s)`
                  : `Rapport avec tous les produits (${filteredProducts.length})`}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportConfigOpen(false)}>Annuler</Button>
          <Button onClick={handleConfigureReport} variant="contained" color="success" startIcon={<PictureAsPdf />}>Générer</Button>
        </DialogActions>
      </Dialog>

      {/* PDF Actions Dialog */}
      <Dialog open={reportDialogOpen} onClose={() => { setReportDialogOpen(false); setGeneratedPdfBlob(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('products:dialogs.generatePdf')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {generatingPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">{t('products:labels.generatingLabel')}</Typography>
            </Box>
          ) : generatedPdfBlob ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>{t('products:messages.reportGenerated')}</Alert>
              <Typography variant="body2" color="text.secondary">{t('products:messages.pdfGenerationHelpText')}</Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setReportDialogOpen(false); setGeneratedPdfBlob(null); }} disabled={generatingPdf}>
            {t('products:buttons.cancel')}
          </Button>
          {generatedPdfBlob && (
            <>
              <Button onClick={() => handlePdfAction('preview')} variant="outlined" startIcon={<Receipt />}>{t('products:buttons.preview')}</Button>
              <Button onClick={() => handlePdfAction('print')} variant="outlined" color="secondary" startIcon={<Print />}>{t('products:buttons.print')}</Button>
              <Button onClick={() => handlePdfAction('download')} variant="contained" color="success" startIcon={<Download />}>{t('products:buttons.download')}</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Products;
