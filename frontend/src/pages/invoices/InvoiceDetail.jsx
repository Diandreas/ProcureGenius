import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Stack,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Edit,
  Delete,
  Print,
  Email,
  CheckCircle,
  Schedule,
  Warning,
  Block,
  ArrowBack,
  MoreVert,
  AttachMoney,
  Business,
  Person,
  CalendarToday,
  Receipt,
  Add,
  Remove,
  Download,
  Send,
  Done,
  Payment,
  PictureAsPdf,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/config';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { invoicesAPI } from '../../services/api';
import { settingsAPI } from '../../services/settingsAPI';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import { generateInvoicePDF, downloadPDF, openPDFInNewTab, TEMPLATE_TYPES } from '../../services/pdfService';

function InvoiceDetail() {
  const { t } = useTranslation(['invoices', 'common']);
  const { format: formatCurrency } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_TYPES.CLASSIC);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [settings, setSettings] = useState(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    custom_message: ''
  });
  const [paymentData, setPaymentData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: ''
  });
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    product_reference: ''
  });

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  // Charger les paramètres d'organisation pour détecter le format thermal
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsAPI.getAll();
        setSettings(response.data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Ouvrir le modal d'email si demandé depuis la navigation
  useEffect(() => {
    if (location.state?.openEmailDialog && invoice) {
      setSendEmailDialogOpen(true);
      if (location.state?.recipientEmail) {
        setEmailData(prev => ({ ...prev, recipient_email: location.state.recipientEmail }));
      } else if (invoice.client?.email) {
        setEmailData(prev => ({ ...prev, recipient_email: invoice.client.email }));
      }
      // Nettoyer le state pour éviter de rouvrir le modal à chaque render
      navigate(location.pathname, { replace: true });
    }
  }, [invoice, location.state, navigate]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await invoicesAPI.get(id);
      setInvoice(response.data);
    } catch (error) {
      enqueueSnackbar(t('invoices:messages.loadInvoiceError'), { variant: 'error' });
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/invoices/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(t('invoices:messages.deleteConfirmation'))) {
      try {
        await invoicesAPI.delete(id);
        enqueueSnackbar(t('invoices:messages.invoiceDeletedSuccess'), { variant: 'success' });
        navigate('/invoices');
      } catch (error) {
        enqueueSnackbar(t('invoices:messages.deleteError'), { variant: 'error' });
      }
    }
  };

  const handleSend = async () => {
    try {
      const response = await invoicesAPI.send(id);
      setInvoice(response.data.invoice || response.data);
      enqueueSnackbar(t('invoices:messages.invoiceSentSuccess'), { variant: 'success' });
      setSendDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(t('invoices:messages.sendError'), { variant: 'error' });
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.recipient_email) {
      enqueueSnackbar(t('invoices:messages.emailRequired') || 'Email destinataire requis', { variant: 'error' });
      return;
    }

    setSendingEmail(true);
    try {
      // Récupérer la langue actuelle depuis i18n
      const currentLanguage = i18n.language || 'fr';
      const language = currentLanguage.split('-')[0]; // 'en-US' -> 'en'
      
      const response = await invoicesAPI.sendEmail(id, {
        recipient_email: emailData.recipient_email,
        custom_message: emailData.custom_message || undefined,
        template: selectedTemplate,
        language: language
      });
      setInvoice(response.data.invoice || response.data);
      enqueueSnackbar(response.data.message || t('invoices:messages.emailSent') || 'Email envoyé avec succès', { variant: 'success' });
      setSendEmailDialogOpen(false);
      setEmailData({ recipient_email: '', custom_message: '' });
    } catch (error) {
      console.error('Error sending email:', error);
      enqueueSnackbar(
        error.response?.data?.error || t('invoices:messages.emailError') || 'Erreur lors de l\'envoi de l\'email',
        { variant: 'error' }
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      const response = await invoicesAPI.markPaid(id, paymentData);
      setInvoice(response.data);
      enqueueSnackbar(t('invoices:messages.invoiceMarkedPaidSuccess'), { variant: 'success' });
      setMarkPaidDialogOpen(false);
      setPaymentData({ payment_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' });
    } catch (error) {
      enqueueSnackbar(t('invoices:messages.markPaidError'), { variant: 'error' });
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await invoicesAPI.addItem(id, newItem);
      await fetchInvoice(); // Reload to get updated totals
      enqueueSnackbar(t('invoices:messages.itemAddedSuccess'), { variant: 'success' });
      setAddItemDialogOpen(false);
      setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '' });
    } catch (error) {
      enqueueSnackbar(t('invoices:messages.addItemError'), { variant: 'error' });
    }
  };

  const handleGeneratePDF = async (action = 'download') => {
    setGeneratingPdf(true);
    try {
      const pdfBlob = await generateInvoicePDF(invoice, selectedTemplate);

      if (action === 'download') {
        downloadPDF(pdfBlob, `facture-${invoice.invoice_number}.pdf`);
        enqueueSnackbar(t('invoices:messages.pdfDownloadedSuccess'), { variant: 'success' });
      } else if (action === 'preview') {
        openPDFInNewTab(pdfBlob);
      } else if (action === 'print') {
        // Ouvrir le PDF dans une nouvelle fenêtre et déclencher l'impression
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');

        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Libérer l'URL après impression
            setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
          };
          enqueueSnackbar(t('invoices:messages.printWindowOpened'), { variant: 'success' });
        } else {
          enqueueSnackbar(t('invoices:messages.cannotOpenPrintWindow'), { variant: 'error' });
        }
      }

      setPdfDialogOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      enqueueSnackbar(t('invoices:messages.pdfGenerationError'), { variant: 'error' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: <Edit color="action" />,
      sent: <Send color="info" />,
      paid: <CheckCircle color="success" />,
      overdue: <Warning color="error" />,
      cancelled: <Block color="error" />,
    };
    return icons[status] || null;
  };

  const isOverdue = () => {
    if (!invoice?.due_date || invoice.status === 'paid') return false;
    return new Date(invoice.due_date) < new Date() && invoice.status === 'sent';
  };

  const getDaysOverdue = () => {
    if (!isOverdue()) return 0;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  };

  const MobileInvoiceInfoCard = ({ invoice }) => (
    <Card sx={{
      mb: 1.5,
      borderRadius: 1,
      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(250, 250, 252, 0.95))',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(200, 200, 220, 0.2)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden'
    }}>
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1} mr={1}>
            <Typography variant="h6" sx={{
              fontSize: '0.9rem',
              fontWeight: 700,
              mb: 0.25,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: 'text.primary'
            }}>
              {invoice.title}
            </Typography>
            <Typography variant="caption" sx={{
              fontSize: '0.7rem',
              color: 'text.secondary',
              fontWeight: 500,
              letterSpacing: '0.02em'
            }}>
              {invoice.invoice_number}
            </Typography>
          </Box>
          <Chip
            icon={getStatusIcon(isOverdue() ? 'overdue' : invoice.status)}
            label={isOverdue() ? t('invoices:labels.daysOverdue', { days: getDaysOverdue() }) : getStatusLabel(invoice.status)}
            color={isOverdue() ? 'error' : getStatusColor(invoice.status)}
            size="small"
            sx={{
              fontSize: '0.65rem',
              height: 22,
              fontWeight: 600,
              '& .MuiChip-icon': { fontSize: '0.9rem' }
            }}
          />
        </Box>

        {invoice.description && (
          <Typography variant="body2" sx={{
            fontSize: '0.75rem',
            color: 'text.secondary',
            mb: 1,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {invoice.description}
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" spacing={0.5} justifyContent="center">
          <IconButton
            size="small"
            onClick={() => setPdfDialogOpen(true)}
            sx={{
              bgcolor: 'primary.50',
              color: 'primary.main',
              width: 32,
              height: 32,
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'white',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(25, 118, 210, 0.25)'
              },
              transition: 'all 0.2s'
            }}
          >
            <PictureAsPdf sx={{ fontSize: '1.1rem' }} />
          </IconButton>
          <Tooltip
            title={
              !invoice.client
                ? t('invoices:tooltips.noClientAssigned', 'Aucun client associé à cette facture')
                : !invoice.client?.email
                  ? t('invoices:tooltips.noClientEmail', 'Le client n\'a pas d\'adresse email')
                  : t('invoices:tooltips.sendEmail', 'Envoyer par email')
            }
            arrow
          >
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  const defaultMessage = t('invoices:dialogs.sendEmail.defaultMessage', {
                    name: invoice.client?.name || 'Client',
                    number: invoice.invoice_number
                  });
                  setEmailData({
                    recipient_email: invoice.client?.email || '',
                    custom_message: defaultMessage
                  });
                  setSendEmailDialogOpen(true);
                }}
                disabled={!invoice.client?.email}
                sx={{
                  bgcolor: invoice.client?.email ? 'info.50' : 'grey.100',
                  color: invoice.client?.email ? 'info.main' : 'grey.400',
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  '&:hover': invoice.client?.email ? {
                    bgcolor: 'info.main',
                    color: 'white',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(25, 118, 210, 0.25)'
                  } : {},
                  transition: 'all 0.2s'
                }}
              >
                <Email sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton
            size="small"
            onClick={handleEdit}
            sx={{
              bgcolor: 'grey.100',
              color: 'grey.700',
              width: 32,
              height: 32,
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'grey.700',
                color: 'white',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(100, 100, 100, 0.25)'
              },
              transition: 'all 0.2s'
            }}
          >
            <Edit sx={{ fontSize: '1.1rem' }} />
          </IconButton>
          {invoice.status === 'draft' && (
            <IconButton
              size="small"
              onClick={() => setSendDialogOpen(true)}
              sx={{
                bgcolor: 'success.50',
                color: 'success.main',
                width: 32,
                height: 32,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'success.main',
                  color: 'white',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(46, 125, 50, 0.25)'
              },
              transition: 'all 0.2s'
            }}
          >
            <Send sx={{ fontSize: '1.1rem' }} />
          </IconButton>
          )}
          {(invoice.status === 'sent' || isOverdue()) && (
            <IconButton
              size="small"
              onClick={() => setMarkPaidDialogOpen(true)}
              sx={{
                bgcolor: 'warning.50',
                color: 'warning.main',
                width: 32,
                height: 32,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'warning.main',
                  color: 'white',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(255, 152, 0, 0.25)'
                },
                transition: 'all 0.2s'
              }}
            >
              <Payment sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <LoadingState message={t('invoices:messages.loading', 'Chargement de la facture...')} />;
  }

  if (!invoice) {
    return (
      <ErrorState
        title={t('invoices:messages.invoiceNotFound', 'Facture non trouvée')}
        message={t('invoices:messages.invoiceNotFoundDescription', 'La facture que vous recherchez n\'existe pas ou a été supprimée.')}
        showHome={false}
        onRetry={() => navigate('/invoices')}
      />
    );
  }

  const actualStatus = isOverdue() ? 'overdue' : invoice.status;

  return (
    <Box p={{ xs: 1.5, sm: 2, md: 3 }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 3, display: { xs: 'none', md: 'flex' }, justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/invoices')}
            sx={{
              bgcolor: 'grey.100',
              '&:hover': { bgcolor: 'grey.200' }
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontSize: '2rem', fontWeight: 600 }}>
            {invoice.invoice_number}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={() => setPdfDialogOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {t('invoices:buttons.generatePdf')}
            </Button>
            <Tooltip
              title={
                !invoice.client
                  ? t('invoices:tooltips.noClientAssigned', 'Aucun client associé à cette facture')
                  : !invoice.client?.email
                    ? t('invoices:tooltips.noClientEmail', 'Le client n\'a pas d\'adresse email')
                    : ''
              }
              arrow
            >
              <span>
                <Button
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={() => {
                    setEmailData({
                      recipient_email: invoice.client?.email || '',
                      custom_message: `Bonjour ${invoice.client?.name || 'Client'},

Veuillez trouver ci-joint votre facture ${invoice.invoice_number}.

Le PDF de votre facture est joint à cet email.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement`
                    });
                    setSendEmailDialogOpen(true);
                  }}
                  disabled={!invoice.client?.email}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  {t('invoices:buttons.sendEmail')}
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {t('invoices:buttons.edit')}
            </Button>
            {(invoice.status === 'sent' || isOverdue()) && (
              <Button
                variant="contained"
                startIcon={<Payment />}
                onClick={() => setMarkPaidDialogOpen(true)}
                color="success"
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                {t('invoices:buttons.markPaid')}
              </Button>
            )}
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                bgcolor: 'grey.100',
                '&:hover': { bgcolor: 'grey.200' }
              }}
            >
              <MoreVert />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => setAddItemDialogOpen(true)} disabled={invoice.status !== 'draft'}>
                <Add fontSize="small" sx={{ mr: 1 }} />
                {t('invoices:buttons.addItem')}
              </MenuItem>
              <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                <Delete fontSize="small" sx={{ mr: 1 }} />
                {t('invoices:buttons.delete')}
              </MenuItem>
            </Menu>
          </Box>
      </Box>

      {isMobile ? (
        <Box>
          <MobileInvoiceInfoCard invoice={invoice} />

          {/* Client Info Mobile */}
          {invoice.client ? (
            <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                  {t('invoices:labels.client')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                    <Business fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {invoice.client.name || t('invoices:labels.clientWithoutName')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {invoice.client.email || t('invoices:labels.noEmail')}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/clients/${invoice.client.id}`)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.875rem' }}
                >
                  {t('invoices:buttons.viewClient')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px dashed', borderColor: 'warning.main' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Warning color="warning" fontSize="small" />
                  <Typography variant="body2" color="warning.main" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {t('invoices:labels.noClientAssociated')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {t('invoices:labels.noClientDescription')}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Financial Summary Mobile - Ultra Compact */}
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={4}>
              <Card sx={{ borderRadius: 2, bgcolor: 'primary.50', boxShadow: 1 }}>
                <CardContent sx={{ p: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="body2" color="primary.main" sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 0.5 }}>
                    {formatCurrency(invoice.subtotal || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {t('invoices:labels.subtotal')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card sx={{ borderRadius: 2, bgcolor: 'warning.50', boxShadow: 1 }}>
                <CardContent sx={{ p: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="body2" color="warning.main" sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 0.5 }}>
                    {formatCurrency(invoice.tax_amount || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {t('invoices:labels.taxes')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card sx={{ borderRadius: 2, bgcolor: 'success.50', boxShadow: 1 }}>
                <CardContent sx={{ p: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="body2" color="success.main" sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 0.5 }}>
                    {formatCurrency(invoice.total_amount || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {t('invoices:labels.total')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Items Table Mobile - Compact */}
          <Card sx={{ mb: 1.5, borderRadius: 2.5, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1, color: 'text.primary' }}>
                {t('invoices:labels.itemsCount', { count: invoice.items?.length || 0 })}
              </Typography>
              {invoice.items?.map((item, index) => (
                <Box key={index} sx={{
                  mb: 1,
                  pb: 1,
                  borderBottom: index < invoice.items.length - 1 ? '1px solid' : 'none',
                  borderColor: 'rgba(0,0,0,0.06)'
                }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    {item.product ? (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'primary.main',
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => navigate(`/products/${item.product}`)}
                      >
                        {item.product_reference || 'REF-?'}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'primary.main' }}>
                        {item.product_reference || 'REF-?'}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary' }}>
                      {formatCurrency(item.total_price)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    mb: 0.25,
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.description}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </Typography>
                </Box>
              ))}
              {(!invoice.items || invoice.items.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {t('invoices:labels.noItems')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Dates Mobile - Compact */}
          <Card sx={{ mb: 1.5, borderRadius: 2.5, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1, color: 'text.primary' }}>
                {t('invoices:labels.datesLabel')}
              </Typography>
              <Stack spacing={0.5}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                    {t('invoices:labels.creationDate')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {formatDate(invoice.created_at)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                    {t('invoices:labels.issueDate')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {formatDate(invoice.issue_date)}
                  </Typography>
                </Box>
                {invoice.due_date && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                      {t('invoices:labels.dueDateShort')}
                    </Typography>
                    <Typography variant="body2" sx={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isOverdue() ? 'error.main' : 'success.main'
                    }}>
                      {formatDate(invoice.due_date)}
                    </Typography>
                  </Box>
                )}
                {invoice.payment_date && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                      {t('invoices:labels.paymentDate')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'success.main' }}>
                      {formatDate(invoice.payment_date)}
                    </Typography>
                  </Box>
                )}
                {(invoice.sent_at || invoice.sent_date) && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                      {t('invoices:labels.sentDateLabel', 'Date d\'envoi')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'info.main' }}>
                      {formatDate(invoice.sent_at || invoice.sent_date)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Invoice Info */}
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('invoices:labels.generalInformation')}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                      {invoice.title}
                    </Typography>
                  </Grid>
                  {invoice.description && (
                    <Grid item xs={12}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('invoices:labels.description')}
                        </Typography>
                        <Typography>{invoice.description}</Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t('invoices:labels.billedItems')}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setAddItemDialogOpen(true)}
                    disabled={invoice.status !== 'draft'}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('invoices:buttons.addItem')}
                  </Button>
                </Box>
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>{t('invoices:columns.reference')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('invoices:columns.description')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{t('invoices:columns.quantity')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{t('invoices:columns.unitPrice')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{t('invoices:columns.total')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.items?.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            {item.product ? (
                              <Box
                                component="span"
                                sx={{
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  fontWeight: 600,
                                  '&:hover': {
                                    textDecoration: 'underline'
                                  }
                                }}
                                onClick={() => navigate(`/products/${item.product}`)}
                                title={t('invoices:tooltips.clickProductDetails')}
                              >
                                {item.product_reference || '-'}
                              </Box>
                            ) : (
                              item.product_reference || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {item.product ? (
                              <Box
                                component="span"
                                sx={{
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  '&:hover': {
                                    textDecoration: 'underline'
                                  }
                                }}
                                onClick={() => navigate(`/products/${item.product}`)}
                                title={t('invoices:tooltips.clickProductDetails')}
                              >
                                {item.description}
                              </Box>
                            ) : (
                              item.description
                            )}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                      {(!invoice.items || invoice.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">
                              {t('invoices:labels.noItemsInInvoice')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('invoices:labels.financialSummary')}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                        {formatCurrency(invoice.subtotal || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('invoices:labels.subtotal')}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                        {formatCurrency(invoice.tax_amount || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('invoices:labels.taxes')}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                        {formatCurrency(invoice.total_amount || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('invoices:labels.total')}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Client Info */}
            {invoice.client ? (
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {t('invoices:labels.client')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <Business />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {invoice.client.name || t('invoices:labels.clientWithoutName')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {invoice.client.email || t('invoices:labels.noEmail')}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate(`/clients/${invoice.client.id}`)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    startIcon={<Business />}
                  >
                    {t('invoices:buttons.viewClient')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '2px dashed', borderColor: 'warning.light' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.light' }}>
                      <Warning color="warning" />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {t('invoices:labels.noClientLinked')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('invoices:labels.noClientLinkedMessage')}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    onClick={handleEdit}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('invoices:buttons.linkClient')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('invoices:labels.importantDates')}
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarToday color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('invoices:labels.creationDateLabel')}
                      secondary={formatDate(invoice.created_at)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Send color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('invoices:labels.issueDateLabel')}
                      secondary={formatDate(invoice.issue_date)}
                    />
                  </ListItem>
                  {invoice.due_date && (
                    <ListItem>
                      <ListItemIcon>
                        <Schedule color={isOverdue() ? "error" : "warning"} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('invoices:labels.dueDateLabel')}
                        secondary={
                          <React.Fragment>
                            <Typography variant="body2" component="span" display="block" color={isOverdue() ? "error" : "inherit"}>
                              {formatDate(invoice.due_date)}
                            </Typography>
                            {isOverdue() && (
                              <Typography variant="caption" component="span" display="block" color="error">
                                {t('invoices:messages.overdueMessage', { days: getDaysOverdue() })}
                              </Typography>
                            )}
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                  )}
                  {invoice.payment_date && (
                    <ListItem>
                      <ListItemIcon>
                        <Payment color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('invoices:labels.paymentDateLabel')}
                        secondary={formatDate(invoice.payment_date)}
                      />
                    </ListItem>
                  )}
                  {(invoice.sent_at || invoice.sent_date) && (
                    <ListItem>
                      <ListItemIcon>
                        <Send color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('invoices:labels.sentDateLabel', 'Date d\'envoi')}
                        secondary={formatDate(invoice.sent_at || invoice.sent_date)}
                      />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemIcon>
                      <Edit color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('invoices:labels.lastUpdate')}
                      secondary={formatDate(invoice.updated_at)}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Payment Info */}
            {invoice.status === 'paid' && (
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {t('invoices:labels.paymentInfo')}
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary={t('invoices:labels.paymentMethod')}
                        secondary={invoice.payment_method || t('invoices:labels.notSpecified')}
                      />
                    </ListItem>
                    {invoice.payment_reference && (
                      <ListItem>
                        <ListItemText
                          primary={t('invoices:labels.paymentReference')}
                          secondary={invoice.payment_reference}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            )}

            {/* Created By */}
            {invoice.created_by && (
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {t('invoices:labels.createdBy')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {invoice.created_by.first_name} {invoice.created_by.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {invoice.created_by.email}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t('invoices:dialogs.sendInvoice')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('invoices:messages.sendInvoiceConfirm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            {t('invoices:buttons.cancel')}
          </Button>
          <Button
            onClick={handleSend}
            color="primary"
            variant="contained"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {t('invoices:buttons.send')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog 
        open={sendEmailDialogOpen} 
        onClose={() => setSendEmailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Email sx={{ color: 'primary.main' }} />
          {t('invoices:dialogs.sendEmail.title')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('invoices:dialogs.sendEmail.recipient')}
                  type="email"
                  value={emailData.recipient_email}
                  onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                  required
                  helperText={t('invoices:dialogs.sendEmail.recipientHelp')}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('invoices:fields.invoiceTemplate')}</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label={t('invoices:fields.invoiceTemplate')}
                  >
                    <MenuItem value={TEMPLATE_TYPES.CLASSIC}>{t('invoices:templates.classic')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.MODERN}>{t('invoices:templates.modern')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.MINIMAL}>{t('invoices:templates.minimal')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.PROFESSIONAL}>{t('invoices:templates.professional')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('invoices:dialogs.sendEmail.message')}
                  multiline
                  rows={8}
                  value={emailData.custom_message}
                  onChange={(e) => setEmailData({ ...emailData, custom_message: e.target.value })}
                  helperText={t('invoices:dialogs.sendEmail.messageHelp')}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => {
              setSendEmailDialogOpen(false);
              setEmailData({ recipient_email: '', custom_message: '' });
            }} 
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {t('invoices:buttons.cancel')}
          </Button>
          <Button
            onClick={handleSendEmail}
            color="primary"
            variant="contained"
            disabled={!emailData.recipient_email || sendingEmail}
            startIcon={sendingEmail ? <CircularProgress size={20} /> : <Send />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {sendingEmail ? t('invoices:labels.sending') : t('invoices:dialogs.sendEmail.send')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidDialogOpen} onClose={() => setMarkPaidDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('invoices:dialogs.markPaid')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('invoices:fields.paymentDate')}
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('invoices:fields.paymentMethod')}
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                placeholder={t('invoices:fields.paymentMethodPlaceholder')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('invoices:fields.notes')}
                multiline
                rows={3}
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder={t('invoices:fields.notesPlaceholder')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkPaidDialogOpen(false)}>{t('invoices:buttons.cancel')}</Button>
          <Button
            onClick={handleMarkPaid}
            variant="contained"
            color="success"
          >
            {t('invoices:buttons.markPaid')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('invoices:dialogs.addItem')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('invoices:fields.productReference')}
                value={newItem.product_reference}
                onChange={(e) => setNewItem({ ...newItem, product_reference: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('invoices:columns.description')}
                required
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={t('invoices:columns.quantity')}
                type="number"
                required
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={t('invoices:columns.unitPrice')}
                type="number"
                required
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>{t('invoices:buttons.cancel')}</Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.description || newItem.quantity <= 0}
          >
            {t('invoices:buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Generation Dialog */}
      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('invoices:dialogs.generatePdf')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {settings?.paperSize === 'thermal_80' || settings?.paperSize === 'thermal_58' ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  {t('invoices:messages.thermalPrintingMode', 'Format d\'impression thermique détecté. Le template de ticket thermal sera utilisé automatiquement.')}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {settings.paperSize === 'thermal_80' ? 'Format: 80mm' : 'Format: 58mm'}
                </Typography>
              </Alert>
            ) : (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>{t('invoices:fields.invoiceTemplate')}</InputLabel>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  label={t('invoices:fields.invoiceTemplate')}
                >
                  <MenuItem value={TEMPLATE_TYPES.CLASSIC}>{t('invoices:templates.classic')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.MODERN}>{t('invoices:templates.modern')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.MINIMAL}>{t('invoices:templates.minimal')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.PROFESSIONAL}>{t('invoices:templates.professional')}</MenuItem>
                </Select>
              </FormControl>
            )}
            <Typography variant="body2" color="text.secondary">
              {t('invoices:messages.pdfGenerationHelpText')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfDialogOpen(false)}>
            {t('invoices:buttons.cancel')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('preview')}
            variant="outlined"
            disabled={generatingPdf}
            startIcon={<Receipt />}
          >
            {t('invoices:buttons.preview')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('print')}
            variant="outlined"
            color="secondary"
            disabled={generatingPdf}
            startIcon={<Print />}
          >
            {t('invoices:buttons.print')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('download')}
            variant="contained"
            disabled={generatingPdf}
            startIcon={generatingPdf ? <CircularProgress size={20} /> : <Download />}
          >
            {generatingPdf ? t('invoices:labels.generatingLabel') : t('invoices:buttons.download')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvoiceDetail;