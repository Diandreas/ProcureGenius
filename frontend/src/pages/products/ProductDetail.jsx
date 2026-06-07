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
import usePdfViewer from '../../hooks/usePdfViewer';
import PdfViewerDialog from '../../components/pdf/PdfViewerDialog';
import { isNativePlatform } from '../../utils/platform';
import useSwipeTabs from '../../hooks/useSwipeTabs';

const IS_NATIVE = isNativePlatform();
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
  const pdfViewer = usePdfViewer();
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

  const handlePdfAction = async (action) => {
    if (!generatedPdfBlob) return;
    const fname = `rapport-produit-${product.name}.pdf`;

    if (action === 'download') {
      await pdfViewer.download(generatedPdfBlob, fname);
      enqueueSnackbar(t('products:messages.pdfDownloaded', 'Rapport PDF téléchargé avec succès'), { variant: 'success' });
    } else if (action === 'preview') {
      pdfViewer.preview(generatedPdfBlob, fname, `Rapport ${product.name}`);
      return;
    } else if (action === 'print') {
      if (IS_NATIVE) {
        pdfViewer.preview(generatedPdfBlob, fname, `Rapport ${product.name}`);
        return;
      }
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

  // Swipe entre onglets (mobile). IMPORTANT : appele AVANT tout return
  // conditionnel pour respecter la regle des hooks (sinon React error #310).
  // Nombre d'onglets : 3 + 2 si produit physique.
  const tabsCount = 3 + (product?.product_type === 'physical' ? 2 : 0);
  const swipeHandlers = useSwipeTabs(activeTab, tabsCount, setActiveTab, IS_NATIVE);

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

  // Définition des onglets (icône seule sur mobile, icône + label desktop)
  const isPhysical = product?.product_type === 'physical';
  const PRODUCT_TABS = [
    { icon: Info, label: t('products:tabs.info') },
    { icon: Receipt, label: t('products:tabs.invoices') },
    { icon: People, label: t('products:tabs.clients') },
    ...(isPhysical ? [{ icon: Warehouse, label: 'Lots' }] : []),
    ...(isPhysical ? [{ icon: History, label: t('products:tabs.movements') }] : []),
  ];

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


      {/* Onglets segmentés neumorphiques (icônes seules sur mobile) */}
      <Box sx={{ px: isMobile ? 1.5 : 0, mb: isMobile ? 1.5 : 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: isMobile ? 0.5 : 1,
            p: isMobile ? 0.5 : 0.75,
            borderRadius: 3,
            boxShadow: th => neuShadows.shadowInset(th),
            bgcolor: 'background.default',
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {PRODUCT_TABS.map((tab, idx) => {
            const TabIcon = tab.icon;
            const selected = activeTab === idx;
            return (
              <Tooltip key={idx} title={isMobile ? tab.label : ''} arrow disableHoverListener={!isMobile}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  aria-label={tab.label}
                  aria-selected={selected}
                  sx={{
                    flex: isMobile ? '0 0 auto' : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? 0 : 0.75,
                    minWidth: isMobile ? 44 : 0,
                    px: isMobile ? 0 : 2,
                    py: isMobile ? 1 : 1.1,
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 2.25,
                    fontFamily: 'inherit',
                    fontSize: '0.82rem',
                    fontWeight: selected ? 700 : 500,
                    whiteSpace: 'nowrap',
                    color: selected ? typeConfig.color : 'text.secondary',
                    bgcolor: selected ? 'background.paper' : 'transparent',
                    boxShadow: selected ? (th => neuShadows.shadowRaisedSm(th)) : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: selected ? typeConfig.color : 'text.primary',
                    },
                  }}
                >
                  <TabIcon sx={{ fontSize: isMobile ? 20 : 18, color: selected ? typeConfig.color : 'inherit' }} />
                  {!isMobile && tab.label}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Zone de contenu des onglets : swipe horizontal sur mobile */}
      <Box {...swipeHandlers}>

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
        <Box sx={{ px: isMobile ? 1.5 : 0 }}>
          <NeumorphicPanel accent={typeConfig.color} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Receipt sx={{ color: typeConfig.color, fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                {t('products:tabs.invoices')}
              </Typography>
            </Box>
            <ProductInvoicesTable
              invoices={statistics?.recent_invoices}
              loading={!statistics}
            />
          </NeumorphicPanel>
        </Box>
      )}

      {/* Tab: Clients */}
      {activeTab === 2 && (
        <Box sx={{ px: isMobile ? 1.5 : 0 }}>
          <NeumorphicPanel accent={typeConfig.color} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <People sx={{ color: typeConfig.color, fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                {t('products:tabs.clients')}
              </Typography>
            </Box>
            <ProductClientsTable
              clients={statistics?.top_clients}
              loading={!statistics}
            />
          </NeumorphicPanel>
        </Box>
      )}

      {/* Tab: Lots - Affiché uniquement pour les produits physiques (Index 3 si type physical) */}
      {product?.product_type === 'physical' && activeTab === 3 && (
        <Box sx={{ px: isMobile ? 1.5 : 0 }}>
          <NeumorphicPanel accent={typeConfig.color} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Warehouse sx={{ color: typeConfig.color, fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>Lots</Typography>
            </Box>
            <ProductBatchesTab productId={id} onStockChange={fetchProduct} />
          </NeumorphicPanel>
        </Box>
      )}

      {/* Tab: Mouvements de Stock - Affiché uniquement pour les produits physiques (Index 4 maintenant car on a ajouté Lots) */}
      {product?.product_type === 'physical' && activeTab === 4 && (
        <Box sx={{ px: isMobile ? 1.5 : 0 }}>
          <NeumorphicPanel accent={typeConfig.color} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <History sx={{ color: typeConfig.color, fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                {t('products:tabs.movements')}
              </Typography>
            </Box>
            <StockMovementsTab productId={id} productType={product?.product_type} />
          </NeumorphicPanel>
        </Box>
      )}

      </Box>
      {/* fin zone swipeable */}

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
            variant={IS_NATIVE ? 'contained' : 'outlined'}
            disabled={generatingPdf || !generatedPdfBlob}
            startIcon={<Receipt />}
          >
            {t('common:buttons.preview', 'Aperçu')}
          </Button>
          {!IS_NATIVE && (
            <Button
              onClick={() => handlePdfAction('print')}
              variant="outlined"
              color="secondary"
              disabled={generatingPdf || !generatedPdfBlob}
              startIcon={<Print />}
            >
              {t('common:buttons.print', 'Imprimer')}
            </Button>
          )}
          {!IS_NATIVE && (
            <Button
              onClick={() => handlePdfAction('download')}
              variant="contained"
              disabled={generatingPdf || !generatedPdfBlob}
              startIcon={<Download />}
            >
              {t('common:buttons.download', 'Télécharger')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Visionneuse PDF integree (apercu dans l'app) */}
      <PdfViewerDialog {...pdfViewer.dialogProps} />
    </Box>
  );
}

export default ProductDetail;
