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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
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
  PictureAsPdf,
  Print,
  Download,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { productsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import ProductInvoicesTable from '../../components/products/ProductInvoicesTable';
import ProductClientsTable from '../../components/products/ProductClientsTable';
import StockMovementsTab from '../../components/StockMovementsTab';
import ProductBatchesTab from '../../components/ProductBatchesTab';
import { generateProductReportPDF, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';
import { useHeader } from '../../contexts/HeaderContext';
import { NeumorphicPanel, neuShadows } from '../../components/neumorphic/NeumorphicList';

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
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);

  const { setPageHeader } = useHeader();

  useEffect(() => {
    fetchProduct();
    fetchStatistics();
  }, [id]);

  // Update Global Header
  useEffect(() => {
    if (product) {
      // Sur mobile, les actions (PDF / Modifier / Supprimer) sont déjà
      // présentes dans le corps de la page : on ne les duplique plus dans le
      // top nav, on n'y garde que le titre.
      setPageHeader({
        title: isMobile ? product.name : '',
        showTitle: isMobile,
        actions: null,
      });
    }
    
    return () => setPageHeader(null);
  }, [product, isMobile, id]);

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

  // Générer automatiquement le PDF quand le dialogue s'ouvre
  useEffect(() => {
    if (pdfDialogOpen && product && !generatedPdfBlob && !generatingPdf) {
      const generatePDF = async () => {
        setGeneratingPdf(true);
        try {
          const pdfBlob = await generateProductReportPDF(product);
          setGeneratedPdfBlob(pdfBlob);
        } catch (error) {
          console.error('Error generating PDF:', error);
          enqueueSnackbar(t('products:messages.pdfError', 'Erreur lors de la génération du PDF'), { variant: 'error' });
          setPdfDialogOpen(false);
        } finally {
          setGeneratingPdf(false);
        }
      };
      generatePDF();
    }
  }, [pdfDialogOpen, product, generatedPdfBlob, generatingPdf]);

  const handlePdfAction = (action) => {
    if (!generatedPdfBlob) return;

    if (action === 'download') {
      downloadPDF(generatedPdfBlob, `rapport-produit-${product.name}.pdf`);
      enqueueSnackbar(t('products:messages.pdfDownloaded', 'Rapport PDF téléchargé avec succès'), { variant: 'success' });
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
        enqueueSnackbar(t('products:messages.printWindowOpened', 'Fenêtre d\'impression ouverte'), { variant: 'success' });
      } else {
        enqueueSnackbar(t('products:messages.cannotOpenPrintWindow', 'Impossible d\'ouvrir la fenêtre d\'impression'), { variant: 'error' });
      }
    }
    setPdfDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  if (loading) {
    return <LoadingState message={t('products:messages.loading', 'Chargement du produit...')} />;
  }

  if (!product) {
    return (
      <ErrorState
        title={t('products:messages.productNotFound', 'Produit non trouvé')}
        message={t('products:messages.productNotFoundDescription', 'Le produit que vous recherchez n\'existe pas ou a été supprimé.')}
        showHome={false}
        onRetry={() => navigate('/products')}
      />
    );
  }

  const stockStatus = product.stock_quantity === 0 ? 'error' :
    product.stock_quantity <= 10 ? 'warning' : 'success';

  // Configuration du type de produit
  const typeConfig = TYPE_CONFIG[product.product_type] || TYPE_CONFIG.physical;
  const TypeIcon = typeConfig.icon;

  return (
    <Box sx={{
      p: { xs: 0, sm: 2, md: 3 },
      pb: isMobile ? 12 : 3, // Space for mobile nav
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header - Simple back button on desktop */}
      <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/products')} size="medium">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {product.name}
          </Typography>
        </Box>
      </Box>


      {/* Tabs - Style mobile app */}
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: isMobile ? 1.5 : 3,
          px: isMobile ? 2 : 0,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            minWidth: isMobile ? 'auto' : 120,
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            px: isMobile ? 1.5 : 2,
            py: isMobile ? 1 : 1.5,
            minHeight: isMobile ? 40 : 48,
            borderRadius: isMobile ? 1.5 : 0,
            mr: isMobile ? 0.5 : 0,
            '&:hover': {
              bgcolor: theme => isMobile ? alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.04) : 'transparent',
            },
            transition: 'all 0.2s ease'
          },
          '& .MuiTabs-indicator': {
            height: isMobile ? 3 : 2,
            borderRadius: isMobile ? 1.5 : 0,
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
        {/* Afficher l'onglet Stock et Lots uniquement pour les produits physiques */}
        {product?.product_type === 'physical' && (
          <Tab
            icon={<Warehouse sx={{ fontSize: isMobile ? 18 : 20 }} />}
            label="Lots"
            iconPosition="start"
          />
        )}
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
        <Box sx={{ px: isMobile ? 1.5 : 0 }}>
          <Grid container spacing={isMobile ? 1.5 : 2.5}>
            {/* Colonne principale */}
            <Grid item xs={12} md={8}>
              {/* Hero produit */}
              <NeumorphicPanel accent={typeConfig.color} sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar src={product.image} variant="rounded" sx={{ width: { xs: 64, sm: 84 }, height: { xs: 64, sm: 84 }, bgcolor: typeConfig.color, borderRadius: 3, flexShrink: 0 }}>
                    <TypeIcon sx={{ fontSize: { xs: 30, sm: 42 }, color: 'white' }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.4rem' }, lineHeight: 1.2 }}>{product.name}</Typography>
                      {/* Actions (mobile + desktop) */}
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => setPdfDialogOpen(true)} sx={{ borderRadius: 2, color: 'success.main', boxShadow: th => neuShadows.shadowInset(th) }}><PictureAsPdf sx={{ fontSize: 18 }} /></IconButton>
                        <IconButton size="small" onClick={() => navigate(`/products/${id}/edit`)} sx={{ borderRadius: 2, color: 'primary.main', boxShadow: th => neuShadows.shadowInset(th) }}><Edit sx={{ fontSize: 18 }} /></IconButton>
                        <IconButton size="small" onClick={handleDelete} sx={{ borderRadius: 2, color: 'error.main', boxShadow: th => neuShadows.shadowInset(th) }}><Delete sx={{ fontSize: 18 }} /></IconButton>
                      </Stack>
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>{t('products:labels.reference')}: {product.reference || product.sku || '—'}</Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip icon={<TypeIcon sx={{ color: 'white !important', fontSize: 14 }} />} label={typeConfig.label} size="small" sx={{ bgcolor: typeConfig.color, color: 'white', fontWeight: 600, height: 24 }} />
                      <Chip label={product.is_active ? t('products:status.active') : t('products:status.inactive')} color={product.is_active ? 'success' : 'default'} size="small" sx={{ height: 24 }} />
                      {product.category && <Chip icon={<Category sx={{ fontSize: 14 }} />} label={product.category.name} variant="outlined" size="small" sx={{ height: 24 }} />}
                    </Stack>
                  </Box>
                </Box>
                {/* Prix en avant */}
                <Box sx={{ mt: 2, p: 1.5, borderRadius: 3, display: 'flex', alignItems: 'baseline', gap: 1.5, boxShadow: th => neuShadows.shadowInset(th) }}>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', sm: '1.8rem' }, color: 'text.primary', letterSpacing: '-0.02em' }}>{formatCurrency(product.price)}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>prix de vente</Typography>
                </Box>
                {product.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>{t('products:labels.description')}</Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.5 }}>{product.description}</Typography>
                  </Box>
                )}
              </NeumorphicPanel>

              {/* Infos détaillées */}
              {(product.supplier_name || product.warehouse_name) && (
                <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 2, sm: 2.5 } }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>Informations</Typography>
                  <Grid container spacing={1.5}>
                    {product.supplier_name && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2.5, boxShadow: th => neuShadows.shadowInset(th) }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}><Business sx={{ fontSize: 18 }} /></Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase' }}>{t('products:labels.supplier')}</Typography>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.supplier_name}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    {product.warehouse_name && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2.5, boxShadow: th => neuShadows.shadowInset(th) }}>
                          <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}><Warehouse sx={{ fontSize: 18 }} /></Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase' }}>Entrepôt</Typography>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.warehouse_code ? `${product.warehouse_code} - ${product.warehouse_name}` : product.warehouse_name}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </NeumorphicPanel>
              )}

              {/* Prix & marge */}
              <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 2, sm: 2.5 } }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>Tarification</Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={product.cost_price > 0 ? 4 : 12}>
                    <Box sx={{ p: 1.5, borderRadius: 2.5, textAlign: 'center', boxShadow: th => neuShadows.shadowInset(th) }}>
                      <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase' }}>Prix</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'primary.main' }}>{formatCurrency(product.price)}</Typography>
                    </Box>
                  </Grid>
                  {product.cost_price > 0 && (
                    <>
                      <Grid item xs={4}>
                        <Box sx={{ p: 1.5, borderRadius: 2.5, textAlign: 'center', boxShadow: th => neuShadows.shadowInset(th) }}>
                          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase' }}>Coût</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'warning.main' }}>{formatCurrency(product.cost_price)}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ p: 1.5, borderRadius: 2.5, textAlign: 'center', boxShadow: th => neuShadows.shadowInset(th) }}>
                          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase' }}>Marge</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'success.main' }}>{Math.round(((product.price - product.cost_price) / product.price) * 100)}%</Typography>
                        </Box>
                      </Grid>
                    </>
                  )}
                </Grid>
              </NeumorphicPanel>

              {/* Statistiques de vente */}
              {statistics?.sales_summary && (
                <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 2, sm: 2.5 } }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>Performance</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.5, borderRadius: 2.5, textAlign: 'center', boxShadow: th => neuShadows.shadowInset(th) }}>
                        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase' }}>Factures</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>{statistics.sales_summary.total_invoices || 0}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.5, borderRadius: 2.5, textAlign: 'center', boxShadow: th => neuShadows.shadowInset(th) }}>
                        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase' }}>CA généré</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'success.main' }}>{formatCurrency(statistics.sales_summary.total_sales_amount || 0)}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </NeumorphicPanel>
              )}
            </Grid>

            {/* Sidebar : stock */}
            <Grid item xs={12} md={4}>
              {product.product_type === 'physical' && product.stock_quantity !== null && product.stock_quantity !== undefined && (
                <NeumorphicPanel accent={theme.palette[stockStatus].main} sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 2, sm: 2.5 }, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>Stock</Typography>
                  <Box sx={{ width: 110, height: 110, mx: 'auto', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: th => neuShadows.shadowInset(th), mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '2rem', color: `${stockStatus}.main`, lineHeight: 1 }}>{product.stock_quantity}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', textTransform: 'uppercase' }}>unités</Typography>
                  </Box>
                  <Chip
                    label={product.stock_quantity === 0 ? t('products:stockStatus.outOfStock') : product.stock_quantity <= 10 ? t('products:stockStatus.low') : t('products:filters.inStock')}
                    color={stockStatus}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </NeumorphicPanel>
              )}
            </Grid>
          </Grid>
        </Box>
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

      {/* Tab: Lots - Affiché uniquement pour les produits physiques (Index 3 si type physical) */}
      {product?.product_type === 'physical' && activeTab === 3 && (
        <Box>
          <ProductBatchesTab productId={id} onStockChange={fetchProduct} />
        </Box>
      )}

      {/* Tab: Mouvements de Stock - Affiché uniquement pour les produits physiques (Index 4 maintenant car on a ajouté Lots) */}
      {product?.product_type === 'physical' && activeTab === 4 && (
        <Box>
          <StockMovementsTab productId={id} productType={product?.product_type} />
        </Box>
      )}

      {/* PDF Dialog - Génération automatique */}
      <Dialog open={pdfDialogOpen} onClose={handleClosePdfDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('products:pdf.title', 'Rapport PDF Produit')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {generatingPdf ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={3}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                {t('common:labels.generating', 'Génération du PDF en cours...')}
              </Typography>
            </Box>
          ) : generatedPdfBlob ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {t('products:pdf.ready', 'Le rapport PDF est prêt. Choisissez une action:')}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('products:pdf.description', 'Génération du rapport PDF...')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePdfDialog}>
            {t('common:buttons.cancel', 'Annuler')}
          </Button>
          <Button
            onClick={() => handlePdfAction('preview')}
            variant="outlined"
            disabled={generatingPdf || !generatedPdfBlob}
            startIcon={<Receipt />}
          >
            {t('common:buttons.preview', 'Aperçu')}
          </Button>
          <Button
            onClick={() => handlePdfAction('print')}
            variant="outlined"
            color="secondary"
            disabled={generatingPdf || !generatedPdfBlob}
            startIcon={<Print />}
          >
            {t('common:buttons.print', 'Imprimer')}
          </Button>
          <Button
            onClick={() => handlePdfAction('download')}
            variant="contained"
            disabled={generatingPdf || !generatedPdfBlob}
            startIcon={<Download />}
          >
            {t('common:buttons.download', 'Télécharger')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProductDetail;
