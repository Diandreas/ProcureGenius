import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Edit,
  Delete,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { purchaseOrdersAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import { useHeader } from '../../contexts/HeaderContext';
import { NeumorphicKpis, NeumorphicSearch, NeumorphicCard } from '../../components/neumorphic/NeumorphicList';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import DateNavigator from '../../components/common/DateNavigator';
import { generatePurchaseOrdersBulkReport, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';
import { generatePurchaseOrderPDF, openPDFInNewTab as openSinglePDF } from '../../services/pdfService';

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
  const { setPageHeader } = useHeader();

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

  // Set the page header via Context
  useEffect(() => {
    setPageHeader({
      title: t('purchaseOrders:title', 'Commandes'),
      // Action pour le bouton mobile à gauche
      action: {
        label: t('navigation:topBar.new', 'Nouveau'),
        icon: <ShoppingCart />,
        onClick: () => navigate('/purchase-orders/new'),
        color: 'primary',
        variant: 'contained'
      },
      // Actions pour le desktop à droite
      actions: (
        <Button
          variant="contained"
          color="primary"
          startIcon={<ShoppingCart />}
          onClick={() => navigate('/purchase-orders/new')}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            px: { xs: 2, sm: 3 },
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
          }}
        >
          {t('navigation:topBar.newPurchaseOrder', 'Nouveau bon')}
        </Button>
      )
    });
    return () => setPageHeader({ title: '', actions: null });
  }, [t, navigate, theme.palette.primary, setPageHeader]);

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

  const POCard = ({ po, index }) => {
    const accent = po.status === 'approved' ? '#10b981'
      : po.status === 'sent' ? '#f59e0b'
      : po.status === 'cancelled' ? '#ef4444' : '#94a3b8';
    return (
      <NeumorphicCard
        index={index}
        accentColor={accent}
        code={po.po_number}
        status={{ label: getStatusLabel(po.status), color: accent }}
        title={po.supplier_name || po.title || 'Bon de commande'}
        subtitle={po.supplier_name && po.title ? po.title : ''}
        amount={po.total_amount != null ? formatCurrency(po.total_amount) : null}
        footer={po.expected_delivery_date ? `Livraison ${formatDate(po.expected_delivery_date)}` : (po.required_date ? formatDate(po.required_date) : '')}
        onClick={() => navigate(`/purchase-orders/${po.id}`)}
        actions={(
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${po.id}/edit`); }}
            sx={{ width: 30, height: 30, borderRadius: 2, color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
            <Edit sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      />
    );
  };

  if (loading) {
    return <LoadingState message={t('purchaseOrders:messages.loading', 'Chargement des bons de commande...')} />;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, maxWidth: 1280, mx: 'auto' }}>

      <NeumorphicKpis
        activeKey={quickFilter}
        onSelect={handleQuickFilterClick}
        kpis={[
          { key: '', label: 'Total commandes', value: formatCurrency(totalAmount), sub: totalPOs + ' BC', color: '#2563eb' },
          { key: 'approved', label: 'Approuves', value: approvedPOs, sub: 'valides', color: '#10b981' },
          { key: 'sent', label: 'Envoyes', value: pendingPOs, sub: 'en attente', color: '#f59e0b' },
          { key: 'draft', label: 'Brouillons', value: draftPOs, sub: 'a finaliser', color: '#94a3b8' },
          { key: 'cancelled', label: 'Annules', value: cancelledPOs, sub: 'clotures', color: '#ef4444' },
        ]}
      />

      <NeumorphicSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Rechercher un bon de commande, un fournisseur..."
      />

      {filteredPurchaseOrders.length === 0 ? (
        <EmptyState
          title={t('purchaseOrders:messages.noPurchaseOrders')}
          description={t('purchaseOrders:messages.noPOMatchSearch')}
          actionLabel={t('purchaseOrders:newPO')}
          onAction={() => navigate('/purchase-orders/new')}
        />
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          <AnimatePresence mode="popLayout">
            {filteredPurchaseOrders.map((po, index) => (
              <Grid item xs={6} sm={6} md={4} lg={3} key={po.id}>
                <POCard po={po} index={index} />
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
            {t('purchaseOrders:report.title', 'Générer un Rapport de Bons de Commande')}
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

            {/* Sélection de bons de commande */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                 Bons de commande à inclure
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
