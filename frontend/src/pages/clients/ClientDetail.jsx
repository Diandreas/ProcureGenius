import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSharedElement } from '../../contexts/SharedElementContext';
import { Box, Card, CardContent, Typography, Button, IconButton, Chip, Avatar, Divider, Grid, Stack, CircularProgress, Alert, Tabs, useMediaQuery, useTheme, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { SafeTab } from '../../components/safe';
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
  const { consumeSharedElement, clearSharedElement } = useSharedElement();

  const [client, setClient] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);

  // Morphing animation state
  const [isAnimating, setIsAnimating] = useState(true);
  const [sharedElementData, setSharedElementData] = useState(null);
  const targetCardRef = useRef(null);
  const [targetRect, setTargetRect] = useState(null);

  // Capturer l'élément partagé au montage
  useLayoutEffect(() => {
    const shared = consumeSharedElement(`client-${id}`);
    if (shared) {
      setSharedElementData(shared);
    } else {
      setIsAnimating(false);
    }
  }, [id, consumeSharedElement]);

  // Mesurer la position cible après le premier rendu
  useLayoutEffect(() => {
    if (targetCardRef.current && sharedElementData && !loading && client) {
      const rect = targetCardRef.current.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [sharedElementData, loading, client]);

  // Terminer l'animation
  const handleAnimationComplete = () => {
    // Ajouter un petit délai pour s'assurer que l'animation est complètement terminée
    setTimeout(() => {
      setIsAnimating(false);
      clearSharedElement();
    }, 50); // 50ms delay to ensure smooth transition
  };

  useEffect(() => {
    // Only start fetching after we've processed the shared element
    const fetchClientData = async () => {
      await fetchClient();
      await fetchStatistics();
    };

    fetchClientData();
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

  return (
    <>
      {/* Morphing Animation Overlay - Ghost Card Complète */}
      <AnimatePresence>
        {isAnimating && sharedElementData && targetRect && (
          <motion.div
            initial={{
              position: 'fixed',
              top: sharedElementData.rect.top,
              left: sharedElementData.rect.left,
              width: sharedElementData.rect.width,
              height: sharedElementData.rect.height,
              zIndex: 9999,
              borderRadius: 12,
              background: sharedElementData.data.is_active
                ? 'linear-gradient(145deg, rgba(230, 233, 239, 0.95) 0%, rgba(37, 99, 235, 0.03) 50%, rgba(230, 233, 239, 0.95) 100%)'
                : 'linear-gradient(145deg, rgba(230, 233, 239, 0.9) 0%, rgba(100, 116, 139, 0.05) 100%)',
              boxShadow: sharedElementData.data.is_active
                ? '0 4px 20px rgba(37, 99, 235, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                : '0 4px 16px rgba(0, 0, 0, 0.06)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
            }}
            animate={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              borderRadius: 12,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
            }}
            onAnimationComplete={handleAnimationComplete}
            style={{ pointerEvents: 'none' }} // Prevent interaction during animation
          >
            {/* Barre de couleur en haut */}
            <Box
              component={motion.div}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5 }}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: sharedElementData.data.is_active
                  ? 'linear-gradient(90deg, #10b981, #2563eb, #64748b)'
                  : 'linear-gradient(90deg, #9ca3af, #6b7280)',
                borderRadius: '12px 12px 0 0',
                transformOrigin: 'left',
              }}
            />

            {/* Contenu de la card source - exactement comme dans la liste */}
            <Box
              component={motion.div}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: 0.25 }}
              sx={{ p: 2 }}
            >
              {/* Header avec Avatar et Nom */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                <Avatar
                  sx={{
                    width: isMobile ? 48 : 56,
                    height: isMobile ? 48 : 56,
                    bgcolor: 'primary.main',
                    borderRadius: 2,
                    fontSize: isMobile ? '1.2rem' : '1.5rem',
                    fontWeight: 'bold',
                    boxShadow: 2,
                  }}
                >
                  {sharedElementData.data.avatar}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      fontSize: isMobile ? '0.875rem' : '0.95rem',
                    }}
                  >
                    {sharedElementData.data.name}
                  </Typography>
                  {sharedElementData.data.legal_name && sharedElementData.data.legal_name !== sharedElementData.data.name && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                      {sharedElementData.data.legal_name}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Infos de contact */}
              <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                {sharedElementData.data.contact_person && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sharedElementData.data.contact_person}
                    </Typography>
                  </Box>
                )}
                {sharedElementData.data.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sharedElementData.data.email}
                    </Typography>
                  </Box>
                )}
                {sharedElementData.data.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {sharedElementData.data.phone}
                    </Typography>
                  </Box>
                )}
                {sharedElementData.data.payment_terms && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CreditCard sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {sharedElementData.data.payment_terms}
                    </Typography>
                  </Box>
                )}
              </Stack>

              {/* Stats si présentes */}
              {(sharedElementData.data.total_invoices > 0 || sharedElementData.data.total_sales_amount > 0) && (
                <Box
                  sx={{
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.12)} 0%, ${alpha(theme.palette.success.main, 0.06)} 100%)`,
                    borderRadius: 2,
                    p: 1.5,
                    mb: 1.5,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.success.main, 0.2),
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    {sharedElementData.data.total_invoices > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: 'success.main', display: 'flex' }}>
                          <Receipt sx={{ fontSize: 16, color: 'white' }} />
                        </Box>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'success.main' }}>
                          {sharedElementData.data.total_invoices}
                        </Typography>
                      </Box>
                    )}
                    {sharedElementData.data.total_sales_amount > 0 && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.938rem',
                          fontWeight: 800,
                          background: theme => `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {formatCurrency(sharedElementData.data.total_sales_amount)}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}

              {/* Footer */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={sharedElementData.data.is_active ? 'Actif' : 'Inactif'}
                  size="small"
                  color={sharedElementData.data.is_active ? 'success' : 'default'}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
                {sharedElementData.data.business_number && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    N° {sharedElementData.data.business_number}
                  </Typography>
                )}
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <Box
        sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          opacity: isAnimating ? 0 : 1,
          transition: 'opacity 0.2s ease',
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
        <SafeTab icon={<Info sx={{ fontSize: isMobile ? 18 : 20 }} />} label={t('clients:tabs.info')} iconPosition="start" />
        <SafeTab icon={<Receipt sx={{ fontSize: isMobile ? 18 : 20 }} />} label={t('clients:tabs.invoices')} iconPosition="start" />
        <SafeTab icon={<Inventory sx={{ fontSize: isMobile ? 18 : 20 }} />} label={t('clients:tabs.products')} iconPosition="start" />
      </Tabs>

      {/* Loading skeleton pendant le chargement */}
      {loading && !client && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab: Informations */}
      {activeTab === 0 && client && (
        <Grid container spacing={isMobile ? 1.5 : 3}>
          {/* Card principale avec design amélioré */}
          <Grid item xs={12} md={8}>
            <Card
              ref={targetCardRef}
              component={motion.div}
              layoutId={`client-card-${id}`}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
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
                },
                opacity: isAnimating ? 0 : 1, // Hide during animation
                visibility: isAnimating ? 'hidden' : 'visible' // Ensure it's not taking up space during animation
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                {/* En-tête avec Avatar */}
                <Box sx={{ display: 'flex', gap: isMobile ? 1.5 : 2, mb: isMobile ? 2 : 3, alignItems: 'flex-start' }}>
                  <motion.div
                    layoutId={`client-avatar-${id}`}
                    initial={false}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  >
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
                      {client?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                  </motion.div>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <motion.div
                      layoutId={`client-name-${id}`}
                      initial={false}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    >
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
                        {loading ? '...' : client?.name}
                      </Typography>
                    </motion.div>
                    {client?.legal_name && client.legal_name !== client.name && (
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
                        icon={client.is_manually_active ? undefined : <AccessTime sx={{ fontSize: isMobile ? 12 : 14 }} />}
                        sx={{
                          fontWeight: 500,
                          fontSize: isMobile ? '0.688rem' : undefined,
                          height: isMobile ? 20 : undefined
                        }}
                      />
                      {client.is_manually_active && (
                        <Chip
                          label={t('clients:labels.manualStatus')}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontWeight: 500,
                            fontSize: isMobile ? '0.688rem' : undefined,
                            height: isMobile ? 20 : undefined
                          }}
                        />
                      )}
                      {client.auto_inactive_since && (
                        <Chip
                          label={`${t('clients:labels.autoInactiveSince')} ${formatDate(client.auto_inactive_since)}`}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{
                            fontWeight: 500,
                            fontSize: isMobile ? '0.688rem' : undefined,
                            height: isMobile ? 20 : undefined
                          }}
                        />
                      )}
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
                          alignItems: 'center',
                          gap: isMobile ? 1.5 : 2,
                          p: isMobile ? 1.5 : 2,
                          borderRadius: 2,
                          bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
                          border: '1px solid',
                          borderColor: theme => alpha(theme.palette.primary.main, 0.2),
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
                            transform: 'translateY(-2px)',
                            boxShadow: theme => `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
                          }
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Person sx={{ fontSize: isMobile ? 20 : 22, color: 'white' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ fontSize: isMobile ? '0.688rem' : '0.75rem' }}
                          >
                            {t('clients:labels.contactPerson')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              mt: 0.5,
                              fontSize: isMobile ? '0.875rem' : '0.938rem',
                              color: 'text.primary'
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
                          alignItems: 'center',
                          gap: isMobile ? 1.5 : 2,
                          p: isMobile ? 1.5 : 2,
                          borderRadius: 2,
                          bgcolor: theme => alpha(theme.palette.info.main, 0.08),
                          border: '1px solid',
                          borderColor: theme => alpha(theme.palette.info.main, 0.2),
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: theme => alpha(theme.palette.info.main, 0.12),
                            transform: 'translateY(-2px)',
                            boxShadow: theme => `0 4px 12px ${alpha(theme.palette.info.main, 0.2)}`
                          }
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: 'info.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Email sx={{ fontSize: isMobile ? 20 : 22, color: 'white' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ fontSize: isMobile ? '0.688rem' : '0.75rem' }}
                          >
                            {t('clients:labels.email')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            component="a"
                            href={`mailto:${client.email}`}
                            sx={{
                              mt: 0.5,
                              fontSize: isMobile ? '0.875rem' : '0.938rem',
                              color: 'info.main',
                              textDecoration: 'none',
                              display: 'block',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {client.email}
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
                          alignItems: 'center',
                          gap: isMobile ? 1.5 : 2,
                          p: isMobile ? 1.5 : 2,
                          borderRadius: 2,
                          bgcolor: theme => alpha(theme.palette.success.main, 0.08),
                          border: '1px solid',
                          borderColor: theme => alpha(theme.palette.success.main, 0.2),
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: theme => alpha(theme.palette.success.main, 0.12),
                            transform: 'translateY(-2px)',
                            boxShadow: theme => `0 4px 12px ${alpha(theme.palette.success.main, 0.2)}`
                          }
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: 'success.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Phone sx={{ fontSize: isMobile ? 20 : 22, color: 'white' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ fontSize: isMobile ? '0.688rem' : '0.75rem' }}
                          >
                            {t('clients:labels.phone')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            component="a"
                            href={`tel:${client.phone}`}
                            sx={{
                              mt: 0.5,
                              fontSize: isMobile ? '0.875rem' : '0.938rem',
                              color: 'success.main',
                              textDecoration: 'none',
                              display: 'block',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {client.phone}
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
                          alignItems: 'center',
                          gap: isMobile ? 1.5 : 2,
                          p: isMobile ? 1.5 : 2,
                          borderRadius: 2,
                          bgcolor: theme => alpha(theme.palette.secondary.main, 0.08),
                          border: '1px solid',
                          borderColor: theme => alpha(theme.palette.secondary.main, 0.2),
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: theme => alpha(theme.palette.secondary.main, 0.12),
                            transform: 'translateY(-2px)',
                            boxShadow: theme => `0 4px 12px ${alpha(theme.palette.secondary.main, 0.2)}`
                          }
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: 'secondary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <LocationOn sx={{ fontSize: isMobile ? 20 : 22, color: 'white' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ fontSize: isMobile ? '0.688rem' : '0.75rem' }}
                          >
                            {t('clients:labels.address')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{
                              mt: 0.5,
                              fontSize: isMobile ? '0.875rem' : '0.938rem',
                              color: 'text.primary'
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
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CreditCard sx={{ color: 'white', fontSize: isMobile ? 20 : 22 }} />
                  </Box>
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
                    p: isMobile ? 2 : 3,
                    borderRadius: 2.5,
                    background: theme => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    mb: client.credit_limit ? (isMobile ? 1.5 : 2) : 0,
                    boxShadow: theme => `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                      borderRadius: '2.5px 2.5px 0 0'
                    }
                  }}
                >
                  <Typography
                    variant="h5"
                    color="white"
                    fontWeight="bold"
                    gutterBottom
                    sx={{
                      fontSize: isMobile ? '1.25rem' : '1.5rem',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    {client.payment_terms || 'CASH'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255,255,255,0.95)',
                      fontWeight: 500,
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    {t('clients:labels.paymentTerms')}
                  </Typography>
                </Box>

                {client.credit_limit && (
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: isMobile ? 2 : 3,
                      borderRadius: 2.5,
                      background: theme => `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                      boxShadow: theme => `0 4px 16px ${alpha(theme.palette.info.main, 0.3)}`,
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                        borderRadius: '2.5px 2.5px 0 0'
                      }
                    }}
                  >
                    <Typography
                      variant="h5"
                      color="white"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ 
                        fontSize: isMobile ? '1.125rem' : '1.375rem',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      {formatCurrency(client.credit_limit)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255,255,255,0.95)',
                        fontWeight: 500,
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        position: 'relative',
                        zIndex: 1
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? 1.5 : 2,
                      p: isMobile ? 1.5 : 2,
                      borderRadius: 2,
                      bgcolor: theme => alpha(theme.palette.warning.main, 0.08),
                      border: '1px solid',
                      borderColor: theme => alpha(theme.palette.warning.main, 0.2),
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: theme => alpha(theme.palette.warning.main, 0.12),
                        transform: 'translateY(-2px)',
                        boxShadow: theme => `0 4px 12px ${alpha(theme.palette.warning.main, 0.2)}`
                      }
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: 'warning.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Info sx={{ fontSize: isMobile ? 18 : 20, color: 'white' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight="500"
                        display="block"
                        gutterBottom
                        sx={{ fontSize: isMobile ? '0.688rem' : '0.75rem' }}
                      >
                        {t('clients:labels.createdOn')}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ fontSize: isMobile ? '0.875rem' : '0.938rem' }}
                      >
                        {formatDate(client.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? 1.5 : 2,
                      p: isMobile ? 1.5 : 2,
                      borderRadius: 2,
                      bgcolor: theme => alpha(theme.palette.info.main, 0.08),
                      border: '1px solid',
                      borderColor: theme => alpha(theme.palette.info.main, 0.2),
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: theme => alpha(theme.palette.info.main, 0.12),
                        transform: 'translateY(-2px)',
                        boxShadow: theme => `0 4px 12px ${alpha(theme.palette.info.main, 0.2)}`
                      }
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: 'info.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <AccessTime sx={{ fontSize: isMobile ? 18 : 20, color: 'white' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight="500"
                        display="block"
                        gutterBottom
                        sx={{ fontSize: isMobile ? '0.688rem' : '0.75rem' }}
                      >
                        {t('clients:labels.updatedOn')}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ fontSize: isMobile ? '0.875rem' : '0.938rem' }}
                      >
                        {formatDate(client.updated_at)}
                      </Typography>
                    </Box>
                  </Box>
                  {client.last_activity_date && (
                    <>
                      <Divider sx={{ my: isMobile ? 1 : 1.5 }} />
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: isMobile ? 1.5 : 2,
                          p: isMobile ? 1.5 : 2,
                          borderRadius: 2,
                          bgcolor: theme => alpha(theme.palette.primary.main, 0.05),
                          border: '1px solid',
                          borderColor: theme => alpha(theme.palette.primary.main, 0.1)
                        }}
                      >
                        <AccessTime sx={{
                          fontSize: isMobile ? 20 : 24,
                          color: 'primary.main'
                        }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            gutterBottom
                            sx={{ fontSize: isMobile ? '0.688rem' : '0.75rem' }}
                          >
                            {t('clients:labels.lastActivity')}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            sx={{ fontSize: isMobile ? '0.875rem' : '0.938rem' }}
                          >
                            {formatDate(client.last_activity_date)}
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: Factures */}
      {activeTab === 1 && client && (
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
      {activeTab === 2 && client && (
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
    </>
  );
}

export default ClientDetail;
