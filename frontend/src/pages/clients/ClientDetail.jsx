import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSharedElement } from '../../contexts/SharedElementContext';
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

  // Onglets (icône seule sur mobile, icône + label desktop)
  const CLIENT_TABS = [
    { icon: Info, label: t('clients:tabs.info') },
    { icon: Receipt, label: t('clients:tabs.invoices') },
    { icon: Inventory, label: t('clients:tabs.products') },
  ];

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
                : '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff',
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
          pb: { xs: 12, sm: 2, md: 3 }, // Space for mobile nav
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
                <motion.div layoutId={`client-avatar-${id}`} initial={false} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
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
                </motion.div>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <motion.div layoutId={`client-name-${id}`} initial={false} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
                        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.4rem' }, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {client?.name}
                        </Typography>
                      </motion.div>
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
