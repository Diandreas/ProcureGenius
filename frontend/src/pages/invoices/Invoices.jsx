import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Stack,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  useMediaQuery,
  useTheme,
  Button,
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
  Receipt,
  Business,
  Person,
  AttachMoney,
  TrendingUp,
  Schedule,
  CheckCircle,
  Warning,
  Error,
  Description,
  PictureAsPdf,
  Print,
  Download,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { fetchInvoices } from '../../store/slices/invoicesSlice';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { generateInvoicesBulkReport, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';

function Invoices() {
  const { t } = useTranslation(['invoices', 'common']);
  const { format: formatCurrency } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redux state
  const { invoices, loading, error } = useSelector((state) => state.invoices);

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [reportConfigOpen, setReportConfigOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    dateStart: '',
    dateEnd: '',
    selectedInvoices: [],
  });

  useEffect(() => {
    dispatch(fetchInvoices());
  }, [dispatch]);

  const handleQuickFilterClick = (filterValue) => {
    if (quickFilter === filterValue) {
      setQuickFilter('');
    } else {
      setQuickFilter(filterValue);
    }
  };

  const handleGenerateReportClick = useCallback(() => {
    setReportConfigOpen(true);
  }, []);

  // Enregistrer la fonction de rapport dans la top nav bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('register-report-action', {
      detail: {
        onClick: handleGenerateReportClick,
        label: t('invoices:actions.generateReport', 'Rapport PDF'),
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
      const pdfBlob = await generateInvoicesBulkReport({
        itemIds: reportFilters.selectedInvoices.length > 0 ? reportFilters.selectedInvoices : undefined,
        dateStart: reportFilters.dateStart || undefined,
        dateEnd: reportFilters.dateEnd || undefined,
        status: quickFilter || statusFilter || undefined,
      });
      setGeneratedPdfBlob(pdfBlob);
    } catch (error) {
      console.error('Error generating report:', error);
      enqueueSnackbar(t('invoices:messages.reportError', 'Erreur lors de la génération du rapport'), {
        variant: 'error',
      });
      setReportDialogOpen(false);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePdfAction = (action) => {
    if (!generatedPdfBlob) return;

    if (action === 'download') {
      downloadPDF(generatedPdfBlob, `rapport-factures-${new Date().getTime()}.pdf`);
      enqueueSnackbar(t('invoices:messages.pdfDownloadedSuccess', 'PDF téléchargé avec succès'), {
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
      enqueueSnackbar(t('invoices:messages.printWindowOpened', 'Fenêtre d\'impression ouverte'), {
        variant: 'success',
      });
    }
    setReportDialogOpen(false);
  };

  const handleCloseDialog = () => {
    setReportDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || invoice.status === statusFilter;

    const matchesQuick = !quickFilter || (() => {
      if (quickFilter === 'paid') return invoice.status === 'paid';
      if (quickFilter === 'cancelled') return invoice.status === 'cancelled';
      return true;
    })();

    const matchesDate = !selectedDate || (() => {
      // Filtrer par date de création
      const createdAt = invoice.created_at ? invoice.created_at.split('T')[0] : null;
      return createdAt === selectedDate;
    })();

    return matchesSearch && matchesStatus && matchesQuick && matchesDate;
  });

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      overdue: 'error',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: t('invoices:status.draft'),
      sent: t('invoices:status.sent'),
      paid: t('invoices:status.paid'),
      overdue: t('invoices:status.overdue'),
      cancelled: t('invoices:status.cancelled')
    };
    return labels[status] || status;
  };

  // Statistiques
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);

  // Payment method stats (based on filtered invoices)
  const cashAmount = filteredInvoices
    .filter(i => i.status === 'paid' && (i.payment_method === 'cash' || !i.payment_method))
    .reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);
  const mobileAmount = filteredInvoices
    .filter(i => i.status === 'paid' && i.payment_method === 'mobile_money')
    .reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);
  const filteredPaidTotal = filteredInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);

  const InvoiceCard = ({ invoice, index }) => {
    const statusColor = invoice.status === 'paid' ? '#10b981' : invoice.status === 'sent' ? '#2563eb' : '#f59e0b';

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
          boxShadow: `0 20px 60px ${alpha(statusColor, 0.2)}`
        }}
        style={{ height: '100%' }}
      >
        <Card
          onClick={() => navigate(`/invoices/${invoice.id}`)}
          sx={{
            cursor: 'pointer',
            height: '100%',
            borderRadius: 3,
            background: theme => `linear-gradient(145deg,
              ${alpha(theme.palette.background.paper, 0.95)} 0%,
              ${alpha(statusColor, 0.03)} 50%,
              ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            boxShadow: theme => `0 4px 20px ${alpha(statusColor, 0.08)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
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
              background: `linear-gradient(90deg, ${statusColor}, ${alpha(statusColor, 0.5)})`,
              borderRadius: '3px 3px 0 0',
              boxShadow: `0 2px 8px ${alpha(statusColor, 0.3)}`
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at top right, ${alpha(statusColor, 0.05)} 0%, transparent 70%)`,
              pointerEvents: 'none'
            }
          }}
        >
          <CardContent sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
              <Avatar
                sx={{
                  width: isMobile ? 48 : 56,
                  height: isMobile ? 48 : 56,
                  bgcolor: 'primary.main',
                  borderRadius: 2,
                  boxShadow: 2,
                }}
              >
                <Receipt />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    mb: 0.5,
                    color: 'primary.main',
                    fontSize: isMobile ? '0.875rem' : '0.95rem',
                  }}
                >
                  {invoice.invoice_number}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {invoice.title}
                </Typography>
              </Box>
            </Box>

            {/* Prix */}
            <Box
              sx={{
                bgcolor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(52, 211, 153, 0.1)'
                  : 'rgba(16, 185, 129, 0.08)',
                borderRadius: 1,
                p: 1,
                mb: 1.5,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h6"
                color="success.main"
                sx={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.25rem' }}
              >
                {formatCurrency(invoice.total_amount)}
              </Typography>
            </Box>

            {/* Infos */}
            <Stack spacing={0.75}>
              {invoice.client_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {invoice.client_name}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {formatDate(invoice.created_at)}
                </Typography>
              </Box>
            </Stack>

            {/* Footer */}
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={getStatusLabel(invoice.status)}
                size="small"
                color={getStatusColor(invoice.status)}
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading && invoices.length === 0) {
    return <LoadingState message={t('invoices:messages.loading', 'Chargement des factures...')} />;
  }

  if (error) {
    return (
      <ErrorState
        title={t('invoices:messages.loadingError', 'Erreur de chargement')}
        message={t('invoices:messages.loadingErrorDescription', 'Impossible de charger les factures. Veuillez réessayer.')}
        showHome={false}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>

      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={isMobile ? 1.5 : 2}>
          {/* Encaisse Card */}
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                borderRadius: 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.03)} 100%)`,
                border: '1.5px solid',
                borderColor: theme => alpha(theme.palette.success.main, 0.2),
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.success.main, 0.15)}`,
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoney sx={{ fontSize: 24, color: 'success.main' }} />
                    <Typography variant="h6" fontWeight="600" color="text.primary">
                      Encaisse
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: theme => alpha(theme.palette.success.main, 0.08),
                        border: '1px solid',
                        borderColor: theme => alpha(theme.palette.success.main, 0.15)
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                          Cash
                        </Typography>
                        <Typography variant="h6" fontWeight="700" color="success.main" sx={{ mt: 0.5 }}>
                          {formatCurrency(cashAmount)}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: theme => alpha(theme.palette.info.main, 0.08),
                        border: '1px solid',
                        borderColor: theme => alpha(theme.palette.info.main, 0.15)
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                          Mobile Money
                        </Typography>
                        <Typography variant="h6" fontWeight="700" color="info.main" sx={{ mt: 0.5 }}>
                          {formatCurrency(mobileAmount)}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
                        border: '1px solid',
                        borderColor: theme => alpha(theme.palette.primary.main, 0.15)
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                          Total Payé
                        </Typography>
                        <Typography variant="h6" fontWeight="700" color="primary.main" sx={{ mt: 0.5 }}>
                          {formatCurrency(filteredPaidTotal)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Invoice Count & Date Navigation */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
                border: '1.5px solid',
                borderColor: theme => alpha(theme.palette.primary.main, 0.2),
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardContent sx={{ p: isMobile ? 2 : 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack spacing={2} sx={{ flex: 1 }}>
                  {/* Invoice Count */}
                  <Box sx={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Receipt sx={{ fontSize: 32, color: 'primary.main', mb: 1, mx: 'auto' }} />
                    <Typography variant="h3" fontWeight="700" color="primary.main">
                      {filteredInvoices.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500, mt: 0.5 }}>
                      {selectedDate ? 'Factures du jour' : 'Factures totales'}
                    </Typography>
                  </Box>

                  {/* Date Navigation */}
                  <Box>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const currentDate = selectedDate ? new Date(selectedDate) : new Date();
                          currentDate.setDate(currentDate.getDate() - 1);
                          setSelectedDate(currentDate.toISOString().split('T')[0]);
                        }}
                        sx={{
                          minWidth: 'auto',
                          px: 1,
                          fontSize: '0.7rem',
                          textTransform: 'none'
                        }}
                      >
                        Jour précédent
                      </Button>
                      <Button
                        size="small"
                        variant={selectedDate === new Date().toISOString().split('T')[0] || !selectedDate ? 'contained' : 'outlined'}
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        sx={{
                          minWidth: 'auto',
                          px: 1.5,
                          fontSize: '0.7rem',
                          textTransform: 'none'
                        }}
                      >
                        Aujourd'hui
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const currentDate = selectedDate ? new Date(selectedDate) : new Date();
                          currentDate.setDate(currentDate.getDate() + 1);
                          setSelectedDate(currentDate.toISOString().split('T')[0]);
                        }}
                        sx={{
                          minWidth: 'auto',
                          px: 1,
                          fontSize: '0.7rem',
                          textTransform: 'none'
                        }}
                      >
                        Jour suivant
                      </Button>
                    </Stack>
                    {selectedDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1, fontSize: '0.7rem' }}>
                        {formatDate(selectedDate)}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter Indicator for Paid */}
        {quickFilter === 'paid' && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{t('invoices:filters.activeFilter')}</Typography>
            <Chip
              label={
                quickFilter === 'paid' ? t('invoices:filters.paid') :
                  quickFilter === 'cancelled' ? 'Annulées' : ''
              }
              onDelete={() => setQuickFilter('')}
              color={
                quickFilter === 'paid' ? 'success' :
                  quickFilter === 'cancelled' ? 'error' : 'primary'
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
                placeholder={t('invoices:search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: '1 1 auto',
                  minWidth: isMobile ? 'calc(100% - 140px)' : '200px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
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

            {/* Date filter indicator */}
            {selectedDate && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('invoices:filters.dateFilter', 'Filtre par date')}:
                </Typography>
                <Chip
                  label={formatDate(selectedDate)}
                  onDelete={() => setSelectedDate('')}
                  color="primary"
                  size="small"
                />
              </Box>
            )}

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
                      <InputLabel>{t('invoices:filters.statusLabel')}</InputLabel>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label={t('invoices:filters.statusLabel')}
                        sx={{
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: theme => alpha(theme.palette.primary.main, 0.1) + ' 0px 0px 0px 2px',
                          },
                        }}
                      >
                        <MenuItem value="">{t('invoices:filters.all')}</MenuItem>
                        <MenuItem value="draft">{t('invoices:status.draft')}</MenuItem>
                        <MenuItem value="sent">{t('invoices:status.sent')}</MenuItem>
                        <MenuItem value="paid">{t('invoices:status.paid')}</MenuItem>
                        <MenuItem value="overdue">{t('invoices:status.overdue')}</MenuItem>
                        <MenuItem value="cancelled">{t('invoices:status.cancelled')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </motion.div>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Invoices Grid */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          title={t('invoices:messages.noInvoices')}
          description={t('invoices:messages.noInvoicesDescription')}
          actionLabel={t('invoices:newInvoice')}
          onAction={() => navigate('/invoices/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          <AnimatePresence mode="popLayout">
            {filteredInvoices.map((invoice, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={invoice.id}>
                <InvoiceCard invoice={invoice} index={index} />
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
            {t('invoices:report.title', 'Générer un Rapport de Factures')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Période */}
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

            {/* Sélection de factures */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                📋 Factures à inclure
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {reportFilters.selectedInvoices.length > 0
                  ? `${reportFilters.selectedInvoices.length} facture(s) sélectionnée(s)`
                  : 'Toutes les factures filtrées seront incluses'}
              </Typography>

              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    {filteredInvoices.map((invoice) => (
                      <FormControlLabel
                        key={invoice.id}
                        control={
                          <Checkbox
                            checked={reportFilters.selectedInvoices.includes(invoice.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedInvoices: [...reportFilters.selectedInvoices, invoice.id]
                                });
                              } else {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedInvoices: reportFilters.selectedInvoices.filter(id => id !== invoice.id)
                                });
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{invoice.invoice_number}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {invoice.client_name || '-'} • {formatCurrency(invoice.total_amount)}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0, py: 0.5 }}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Box>

              {filteredInvoices.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedInvoices: filteredInvoices.map(inv => inv.id) })}
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedInvoices: [] })}
                  >
                    Tout désélectionner
                  </Button>
                </Box>
              )}
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                {reportFilters.selectedInvoices.length > 0
                  ? `Un rapport sera généré avec ${reportFilters.selectedInvoices.length} facture(s) sélectionnée(s)`
                  : `Un rapport sera généré avec toutes les factures (${filteredInvoices.length})`}
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
            {t('invoices:dialogs.generatePdf', 'Générer un PDF du rapport')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {generatingPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t('invoices:labels.generatingLabel', 'Génération du rapport en cours...')}
              </Typography>
            </Box>
          ) : generatedPdfBlob ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('invoices:messages.reportGenerated', 'Rapport généré avec succès ! Choisissez une action ci-dessous.')}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                {t('invoices:messages.pdfGenerationHelpText', 'Vous pouvez prévisualiser, télécharger ou imprimer directement le rapport.')}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={generatingPdf}>
            {t('invoices:buttons.cancel', 'Annuler')}
          </Button>
          {generatedPdfBlob && (
            <>
              <Button
                onClick={() => handlePdfAction('preview')}
                variant="outlined"
                startIcon={<Description />}
              >
                {t('invoices:buttons.preview', 'Aperçu')}
              </Button>
              <Button
                onClick={() => handlePdfAction('print')}
                variant="outlined"
                color="secondary"
                startIcon={<Print />}
              >
                {t('invoices:buttons.print', 'Imprimer')}
              </Button>
              <Button
                onClick={() => handlePdfAction('download')}
                variant="contained"
                color="success"
                startIcon={<Download />}
              >
                {t('invoices:buttons.download', 'Télécharger')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Invoices;
