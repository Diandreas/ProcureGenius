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
  DialogContentText,
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
  CreditCard,
  AttachMoney,
  Receipt,
  Inventory,
  TrendingUp,
  Info,
  PictureAsPdf,
  Print,
  Download,
  AccessTime,
  CalendarToday,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import ClientInvoicesTable from '../../components/clients/ClientInvoicesTable';
import ClientProductsTable from '../../components/clients/ClientProductsTable';
import { NeumorphicPanel, neuShadows } from '../../components/neumorphic/NeumorphicList';
import { generateClientReportPDF, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';
import LoadingState from '../../components/LoadingState';
import usePdfViewer from '../../hooks/usePdfViewer';
import PdfViewerDialog from '../../components/pdf/PdfViewerDialog';
import { isNativePlatform } from '../../utils/platform';

const IS_NATIVE = isNativePlatform();
import ErrorState from '../../components/ErrorState';
import { useHeader } from '../../contexts/HeaderContext';

function ClientDetail() {
  const { t } = useTranslation(['clients', 'common']);
  const { format: formatCurrency } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [client, setClient] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const pdfViewer = usePdfViewer();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);

  const { setHeaderConfig } = useHeader();

  useEffect(() => {
    // Only start fetching after we've processed the shared element
    const fetchClientData = async () => {
      await fetchClient();
      await fetchStatistics();
    };

    fetchClientData();
  }, [id]);

  // Global Header Integration
  useEffect(() => {
    if (isMobile && client) {
      setHeaderConfig({
        title: client.name,
        showBackButton: true,
        onBack: () => navigate('/clients'),
        rightActions: [
          {
            icon: <PictureAsPdf />,
            onClick: () => setPdfDialogOpen(true),
            label: t('clients:tooltips.downloadPdfReport')
          },
          {
            icon: <Edit />,
            onClick: () => navigate(`/clients/${id}/edit`),
            label: t('clients:tooltips.editClient')
          },
          {
            icon: <Delete />,
            onClick: handleDeleteClick,
            label: t('clients:tooltips.deleteClient'),
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
  }, [isMobile, client, id, t]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const response = await clientsAPI.get(id);
      setClient(response.data);
    } catch (error) {
      enqueueSnackbar(t('clients:messages.loadClientError'), { variant: 'error' });
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await clientsAPI.getStatistics(id);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error loading client statistics:', error);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  // Générer automatiquement le PDF quand le dialogue s'ouvre
  useEffect(() => {
    if (pdfDialogOpen && client && !generatedPdfBlob && !generatingPdf) {
      const generatePDF = async () => {
        setGeneratingPdf(true);
        try {
          const pdfBlob = await generateClientReportPDF(client);
          setGeneratedPdfBlob(pdfBlob);
        } catch (error) {
          console.error('Error generating PDF:', error);
          enqueueSnackbar(t('clients:messages.pdfError', 'Erreur lors de la génération du PDF'), { variant: 'error' });
          setPdfDialogOpen(false);
        } finally {
          setGeneratingPdf(false);
        }
      };
      generatePDF();
    }
  }, [pdfDialogOpen, client, generatedPdfBlob, generatingPdf]);

  const handlePdfAction = async (action) => {
    if (!generatedPdfBlob) return;
    const fname = `rapport-client-${client.name}.pdf`;

    if (action === 'download') {
      await pdfViewer.download(generatedPdfBlob, fname);
      enqueueSnackbar(t('clients:messages.pdfDownloaded', 'Rapport PDF téléchargé avec succès'), { variant: 'success' });
    } else if (action === 'preview') {
      pdfViewer.preview(generatedPdfBlob, fname, `Rapport ${client.name}`);
    } else if (action === 'print') {
      if (IS_NATIVE) {
        pdfViewer.preview(generatedPdfBlob, fname, `Rapport ${client.name}`);
      } else {
        const pdfUrl = URL.createObjectURL(generatedPdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
          };
          enqueueSnackbar(t('clients:messages.printWindowOpened', 'Fenêtre d\'impression ouverte'), { variant: 'success' });
        } else {
          enqueueSnackbar(t('clients:messages.cannotOpenPrintWindow', 'Impossible d\'ouvrir la fenêtre d\'impression'), { variant: 'error' });
        }
      }
    }
    setPdfDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    setGeneratedPdfBlob(null);
  };

  const handleDeleteConfirm = async () => {
    setDeleteDialogOpen(false);
    try {
      await clientsAPI.delete(id);
      enqueueSnackbar(t('clients:messages.clientDeleted'), { variant: 'success' });
      navigate('/clients');
    } catch (error) {
      enqueueSnackbar(t('clients:messages.deleteError'), { variant: 'error' });
    }
  };

  if (!loading && !client) {
    return (
      <ErrorState
        title={t('clients:messages.clientNotFound', 'Client non trouvé')}
        message={t('clients:messages.clientNotFoundDescription', 'Le client que vous recherchez n\'existe pas ou a été supprimé.')}
        showHome={false}
        onRetry={() => navigate('/clients')}
      />
    );
  }

  // Onglets (icône seule sur mobile, icône + label desktop)
  const CLIENT_TABS = [
    { icon: Info, label: t('clients:tabs.info') },
    { icon: Receipt, label: t('clients:tabs.invoices') },
    { icon: Inventory, label: t('clients:tabs.products') },
  ];

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        pb: { xs: 12, sm: 2, md: 3 }, // Space for mobile nav
      }}
    >
        {/* Header - Caché sur mobile (géré par top navbar) */}
        <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <IconButton onClick={() => navigate('/clients')} size="medium">
              <ArrowBack />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {client?.name || '...'}
              </Typography>
              {client?.legal_name && client.legal_name !== client.name && (
                <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {client.legal_name}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title={t('clients:tooltips.downloadPdfReport')}>
              <IconButton
                onClick={() => setPdfDialogOpen(true)}
                sx={{
                  color: 'success.main',
                  '&:hover': { bgcolor: 'success.light', color: 'white' }
                }}
              >
                <PictureAsPdf />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('clients:tooltips.editClient')}>
              <IconButton
                onClick={() => navigate(`/clients/${id}/edit`)}
                sx={{
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'primary.light', color: 'white' }
                }}
              >
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('clients:tooltips.deleteClient')}>
              <IconButton
                onClick={handleDeleteClick}
                sx={{
                  color: 'error.main',
                  '&:hover': { bgcolor: 'error.light', color: 'white' }
                }}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>


      {/* Onglets segmentés neumorphiques (icônes seules sur mobile) */}
      <Box sx={{ mb: isMobile ? 2 : 3 }}>
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
          {CLIENT_TABS.map((tab, idx) => {
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

      {/* Loading skeleton pendant le chargement */}
      {loading && !client && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab: Informations */}
      {activeTab === 0 && client && (
        <Grid container spacing={isMobile ? 1.5 : 2.5}>
          {/* Colonne principale */}
          <Grid item xs={12} md={8}>
            {/* Hero client */}
            <NeumorphicPanel
              accent="primary.main"
              sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 2, sm: 2.5 } }}
            >
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Avatar
                  sx={{
                    width: { xs: 60, sm: 84 },
                    height: { xs: 60, sm: 84 },
                    bgcolor: 'primary.main',
                    borderRadius: 3,
                    fontSize: { xs: '1.6rem', sm: '2.2rem' },
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {client?.name?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.4rem' }, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client?.name}
                      </Typography>
                      {client?.legal_name && client.legal_name !== client.name && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                          {client.legal_name}
                        </Typography>
                      )}
                    </Box>
                    {/* Actions mobile */}
                    <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'flex', md: 'none' }, flexShrink: 0 }}>
                      <IconButton size="small" onClick={() => setPdfDialogOpen(true)} sx={{ color: 'success.main' }}><PictureAsPdf fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => navigate(`/clients/${id}/edit`)} sx={{ color: 'primary.main' }}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={handleDeleteClick} sx={{ color: 'error.main' }}><Delete fontSize="small" /></IconButton>
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip
                      label={client.is_active ? t('clients:status.active') : t('clients:status.inactive')}
                      color={client.is_active ? 'success' : 'default'}
                      size="small"
                      icon={client.is_manually_active ? undefined : <AccessTime sx={{ fontSize: 13 }} />}
                      sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
                    />
                    {client.business_number && (
                      <Chip icon={<Business sx={{ fontSize: 14 }} />} label={client.business_number} variant="outlined" size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
                    )}
                    {client.auto_inactive_since && (
                      <Chip label={`${t('clients:labels.autoInactiveSince')} ${formatDate(client.auto_inactive_since)}`} size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                    )}
                  </Stack>
                </Box>
              </Box>
            </NeumorphicPanel>

            {/* Coordonnées */}
            <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 1.75, sm: 2.25 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1.5 }}>{t('clients:tabs.info')}</Typography>
              <Grid container spacing={1.25}>
                {[
                  { show: !!client.contact_person, icon: Person, label: t('clients:labels.contactPerson'), value: client.contact_person },
                  { show: !!client.email, icon: Email, label: 'Email', value: client.email },
                  { show: !!client.phone, icon: Phone, label: t('clients:labels.phone', 'Téléphone'), value: client.phone },
                  { show: !!client.billing_address, icon: LocationOn, label: t('clients:labels.billingAddress', 'Adresse'), value: client.billing_address, full: true },
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

            {/* Performance commerciale */}
            {statistics?.sales_summary && (
              <NeumorphicPanel sx={{ p: { xs: 1.75, sm: 2.25 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('clients:labels.performance', 'Performance')}</Typography>
                </Box>
                <Grid container spacing={1.25}>
                  {[
                    { label: t('clients:labels.totalInvoices', 'Factures'), value: statistics.sales_summary.total_invoices || 0, color: 'primary.main' },
                    { label: t('clients:labels.totalRevenue', 'CA généré'), value: formatCurrency(statistics.sales_summary.total_sales_amount || 0), color: 'success.main' },
                    { label: t('clients:labels.averageInvoice', 'Panier moyen'), value: formatCurrency(statistics.sales_summary.average_invoice_amount || 0), color: 'info.main' },
                    { label: t('clients:labels.uniqueProducts', 'Produits'), value: statistics.sales_summary.unique_products || 0, color: 'secondary.main' },
                  ].map((s, i) => (
                    <Grid item xs={6} sm={3} key={i}>
                      <Box sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', boxShadow: th => neuShadows.shadowInset(th) }}>
                        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.15rem' }, color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
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
            {/* Conditions */}
            <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 1.75, sm: 2.25 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CreditCard sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('clients:labels.paymentConditions', 'Conditions')}</Typography>
              </Box>
              <Stack spacing={1.25}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.25, borderRadius: 2, boxShadow: th => neuShadows.shadowInset(th) }}>
                  <Typography variant="caption" color="text.secondary">{t('clients:labels.paymentTerms', 'Paiement')}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{client.payment_terms || 'CASH'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.25, borderRadius: 2, boxShadow: th => neuShadows.shadowInset(th) }}>
                  <Typography variant="caption" color="text.secondary">{t('clients:labels.creditLimit', 'Plafond')}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{client.credit_limit ? formatCurrency(client.credit_limit) : '—'}</Typography>
                </Box>
              </Stack>
            </NeumorphicPanel>

            {/* Contact rapide */}
            <NeumorphicPanel sx={{ mb: isMobile ? 1.5 : 2.5, p: { xs: 1.75, sm: 2.25 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1.5 }}>{t('clients:labels.quickActions', 'Contact rapide')}</Typography>
              <Stack direction="row" spacing={1}>
                <Button fullWidth size="small" variant="outlined" startIcon={<Email />} href={`mailto:${client.email}`} disabled={!client.email} sx={{ textTransform: 'none', borderRadius: 2 }}>Email</Button>
                <Button fullWidth size="small" variant="outlined" startIcon={<Phone />} href={`tel:${client.phone}`} disabled={!client.phone} sx={{ textTransform: 'none', borderRadius: 2 }}>{t('clients:labels.call', 'Appeler')}</Button>
              </Stack>
            </NeumorphicPanel>

            {/* Dates */}
            <NeumorphicPanel sx={{ p: { xs: 1.75, sm: 2.25 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CalendarToday sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('clients:labels.dates', 'Dates')}</Typography>
              </Box>
              <Stack spacing={1.25}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">{t('clients:labels.createdAt', 'Créé le')}</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{formatDate(client.created_at)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">{t('clients:labels.updatedAt', 'Modifié le')}</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{formatDate(client.updated_at)}</Typography>
                </Box>
                {client.last_activity_date && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">{t('clients:labels.lastActivity', 'Dernière activité')}</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{formatDate(client.last_activity_date)}</Typography>
                  </Box>
                )}
              </Stack>
            </NeumorphicPanel>
          </Grid>
        </Grid>
      )}

      {/* Tab: Factures */}
      {activeTab === 1 && client && (
        <NeumorphicPanel accent="primary.main" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Receipt sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
              {t('clients:tabs.invoices')}
            </Typography>
          </Box>
          <ClientInvoicesTable
            invoices={statistics?.recent_invoices}
            loading={!statistics}
          />
        </NeumorphicPanel>
      )}

      {/* Tab: Produits */}
      {activeTab === 2 && client && (
        <NeumorphicPanel accent="info.main" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Inventory sx={{ color: 'info.main', fontSize: 22 }} />
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
              {t('clients:tabs.products')}
            </Typography>
          </Box>
          <ClientProductsTable
            products={statistics?.top_products}
            loading={!statistics}
          />
        </NeumorphicPanel>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          id="delete-dialog-title"
          sx={{
            color: 'error.main',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {t('clients:messages.deleteWarningTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="delete-dialog-description"
            sx={{
              whiteSpace: 'pre-line',
              color: 'text.primary',
              fontSize: '1rem'
            }}
          >
            {t('clients:messages.deleteWarningMessage', { name: client?.name })}
          </DialogContentText>
          {statistics?.sales_summary?.total_invoices > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                {t('clients:messages.invoicesWillBeDeleted', { count: statistics.sales_summary.total_invoices }, `${statistics.sales_summary.total_invoices} facture(s) seront supprimée(s)`)}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleDeleteCancel}
            variant="outlined"
            autoFocus
          >
            {t('clients:actions.cancel')}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={<Delete />}
          >
            {t('clients:actions.deletePermanently', 'Supprimer définitivement')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Dialog - Génération automatique */}
      <Dialog
        open={pdfDialogOpen}
        onClose={handleClosePdfDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 4
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <PictureAsPdf sx={{ color: 'error.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight="600">
              {t('clients:pdf.title')}
            </Typography>
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
            <Alert severity="success" sx={{ mb: 2, borderRadius: 1 }}>
              {t('clients:pdf.ready')}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 1 }}>
              {t('clients:pdf.description')}
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
          {/* Imprimer + Telecharger masques sur mobile (apercu integre suffit). */}
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

export default ClientDetail;
