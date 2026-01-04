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
import { generateProductReportPDF, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';

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

  useEffect(() => {
    fetchProduct();
    fetchStatistics();
  }, [id]);

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
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/products')} size="medium">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold" sx={{ flex: 1 }}>
            {product.name}
          </Typography>
          <Tooltip title={t('products:tooltips.downloadPdfReport', 'Télécharger le rapport PDF')}>
            <IconButton
              onClick={() => setPdfDialogOpen(true)}
              sx={{
                color: 'success.main',
                '&:hover': {
                  bgcolor: 'success.light',
                  color: 'white',
                }
              }}
            >
              <PictureAsPdf />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('products:tooltips.editProduct')}>
            <IconButton
              onClick={() => navigate(`/products/${id}/edit`)}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.light',
                  color: 'white',
                }
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('products:tooltips.deleteProduct')}>
            <IconButton
              onClick={handleDelete}
              sx={{
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'white',
                }
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Actions Mobile - Style app mobile compact */}
      <Box sx={{
        mb: 1.5,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'flex-end',
        gap: 0.5,
        px: 2,
        py: 1
      }}>
          <Tooltip title={t('products:tooltips.downloadPdfReport', 'Télécharger le rapport PDF')}>
            <IconButton
              onClick={() => setPdfDialogOpen(true)}
              size="small"
              sx={{
                bgcolor: 'success.50',
                color: 'success.main',
                width: 36,
                height: 36,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'success.main',
                  color: 'white',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <PictureAsPdf sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('products:tooltips.editProduct')}>
            <IconButton
              onClick={() => navigate(`/products/${id}/edit`)}
              size="small"
              sx={{
                bgcolor: 'primary.50',
                color: 'primary.main',
                width: 36,
                height: 36,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <Edit sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('products:tooltips.deleteProduct')}>
            <IconButton
              onClick={handleDelete}
              size="small"
              sx={{
                bgcolor: 'error.50',
                color: 'error.main',
                width: 36,
                height: 36,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'white',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <Delete sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
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
              bgcolor: isMobile ? 'rgba(0,0,0,0.04)' : 'transparent',
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
        {/* Afficher l'onglet Stock uniquement pour les produits physiques */}
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
        <Box sx={{ px: isMobile ? 2 : 0 }}>
          <Grid container spacing={isMobile ? 1.5 : 3}>
            {/* Card principale - Style mobile app */}
            <Grid item xs={12} md={8}>
              <Card
                sx={{
                  borderRadius: isMobile ? 2.5 : 2,
                  mb: isMobile ? 1.5 : 3,
                  borderLeft: isMobile ? `3px solid ${typeConfig.color}` : `4px solid ${typeConfig.color}`,
                  backgroundColor: typeConfig.bgColor,
                  boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
                  backdropFilter: isMobile ? 'blur(10px)' : 'none',
                  border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{
                  display: 'flex',
                  gap: isMobile ? 1.5 : 2,
                  mb: isMobile ? 2 : 3,
                  alignItems: 'flex-start'
                }}>
                  <Avatar
                    src={product.image}
                    variant="rounded"
                    sx={{
                      width: isMobile ? 64 : 100,
                      height: isMobile ? 64 : 100,
                      bgcolor: typeConfig.color,
                      borderRadius: isMobile ? 2 : 1,
                      boxShadow: isMobile ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    <TypeIcon sx={{ fontSize: isMobile ? 32 : 48, color: 'white' }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant={isMobile ? 'h6' : 'h5'}
                      fontWeight="bold"
                      gutterBottom
                      sx={{
                        fontSize: isMobile ? '1.125rem' : undefined,
                        lineHeight: isMobile ? 1.3 : undefined
                      }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                      sx={{ fontSize: isMobile ? '0.75rem' : undefined }}
                    >
                      {t('products:labels.reference')}: {product.reference || product.sku}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{
                        mt: isMobile ? 1 : 1,
                        flexWrap: 'wrap',
                        gap: 0.5
                      }}
                    >
                      {/* Badge TYPE avec couleur et icône */}
                      <Chip
                        icon={<TypeIcon sx={{ color: 'white !important', fontSize: isMobile ? 14 : 16 }} />}
                        label={typeConfig.label}
                        size="small"
                        sx={{
                          backgroundColor: typeConfig.color,
                          color: 'white',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.688rem' : undefined,
                          height: isMobile ? 24 : undefined,
                          '& .MuiChip-icon': {
                            marginLeft: '6px',
                            marginRight: '-4px'
                          }
                        }}
                      />
                      <Chip
                        label={product.is_active ? t('products:status.active') : t('products:status.inactive')}
                        color={product.is_active ? 'success' : 'default'}
                        size="small"
                        sx={{
                          fontSize: isMobile ? '0.688rem' : undefined,
                          height: isMobile ? 24 : undefined
                        }}
                      />
                      {product.category && (
                        <Chip
                          icon={<Category sx={{ fontSize: isMobile ? 12 : 16 }} />}
                          label={product.category.name}
                          variant="outlined"
                          size="small"
                          sx={{
                            fontSize: isMobile ? '0.688rem' : undefined,
                            height: isMobile ? 24 : undefined,
                            borderRadius: isMobile ? 1.5 : undefined
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Description */}
                {product.description && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                      {t('products:labels.description')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.description}
                    </Typography>
                  </Box>
                )}

                {/* Informations détaillées - Style mobile compact */}
                <Grid container spacing={isMobile ? 1.5 : 2}>
                  {product.supplier_name && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? 1 : 1.5,
                        p: isMobile ? 1 : 0,
                        borderRadius: isMobile ? 1.5 : 0,
                        bgcolor: isMobile ? 'rgba(0,0,0,0.02)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}>
                        <Business sx={{
                          fontSize: isMobile ? 18 : 20,
                          color: 'primary.main',
                          bgcolor: 'primary.50',
                          borderRadius: 1,
                          p: 0.5
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                          >
                            {t('products:labels.supplier')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              fontSize: isMobile ? '0.813rem' : undefined,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {product.supplier_name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {product.warehouse_name && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? 1 : 1.5,
                        p: isMobile ? 1 : 0,
                        borderRadius: isMobile ? 1.5 : 0,
                        bgcolor: isMobile ? 'rgba(0,0,0,0.02)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}>
                        <Warehouse sx={{
                          fontSize: isMobile ? 18 : 20,
                          color: 'info.main',
                          bgcolor: 'info.50',
                          borderRadius: 1,
                          p: 0.5
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                          >
                            {t('products:labels.warehouse')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              fontSize: isMobile ? '0.813rem' : undefined,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {product.warehouse_code} - {product.warehouse_name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {product.lead_time_days && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? 1 : 1.5,
                        p: isMobile ? 1 : 0,
                        borderRadius: isMobile ? 1.5 : 0,
                        bgcolor: isMobile ? 'rgba(0,0,0,0.02)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}>
                        <LocalShipping sx={{
                          fontSize: isMobile ? 18 : 20,
                          color: 'warning.main',
                          bgcolor: 'warning.50',
                          borderRadius: 1,
                          p: 0.5
                        }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                          >
                            {t('products:labels.leadTime')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              fontSize: isMobile ? '0.813rem' : undefined
                            }}
                          >
                            {product.lead_time_days} {t('products:labels.days')}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Prix et statistiques - Style mobile app compact */}
            <Grid container spacing={isMobile ? 1 : 2}>
              <Grid item xs={6}>
                <Card sx={{
                  borderRadius: isMobile ? 2 : 1,
                  bgcolor: 'primary.50',
                  boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: isMobile ? 'translateY(-2px)' : 'none',
                    boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.12)' : 'none'
                  }
                }}>
                  <CardContent sx={{
                    textAlign: 'center',
                    p: isMobile ? 1.5 : 3,
                    '&:last-child': { pb: isMobile ? 1.5 : 3 }
                  }}>
                    <AttachMoney sx={{
                      fontSize: isMobile ? 24 : 32,
                      color: 'primary.main',
                      mb: isMobile ? 0.5 : 1
                    }} />
                    <Typography
                      variant={isMobile ? 'h6' : 'h4'}
                      color="primary"
                      fontWeight="bold"
                      sx={{ fontSize: isMobile ? '1rem' : undefined }}
                    >
                      {formatCurrency(product.price)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                    >
                      {t('products:stats.sellingPrice')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {product.cost_price > 0 && (
                <Grid item xs={6}>
                  <Card sx={{
                    borderRadius: isMobile ? 2 : 1,
                    bgcolor: 'info.50',
                    boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: isMobile ? 'translateY(-2px)' : 'none',
                      boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.12)' : 'none'
                    }
                  }}>
                    <CardContent sx={{
                      textAlign: 'center',
                      p: isMobile ? 1.5 : 3,
                      '&:last-child': { pb: isMobile ? 1.5 : 3 }
                    }}>
                      <AttachMoney sx={{
                        fontSize: isMobile ? 24 : 32,
                        color: 'info.main',
                        mb: isMobile ? 0.5 : 1
                      }} />
                      <Typography
                        variant={isMobile ? 'h6' : 'h4'}
                        color="info.main"
                        fontWeight="bold"
                        sx={{ fontSize: isMobile ? '1rem' : undefined }}
                      >
                        {formatCurrency(product.cost_price)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                      >
                        {t('products:stats.costPrice')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {statistics?.sales_summary && (
                <>
                  <Grid item xs={6}>
                    <Card sx={{
                      borderRadius: isMobile ? 2 : 1,
                      bgcolor: 'success.50',
                      boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: isMobile ? 'translateY(-2px)' : 'none',
                        boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.12)' : 'none'
                      }
                    }}>
                      <CardContent sx={{
                        textAlign: 'center',
                        p: isMobile ? 1.5 : 3,
                        '&:last-child': { pb: isMobile ? 1.5 : 3 }
                      }}>
                        <Receipt sx={{
                          fontSize: isMobile ? 24 : 32,
                          color: 'success.main',
                          mb: isMobile ? 0.5 : 1
                        }} />
                        <Typography
                          variant={isMobile ? 'h6' : 'h4'}
                          color="success.main"
                          fontWeight="bold"
                          sx={{ fontSize: isMobile ? '1rem' : undefined }}
                        >
                          {statistics.sales_summary.total_invoices || 0}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                        >
                          {t('products:tabs.invoices')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6}>
                    <Card sx={{
                      borderRadius: isMobile ? 2 : 1,
                      bgcolor: 'warning.50',
                      boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: isMobile ? 'translateY(-2px)' : 'none',
                        boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.12)' : 'none'
                      }
                    }}>
                      <CardContent sx={{
                        textAlign: 'center',
                        p: isMobile ? 1.5 : 3,
                        '&:last-child': { pb: isMobile ? 1.5 : 3 }
                      }}>
                        <TrendingUp sx={{
                          fontSize: isMobile ? 24 : 32,
                          color: 'warning.main',
                          mb: isMobile ? 0.5 : 1
                        }} />
                        <Typography
                          variant={isMobile ? 'body2' : 'h4'}
                          color="warning.main"
                          fontWeight="bold"
                          sx={{
                            fontSize: isMobile ? '0.875rem' : undefined,
                            wordBreak: 'break-word'
                          }}
                        >
                          {formatCurrency(statistics.sales_summary.total_sales_amount || 0)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                        >
                          {t('products:stats.totalSales')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Stock - Style mobile app */}
            {product.stock_quantity !== null && product.stock_quantity !== undefined && (
              <Card sx={{
                borderRadius: isMobile ? 2.5 : 2,
                mb: isMobile ? 1.5 : 3,
                boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
                backdropFilter: isMobile ? 'blur(10px)' : 'none',
                border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: isMobile ? 1.5 : 2
                  }}>
                    <Inventory sx={{
                      color: 'primary.main',
                      fontSize: isMobile ? 20 : 24
                    }} />
                    <Typography
                      variant="subtitle1"
                      fontWeight="600"
                      sx={{ fontSize: isMobile ? '0.938rem' : undefined }}
                    >
                      {t('products:labels.stock')}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: isMobile ? 1.5 : 2,
                      borderRadius: isMobile ? 2 : 1,
                      bgcolor: `${stockStatus}.50`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: isMobile ? 'translateY(-1px)' : 'none',
                        boxShadow: isMobile ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                      }
                    }}
                  >
                    <Typography
                      variant={isMobile ? "h4" : "h3"}
                      color={`${stockStatus}.main`}
                      fontWeight="bold"
                      sx={{ fontSize: isMobile ? '1.5rem' : undefined }}
                    >
                      {product.stock_quantity}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        fontSize: isMobile ? '0.75rem' : undefined
                      }}
                    >
                      {product.stock_quantity === 0 ? t('products:stockStatus.outOfStock') :
                        product.stock_quantity <= 10 ? t('products:stockStatus.low') : t('products:filters.inStock')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Dates - Style mobile app */}
            <Card sx={{
              borderRadius: isMobile ? 2.5 : 2,
              boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
              backdropFilter: isMobile ? 'blur(10px)' : 'none',
              border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="600"
                  gutterBottom
                  sx={{ fontSize: isMobile ? '0.938rem' : undefined }}
                >
                  {t('products:labels.systemInfo')}
                </Typography>
                <Stack spacing={isMobile ? 1 : 1.5} sx={{ mt: isMobile ? 1.5 : 2 }}>
                  <Box sx={{
                    p: isMobile ? 1 : 0,
                    borderRadius: isMobile ? 1.5 : 0,
                    bgcolor: isMobile ? 'rgba(0,0,0,0.02)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                    >
                      {t('products:labels.createdOn')}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="500"
                      sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                    >
                      {formatDate(product.created_at)}
                    </Typography>
                  </Box>
                  <Divider sx={{
                    borderColor: isMobile ? 'rgba(0,0,0,0.06)' : undefined
                  }} />
                  <Box sx={{
                    p: isMobile ? 1 : 0,
                    borderRadius: isMobile ? 1.5 : 0,
                    bgcolor: isMobile ? 'rgba(0,0,0,0.02)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                    >
                      {t('products:labels.updatedOn')}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="500"
                      sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                    >
                      {formatDate(product.updated_at)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
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

      {/* Tab: Mouvements de Stock - Affiché uniquement pour les produits physiques */}
      {product?.product_type === 'physical' && activeTab === 3 && (
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
