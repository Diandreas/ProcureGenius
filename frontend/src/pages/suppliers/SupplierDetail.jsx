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
  CalendarToday,
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
import { useHeader } from '../../contexts/HeaderContext';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { generateSupplierReportPDF, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';
import usePdfViewer from '../../hooks/usePdfViewer';
import PdfViewerDialog from '../../components/pdf/PdfViewerDialog';
import { isNativePlatform } from '../../utils/platform';
import useSwipeTabs from '../../hooks/useSwipeTabs';

const IS_NATIVE = isNativePlatform();
import { NeumorphicPanel, neuShadows } from '../../components/neumorphic/NeumorphicList';

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
  const pdfViewer = usePdfViewer();
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);

  const { setHeaderConfig } = useHeader();

  useEffect(() => {
    fetchSupplier();
    fetchStatistics();
  }, [id]);

  // Global Header Integration
  useEffect(() => {
    if (isMobile && supplier) {
      setHeaderConfig({
        title: supplier.name,
        showBackButton: true,
        onBack: () => navigate('/suppliers'),
        rightActions: [
          {
            icon: <PictureAsPdf />,
            onClick: () => setPdfDialogOpen(true),
            label: t('suppliers:actions.downloadPdf')
          },
          {
            icon: <Edit />,
            onClick: () => navigate(`/suppliers/${id}/edit`),
            label: t('suppliers:actions.edit')
          },
          {
            icon: <Delete />,
            onClick: handleDelete,
            label: t('suppliers:actions.delete'),
            color: 'error'
          }
        ]
      });
    }

    return () => {
      if (isMobile) {
        setHeaderConfig(null);
      }
    };
  }, [isMobile, supplier, id, t]);

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

  const handlePdfAction = async (action) => {
    if (!generatedPdfBlob) return;
    const fname = `rapport-fournisseur-${supplier.name}.pdf`;

    if (action === 'download') {
      await pdfViewer.download(generatedPdfBlob, fname);
      enqueueSnackbar(t('suppliers:messages.pdfDownloaded', 'Rapport PDF téléchargé avec succès'), { variant: 'success' });
    } else if (action === 'preview') {
      pdfViewer.preview(generatedPdfBlob, fname, `Rapport ${supplier.name}`);
      return;
    } else if (action === 'print') {
      if (IS_NATIVE) {
        pdfViewer.preview(generatedPdfBlob, fname, `Rapport ${supplier.name}`);
        return;
      }
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

  // Onglets (icône seule sur mobile, icône + label desktop)
  const SUPPLIER_TABS = [
    { icon: Info, label: t('suppliers:tabs.info') },
    { icon: ShoppingCart, label: t('suppliers:tabs.orders') },
    { icon: Inventory, label: t('suppliers:tabs.products') },
  ];

  // Swipe horizontal entre onglets (mobile).
  const swipeHandlers = useSwipeTabs(activeTab, SUPPLIER_TABS.length, setActiveTab, IS_NATIVE);

  return (
    <Box sx={{
      p: { xs: 0, sm: 2, md: 3 },
      pb: { xs: 12, sm: 2, md: 3 }, // Space for mobile nav
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header - Simple back button on desktop */}
      <Box sx={{ mb: isMobile ? 1 : 2, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/suppliers')} size="medium">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {supplier.name}
          </Typography>
        </Box>
      </Box>


      {/* Quick Actions - More compact */}
      <Box sx={{ mb: 2, px: isMobile ? 2 : 0 }}>
        <Stack direction={isMobile ? "column" : "row"} spacing={1}>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={() => navigate(`/purchase-orders/new?supplier=${id}`)}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              py: 1,
              bgcolor: 'primary.main',
              boxShadow: 'none',
              '&:hover': { bgcolor: 'primary.dark', boxShadow: '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff' }
            }}
          >
            {t('suppliers:actions.newPurchaseOrder')}
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<Inventory2 />}
            onClick={() => navigate(`/products/new?supplier=${id}`)}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              py: 1,
              bgcolor: 'success.main',
              boxShadow: 'none',
              '&:hover': { bgcolor: 'success.dark', boxShadow: '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff' }
            }}
          >
            {t('suppliers:actions.addProducts')}
          </Button>
          {!isMobile && (
            <Button
              fullWidth
              variant="contained"
              size="small"
              startIcon={<Assessment />}
              onClick={() => handleGenerateReport('pdf')}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                py: 1,
                bgcolor: 'warning.main',
                color: 'white',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'warning.dark', boxShadow: '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff' }
              }}
            >
              {t('suppliers:actions.generateReport')}
            </Button>
          )}
        </Stack>
      </Box>

      {/* Onglets segmentés neumorphiques (icônes seules sur mobile) */}
      <Box sx={{ px: isMobile ? 2 : 0, mb: isMobile ? 1.5 : 3 }}>
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
          {SUPPLIER_TABS.map((tab, idx) => {
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
                    color: selected ? 'primary.main' : 'text.secondary',
                    bgcolor: selected ? 'background.paper' : 'transparent',
                    boxShadow: selected ? (th => neuShadows.shadowRaisedSm(th)) : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: selected ? 'primary.main' : 'text.primary' },
                  }}
                >
                  <TabIcon sx={{ fontSize: isMobile ? 20 : 18, color: selected ? 'primary.main' : 'inherit' }} />
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
        <Box sx={{ px: isMobile ? 2 : 0 }}>
          <Grid container spacing={isMobile ? 1.5 : 2.5}>
            {/* Colonne principale */}
            <Grid item xs={12} md={8}>
              {/* Hero fournisseur */}
              <NeumorphicPanel accent="primary.main" sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar sx={{ width: { xs: 60, sm: 84 }, height: { xs: 60, sm: 84 }, bgcolor: 'primary.main', borderRadius: 3, fontSize: { xs: '1.6rem', sm: '2.2rem' }, fontWeight: 800, flexShrink: 0 }}>
                    {supplier.name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.4rem' }, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {supplier.name}
                      </Typography>
                      {/* Actions mobile */}
                      <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'flex', md: 'none' }, flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => setPdfDialogOpen(true)} sx={{ color: 'success.main' }}><PictureAsPdf fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => navigate(`/suppliers/${id}/edit`)} sx={{ color: 'primary.main' }}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={handleDelete} sx={{ color: 'error.main' }}><Delete fontSize="small" /></IconButton>
                      </Stack>
                    </Box>
                    {parseRating(supplier.rating) > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                        <Rating value={parseRating(supplier.rating)} readOnly size="small" precision={0.1} />
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{parseRating(supplier.rating).toFixed(1)}/5</Typography>
                        {supplier.rating_details && (
                          <Chip label={t('suppliers:labels.autoCalculated')} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                        )}
                      </Box>
                    )}
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip label={getStatusLabel(supplier.status)} color={getStatusColor(supplier.status)} size="small" sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }} />
                      {supplier.is_local && <Chip label={t('suppliers:labels.local')} size="small" color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />}
                      {supplier.is_minority_owned && <Chip label={t('suppliers:labels.minorityOwned')} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />}
                      {supplier.is_woman_owned && <Chip label={t('suppliers:labels.womanOwned')} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />}
                      {supplier.is_indigenous && <Chip label={t('suppliers:labels.indigenousOwned')} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />}
                    </Stack>
                  </Box>
                </Box>
              </NeumorphicPanel>

              {/* Coordonnées */}
              <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 1.75, sm: 2.25 } }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1.5 }}>{t('suppliers:tabs.info')}</Typography>
                <Grid container spacing={1.25}>
                  {[
                    { show: !!supplier.contact_person, icon: Person, label: t('suppliers:labels.contactPerson'), value: supplier.contact_person },
                    { show: !!supplier.email, icon: Email, label: t('suppliers:labels.email'), value: supplier.email },
                    { show: !!supplier.phone, icon: Phone, label: t('suppliers:labels.phone'), value: supplier.phone },
                    { show: !!(supplier.address || supplier.city || supplier.province), icon: LocationOn, label: t('suppliers:labels.address'), value: [supplier.address, supplier.city, supplier.province].filter(Boolean).join(', '), full: true },
                  ].filter(f => f.show).map((f, i) => {
                    const FIcon = f.icon;
                    return (
                      <Grid item xs={12} sm={f.full ? 12 : 6} key={i}>
                        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.25, borderRadius: 2, boxShadow: th => neuShadows.shadowInset(th) }}>
                          <FIcon sx={{ fontSize: 18, color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>{f.label}</Typography>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', wordBreak: 'break-word' }}>{f.value}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </NeumorphicPanel>

              {/* Performance financière */}
              {statistics?.financial_stats && (
                <NeumorphicPanel sx={{ p: { xs: 1.75, sm: 2.25 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('suppliers:labels.performance', 'Performance')}</Typography>
                  </Box>
                  <Grid container spacing={1.25}>
                    {[
                      { label: t('suppliers:labels.totalSpent'), value: formatCurrency(statistics.financial_stats.total_spent || 0), color: 'success.main' },
                      { label: t('suppliers:labels.orders'), value: statistics.financial_stats.total_orders || 0, color: 'primary.main' },
                      { label: t('suppliers:labels.averageValue'), value: formatCurrency(statistics.financial_stats.average_order_value || 0), color: 'info.main' },
                    ].map((s, i) => (
                      <Grid item xs={4} key={i}>
                        <Box sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', boxShadow: th => neuShadows.shadowInset(th) }}>
                          <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.9rem', sm: '1.1rem' }, color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{s.label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </NeumorphicPanel>
              )}
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              {/* Détail notation */}
              {supplier?.rating_details && (
                <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 1.75, sm: 2.25 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Star sx={{ color: 'warning.main', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('suppliers:labels.ratingDetails')}</Typography>
                  </Box>
                  <Stack spacing={1}>
                    {[
                      { label: t('suppliers:labels.punctuality'), score: supplier.rating_details.punctuality_score, weight: supplier.rating_details.weights.punctuality_weight },
                      { label: t('suppliers:labels.quality'), score: supplier.rating_details.quality_score, weight: supplier.rating_details.weights.quality_weight },
                      { label: t('suppliers:labels.payment'), score: supplier.rating_details.payment_score, weight: supplier.rating_details.weights.payment_weight },
                    ].map((r, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.25, borderRadius: 2, boxShadow: th => neuShadows.shadowInset(th) }}>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.label}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{Math.round(r.weight * 100)}% {t('suppliers:labels.ofScore', 'du score')}</Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 800, color: 'warning.main', fontSize: '0.95rem' }}>{r.score}/5</Typography>
                      </Box>
                    ))}
                  </Stack>
                </NeumorphicPanel>
              )}

              {/* Diversité */}
              <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 1.75, sm: 2.25 } }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1.5 }}>{t('suppliers:labels.diversity')}</Typography>
                <Stack spacing={1}>
                  {[
                    { ok: supplier.is_local, label: t('suppliers:labels.localSupplier') },
                    { ok: supplier.is_minority_owned, label: t('suppliers:labels.minorityOwned') },
                    { ok: supplier.is_woman_owned, label: t('suppliers:labels.womanOwned') },
                    { ok: supplier.is_indigenous, label: t('suppliers:labels.indigenousOwned') },
                  ].map((d, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {d.ok ? <CheckCircle sx={{ fontSize: 18 }} color="success" /> : <Block sx={{ fontSize: 18 }} color="disabled" />}
                      <Typography sx={{ fontSize: '0.82rem', color: d.ok ? 'text.primary' : 'text.secondary', fontWeight: d.ok ? 600 : 400 }}>{d.label}</Typography>
                    </Box>
                  ))}
                </Stack>
              </NeumorphicPanel>

              {/* Catégories */}
              {supplier.categories && supplier.categories.length > 0 && (
                <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 1.75, sm: 2.25 } }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1.5 }}>{t('suppliers:labels.categories')}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {supplier.categories.map((category, i) => (
                      <Chip key={i} label={typeof category === 'string' ? category : category.name} size="small" sx={{ height: 24, fontSize: '0.72rem' }} />
                    ))}
                  </Box>
                </NeumorphicPanel>
              )}

              {/* Dates */}
              <NeumorphicPanel sx={{ p: { xs: 1.75, sm: 2.25 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <CalendarToday sx={{ color: 'text.secondary', fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('suppliers:labels.systemInfo')}</Typography>
                </Box>
                <Stack spacing={1.25}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">{t('suppliers:labels.createdOn')}</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{formatDate(supplier.created_at)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">{t('suppliers:labels.modifiedOn')}</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{formatDate(supplier.updated_at)}</Typography>
                  </Box>
                </Stack>
              </NeumorphicPanel>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab: Commandes */}
      {activeTab === 1 && (
        <Box sx={{ px: isMobile ? 2 : 0 }}>
          <NeumorphicPanel accent="primary.main" sx={{ p: { xs: 1.75, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ShoppingCart sx={{ color: 'primary.main', fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                {t('suppliers:labels.purchaseOrders')}
              </Typography>
            </Box>
            {statistics?.purchase_orders?.recent && statistics.purchase_orders.recent.length > 0 ? (
              <Box sx={{ p: 1.5, borderRadius: 2, boxShadow: th => neuShadows.shadowInset(th) }}>
                <Typography variant="body2" color="text.secondary">
                  {t('suppliers:labels.totalOrders', { count: statistics.purchase_orders.total_count })}
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>{t('suppliers:labels.noOrders')}</Alert>
            )}
          </NeumorphicPanel>
        </Box>
      )}

      {/* Tab: Produits */}
      {activeTab === 2 && (
        <Box sx={{ px: isMobile ? 2 : 0 }}>
          <NeumorphicPanel accent="info.main" sx={{ p: { xs: 1.75, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Inventory sx={{ color: 'info.main', fontSize: 22 }} />
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                {t('suppliers:labels.topProducts')}
              </Typography>
            </Box>
            {statistics?.top_products && statistics.top_products.length > 0 ? (
              <Box sx={{ p: 1.5, borderRadius: 2, boxShadow: th => neuShadows.shadowInset(th) }}>
                <Typography variant="body2" color="text.secondary">
                  {t('suppliers:labels.totalProducts', { count: statistics.top_products.length })}
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>{t('suppliers:labels.noProducts')}</Alert>
            )}
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

export default SupplierDetail;
