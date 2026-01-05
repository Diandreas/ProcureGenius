import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, IconButton, TextField, InputAdornment,
  FormControl, FormGroup, FormControlLabel, Checkbox, InputLabel, Select, MenuItem, Grid, Chip, Avatar, Stack,
  CircularProgress, useMediaQuery, useTheme, Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Search, FilterList, ShoppingCart, AttachMoney, CheckCircle, Schedule, Business,
  Description, HourglassEmpty, Cancel, PictureAsPdf,
  Print,
  Download,
  Receipt,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { purchaseOrdersAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import DateNavigator from '../../components/common/DateNavigator';
import { generatePurchaseOrdersBulkReport, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';

function PurchaseOrders() {
  const { t } = useTranslation(['purchaseOrders', 'common']);
  const { format: formatCurrency } = useCurrency();
  const { enqueueSnackbar } = useSnackbar();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [reportConfigOpen, setReportConfigOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    dateStart: '',
    dateEnd: '',
    selectedPOs: [],
  });
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersAPI.list();
      setPurchaseOrders(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

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
        label: t('purchaseOrders:actions.generateReport', 'Rapport PDF'),
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
      const pdfBlob = await generatePurchaseOrdersBulkReport({
        itemIds: reportFilters.selectedPOs.length > 0 ? reportFilters.selectedPOs : undefined,
        dateStart: reportFilters.dateStart || undefined,
        dateEnd: reportFilters.dateEnd || undefined,
        status: quickFilter || statusFilter || undefined,
      });
      setGeneratedPdfBlob(pdfBlob);
    } catch (error) {
      console.error('Error generating report:', error);
      enqueueSnackbar(t('purchaseOrders:messages.reportError', 'Erreur lors de la génération du rapport'), {
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
      downloadPDF(generatedPdfBlob, `rapport-bons-commande-${new Date().getTime()}.pdf`);
      enqueueSnackbar(t('purchaseOrders:messages.pdfDownloadedSuccess', 'PDF téléchargé avec succès'), {
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
    }
    setPdfDialogOpen(false);
  };

  const getStatusColor = (status) => {
    const colors = { draft: 'default', sent: 'info', approved: 'success', cancelled: 'error' };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: t('purchaseOrders:status.draft'),
      pending: t('purchaseOrders:status.pending'),
      sent: t('purchaseOrders:status.sent'),
      approved: t('purchaseOrders:status.approved'),
      received: t('purchaseOrders:status.received'),
      cancelled: t('purchaseOrders:status.cancelled')
    };
    return labels[status] || status;
  };

  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    const matchesSearch = !searchTerm ||
      po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || po.status === statusFilter;

    const matchesQuick = !quickFilter || (() => {
      if (quickFilter === 'draft') return po.status === 'draft';
      if (quickFilter === 'sent') return po.status === 'sent';
      if (quickFilter === 'approved') return po.status === 'approved';
      if (quickFilter === 'cancelled') return po.status === 'cancelled';
      return true;
    })();

    const matchesDate = !selectedDate || (() => {
      // Filtrer par date de commande (order_date) ou date de livraison (delivery_date)
      const orderDate = po.order_date ? po.order_date.split('T')[0] : null;
      const deliveryDate = po.delivery_date ? po.delivery_date.split('T')[0] : null;
      return orderDate === selectedDate || deliveryDate === selectedDate;
    })();

    return matchesSearch && matchesStatus && matchesQuick && matchesDate;
  });

  const totalPOs = purchaseOrders.length;
  const draftPOs = purchaseOrders.filter(po => po.status === 'draft').length;
  const pendingPOs = purchaseOrders.filter(po => po.status === 'sent').length;
  const approvedPOs = purchaseOrders.filter(po => po.status === 'approved').length;
  const cancelledPOs = purchaseOrders.filter(po => po.status === 'cancelled').length;
  const totalAmount = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);

  const POCard = ({ po }) => (
    <Card
      onClick={() => navigate(`/purchase-orders/${po.id}`)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Avatar
            sx={{
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              bgcolor: 'primary.main',
              borderRadius: 1,
            }}
          >
            <ShoppingCart />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                color: 'primary.main',
              }}
            >
              {po.po_number}
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
              {po.title}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'success.50',
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
            {formatCurrency(po.total_amount)}
          </Typography>
        </Box>

        <Stack spacing={0.75}>
          {po.supplier_name && (
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
                {po.supplier_name}
              </Typography>
            </Box>
          )}
          {po.delivery_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {t('purchaseOrders:labels.delivery')} {formatDate(po.delivery_date)}
              </Typography>
            </Box>
          )}
        </Stack>

        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={getStatusLabel(po.status)}
            size="small"
            color={getStatusColor(po.status)}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <LoadingState message={t('purchaseOrders:messages.loading', 'Chargement des bons de commande...')} />;
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>

      <Box sx={{ mb: 3 }}>
        {/* Stats Cards - Clickable Filters - Design Compact et Moderne */}
        <Grid container spacing={isMobile ? 0.75 : 1.5}>
          {/* Brouillons */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('draft')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.grey[500], 0.1)} 0%, ${alpha(theme.palette.grey[500], 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'draft' ? 'grey.600' : theme => alpha(theme.palette.grey[500], 0.2),
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: theme => `0 8px 24px ${alpha(theme.palette.grey[500], 0.3)}`,
                  borderColor: 'grey.600'
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)'
                },
                ...(quickFilter === 'draft' && {
                  boxShadow: theme => `0 4px 16px ${alpha(theme.palette.grey[500], 0.4)}`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: theme => `linear-gradient(90deg, ${theme.palette.grey[600]}, ${alpha(theme.palette.grey[400], 0.8)})`,
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
                  <Description sx={{ 
                    fontSize: isMobile ? 20 : 24, 
                    color: 'grey.600',
                    mb: isMobile ? 0.25 : 0.5
                  }} />
                  <Typography 
                    variant={isMobile ? 'h6' : 'h5'} 
                    fontWeight="700" 
                    sx={{
                      color: 'grey.700',
                      fontSize: isMobile ? '1rem' : undefined,
                      lineHeight: 1.2
                    }}
                  >
                    {draftPOs}
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
                    {t('purchaseOrders:filters.drafts')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* En attente */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('sent')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'sent' ? 'warning.main' : theme => alpha(theme.palette.warning.main, 0.2),
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
                ...(quickFilter === 'sent' && {
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
                  <HourglassEmpty sx={{ 
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
                    {pendingPOs}
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
                    {t('purchaseOrders:filters.pending')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Approuvés */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('approved')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'approved' ? 'success.main' : theme => alpha(theme.palette.success.main, 0.2),
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
                ...(quickFilter === 'approved' && {
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
                    {approvedPOs}
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
                    {t('purchaseOrders:filters.approved')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Annulés */}
          <Grid item xs={3} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('cancelled')}
              sx={{
                borderRadius: isMobile ? 2 : 2.5,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                border: '1.5px solid',
                borderColor: quickFilter === 'cancelled' ? 'error.main' : theme => alpha(theme.palette.error.main, 0.2),
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
                ...(quickFilter === 'cancelled' && {
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
                  <Cancel sx={{ 
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
                    {cancelledPOs}
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
                    {t('purchaseOrders:filters.cancelled')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter Indicator */}
        {quickFilter && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{t('purchaseOrders:filters.activeFilter')}</Typography>
            <Chip
              label={
                quickFilter === 'draft' ? t('purchaseOrders:filters.drafts') :
                quickFilter === 'sent' ? t('purchaseOrders:filters.pending') :
                quickFilter === 'approved' ? t('purchaseOrders:filters.approved') :
                quickFilter === 'cancelled' ? t('purchaseOrders:filters.cancelled') : ''
              }
              onDelete={() => setQuickFilter('')}
              color={
                quickFilter === 'draft' ? 'default' :
                quickFilter === 'sent' ? 'warning' :
                quickFilter === 'approved' ? 'success' :
                quickFilter === 'cancelled' ? 'error' : 'primary'
              }
              size="small"
            />
          </Box>
        )}
      </Box>

      <Card sx={{ mb: 3, borderRadius: 1 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('purchaseOrders:search.placeholder')}
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
                  '& .MuiOutlinedInput-root': { borderRadius: 1 },
                  minWidth: isMobile ? '100%' : '200px',
                  flex: 1,
                }}
              />
              <DateNavigator
                value={selectedDate}
                onChange={setSelectedDate}
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

            {/* Date filter indicator */}
            {selectedDate && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('purchaseOrders:filters.dateFilter', 'Filtre par date')}:
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
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('purchaseOrders:filters.statusLabel')}</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label={t('purchaseOrders:filters.statusLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('purchaseOrders:filters.allStatuses')}</MenuItem>
                      <MenuItem value="draft">{t('purchaseOrders:status.draft')}</MenuItem>
                      <MenuItem value="sent">{t('purchaseOrders:status.sent')}</MenuItem>
                      <MenuItem value="approved">{t('purchaseOrders:status.approved')}</MenuItem>
                      <MenuItem value="cancelled">{t('purchaseOrders:status.cancelled')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Stack>
        </CardContent>
      </Card>

      {filteredPurchaseOrders.length === 0 ? (
        <EmptyState
          title={t('purchaseOrders:messages.noPurchaseOrders')}
          description={t('purchaseOrders:messages.noPOMatchSearch')}
          actionLabel={t('purchaseOrders:newPO')}
          onAction={() => navigate('/purchase-orders/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredPurchaseOrders.map((po) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={po.id}>
              <POCard po={po} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Configuration Dialog */}
      <Dialog open={reportConfigOpen} onClose={() => setReportConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PictureAsPdf color="error" />
            {t('purchaseOrders:report.title', 'Générer un Rapport de Bons de Commande')}
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

            {/* Sélection de bons de commande */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                📋 Bons de commande à inclure
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {reportFilters.selectedPOs.length > 0
                  ? `${reportFilters.selectedPOs.length} bon(s) de commande sélectionné(s)`
                  : 'Tous les bons de commande filtrés seront inclus'}
              </Typography>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    {filteredPurchaseOrders.map((po) => (
                      <FormControlLabel
                        key={po.id}
                        control={
                          <Checkbox
                            checked={reportFilters.selectedPOs.includes(po.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedPOs: [...reportFilters.selectedPOs, po.id]
                                });
                              } else {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedPOs: reportFilters.selectedPOs.filter(id => id !== po.id)
                                });
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{po.po_number}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {po.supplier_name || '-'} • {formatCurrency(po.total_amount)}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0, py: 0.5 }}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Box>

              {filteredPurchaseOrders.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedPOs: filteredPurchaseOrders.map(po => po.id) })}
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedPOs: [] })}
                  >
                    Tout désélectionner
                  </Button>
                </Box>
              )}
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                {reportFilters.selectedPOs.length > 0
                  ? `Un rapport sera généré avec ${reportFilters.selectedPOs.length} bon(s) de commande sélectionné(s)`
                  : `Un rapport sera généré avec tous les bons de commande (${filteredPurchaseOrders.length})`}
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
            {t('purchaseOrders:dialogs.generatePdf', 'Générer un PDF du rapport')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {generatingPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t('purchaseOrders:labels.generatingLabel', 'Génération du rapport en cours...')}
              </Typography>
            </Box>
          ) : generatedPdfBlob ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('purchaseOrders:messages.reportGenerated', 'Rapport généré avec succès ! Choisissez une action ci-dessous.')}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                {t('purchaseOrders:messages.pdfGenerationHelpText', 'Vous pouvez prévisualiser, télécharger ou imprimer directement le rapport.')}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={generatingPdf}>
            {t('purchaseOrders:buttons.cancel', 'Annuler')}
          </Button>
          {generatedPdfBlob && (
            <>
              <Button
                onClick={() => handlePdfAction('preview')}
                variant="outlined"
                startIcon={<Description />}
              >
                {t('purchaseOrders:buttons.preview', 'Aperçu')}
              </Button>
              <Button
                onClick={() => handlePdfAction('print')}
                variant="outlined"
                color="secondary"
                startIcon={<Print />}
              >
                {t('purchaseOrders:buttons.print', 'Imprimer')}
              </Button>
              <Button
                onClick={() => handlePdfAction('download')}
                variant="contained"
                color="success"
                startIcon={<Download />}
              >
                {t('purchaseOrders:buttons.download', 'Télécharger')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PurchaseOrders;
