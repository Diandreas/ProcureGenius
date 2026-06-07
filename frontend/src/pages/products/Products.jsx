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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  LocalShipping,
  MoreVert,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { fetchProducts } from '../../store/slices/productsSlice';
import { warehousesAPI } from '../../services/api';
import { useHeader } from '../../contexts/HeaderContext';
import useCurrency from '../../hooks/useCurrency';
import { NeumorphicKpis, NeumorphicSearch, NeumorphicCard } from '../../components/neumorphic/NeumorphicList';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { generateProductsBulkReport, downloadPDF, openPDFInNewTab, generateProductReportPDF } from '../../services/pdfReportService';
import usePdfViewer from '../../hooks/usePdfViewer';
import PdfViewerDialog from '../../components/pdf/PdfViewerDialog';
import { isNativePlatform } from '../../utils/platform';

const IS_NATIVE = isNativePlatform();

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

// Actions du header de la liste produits.
// Desktop : boutons complets. Mobile : un menu overflow (⋮) regroupe
// « Marges & bénéfices » et « Restockage » pour ne pas saturer le top nav,
// et « Nouveau produit » devient un bouton icône.
function ProductsHeaderActions() {
  const { t } = useTranslation(['products', 'common']);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState(null);

  if (isMobile) {
    return (
      <Box display="flex" gap={0.5} alignItems="center">
        <IconButton
          color="primary"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`, borderRadius: 2 }}
          aria-label={t('common:more', 'Plus')}
        >
          <MoreVert />
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/products/margins'); }}>
            <ListItemIcon><TrendingUp fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>{t('products:margins', 'Marges & bénéfices')}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/products/restock'); }}>
            <ListItemIcon><LocalShipping fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>{t('products:restock.cta', 'Restockage')}</ListItemText>
          </MenuItem>
        </Menu>
        <IconButton
          color="primary"
          onClick={() => navigate('/products/new')}
          sx={{
            bgcolor: 'primary.main', color: '#fff', borderRadius: 2,
            boxShadow: `0 6px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': { bgcolor: 'primary.dark' },
          }}
          aria-label={t('products:newProduct', 'Nouveau produit')}
        >
          <Add />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box display="flex" gap={1}>
      <Button
        variant="outlined" color="primary" startIcon={<TrendingUp />}
        onClick={() => navigate('/products/margins')}
        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 2.5 }}
      >
        {t('products:margins', 'Marges & bénéfices')}
      </Button>
      <Button
        variant="outlined" color="primary" startIcon={<LocalShipping />}
        onClick={() => navigate('/products/restock')}
        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 2.5 }}
      >
        {t('products:restock.cta', 'Restockage')}
      </Button>
      <Button
        variant="contained" color="primary" startIcon={<Inventory />}
        onClick={() => navigate('/products/new')}
        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3, boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}` }}
      >
        {t('products:newProduct', 'Nouveau produit')}
      </Button>
    </Box>
  );
}

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
  const pdfViewer = usePdfViewer();
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
      // Actions responsives : menu overflow sur mobile (cf. ProductsHeaderActions)
      actions: <ProductsHeaderActions />,
    });
    return () => setPageHeader({ title: '', actions: null });
  }, [t, setPageHeader]);

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

  const handlePdfAction = async (action) => {
    if (!generatedPdfBlob) return;
    const fname = `rapport-produits-${new Date().getTime()}.pdf`;

    if (action === 'download') {
      await pdfViewer.download(generatedPdfBlob, fname);
      enqueueSnackbar(t('products:messages.pdfDownloadedSuccess', 'PDF téléchargé avec succès'), {
        variant: 'success',
      });
    } else if (action === 'preview') {
      pdfViewer.preview(generatedPdfBlob, fname, 'Rapport produits');
      return;
    } else if (action === 'print') {
      if (IS_NATIVE) {
        pdfViewer.preview(generatedPdfBlob, fname, 'Rapport produits');
        return;
      }
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
    const isPhysical = product.product_type === 'physical';
    const oos = isPhysical && product.stock_quantity === 0;
    const low = isPhysical && product.stock_quantity > 0 && product.stock_quantity <= (product.low_stock_threshold || 10);
    const accent = !isPhysical ? '#3b82f6' : oos ? '#ef4444' : low ? '#f59e0b' : '#10b981';
    const statusLabel = !isPhysical ? 'Service' : oos ? 'Rupture' : low ? 'Stock bas' : 'En stock';
    const footer = isPhysical
      ? `${product.stock_quantity ?? 0} en stock`
      : 'Service';
    return (
      <NeumorphicCard
        index={index}
        accentColor={accent}
        code={product.sku || product.reference || ''}
        status={{ label: statusLabel, color: accent }}
        title={product.name}
        subtitle={product.category?.name || ''}
        amount={product.price != null ? formatCurrency(product.price) : null}
        footer={footer}
        onClick={() => navigate(`/products/${product.id}`)}
        actions={(
          <>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.id}/edit`); }}
              sx={{ width: 30, height: 30, borderRadius: 2, color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
              <Edit sx={{ fontSize: 16 }} />
            </IconButton>
          </>
        )}
      />
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

  // Catégories dérivées des produits (pour le filtre)
  const productCategories = Array.from(
    new Map(products.filter(p => p.category?.id).map(p => [p.category.id, p.category])).values()
  );

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, maxWidth: 1280, mx: 'auto' }}>
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

      {/* KPI / filtres rapides neumorphiques */}
      <NeumorphicKpis
        activeKey={stockFilter}
        onSelect={handleStockFilterClick}
        kpis={[
          { key: '', label: 'Produits', value: totalProducts, sub: 'au catalogue', color: '#2563eb' },
          { key: 'ok', label: 'En stock', value: inStock, sub: 'disponibles', color: '#10b981' },
          { key: 'low_stock', label: 'Stock bas', value: lowStock, sub: 'a surveiller', color: '#f59e0b' },
          { key: 'out_of_stock', label: 'Rupture', value: outOfStock, sub: 'a reapprovisionner', color: '#ef4444' },
          { key: 'services', label: 'Services', value: servicesCount, sub: 'non stockes', color: '#3b82f6' },
        ]}
      />

      {/* Recherche neumorphique + filtre categorie */}
      <NeumorphicSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Rechercher un produit, une reference..."
        right={productCategories.length > 0 ? (
          <Box sx={{ minWidth: 160 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Categorie</InputLabel>
              <Select
                value={categoryFilter}
                label="Categorie"
                onChange={(e) => setCategoryFilter(e.target.value)}
                sx={{ borderRadius: 999, '& fieldset': { border: 'none' }, bgcolor: 'background.paper', boxShadow: theme => theme.palette.mode === 'light' ? 'inset 4px 4px 9px #cdd4e0, inset -4px -4px 9px #ffffff' : 'inset 4px 4px 9px #14191f, inset -4px -4px 9px #283041' }}
              >
                <MenuItem value="">Toutes</MenuItem>
                {productCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : null}
      />

      {/* Grille de produits */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title={t('products:messages.noProducts')}
          description={t('products:messages.noProductsDescription')}
          actionLabel={t('products:newProduct')}
          onAction={() => navigate('/products/new')}
        />
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
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
               Période (optionnel)
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
                 Produits à inclure
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
                variant={IS_NATIVE ? 'contained' : 'outlined'}
                startIcon={<Receipt />}
              >
                {t('products:buttons.preview', 'Aperçu')}
              </Button>
              {!IS_NATIVE && (
                <Button
                  onClick={() => handlePdfAction('print')}
                  variant="outlined"
                  color="secondary"
                  startIcon={<Print />}
                >
                  {t('products:buttons.print', 'Imprimer')}
                </Button>
              )}
              {!IS_NATIVE && (
                <Button
                  onClick={() => handlePdfAction('download')}
                  variant="contained"
                  color="success"
                  startIcon={<Download />}
                >
                  {t('products:buttons.download', 'Télécharger')}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Visionneuse PDF integree (apercu dans l'app) */}
      <PdfViewerDialog {...pdfViewer.dialogProps} />
    </Box>
  );
}

export default Products;
