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
  Rating,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowBack,
  Edit,
  Delete,
  Person,
  Email,
  Phone,
  LocationOn,
  Business,
  Star,
  AttachMoney,
  ShoppingCart,
  Inventory,
  TrendingUp,
  Info,
  CheckCircle,
  Block,
  Assessment,
  Add,
  ReceiptLong,
  Inventory2,
  PictureAsPdf,
  Receipt,
  Print,
  Download,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../../services/api';
import reportsAPI from '../../services/reportsAPI';
import { getStatusColor, getStatusLabel, formatDate, parseRating } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { generateSupplierReportPDF, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';

function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['suppliers', 'common']);
  const { format: formatCurrency } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [supplier, setSupplier] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);

  useEffect(() => {
    fetchSupplier();
    fetchStatistics();
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.get(id);
      setSupplier(response.data);
    } catch (error) {
      enqueueSnackbar(t('suppliers:messages.loadingError'), { variant: 'error' });
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await suppliersAPI.getStatistics(id);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error loading supplier statistics:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('suppliers:messages.deleteConfirmation', { name: supplier.name }))) {
      try {
        await suppliersAPI.delete(id);
        enqueueSnackbar(t('suppliers:messages.supplierDeleted'), { variant: 'success' });
        navigate('/suppliers');
      } catch (error) {
        enqueueSnackbar(t('suppliers:messages.deleteError'), { variant: 'error' });
      }
    }
  };

  const handleGenerateReport = async (format = 'pdf') => {
    try {
      enqueueSnackbar(t('suppliers:messages.reportGenerating', { format: format.toUpperCase() }), { variant: 'info' });

      const response = await reportsAPI.generateSupplierReport(id, format);
      const report = response.data;

      if (report.status === 'completed') {
        enqueueSnackbar(t('suppliers:messages.reportGenerated'), { variant: 'success' });

        // Télécharger automatiquement
        const downloadResponse = await reportsAPI.download(report.id);
        const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', report.file_name || `rapport_${id}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        enqueueSnackbar(t('suppliers:messages.reportInProgress'), { variant: 'info' });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      enqueueSnackbar(t('suppliers:messages.reportError'), { variant: 'error' });
    }
  };

  // Générer automatiquement le PDF quand le dialogue s'ouvre
  useEffect(() => {
    if (pdfDialogOpen && supplier && !generatedPdfBlob && !generatingPdf) {
      const generatePDF = async () => {
        setGeneratingPdf(true);
        try {
          const pdfBlob = await generateSupplierReportPDF(supplier);
          setGeneratedPdfBlob(pdfBlob);
        } catch (error) {
          console.error('Error generating PDF:', error);
          enqueueSnackbar(t('suppliers:messages.pdfError', 'Erreur lors de la génération du PDF'), { variant: 'error' });
          setPdfDialogOpen(false);
        } finally {
          setGeneratingPdf(false);
        }
      };
      generatePDF();
    }
  }, [pdfDialogOpen, supplier, generatedPdfBlob, generatingPdf]);

  const handlePdfAction = (action) => {
    if (!generatedPdfBlob) return;

    if (action === 'download') {
      downloadPDF(generatedPdfBlob, `rapport-fournisseur-${supplier.name}.pdf`);
      enqueueSnackbar(t('suppliers:messages.pdfDownloaded', 'Rapport PDF téléchargé avec succès'), { variant: 'success' });
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
        enqueueSnackbar(t('suppliers:messages.printWindowOpened', 'Fenêtre d\'impression ouverte'), { variant: 'success' });
      } else {
        enqueueSnackbar(t('suppliers:messages.cannotOpenPrintWindow', 'Impossible d\'ouvrir la fenêtre d\'impression'), { variant: 'error' });
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
    return <LoadingState message={t('suppliers:messages.loading', 'Chargement du fournisseur...')} />;
  }

  if (!supplier) {
    return (
      <ErrorState
        title={t('suppliers:messages.supplierNotFound', 'Fournisseur non trouvé')}
        message={t('suppliers:messages.supplierNotFoundDescription', 'Le fournisseur que vous recherchez n\'existe pas ou a été supprimé.')}
        showHome={false}
        onRetry={() => navigate('/suppliers')}
      />
    );
  }

  return (
    <Box sx={{
      p: { xs: 0, sm: 2, md: 3 },
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/suppliers')} size="medium">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold" sx={{ flex: 1 }}>
            {supplier.name}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="success"
              startIcon={<PictureAsPdf />}
              onClick={() => setPdfDialogOpen(true)}
            >
              {t('suppliers:actions.downloadPdf', 'Rapport PDF')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate(`/suppliers/${id}/edit`)}
            >
              {t('suppliers:actions.edit')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleDelete}
            >
              {t('suppliers:actions.delete')}
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Actions Mobile - Style mobile app compact */}
      <Box sx={{
        mb: 1.5,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'flex-end',
        gap: 0.5,
        px: 2,
        py: 1
      }}>
        <Tooltip title={t('suppliers:tooltips.editSupplier')}>
          <IconButton
            onClick={() => navigate(`/suppliers/${id}/edit`)}
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
        <Tooltip title={t('suppliers:tooltips.deleteSupplier')}>
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

      {/* Quick Actions */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mb: 2 }}>
            {t('suppliers:actions.quickActions')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/purchase-orders/new?supplier=${id}`)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
              >
                {t('suppliers:actions.newPurchaseOrder')}
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Inventory2 />}
                onClick={() => navigate(`/products/new?supplier=${id}`)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  bgcolor: 'success.main',
                  '&:hover': {
                    bgcolor: 'success.dark',
                  }
                }}
              >
                {t('suppliers:actions.addProducts')}
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Assessment />}
                onClick={() => handleGenerateReport('pdf')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  bgcolor: 'warning.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'warning.dark',
                  }
                }}
              >
                {t('suppliers:actions.generateReport')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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
          label={t('suppliers:tabs.info')}
          iconPosition="start"
        />
        <Tab
          icon={<ShoppingCart sx={{ fontSize: isMobile ? 18 : 20 }} />}
          label={t('suppliers:tabs.orders')}
          iconPosition="start"
        />
        <Tab
          icon={<Inventory sx={{ fontSize: isMobile ? 18 : 20 }} />}
          label={t('suppliers:tabs.products')}
          iconPosition="start"
        />
      </Tabs>

      {/* Tab: Informations */}
      {activeTab === 0 && (
        <Box sx={{ px: isMobile ? 2 : 0 }}>
          <Grid container spacing={isMobile ? 1.5 : 3}>
            {/* Card principale - Style mobile app */}
            <Grid item xs={12} md={8}>
              <Card sx={{
                borderRadius: isMobile ? 3 : 2.5,
                mb: isMobile ? 2 : 3,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                boxShadow: isMobile ? '0 8px 32px rgba(0,0,0,0.12)' : '0 4px 20px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid',
                borderColor: theme => alpha(theme.palette.divider, 0.1),
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: isMobile ? 'translateY(-2px)' : 'translateY(-4px)',
                  boxShadow: isMobile ? '0 12px 40px rgba(0,0,0,0.15)' : '0 8px 30px rgba(0,0,0,0.12)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  borderRadius: '2.5px 2.5px 0 0'
                }
              }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Avatar
                    sx={{
                      width: isMobile ? 80 : 100,
                      height: isMobile ? 80 : 100,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      fontSize: isMobile ? '2rem' : '2.5rem',
                    }}
                  >
                    {supplier.name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" gutterBottom>
                      {supplier.name}
                    </Typography>
                    {parseRating(supplier.rating) > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Rating value={parseRating(supplier.rating)} readOnly size={isMobile ? 'small' : 'medium'} />
                        <Typography variant="body2" color="text.secondary">
                          ({parseRating(supplier.rating).toFixed(1)}/5)
                        </Typography>
                      </Box>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={getStatusLabel(supplier.status)}
                        color={getStatusColor(supplier.status)}
                        size="small"
                      />
                      {supplier.is_local && (
                        <Chip label={t('suppliers:labels.local')} size="small" color="success" variant="outlined" />
                      )}
                      {supplier.is_minority_owned && (
                        <Chip label={t('suppliers:diversity.minority')} size="small" color="info" variant="outlined" />
                      )}
                      {supplier.is_woman_owned && (
                        <Chip label={t('suppliers:diversity.woman')} size="small" color="secondary" variant="outlined" />
                      )}
                      {supplier.is_indigenous && (
                        <Chip label={t('suppliers:diversity.indigenous')} size="small" color="warning" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Informations de contact */}
                <Grid container spacing={2}>
                  {supplier.contact_person && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('suppliers:labels.contactPerson')}
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {supplier.contact_person}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {supplier.email && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('suppliers:labels.email')}
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            <a href={`mailto:${supplier.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {supplier.email}
                            </a>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {supplier.phone && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('suppliers:labels.phone')}
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            <a href={`tel:${supplier.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {supplier.phone}
                            </a>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {(supplier.address || supplier.city || supplier.province) && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LocationOn sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('suppliers:labels.address')}
                          </Typography>
                          {supplier.address && (
                            <Typography variant="body2" fontWeight="500">
                              {supplier.address}
                            </Typography>
                          )}
                          <Typography variant="body2" fontWeight="500">
                            {[supplier.city, supplier.province].filter(Boolean).join(', ')}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Statistiques */}
            {statistics?.financial_stats && (
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={6} sm={4}>
                  <Card sx={{
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.primary.main, 0.2),
                    boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: isMobile ? 'translateY(-4px) scale(1.02)' : 'translateY(-2px)',
                      boxShadow: isMobile ? '0 8px 32px rgba(0,0,0,0.15)' : '0 4px 16px rgba(0,0,0,0.12)'
                    },
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.light, 0.8)})`,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <AttachMoney sx={{
                        fontSize: isMobile ? 32 : 36,
                        color: 'primary.main',
                        mb: isMobile ? 1 : 1.5,
                        opacity: 0.9
                      }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                        fontWeight: 700,
                        mb: 1,
                        background: theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {formatCurrency(statistics.financial_stats.total_spent || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('suppliers:labels.totalSpent')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Card sx={{
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.success.main, 0.2),
                    boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: isMobile ? 'translateY(-4px) scale(1.02)' : 'translateY(-2px)',
                      boxShadow: isMobile ? '0 8px 32px rgba(0,0,0,0.15)' : '0 4px 16px rgba(0,0,0,0.12)'
                    },
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: theme => `linear-gradient(90deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.light, 0.8)})`,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <ShoppingCart sx={{
                        fontSize: isMobile ? 32 : 36,
                        color: 'success.main',
                        mb: isMobile ? 1 : 1.5,
                        opacity: 0.9
                      }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                        fontWeight: 700,
                        mb: 1,
                        background: theme => `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {statistics.financial_stats.total_orders || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('suppliers:labels.orders')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card sx={{
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.info.main, 0.2),
                    boxShadow: isMobile ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: isMobile ? 'translateY(-4px) scale(1.02)' : 'translateY(-2px)',
                      boxShadow: isMobile ? '0 8px 32px rgba(0,0,0,0.15)' : '0 4px 16px rgba(0,0,0,0.12)'
                    },
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: theme => `linear-gradient(90deg, ${theme.palette.info.main}, ${alpha(theme.palette.info.light, 0.8)})`,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <TrendingUp sx={{
                        fontSize: isMobile ? 32 : 36,
                        color: 'info.main',
                        mb: isMobile ? 1 : 1.5,
                        opacity: 0.9
                      }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                        fontWeight: 700,
                        mb: 1,
                        background: theme => `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {formatCurrency(statistics.financial_stats.average_order_value || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('suppliers:labels.averageValue')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Diversité */}
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Business sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight="600">
                    {t('suppliers:labels.diversity')}
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      {supplier.is_local ? <CheckCircle color="success" /> : <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText primary={t('suppliers:labels.localSupplier')} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {supplier.is_minority_owned ? <CheckCircle color="success" /> : <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText primary={t('suppliers:labels.minorityOwned')} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {supplier.is_woman_owned ? <CheckCircle color="success" /> : <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText primary={t('suppliers:labels.womanOwned')} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {supplier.is_indigenous ? <CheckCircle color="success" /> : <Block color="disabled" />}
                    </ListItemIcon>
                    <ListItemText primary={t('suppliers:labels.indigenousOwned')} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Catégories */}
            {supplier.categories && supplier.categories.length > 0 && (
              <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    {t('suppliers:labels.categories')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {supplier.categories.map((category) => (
                      <Chip
                        key={category.id}
                        label={category.name}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t('suppliers:labels.systemInfo')}
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('suppliers:labels.createdOn')}
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(supplier.created_at)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('suppliers:labels.modifiedOn')}
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(supplier.updated_at)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </Box>
      )}

      {/* Tab: Commandes */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ShoppingCart color="primary" />
            {t('suppliers:labels.purchaseOrders')}
          </Typography>
          {statistics?.purchase_orders?.recent && statistics.purchase_orders.recent.length > 0 ? (
            <Card sx={{ borderRadius: 1 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {t('suppliers:labels.totalOrders', { count: statistics.purchase_orders.total_count })}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">{t('suppliers:labels.noOrders')}</Alert>
          )}
        </Box>
      )}

      {/* Tab: Produits */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Inventory color="primary" />
            {t('suppliers:labels.topProducts')}
          </Typography>
          {statistics?.top_products && statistics.top_products.length > 0 ? (
            <Card sx={{ borderRadius: 1 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {t('suppliers:labels.totalProducts', { count: statistics.top_products.length })}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">{t('suppliers:labels.noProducts')}</Alert>
          )}
        </Box>
      )}

      {/* PDF Dialog - Génération automatique */}
      <Dialog open={pdfDialogOpen} onClose={handleClosePdfDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('suppliers:pdf.title', 'Rapport PDF Fournisseur')}
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
              {t('suppliers:pdf.ready', 'Le rapport PDF est prêt. Choisissez une action:')}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('suppliers:pdf.description', 'Génération du rapport PDF...')}
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

export default SupplierDetail;
