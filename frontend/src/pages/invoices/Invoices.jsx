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
  AutoAwesome,
  CloudUpload,
  Edit,
  Delete,
  Close,
  CalendarToday,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { fetchInvoices } from '../../store/slices/invoicesSlice';
import { formatDate } from '../../utils/formatters';
import { useHeader } from '../../contexts/HeaderContext';
import useCurrency from '../../hooks/useCurrency';
import PullToRefresh from '../../components/mobile/PullToRefresh';
import OfflineBadge from '../../components/mobile/OfflineBadge';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import DateNavigator from '../../components/common/DateNavigator';
import Mascot from '../../components/Mascot';
import { generateInvoicesBulkReport, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';
import { generateInvoicePDF, openPDFInNewTab as openSinglePDF } from '../../services/pdfService';

function Invoices() {
  const { t } = useTranslation(['invoices', 'common']);
  const { format: formatCurrency } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { setPageHeader } = useHeader();

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

  // Pull-to-refresh : recharge les factures.
  const handleRefresh = useCallback(async () => {
    await dispatch(fetchInvoices());
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

  // Update global header via Context
  useEffect(() => {
    setPageHeader({
      title: t('invoices:title', 'Factures'),
      // Action pour le bouton mobile à gauche
      action: {
        label: t('navigation:topBar.new', 'Nouveau'),
        icon: <Receipt />,
        onClick: () => navigate('/invoices/new'),
        color: 'primary',
        variant: 'contained'
      },
      // Actions pour le desktop à droite
      actions: (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            startIcon={<Receipt />}
            onClick={() => navigate('/invoices/new')}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              px: { xs: 1.5, sm: 3 },
              boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
            }}
          >
            {t('invoices:newInvoice')}
          </Button>
        </Stack>
      )
    });

    return () => setPageHeader({ title: '', actions: null });
  }, [t, navigate, theme.palette.primary.main, setPageHeader]);

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
      if (quickFilter === 'unpaid') return invoice.status === 'sent';
      if (quickFilter === 'overdue') return invoice.status === 'overdue';
      if (quickFilter === 'draft') return invoice.status === 'draft';
      return true;
    })();

    const matchesDate = !selectedDate || (() => {
      // Filtrer par date de facture (issue_date) ou date d'échéance (due_date)
      const invoiceDate = invoice.issue_date ? invoice.issue_date.split('T')[0] : null;
      const dueDate = invoice.due_date ? invoice.due_date.split('T')[0] : null;
      return invoiceDate === selectedDate || dueDate === selectedDate;
    })();

    return matchesSearch && matchesStatus && matchesQuick && matchesDate;
  });

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      pending: 'warning',
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
      pending: 'En attente',
      paid: t('invoices:status.paid'),
      overdue: t('invoices:status.overdue'),
      cancelled: t('invoices:status.cancelled')
    };
    return labels[status] || status;
  };

  // Statistiques
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const unpaidInvoices = invoices.filter(i => i.status === 'sent').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  const draftInvoices = invoices.filter(i => i.status === 'draft').length;
  const totalAmount = invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);

  const statusColorMap = { paid: '#10b981', sent: '#3b82f6', overdue: '#ef4444', draft: '#94a3b8', cancelled: '#94a3b8' };

  const InvoiceRow = ({ invoice, index, isLast }) => {
    const statusColor = statusColorMap[invoice.status] || '#94a3b8';
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
      >
        <Box
          onClick={() => navigate(`/invoices/${invoice.id}`)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: isMobile ? 1.5 : 2.5,
            py: isMobile ? 1.25 : 1,
            cursor: 'pointer',
            borderBottom: isLast ? 'none' : theme => `1px solid ${alpha(theme.palette.divider, 0.35)}`,
            borderLeft: `3px solid ${statusColor}`,
            transition: 'background 0.15s ease',
            '&:hover': {
              bgcolor: theme => alpha(theme.palette.action.hover, 0.5),
              '& .invoice-actions': { opacity: 1 },
            },
            minHeight: isMobile ? 52 : 48,
          }}
        >
          {isMobile ? (
            <>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', mb: 0.25 }}>
                  {invoice.invoice_number}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                  {invoice.client_name || invoice.title}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                  {formatCurrency(invoice.total_amount)}
                </Typography>
                <Chip label={getStatusLabel(invoice.status)} size="small" sx={{ height: 16, fontSize: '0.58rem', mt: 0.25, bgcolor: alpha(statusColor, 0.12), color: statusColor, border: 'none' }} />
              </Box>
            </>
          ) : (
            <>
              {/* Invoice number */}
              <Box sx={{ width: 130, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary', fontFamily: 'monospace' }}>
                  {invoice.invoice_number}
                </Typography>
              </Box>
              {/* Title + client */}
              <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.825rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {invoice.title}
                </Typography>
                {invoice.client_name && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
                    {invoice.client_name}
                  </Typography>
                )}
              </Box>
              {/* Amount */}
              <Box sx={{ width: 110, textAlign: 'right', flexShrink: 0, pr: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  {formatCurrency(invoice.total_amount)}
                </Typography>
              </Box>
              {/* Status */}
              <Box sx={{ width: 100, flexShrink: 0, pr: 2 }}>
                <Chip
                  label={getStatusLabel(invoice.status)}
                  size="small"
                  sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha(statusColor, 0.1), color: statusColor, border: `1px solid ${alpha(statusColor, 0.2)}` }}
                />
              </Box>
              {/* Due date */}
              <Box sx={{ width: 90, flexShrink: 0, pr: 2 }}>
                {invoice.due_date && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
                    {formatDate(invoice.due_date)}
                  </Typography>
                )}
              </Box>
              {/* Hover actions */}
              <Box className="invoice-actions" sx={{ opacity: 0, transition: 'opacity 0.15s', display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <IconButton size="small" onClick={async (e) => { e.stopPropagation(); const blob = await generateInvoicePDF(invoice); openSinglePDF(blob); }} sx={{ width: 28, height: 28, color: 'text.disabled', '&:hover': { color: 'success.main' } }}>
                  <PictureAsPdf sx={{ fontSize: 15 }} />
                </IconButton>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.id}/edit`); }} sx={{ width: 28, height: 28, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}>
                  <Edit sx={{ fontSize: 15 }} />
                </IconButton>
              </Box>
            </>
          )}
        </Box>
      </motion.div>
    );
  };

  // ─── Carte facture — design neumorphique moderne, epure et anime ─────────
  const InvoiceCard = ({ invoice, index }) => {
    const statusColor = statusColorMap[invoice.status] || '#94a3b8';
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.035, 0.4), ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -4 }}
        style={{ height: '100%' }}
      >
        <Box
          onClick={() => navigate(`/invoices/${invoice.id}`)}
          sx={{
            cursor: 'pointer',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1.5, sm: 2.25 },
            borderRadius: { xs: 3, sm: 4 },
            bgcolor: 'background.paper',
            position: 'relative',
            overflow: 'hidden',
            transition: 'box-shadow 0.3s cubic-bezier(0.22,1,0.36,1)',
            boxShadow: theme => theme.palette.mode === 'light'
              ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff'
              : '6px 6px 16px #14191f, -6px -6px 16px #283041',
            '&:hover': {
              boxShadow: theme => theme.palette.mode === 'light'
                ? '10px 10px 24px #c4cddc, -10px -10px 24px #ffffff'
                : '10px 10px 24px #11161c, -10px -10px 24px #2a3344',
              '& .inv-actions': { opacity: 1 },
            },
          }}
        >
          {/* Accent de statut en haut */}
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: statusColor, opacity: 0.9 }} />

          {/* Ligne haut : numero + pastille statut (point seul sur mobile) */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 1.5 }, mt: 0.5, gap: 1 }}>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: { xs: '0.68rem', sm: '0.78rem' }, color: 'text.secondary', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {invoice.invoice_number}
            </Typography>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: { xs: 0.6, sm: 1 }, py: 0.3, borderRadius: 999, bgcolor: alpha(statusColor, 0.12), flexShrink: 0 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor }} />
              <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.62rem', fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {getStatusLabel(invoice.status)}
              </Typography>
            </Box>
          </Box>

          {/* Titre + client */}
          <Box sx={{ flex: 1, minWidth: 0, mb: { xs: 1, sm: 1.5 } }}>
            <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.82rem', sm: '0.95rem' }, color: 'text.primary', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {invoice.title || invoice.client_name || 'Facture'}
            </Typography>
            {invoice.client_name && invoice.title && (
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {invoice.client_name}
              </Typography>
            )}
          </Box>

          {/* Montant (police de l'app) */}
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.45rem' }, color: 'text.primary', lineHeight: 1, mb: { xs: 0.75, sm: 1.25 }, letterSpacing: '-0.01em' }}>
            {formatCurrency(invoice.total_amount)}
          </Typography>

          {/* Bas : echeance + actions (actions cachees sur mobile) */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: { xs: 0.75, sm: 1.25 }, borderTop: theme => `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
            <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {invoice.due_date ? `Échéance ${formatDate(invoice.due_date)}` : (invoice.issue_date ? formatDate(invoice.issue_date) : '')}
            </Typography>
            <Box className="inv-actions" sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, opacity: 0, transition: 'opacity 0.2s' }}>
              <IconButton size="small" onClick={async (e) => { e.stopPropagation(); try { const blob = await generateInvoicePDF(invoice); openSinglePDF(blob); } catch {} }}
                sx={{ width: 30, height: 30, borderRadius: 2, color: 'text.disabled', '&:hover': { color: 'success.main', bgcolor: alpha('#10b981', 0.1) } }}>
                <PictureAsPdf sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.id}/edit`); }}
                sx={{ width: 30, height: 30, borderRadius: 2, color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
                <Edit sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
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
    <PullToRefresh onRefresh={handleRefresh}>
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, maxWidth: 1280, mx: 'auto' }}>

      {/* KPI / Filtres rapides (tuiles neumorphiques) */}
      <Grid container spacing={{ xs: 1.25, sm: 2 }} sx={{ mb: 2.5 }}>
        {[
          { key: '', label: 'Total facture', value: formatCurrency(totalAmount), sub: totalInvoices + ' facture(s)', color: '#2563eb' },
          { key: 'paid', label: 'Payees', value: paidInvoices, sub: 'encaissees', color: '#10b981' },
          { key: 'unpaid', label: 'Impayees', value: unpaidInvoices, sub: 'envoyees', color: '#3b82f6' },
          { key: 'overdue', label: 'En retard', value: overdueInvoices, sub: 'a relancer', color: '#ef4444' },
          { key: 'draft', label: 'Brouillons', value: draftInvoices, sub: 'a finaliser', color: '#94a3b8' },
        ].map((kpi) => {
          const active = quickFilter === kpi.key && kpi.key !== '';
          return (
            <Grid item xs={kpi.key === '' ? 12 : 3} sm={4} md={kpi.key === '' ? 4 : 2} key={kpi.label}>
              <Box
                onClick={() => kpi.key !== '' && handleQuickFilterClick(kpi.key)}
                sx={{
                  cursor: kpi.key !== '' ? 'pointer' : 'default',
                  p: { xs: 1.1, sm: 2 },
                  borderRadius: { xs: 3, sm: 4 },
                  textAlign: { xs: 'center', sm: 'left' },
                  bgcolor: 'background.paper',
                  transition: 'box-shadow 0.25s, transform 0.25s',
                  boxShadow: (th) => active
                    ? (th.palette.mode === 'light'
                        ? 'inset 4px 4px 10px #cdd4e0, inset -4px -4px 10px #ffffff'
                        : 'inset 4px 4px 10px #14191f, inset -4px -4px 10px #283041')
                    : (th.palette.mode === 'light'
                        ? '5px 5px 14px #cdd4e0, -5px -5px 14px #ffffff'
                        : '5px 5px 14px #14191f, -5px -5px 14px #283041'),
                  '&:hover': kpi.key !== '' && !active ? { transform: 'translateY(-2px)' } : {},
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: { xs: 0.5, sm: 1 }, mb: { xs: 0.4, sm: 0.75 } }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: kpi.color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.7rem' }, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {kpi.label}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.6rem' }, lineHeight: 1, color: 'text.primary', letterSpacing: '-0.01em' }}>
                  {kpi.value}
                </Typography>
                <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.68rem', color: 'text.disabled', mt: 0.5 }}>{kpi.sub}</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Barre de recherche neumorphique (inset) */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{
          flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1, borderRadius: 999, bgcolor: 'background.paper',
          boxShadow: (th) => th.palette.mode === 'light'
            ? 'inset 4px 4px 9px #cdd4e0, inset -4px -4px 9px #ffffff'
            : 'inset 4px 4px 9px #14191f, inset -4px -4px 9px #283041',
        }}>
          <Search sx={{ fontSize: 20, color: 'text.disabled' }} />
          <Box
            component="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une facture, un client..."
            sx={{
              flex: 1, border: 'none', outline: 'none', bgcolor: 'transparent',
              fontSize: '0.9rem', color: 'text.primary', fontFamily: 'inherit',
              '&::placeholder': { color: 'text.disabled' },
            }}
          />
          {searchTerm && (
            <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.25 }}>
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
        {/* Filtre date — pastille neumorphique cohérente avec la recherche */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.75, py: 1, borderRadius: 999, bgcolor: 'background.paper',
          boxShadow: theme => theme.palette.mode === 'light'
            ? 'inset 4px 4px 9px #cdd4e0, inset -4px -4px 9px #ffffff'
            : 'inset 4px 4px 9px #14191f, inset -4px -4px 9px #283041',
        }}>
          <CalendarToday sx={{ fontSize: 17, color: 'text.disabled' }} />
          <Box
            component="input"
            type="date"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{
              border: 'none', outline: 'none', bgcolor: 'transparent',
              fontSize: '0.85rem', color: selectedDate ? 'text.primary' : 'text.disabled',
              fontFamily: 'inherit', cursor: 'pointer', colorScheme: 'light',
            }}
          />
        </Box>
      </Box>

      {(quickFilter || selectedDate) && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
          {quickFilter && (
            <Chip label={'Filtre : ' + getStatusLabel(quickFilter === 'unpaid' ? 'sent' : quickFilter)} onDelete={() => setQuickFilter('')} size="small" sx={{ fontWeight: 600 }} />
          )}
          {selectedDate && (
            <Chip label={'Date : ' + formatDate(selectedDate)} onDelete={() => setSelectedDate('')} size="small" sx={{ fontWeight: 600 }} />
          )}
        </Box>
      )}

      {/* Grille de factures (cartes neumorphiques) */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          title={t('invoices:messages.noInvoices')}
          description={t('invoices:messages.noInvoicesDescription')}
          actionLabel={t('invoices:newInvoice')}
          onAction={() => navigate('/invoices/new')}
        />
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          <AnimatePresence mode="popLayout">
            {filteredInvoices.map((invoice, index) => (
              <Grid item xs={6} sm={6} md={4} lg={3} key={invoice.id}>
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

            {/* Sélection de factures */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                 Factures à inclure
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
    </PullToRefresh>
  );
}

export default Invoices;
