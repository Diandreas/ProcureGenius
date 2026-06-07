import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Avatar,
  Stack,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Alert,
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
  Person,
  Email,
  Phone,
  AttachMoney,
  Receipt,
  CreditCard,
  Business,
  TrendingUp,
  CheckCircle,
  Block,
  Star,
  FiberNew,
  PictureAsPdf,
  Print,
  Download,
  Edit,
  Close,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { fetchClients } from '../../store/slices/clientsSlice';
import { useHeader } from '../../contexts/HeaderContext';
import useCurrency from '../../hooks/useCurrency';
import { NeumorphicKpis, NeumorphicSearch, NeumorphicCard } from '../../components/neumorphic/NeumorphicList';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { generateClientsBulkReport, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';
import usePdfViewer from '../../hooks/usePdfViewer';
import PdfViewerDialog from '../../components/pdf/PdfViewerDialog';
import { isNativePlatform } from '../../utils/platform';
import PullToRefresh from '../../components/mobile/PullToRefresh';

const IS_NATIVE = isNativePlatform();

function Clients() {
  const { t } = useTranslation(['clients', 'common']);
  const { format: formatCurrency } = useCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { setPageHeader } = useHeader();

  // Redux state
  const { clients, loading, error } = useSelector((state) => state.clients);

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentTermsFilter, setPaymentTermsFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const [reportConfigOpen, setReportConfigOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfViewer = usePdfViewer();
  const [reportFilters, setReportFilters] = useState({
    dateStart: '',
    dateEnd: '',
    selectedClients: [],
  });

  // Use a ref to prevent double execution in StrictMode
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      dispatch(fetchClients());
    }
  }, [dispatch]);

  // Pull-to-refresh : recharge la liste des clients.
  const handleRefresh = useCallback(async () => {
    await dispatch(fetchClients());
  }, [dispatch]);

  const handleGenerateReportClick = useCallback(() => {
    setReportConfigOpen(true);
  }, []);

  // Set the page header via Context
  useEffect(() => {
    setPageHeader({
      title: t('clients:title', 'Clients'),
      // Action pour le bouton mobile à gauche
      action: {
        label: t('navigation:topBar.new', 'Nouveau'),
        icon: <Person />,
        onClick: () => navigate('/clients/new'),
        color: 'primary',
        variant: 'contained'
      },
      // Actions pour le desktop à droite
      actions: (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Person />}
          onClick={() => navigate('/clients/new')}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            px: { xs: 2, sm: 3 },
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
          }}
        >
          {t('navigation:topBar.newClient', 'Nouveau client')}
        </Button>
      )
    });
    return () => setPageHeader({ title: '', actions: null });
  }, [t, navigate, theme.palette.primary, setPageHeader]);

  // Enregistrer la fonction de rapport dans la top nav bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('register-report-action', {
      detail: {
        onClick: handleGenerateReportClick,
        label: t('clients:actions.generateReport', 'Rapport PDF'),
      }
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('clear-report-action'));
    };
  }, [handleGenerateReportClick, t]);

  const handleQuickFilterClick = (filterValue) => {
    if (quickFilter === filterValue) {
      setQuickFilter('');
    } else {
      setQuickFilter(filterValue);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm ||
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && client.is_active) ||
      (statusFilter === 'inactive' && !client.is_active);

    const matchesPaymentTerms = !paymentTermsFilter || client.payment_terms === paymentTermsFilter;

    const matchesQuick = !quickFilter || (() => {
      if (quickFilter === 'active') return client.is_active;
      if (quickFilter === 'inactive') return !client.is_active;
      if (quickFilter === 'vip') return (client.total_sales_amount || 0) > 10000;
      if (quickFilter === 'new') {
        if (!client.created_at) return false;
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(client.created_at) > monthAgo;
      }
      return true;
    })();

    return matchesSearch && matchesStatus && matchesPaymentTerms && matchesQuick;
  });

  // Statistiques
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.is_active).length;
  const inactiveClients = clients.filter(c => !c.is_active).length;
  const vipClients = clients.filter(c => (c.total_sales_amount || 0) > 10000).length;
  const newClients = clients.filter(c => {
    if (!c.created_at) return false;
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return new Date(c.created_at) > monthAgo;
  }).length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.total_sales_amount || 0), 0);
  const totalInvoices = clients.reduce((sum, c) => sum + (c.total_invoices || 0), 0);

  const handleCardClick = useCallback((event, client) => {
    // Navigation simple vers le détail (sans animation morph)
    navigate(`/clients/${client.id}`);
  }, [navigate]);

  const ClientCard = ({ client, index }) => {
    const isActive = client.is_active;
    const isVip = (client.total_sales_amount || 0) > 10000;
    const accent = isVip ? '#8b5cf6' : isActive ? '#10b981' : '#94a3b8';
    return (
      <NeumorphicCard
        index={index}
        accentColor={accent}
        status={{ label: isVip ? 'VIP' : isActive ? 'Actif' : 'Inactif', color: accent }}
        title={client.name}
        subtitle={client.contact_person || client.email || ''}
        amount={client.total_sales_amount ? formatCurrency(client.total_sales_amount) : null}
        footer={(client.total_invoices || 0) + ' facture(s)'}
        onClick={(e) => handleCardClick(e, client)}
        actions={(
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}/edit`); }}
            sx={{ width: 30, height: 30, borderRadius: 2, color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
            <Edit sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      />
    );
  };

  if (loading && clients.length === 0) {
    return <LoadingState message={t('clients:messages.loading', 'Chargement des clients...')} />;
  }

  if (error) {
    return (
      <ErrorState
        title={t('clients:messages.loadingError', 'Erreur de chargement')}
        message={t('clients:messages.loadingErrorDescription', 'Impossible de charger les clients. Veuillez réessayer.')}
        showHome={false}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const handleConfigureReport = async () => {
    setReportConfigOpen(false);
    setGeneratingPdf(true);
    setReportDialogOpen(true);
    
    try {
      const pdfBlob = await generateClientsBulkReport({
        itemIds: reportFilters.selectedClients.length > 0 ? reportFilters.selectedClients : undefined,
        dateStart: reportFilters.dateStart || undefined,
        dateEnd: reportFilters.dateEnd || undefined,
        status: quickFilter || statusFilter || undefined,
      });
      setGeneratedPdfBlob(pdfBlob);
    } catch (error) {
      console.error('Error generating report:', error);
      enqueueSnackbar(t('clients:messages.reportError', 'Erreur lors de la génération du rapport'), {
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
    const fname = `rapport-clients-${new Date().getTime()}.pdf`;

    if (action === 'download') {
      await pdfViewer.download(generatedPdfBlob, fname);
      enqueueSnackbar(t('clients:messages.pdfDownloadedSuccess', 'PDF téléchargé avec succès'), {
        variant: 'success',
      });
    } else if (action === 'preview') {
      pdfViewer.preview(generatedPdfBlob, fname, 'Rapport clients');
    } else if (action === 'print') {
      if (IS_NATIVE) {
        pdfViewer.preview(generatedPdfBlob, fname, 'Rapport clients');
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
      enqueueSnackbar(t('clients:messages.printWindowOpened', 'Fenêtre d\'impression ouverte'), {
        variant: 'success',
      });
    }
    setReportDialogOpen(false);
  };


  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, maxWidth: 1280, mx: 'auto' }}>

      <NeumorphicKpis
        activeKey={quickFilter}
        onSelect={handleQuickFilterClick}
        kpis={[
          { key: '', label: 'Chiffre clients', value: formatCurrency(totalRevenue), sub: totalClients + ' client(s)', color: '#2563eb' },
          { key: 'active', label: 'Actifs', value: activeClients, sub: 'en activite', color: '#10b981' },
          { key: 'vip', label: 'VIP', value: vipClients, sub: '+ 10k', color: '#8b5cf6' },
          { key: 'new', label: 'Nouveaux', value: newClients, sub: 'ce mois', color: '#3b82f6' },
          { key: 'inactive', label: 'Inactifs', value: inactiveClients, sub: 'dormants', color: '#94a3b8' },
        ]}
      />

      <NeumorphicSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Rechercher un client, un contact, un email..."
      />

      {filteredClients.length === 0 ? (
        <EmptyState
          title={t('clients:messages.noClients')}
          description={t('clients:messages.noClientsDescription')}
          actionLabel={t('clients:newClient')}
          onAction={() => navigate('/clients/new')}
        />
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, index) => (
              <Grid item xs={6} sm={6} md={4} lg={3} key={client.id}>
                <ClientCard client={client} index={index} />
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
            {t('clients:report.title', 'Générer un Rapport de Clients')}
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

            {/* Sélection de clients */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                 Clients à inclure
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {reportFilters.selectedClients.length > 0
                  ? `${reportFilters.selectedClients.length} client(s) sélectionné(s)`
                  : 'Tous les clients filtrés seront inclus'}
              </Typography>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    {filteredClients.map((client) => (
                      <FormControlLabel
                        key={client.id}
                        control={
                          <Checkbox
                            checked={reportFilters.selectedClients.includes(client.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedClients: [...reportFilters.selectedClients, client.id]
                                });
                              } else {
                                setReportFilters({
                                  ...reportFilters,
                                  selectedClients: reportFilters.selectedClients.filter(id => id !== client.id)
                                });
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{client.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {client.email || '-'} • {client.contact_person || '-'}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0, py: 0.5 }}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Box>

              {filteredClients.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedClients: filteredClients.map(c => c.id) })}
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setReportFilters({ ...reportFilters, selectedClients: [] })}
                  >
                    Tout désélectionner
                  </Button>
                </Box>
              )}
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                {reportFilters.selectedClients.length > 0
                  ? `Un rapport sera généré avec ${reportFilters.selectedClients.length} client(s) sélectionné(s)`
                  : `Un rapport sera généré avec tous les clients (${filteredClients.length})`}
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
            {t('clients:dialogs.generatePdf', 'Générer un PDF du rapport')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {generatingPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t('clients:labels.generatingLabel', 'Génération du rapport en cours...')}
              </Typography>
            </Box>
          ) : generatedPdfBlob ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('clients:messages.reportGenerated', 'Rapport généré avec succès ! Choisissez une action ci-dessous.')}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                {t('clients:messages.pdfGenerationHelpText', 'Vous pouvez prévisualiser, télécharger ou imprimer directement le rapport.')}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={generatingPdf}>
            {t('clients:buttons.cancel', 'Annuler')}
          </Button>
          {generatedPdfBlob && (
            <>
              <Button
                onClick={() => handlePdfAction('preview')}
                variant={IS_NATIVE ? 'contained' : 'outlined'}
                startIcon={<Receipt />}
              >
                {t('clients:buttons.preview', 'Aperçu')}
              </Button>
              {!IS_NATIVE && (
                <Button
                  onClick={() => handlePdfAction('print')}
                  variant="outlined"
                  color="secondary"
                  startIcon={<Print />}
                >
                  {t('clients:buttons.print', 'Imprimer')}
                </Button>
              )}
              {!IS_NATIVE && (
                <Button
                  onClick={() => handlePdfAction('download')}
                  variant="contained"
                  color="success"
                  startIcon={<Download />}
                >
                  {t('clients:buttons.download', 'Télécharger')}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Visionneuse PDF integree (apercu dans l'app) */}
      <PdfViewerDialog {...pdfViewer.dialogProps} />
    </Box>
    </PullToRefresh>
  );
}

export default Clients;
