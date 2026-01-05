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
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { clientsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import ClientInvoicesTable from '../../components/clients/ClientInvoicesTable';
import ClientProductsTable from '../../components/clients/ClientProductsTable';
import { generateClientReportPDF, downloadPDF, openPDFInNewTab } from '../../services/pdfReportService';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);

  useEffect(() => {
    fetchClient();
    fetchStatistics();
  }, [id]);

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

  const handlePdfAction = (action) => {
    if (!generatedPdfBlob) return;

    if (action === 'download') {
      downloadPDF(generatedPdfBlob, `rapport-client-${client.name}.pdf`);
      enqueueSnackbar(t('clients:messages.pdfDownloaded', 'Rapport PDF téléchargé avec succès'), { variant: 'success' });
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
        enqueueSnackbar(t('clients:messages.printWindowOpened', 'Fenêtre d\'impression ouverte'), { variant: 'success' });
      } else {
        enqueueSnackbar(t('clients:messages.cannotOpenPrintWindow', 'Impossible d\'ouvrir la fenêtre d\'impression'), { variant: 'error' });
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

  if (loading) {
    return <LoadingState message={t('clients:messages.loading', 'Chargement du client...')} />;
  }

  if (!client) {
    return (
      <ErrorState
        title={t('clients:messages.clientNotFound', 'Client non trouvé')}
        message={t('clients:messages.clientNotFoundDescription', 'Le client que vous recherchez n\'existe pas ou a été supprimé.')}
        showHome={false}
        onRetry={() => navigate('/clients')}
      />
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
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
              {client.name}
            </Typography>
            {client.legal_name && client.legal_name !== client.name && (
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

      {/* Actions Mobile - Affiché uniquement sur mobile */}
      <Box sx={{ mb: 2, display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end', gap: 1 }}>
        <Tooltip title={t('clients:tooltips.downloadPdfReport')}>
          <IconButton
            onClick={() => setPdfDialogOpen(true)}
            size="small"
            sx={{ color: 'success.main' }}
          >
            <PictureAsPdf />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('clients:tooltips.editClient')}>
          <IconButton
            onClick={() => navigate(`/clients/${id}/edit`)}
            size="small"
            sx={{ color: 'primary.main' }}
          >
            <Edit />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('clients:tooltips.deleteClient')}>
          <IconButton
            onClick={handleDeleteClick}
            size="small"
            sx={{ color: 'error.main' }}
          >
            <Delete />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: isMobile ? 2 : 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            minHeight: isMobile ? 40 : 48,
            fontSize: isMobile ? '0.813rem' : '0.875rem',
            px: isMobile ? 1.5 : 2,
          }
        }}
      >
        <Tab icon={<Info sx={{ fontSize: isMobile ? 18 : 20 }} />} label={t('clients:tabs.info')} iconPosition="start" />
        <Tab icon={<Receipt sx={{ fontSize: isMobile ? 18 : 20 }} />} label={t('clients:tabs.invoices')} iconPosition="start" />
        <Tab icon={<Inventory sx={{ fontSize: isMobile ? 18 : 20 }} />} label={t('clients:tabs.products')} iconPosition="start" />
      </Tabs>

      {/* Tab: Informations */}
      {activeTab === 0 && (
        <Grid container spacing={isMobile ? 1.5 : 3}>
          {/* Card principale avec design amélioré */}
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                borderRadius: 3,
                mb: isMobile ? 1.5 : 3,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
                border: '1px solid',
                borderColor: theme => alpha(theme.palette.divider, 0.1),
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme => `0 12px 40px ${alpha(theme.palette.common.black, 0.15)}`
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                {/* En-tête avec Avatar */}
                <Box sx={{ display: 'flex', gap: isMobile ? 1.5 : 2, mb: isMobile ? 2 : 3, alignItems: 'flex-start' }}>
                  <Avatar
                    sx={{
                      width: isMobile ? 56 : 100,
                      height: isMobile ? 56 : 100,
                      bgcolor: 'primary.main',
                      borderRadius: 2,
                      fontSize: isMobile ? '1.5rem' : '2.5rem',
                      fontWeight: 'bold',
                      boxShadow: 2,
                      flexShrink: 0
                    }}
                  >
                    {client.name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant={isMobile ? 'subtitle1' : 'h5'}
                      fontWeight="bold"
                      gutterBottom
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: isMobile ? '1rem' : undefined
                      }}
                    >
                      {client.name}
                    </Typography>
                    {client.legal_name && client.legal_name !== client.name && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: isMobile ? '0.813rem' : undefined
                        }}
                      >
                        {client.legal_name}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: isMobile ? 1 : 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={client.is_active ? t('clients:status.active') : t('clients:status.inactive')}
                        color={client.is_active ? 'success' : 'default'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          fontSize: isMobile ? '0.688rem' : undefined,
                          height: isMobile ? 20 : undefined
                        }}
                      />
                      {client.business_number && (
                        <Chip
                          icon={<Business sx={{ fontSize: isMobile ? 14 : 16 }} />}
                          label={client.business_number}
                          variant="outlined"
                          size="small"
                          sx={{
                            fontWeight: 500,
                            fontSize: isMobile ? '0.688rem' : undefined,
                            height: isMobile ? 20 : undefined
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Box>

                <Divider sx={{ my: isMobile ? 1.5 : 2.5 }} />

                {/* Informations de contact avec design amélioré */}
                <Grid container spacing={isMobile ? 1.5 : 2.5}>
                  {client.contact_person && (
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: isMobile ? 1 : 1.5,
                          p: isMobile ? 1 : 1.5,
                          borderRadius: 1,
                            bgcolor: theme => alpha(theme.palette.action.hover, 0.5),
                            border: '1px solid',
                            borderColor: theme => alpha(theme.palette.divider, 0.1),
                            '&:hover': {
                              bgcolor: theme => alpha(theme.palette.action.hover, 0.8),
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            },
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <Person sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                          >
                            {t('clients:labels.contactPerson')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              mt: 0.5,
                              fontSize: isMobile ? '0.813rem' : undefined
                            }}
                          >
                            {client.contact_person}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {client.email && (
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: isMobile ? 1 : 1.5,
                          p: isMobile ? 1 : 1.5,
                          borderRadius: 1,
                            bgcolor: theme => alpha(theme.palette.action.hover, 0.5),
                            border: '1px solid',
                            borderColor: theme => alpha(theme.palette.divider, 0.1),
                            '&:hover': {
                              bgcolor: theme => alpha(theme.palette.action.hover, 0.8),
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            },
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <Email sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                          >
                            {t('clients:labels.email')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              mt: 0.5,
                              fontSize: isMobile ? '0.813rem' : undefined,
                              '& a': {
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' }
                              }
                            }}
                          >
                            <a href={`mailto:${client.email}`}>
                              {client.email}
                            </a>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {client.phone && (
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: isMobile ? 1 : 1.5,
                          p: isMobile ? 1 : 1.5,
                          borderRadius: 1,
                            bgcolor: theme => alpha(theme.palette.action.hover, 0.5),
                            border: '1px solid',
                            borderColor: theme => alpha(theme.palette.divider, 0.1),
                            '&:hover': {
                              bgcolor: theme => alpha(theme.palette.action.hover, 0.8),
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            },
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <Phone sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                          >
                            {t('clients:labels.phone')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              mt: 0.5,
                              fontSize: isMobile ? '0.813rem' : undefined,
                              '& a': {
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' }
                              }
                            }}
                          >
                            <a href={`tel:${client.phone}`}>
                              {client.phone}
                            </a>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {client.billing_address && (
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: isMobile ? 1 : 1.5,
                          p: isMobile ? 1 : 1.5,
                          borderRadius: 1,
                            bgcolor: theme => alpha(theme.palette.action.hover, 0.5),
                            border: '1px solid',
                            borderColor: theme => alpha(theme.palette.divider, 0.1),
                            '&:hover': {
                              bgcolor: theme => alpha(theme.palette.action.hover, 0.8),
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            },
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <LocationOn sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                          >
                            {t('clients:labels.address')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              mt: 0.5,
                              fontSize: isMobile ? '0.813rem' : undefined
                            }}
                          >
                            {client.billing_address}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Statistiques avec design amélioré */}
            {statistics?.sales_summary && (
              <Box sx={{ mt: isMobile ? 2 : 3 }}>
                <Typography
                  variant="h6"
                  fontWeight="600"
                  gutterBottom
                  sx={{
                    mb: isMobile ? 1.5 : 2,
                    fontSize: isMobile ? '1rem' : undefined
                  }}
                >
                  {t('clients:labels.generalInfo', 'Informations générales')}
                </Typography>
                <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={6} sm={6}>
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
                        <Receipt sx={{
                          fontSize: isMobile ? 28 : 36,
                          color: 'primary.main',
                          mb: isMobile ? 1 : 1.5,
                          opacity: 0.9
                        }} />
                        <Typography
                          variant={isMobile ? 'h6' : 'h4'}
                          sx={{
                            fontWeight: 700,
                            fontSize: isMobile ? '1.125rem' : undefined,
                            background: theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          {statistics.sales_summary.total_invoices || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {t('clients:tabs.invoices')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={6}>
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
                        <AttachMoney sx={{
                          fontSize: isMobile ? 28 : 36,
                          color: 'success.main',
                          mb: isMobile ? 1 : 1.5,
                          opacity: 0.9
                        }} />
                        <Typography
                          variant={isMobile ? 'body2' : 'h4'}
                          sx={{
                            fontWeight: 700,
                            fontSize: isMobile ? '0.875rem' : undefined,
                            wordBreak: 'break-word',
                            background: theme => `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          {formatCurrency(statistics.sales_summary.total_sales_amount || 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {t('clients:stats.totalRevenue')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {statistics.sales_summary.unique_products > 0 && (
                    <Grid item xs={6} sm={6}>
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
                          <Inventory sx={{
                            fontSize: isMobile ? 28 : 36,
                            color: 'info.main',
                            mb: isMobile ? 1 : 1.5,
                            opacity: 0.9
                          }} />
                          <Typography
                            variant={isMobile ? 'h6' : 'h4'}
                            sx={{
                              fontWeight: 700,
                              fontSize: isMobile ? '1.125rem' : undefined,
                              background: theme => `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent'
                            }}
                          >
                            {statistics.sales_summary.unique_products}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('clients:stats.productsPurchased')}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {statistics.sales_summary.average_invoice_amount > 0 && (
                    <Grid item xs={6} sm={6}>
                      <Card sx={{
                        borderRadius: 3,
                        background: theme => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                        border: '1px solid',
                        borderColor: theme => alpha(theme.palette.warning.main, 0.2),
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
                          background: theme => `linear-gradient(90deg, ${theme.palette.warning.main}, ${alpha(theme.palette.warning.light, 0.8)})`,
                          borderRadius: '3px 3px 0 0'
                        }
                      }}>
                        <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                          <TrendingUp sx={{
                            fontSize: isMobile ? 28 : 36,
                            color: 'warning.main',
                            mb: isMobile ? 1 : 1.5,
                            opacity: 0.9
                          }} />
                          <Typography
                            variant={isMobile ? 'body2' : 'h4'}
                            sx={{
                              fontWeight: 700,
                              fontSize: isMobile ? '0.875rem' : undefined,
                              wordBreak: 'break-word',
                              background: theme => `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent'
                            }}
                          >
                            {formatCurrency(statistics.sales_summary.average_invoice_amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('clients:stats.averageBasket')}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </Grid>

          {/* Sidebar avec design amélioré */}
          <Grid item xs={12} md={4}>
            {/* Conditions commerciales */}
            <Card
              sx={{
                borderRadius: 3,
                mb: isMobile ? 1.5 : 3,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
                border: '1px solid',
                borderColor: theme => alpha(theme.palette.divider, 0.1),
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme => `0 12px 40px ${alpha(theme.palette.common.black, 0.15)}`
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: isMobile ? 1.5 : 2.5 }}>
                  <CreditCard sx={{ color: 'primary.main', fontSize: isMobile ? 20 : 24 }} />
                  <Typography
                    variant="subtitle1"
                    fontWeight="600"
                    sx={{ fontSize: isMobile ? '0.938rem' : undefined }}
                  >
                    {t('clients:labels.commercialConditions')}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: isMobile ? 1.5 : 2.5,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    mb: client.credit_limit ? (isMobile ? 1.5 : 2) : 0,
                    boxShadow: 2
                  }}
                >
                  <Typography
                    variant="h6"
                    color="white"
                    fontWeight="bold"
                    gutterBottom
                    sx={{ fontSize: isMobile ? '1rem' : undefined }}
                  >
                    {client.payment_terms || 'NET 30'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 500,
                      fontSize: isMobile ? '0.688rem' : undefined
                    }}
                  >
                    {t('clients:labels.paymentTerms')}
                  </Typography>
                </Box>

                {client.credit_limit && (
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: isMobile ? 1.5 : 2.5,
                      borderRadius: 2,
                      bgcolor: 'info.main',
                      boxShadow: 2
                    }}
                  >
                    <Typography
                      variant="h6"
                      color="white"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ fontSize: isMobile ? '1rem' : undefined }}
                    >
                      {formatCurrency(client.credit_limit)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: 500,
                        fontSize: isMobile ? '0.688rem' : undefined
                      }}
                    >
                      {t('clients:labels.creditLimit')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Actions rapides avec design amélioré */}
            <Card
              sx={{
                borderRadius: 3,
                mb: isMobile ? 1.5 : 3,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
                border: '1px solid',
                borderColor: theme => alpha(theme.palette.divider, 0.1),
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme => `0 12px 40px ${alpha(theme.palette.common.black, 0.15)}`
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: theme => `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="600"
                  gutterBottom
                  sx={{
                    mb: isMobile ? 1.5 : 2,
                    fontSize: isMobile ? '0.938rem' : undefined
                  }}
                >
                  {t('clients:labels.quickActions')}
                </Typography>
                <Stack spacing={isMobile ? 1 : 1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Receipt sx={{ fontSize: isMobile ? 18 : undefined }} />}
                    onClick={() => navigate(`/invoices/new?clientId=${id}`)}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{
                      py: isMobile ? 0.75 : 1.2,
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: 2,
                      fontSize: isMobile ? '0.813rem' : undefined,
                      '&:hover': { boxShadow: 4 }
                    }}
                  >
                    {t('clients:actions.createInvoice')}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Email sx={{ fontSize: isMobile ? 18 : undefined }} />}
                    href={`mailto:${client.email}`}
                    disabled={!client.email}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{
                      py: isMobile ? 0.75 : 1.2,
                      fontWeight: 500,
                      textTransform: 'none',
                      borderWidth: 2,
                      fontSize: isMobile ? '0.813rem' : undefined,
                      '&:hover': { borderWidth: 2 }
                    }}
                  >
                    {t('clients:actions.sendEmail')}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Phone sx={{ fontSize: isMobile ? 18 : undefined }} />}
                    href={`tel:${client.phone}`}
                    disabled={!client.phone}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{
                      py: isMobile ? 0.75 : 1.2,
                      fontWeight: 500,
                      textTransform: 'none',
                      borderWidth: 2,
                      fontSize: isMobile ? '0.813rem' : undefined,
                      '&:hover': { borderWidth: 2 }
                    }}
                  >
                    {t('clients:actions.call')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Dates avec design amélioré */}
            <Card
              sx={{
                borderRadius: 3,
                background: theme => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
                border: '1px solid',
                borderColor: theme => alpha(theme.palette.divider, 0.1),
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme => `0 12px 40px ${alpha(theme.palette.common.black, 0.15)}`
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: theme => `linear-gradient(90deg, ${theme.palette.info.main}, ${theme.palette.warning.main})`,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="600"
                  gutterBottom
                  sx={{
                    mb: isMobile ? 1.5 : 2,
                    fontSize: isMobile ? '0.938rem' : undefined
                  }}
                >
                  {t('clients:labels.systemInfo')}
                </Typography>
                <Stack spacing={isMobile ? 1.5 : 2} sx={{ mt: 1 }}>
                  <Box
                    sx={{
                      p: isMobile ? 1 : 1.5,
                      borderRadius: 1,
                            bgcolor: theme => alpha(theme.palette.action.hover, 0.5),
                            border: '1px solid',
                            borderColor: theme => alpha(theme.palette.divider, 0.1),
                            '&:hover': {
                              bgcolor: theme => alpha(theme.palette.action.hover, 0.8),
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            },
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="500"
                      display="block"
                      gutterBottom
                      sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                    >
                      {t('clients:labels.createdOn')}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                    >
                      {formatDate(client.created_at)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: isMobile ? 1 : 1.5,
                      borderRadius: 1,
                            bgcolor: theme => alpha(theme.palette.action.hover, 0.5),
                            border: '1px solid',
                            borderColor: theme => alpha(theme.palette.divider, 0.1),
                            '&:hover': {
                              bgcolor: theme => alpha(theme.palette.action.hover, 0.8),
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            },
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="500"
                      display="block"
                      gutterBottom
                      sx={{ fontSize: isMobile ? '0.688rem' : undefined }}
                    >
                      {t('clients:labels.updatedOn')}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                    >
                      {formatDate(client.updated_at)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: Factures */}
      {activeTab === 1 && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: isMobile ? 2 : 3,
              p: isMobile ? 1.5 : 2,
              borderRadius: 3,
              background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: '1px solid',
              borderColor: theme => alpha(theme.palette.primary.main, 0.2),
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(25, 118, 210, 0.15)'
              }
            }}
          >
            <Receipt sx={{ color: 'primary.main', fontSize: isMobile ? 22 : 28 }} />
            <Typography
              variant="h6"
              fontWeight="600"
              color="primary.main"
              sx={{ fontSize: isMobile ? '1rem' : undefined }}
            >
              {t('clients:tabs.invoices')}
            </Typography>
          </Box>
          <Card sx={{
            borderRadius: 3,
            boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
            background: theme => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            border: '1px solid',
            borderColor: theme => alpha(theme.palette.divider, 0.1),
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <CardContent sx={{ p: 0 }}>
              <ClientInvoicesTable
                invoices={statistics?.recent_invoices}
                loading={!statistics}
              />
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab: Produits */}
      {activeTab === 2 && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: isMobile ? 2 : 3,
              p: isMobile ? 1.5 : 2,
              borderRadius: 3,
              background: theme => `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              border: '1px solid',
              borderColor: theme => alpha(theme.palette.info.main, 0.2),
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(25, 118, 210, 0.15)'
              }
            }}
          >
            <Inventory sx={{ color: 'info.main', fontSize: isMobile ? 22 : 28 }} />
            <Typography
              variant="h6"
              fontWeight="600"
              color="info.main"
              sx={{ fontSize: isMobile ? '1rem' : undefined }}
            >
              {t('clients:tabs.products')}
            </Typography>
          </Box>
          <Card sx={{
            borderRadius: 3,
            boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
            background: theme => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            border: '1px solid',
            borderColor: theme => alpha(theme.palette.divider, 0.1),
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <CardContent sx={{ p: 0 }}>
              <ClientProductsTable
                products={statistics?.top_products}
                loading={!statistics}
              />
            </CardContent>
          </Card>
        </Box>
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

export default ClientDetail;
