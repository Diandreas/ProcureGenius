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
  alpha,
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
  Description,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/config';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { invoicesAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import { generateInvoicePDF, downloadPDF, openPDFInNewTab, TEMPLATE_TYPES } from '../../services/pdfService';
import { useHeader } from '../../contexts/HeaderContext';
import { NeumorphicPanel, neuShadows } from '../../components/neumorphic/NeumorphicList';

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
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    custom_message: ''
  });
  const [paymentData, setPaymentData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: ''
  });

  // Paiements
  const [payments, setPayments] = useState([]);
  const [paymentsInfo, setPaymentsInfo] = useState(null); // { total_amount, total_paid, balance_due, payment_status }
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    product_reference: ''
  });

  const { setPageHeader } = useHeader();

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  // Update Global Header
  useEffect(() => {
    if (invoice) {
      setPageHeader({
        title: isMobile ? invoice.invoice_number : '',
        showTitle: isMobile,
        actions: isMobile ? (
          <Stack direction="row" spacing={0.25}>
            <IconButton onClick={handleEdit} size="small" sx={{ color: 'text.secondary' }}>
              <Edit sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ color: 'text.secondary' }}>
              <MoreVert sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        ) : null
      });
    }
    
    return () => setPageHeader(null);
  }, [invoice, isMobile, id, t]);

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

  const fetchPayments = async () => {
    try {
      const response = await invoicesAPI.getPayments(id);
      setPayments(response.data.payments || []);
      setPaymentsInfo({
        total_amount: response.data.total_amount,
        total_paid: response.data.total_paid,
        balance_due: response.data.balance_due,
        payment_status: response.data.payment_status,
      });
    } catch (error) {
      // silently fail — payments section won't show
    }
  };

  useEffect(() => {
    if (id) fetchPayments();
  }, [id]);

  const handleAddPayment = async () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      enqueueSnackbar('Montant invalide', { variant: 'error' });
      return;
    }
    setSavingPayment(true);
    try {
      await invoicesAPI.addPayment(id, {
        amount: parseFloat(newPayment.amount),
        payment_date: newPayment.payment_date,
        payment_method: newPayment.payment_method,
        reference_number: newPayment.reference_number || undefined,
        notes: newPayment.notes || undefined,
      });
      await Promise.all([fetchInvoice(), fetchPayments()]);
      enqueueSnackbar('Paiement enregistré', { variant: 'success' });
      setAddPaymentOpen(false);
      setNewPayment({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference_number: '',
        notes: '',
      });
    } catch (error) {
      enqueueSnackbar(error.response?.data?.amount?.[0] || error.response?.data?.non_field_errors?.[0] || 'Erreur lors de l\'enregistrement', { variant: 'error' });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Supprimer ce paiement ?')) return;
    try {
      await invoicesAPI.deletePayment(id, paymentId);
      await Promise.all([fetchInvoice(), fetchPayments()]);
      enqueueSnackbar('Paiement supprimé', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    }
  };

  const paymentMethodLabel = (method) => {
    const labels = {
      cash: 'Espèces',
      check: 'Chèque',
      credit_card: 'Carte de crédit',
      bank_transfer: 'Virement',
      interac: 'Interac',
      other: 'Autre',
    };
    return labels[method] || method;
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

  const handleConvertQuote = async () => {
    try {
      const response = await invoicesAPI.convertQuote(id);
      setInvoice(response.data.invoice || response.data);
      enqueueSnackbar(response.data.message || 'Devis converti en facture.', { variant: 'success' });
      await fetchInvoice();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Erreur lors de la conversion du devis.', { variant: 'error' });
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
      pending: <Schedule color="warning" />,
      paid: <CheckCircle color="success" />,
      overdue: <Warning color="error" />,
      cancelled: <Block color="error" />,
    };
    return icons[status] || null;
  };

  const isOverdue = () => {
    if (!invoice?.due_date || invoice.status === 'paid') return false;
    return new Date(invoice.due_date) < new Date() && ['sent', 'pending'].includes(invoice.status);
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
      borderRadius: 3,
      border: 'none',
      boxShadow: theme => theme.palette.mode === 'light'
        ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff'
        : '6px 6px 16px #14191f, -6px -6px 16px #283041',
    }} elevation={0}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box flex={1} mr={1} minWidth={0}>
            {invoice.title && (
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {invoice.title}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {invoice.invoice_number}
            </Typography>
          </Box>
          <Chip
            icon={getStatusIcon(isOverdue() ? 'overdue' : invoice.status)}
            label={isOverdue() ? t('invoices:labels.daysOverdue', { days: getDaysOverdue() }) : getStatusLabel(invoice.status)}
            color={isOverdue() ? 'error' : getStatusColor(invoice.status)}
            size="small"
            sx={{ fontSize: '0.65rem', height: 22, fontWeight: 600, '& .MuiChip-icon': { fontSize: '0.9rem' }, flexShrink: 0 }}
          />
        </Box>

        {invoice.description && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.75, lineHeight: 1.4 }}>
            {invoice.description}
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ display: 'none' }}>
          <IconButton size="small">
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
          {invoice.status === 'quote' && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Receipt sx={{ fontSize: '1.1rem' }} />}
              onClick={handleConvertQuote}
              sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
            >
              Convertir en facture
            </Button>
          )}
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
          {(['sent', 'pending'].includes(invoice.status) || isOverdue()) && (
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
    <Box sx={{ 
      p: { xs: 0, sm: 2, md: 3 },
      pb: isMobile ? 12 : 3, // Space for mobile nav
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header neumorphique - Caché sur mobile (géré par top navbar) */}
      <Box sx={{
        mb: 3, display: { xs: 'none', md: 'flex' }, justifyContent: 'space-between', alignItems: 'center',
        gap: 2, p: 2.5, borderRadius: 4, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden',
        boxShadow: theme => theme.palette.mode === 'light'
          ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff'
          : '6px 6px 16px #14191f, -6px -6px 16px #283041',
      }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: theme => (theme.palette[getStatusColor(invoice.status)] || {}).main || theme.palette.grey[400] }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <IconButton
            onClick={() => navigate('/invoices')}
            sx={{ borderRadius: 2.5, bgcolor: theme => alpha(theme.palette.action.hover, 0.6), '&:hover': { bgcolor: 'action.selected' } }}
          >
            <ArrowBack />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {invoice.invoice_number}
              </Typography>
              <Chip label={getStatusLabel(invoice.status)} color={getStatusColor(invoice.status)} size="small" sx={{ fontWeight: 700 }} />
            </Box>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.25 }}>
              {invoice.client?.name || invoice.title || '—'}
              {invoice.total_amount != null && <Box component="span" sx={{ ml: 1.5, fontWeight: 700, color: 'text.primary' }}>{formatCurrency(invoice.total_amount)}</Box>}
            </Typography>
          </Box>
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
            {(['sent', 'pending'].includes(invoice.status) || isOverdue()) && (
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
              <MenuItem onClick={() => { setPdfDialogOpen(true); setAnchorEl(null); }}>
                <PictureAsPdf fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                {t('invoices:buttons.generatePdf')}
              </MenuItem>
              <MenuItem
                disabled={!invoice.client?.email}
                onClick={() => {
                  setEmailData({ recipient_email: invoice.client?.email || '', custom_message: '' });
                  setSendEmailDialogOpen(true);
                  setAnchorEl(null);
                }}
              >
                <Email fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                {t('invoices:buttons.sendEmail')}
              </MenuItem>
              {(['sent', 'pending'].includes(invoice.status) || isOverdue()) && (
                <MenuItem onClick={() => { setMarkPaidDialogOpen(true); setAnchorEl(null); }}>
                  <Payment fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                  {t('invoices:buttons.markPaid')}
                </MenuItem>
              )}
              <MenuItem onClick={() => { setAddPaymentOpen(true); setAnchorEl(null); }}>
                <Add fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                Ajouter un paiement
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { setAddItemDialogOpen(true); setAnchorEl(null); }} disabled={invoice.status !== 'draft'}>
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
            <Card sx={{
              mb: 2,
              borderRadius: 3,
              boxShadow: theme => theme.palette.mode === 'dark'
                ? '6px 6px 16px #14191f, -6px -6px 16px #283041'
                : '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff',
              border: 'none',
              transition: 'all 0.3s ease'
            }}>
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
            <Card sx={{
              mb: 2,
              borderRadius: 3,
              boxShadow: theme => theme.palette.mode === 'dark'
                ? '6px 6px 16px #14191f, -6px -6px 16px #283041'
                : '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff',
              border: '2px dashed',
              borderColor: 'warning.main',
              transition: 'all 0.3s ease'
            }}>
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
          
          {/* Contract Info Mobile */}
          {invoice.contract && (
            <Card sx={{
              mb: 2,
              borderRadius: 3,
              boxShadow: theme => theme.palette.mode === 'dark'
                ? '6px 6px 16px #14191f, -6px -6px 16px #283041'
                : '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff',
              border: 'none',
              transition: 'all 0.3s ease'
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                  {t('invoices:labels.contract', 'Contrat')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <Description fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {invoice.contract_title || t('invoices:labels.contractAssociated', 'Contrat associé')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {invoice.contract_number}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/contracts/${invoice.contract}`)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.875rem' }}
                >
                  {t('invoices:buttons.viewContract', 'Voir le contrat')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Financial Summary Mobile */}
          <Card sx={{ mb: 1.5, borderRadius: 3, border: 'none', boxShadow: theme => theme.palette.mode === 'light' ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff' : '6px 6px 16px #14191f, -6px -6px 16px #283041' }} elevation={0}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack spacing={0.5}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                    {t('invoices:labels.subtotal')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    {formatCurrency(invoice.subtotal || 0)}
                  </Typography>
                </Box>
                {(invoice.discount_amount || 0) > 0 && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="error.main" sx={{ fontSize: '0.72rem' }}>
                      Remise{invoice.discount_type === 'percent' ? ` (${invoice.discount_value}%)` : ''}
                    </Typography>
                    <Typography variant="body2" color="error.main" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      −{formatCurrency(invoice.discount_amount || 0)}
                    </Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                    {t('invoices:labels.taxes')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    {formatCurrency(invoice.tax_amount || 0)}
                  </Typography>
                </Box>
                <Divider />
                <Box display="flex" justifyContent="space-between" alignItems="center" pt={0.25}>
                  <Typography variant="body2" fontWeight={700}>
                    {t('invoices:labels.total')}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} color="primary.main" sx={{ letterSpacing: '-0.02em' }}>
                    {formatCurrency(invoice.total_amount || 0)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Items Table Mobile - Compact */}
          <Card sx={{
            mb: 1.5,
            borderRadius: 3,
            boxShadow: theme => theme.palette.mode === 'light'
              ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff'
              : '6px 6px 16px #14191f, -6px -6px 16px #283041',
            border: 'none'
          }}>
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

          {/* Paiements Mobile */}
          <Card sx={{
            mb: 1.5,
            borderRadius: 3,
            boxShadow: theme => theme.palette.mode === 'light'
              ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff'
              : '6px 6px 16px #14191f, -6px -6px 16px #283041',
            border: 'none'
          }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary' }}>
                  Paiements reçus
                </Typography>
                <IconButton size="small" color="primary" onClick={() => setAddPaymentOpen(true)} sx={{ bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Add fontSize="small" />
                </IconButton>
              </Box>

              {paymentsInfo && (
                <Stack direction="row" spacing={0.75} sx={{ mb: 1.25 }}>
                  <Box sx={{ flex: 1, p: 1, bgcolor: 'primary.50', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.62rem' }}>Total</Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontSize: '0.72rem' }}>
                      {formatCurrency(paymentsInfo.total_amount)}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1, bgcolor: 'success.50', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.62rem' }}>Payé</Typography>
                    <Typography variant="caption" fontWeight={700} color="success.main" sx={{ fontSize: '0.72rem' }}>
                      {formatCurrency(paymentsInfo.total_paid)}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1, bgcolor: paymentsInfo.balance_due <= 0 ? 'success.50' : 'error.50', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.62rem' }}>Solde</Typography>
                    <Typography variant="caption" fontWeight={700} color={paymentsInfo.balance_due <= 0 ? 'success.main' : 'error.main'} sx={{ fontSize: '0.72rem' }}>
                      {formatCurrency(paymentsInfo.balance_due)}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {payments.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 1 }}>
                  Aucun paiement enregistré
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {payments.map((p) => (
                    <Box key={p.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      p: 0.75, bgcolor: 'grey.50', borderRadius: 1
                    }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600, display: 'block' }}>
                          {formatDate(p.payment_date)} · {paymentMethodLabel(p.payment_method)}
                        </Typography>
                        {p.reference_number && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {p.reference_number}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" fontWeight={700} color="success.main" sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {formatCurrency(p.amount)}
                      </Typography>
                      {p.can_delete && (
                        <IconButton size="small" color="error" onClick={() => handleDeletePayment(p.id)} sx={{ p: 0.25 }}>
                          <Delete sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Dates Mobile - Compact */}
          <Card sx={{
            mb: 1.5,
            borderRadius: 3,
            boxShadow: theme => theme.palette.mode === 'light'
              ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff'
              : '6px 6px 16px #14191f, -6px -6px 16px #283041',
            border: 'none'
          }}>
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
        <Grid container spacing={2.5}>
          {/* ── Colonne principale ─────────────────────────────────────── */}
          <Grid item xs={12} md={8}>
            {/* Articles */}
            <NeumorphicPanel sx={{ mb: 2.5, p: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{t('invoices:labels.billedItems')}</Typography>
                  {invoice.title && <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{invoice.title}</Typography>}
                </Box>
                <Button size="small" startIcon={<Add />} onClick={() => setAddItemDialogOpen(true)} disabled={invoice.status !== 'draft'}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                  {t('invoices:buttons.addItem')}
                </Button>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ '& td, & th': { borderColor: theme => alpha(theme.palette.divider, 0.5) } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('invoices:columns.reference')}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('invoices:columns.description')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase' }}>{t('invoices:columns.quantity')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase' }}>{t('invoices:columns.unitPrice')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase' }}>{t('invoices:columns.total')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.items?.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          {item.product ? (
                            <Box component="span" onClick={() => navigate(`/products/${item.product}`)} sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>{item.product_reference || '-'}</Box>
                          ) : (item.product_reference || '-')}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          {item.product ? (
                            <Box component="span" onClick={() => navigate(`/products/${item.product}`)} sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}>{item.description}</Box>
                          ) : item.description}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatCurrency(item.total_price)}</TableCell>
                      </TableRow>
                    ))}
                    {(!invoice.items || invoice.items.length === 0) && (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>{t('invoices:labels.noItemsInInvoice')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ ml: 'auto', maxWidth: 340, p: 2, borderRadius: 3, boxShadow: th => neuShadows.shadowInset(th) }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{t('invoices:labels.subtotal')}</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatCurrency(invoice.subtotal || 0)}</Typography>
                  </Box>
                  {(invoice.discount_amount || 0) > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography sx={{ fontSize: '0.82rem', color: 'error.main' }}>Remise{invoice.discount_type === 'percent' ? ` (${invoice.discount_value}%)` : ''}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'error.main' }}>−{formatCurrency(invoice.discount_amount || 0)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{t('invoices:labels.taxes')}</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatCurrency(invoice.tax_amount || 0)}</Typography>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700 }}>{t('invoices:labels.total')}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: 'primary.main', letterSpacing: '-0.02em' }}>{formatCurrency(invoice.total_amount || 0)}</Typography>
                  </Box>
                </Box>
              </Box>
            </NeumorphicPanel>

            {/* Paiements */}
            <NeumorphicPanel sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Paiements reçus</Typography>
                <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setAddPaymentOpen(true)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Ajouter</Button>
              </Box>
              {paymentsInfo && (
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {[
                    { label: 'Total facture', value: paymentsInfo.total_amount, color: 'primary.main' },
                    { label: 'Déjà payé', value: paymentsInfo.total_paid, color: 'success.main' },
                    { label: 'Solde restant', value: paymentsInfo.balance_due, color: paymentsInfo.balance_due <= 0 ? 'success.main' : 'error.main' },
                  ].map((b) => (
                    <Grid item xs={4} key={b.label}>
                      <Box sx={{ p: 1.5, borderRadius: 2.5, textAlign: 'center', boxShadow: th => neuShadows.shadowInset(th) }}>
                        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block' }}>{b.label}</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: b.color }}>{formatCurrency(b.value)}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
              {payments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3, borderRadius: 2.5, boxShadow: th => neuShadows.shadowInset(th) }}>
                  <Payment sx={{ fontSize: '2rem', color: 'text.disabled', mb: 0.5 }} />
                  <Typography color="text.secondary" variant="body2">Aucun paiement enregistré</Typography>
                </Box>
              ) : (
                <Table size="small" sx={{ '& td, & th': { borderColor: th => alpha(th.palette.divider, 0.5) } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>Méthode</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>Réf.</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>Montant</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(p.payment_date)}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{paymentMethodLabel(p.payment_method)}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{p.reference_number || '—'}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'success.main' }}>{formatCurrency(p.amount)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>
                          <Tooltip title={p.can_delete ? 'Supprimer ce paiement' : 'Suppression impossible après 30 min'}>
                            <span><IconButton size="small" color="error" onClick={() => handleDeletePayment(p.id)} disabled={!p.can_delete}><Delete fontSize="small" /></IconButton></span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </NeumorphicPanel>
          </Grid>

          {/* ── Sidebar ────────────────────────────────────────────────── */}
          <Grid item xs={12} md={4}>
            {invoice.client ? (
              <NeumorphicPanel sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>{t('invoices:labels.client')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 38, height: 38 }}><Business fontSize="small" /></Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{invoice.client.name || t('invoices:labels.clientWithoutName')}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invoice.client.email || t('invoices:labels.noEmail')}</Typography>
                  </Box>
                </Box>
                <Button fullWidth variant="outlined" size="small" onClick={() => navigate(`/clients/${invoice.client.id}`)} startIcon={<Business />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>{t('invoices:buttons.viewClient')}</Button>
              </NeumorphicPanel>
            ) : (
              <NeumorphicPanel accent="#f59e0b" sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Warning color="warning" />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'warning.main' }}>{t('invoices:labels.noClientLinked')}</Typography>
                </Box>
                <Button fullWidth variant="outlined" color="warning" size="small" onClick={handleEdit} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>{t('invoices:buttons.linkClient')}</Button>
              </NeumorphicPanel>
            )}

            {invoice.contract && (
              <NeumorphicPanel sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>{t('invoices:labels.contract', 'Contrat')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 38, height: 38 }}><Description fontSize="small" /></Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>{invoice.contract_title || t('invoices:labels.contractAssociated', 'Contrat associé')}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{invoice.contract_number || '-'}</Typography>
                  </Box>
                </Box>
                <Button fullWidth variant="outlined" size="small" onClick={() => navigate(`/contracts/${invoice.contract}`)} startIcon={<Description />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>{t('invoices:buttons.viewContract', 'Voir le contrat')}</Button>
              </NeumorphicPanel>
            )}

            <NeumorphicPanel sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>{t('invoices:labels.importantDates')}</Typography>
              <Stack spacing={1.25}>
                {[
                  { icon: <CalendarToday sx={{ fontSize: 17 }} color="action" />, label: t('invoices:labels.creationDateLabel'), value: formatDate(invoice.created_at) },
                  { icon: <Send sx={{ fontSize: 17 }} color="info" />, label: t('invoices:labels.issueDateLabel'), value: formatDate(invoice.issue_date) },
                  ...(invoice.due_date ? [{ icon: <Schedule sx={{ fontSize: 17 }} color={isOverdue() ? 'error' : 'warning'} />, label: t('invoices:labels.dueDateLabel'), value: formatDate(invoice.due_date), warn: isOverdue() }] : []),
                  ...(invoice.payment_date ? [{ icon: <Payment sx={{ fontSize: 17 }} color="success" />, label: t('invoices:labels.paymentDateLabel'), value: formatDate(invoice.payment_date) }] : []),
                ].map((d, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    {d.icon}
                    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{d.label}</Typography>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: d.warn ? 'error.main' : 'text.primary' }}>{d.value}</Typography>
                    </Box>
                  </Box>
                ))}
                {isOverdue() && (
                  <Typography sx={{ fontSize: '0.72rem', color: 'error.main', textAlign: 'right' }}>{t('invoices:messages.overdueMessage', { days: getDaysOverdue() })}</Typography>
                )}
              </Stack>
            </NeumorphicPanel>

            {invoice.created_by && (
              <NeumorphicPanel>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>{t('invoices:labels.createdBy')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}><Person fontSize="small" /></Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>{invoice.created_by.first_name} {invoice.created_by.last_name}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invoice.created_by.email}</Typography>
                  </Box>
                </Box>
              </NeumorphicPanel>
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

      {/* Add Payment Dialog */}
      <Dialog open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Payment sx={{ color: 'success.main' }} />
          Enregistrer un paiement
        </DialogTitle>
        <DialogContent>
          {paymentsInfo && paymentsInfo.balance_due > 0 && (
            <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
              Solde restant à payer : <strong>{formatCurrency(paymentsInfo.balance_due)}</strong>
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Montant"
                type="number"
                required
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                inputProps={{ min: 0.01, step: 0.01 }}
                helperText={paymentsInfo ? `Max : ${formatCurrency(paymentsInfo.balance_due)}` : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date du paiement"
                type="date"
                required
                value={newPayment.payment_date}
                onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Méthode de paiement</InputLabel>
                <Select
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                  label="Méthode de paiement"
                >
                  <MenuItem value="cash">Espèces</MenuItem>
                  <MenuItem value="check">Chèque</MenuItem>
                  <MenuItem value="bank_transfer">Virement bancaire</MenuItem>
                  <MenuItem value="credit_card">Carte de crédit</MenuItem>
                  <MenuItem value="interac">Interac</MenuItem>
                  <MenuItem value="other">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Numéro de référence"
                value={newPayment.reference_number}
                onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                placeholder="N° chèque, confirmation virement..."
                helperText="Optionnel"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                placeholder="Notes internes..."
                helperText="Optionnel"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddPaymentOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Annuler
          </Button>
          <Button
            onClick={handleAddPayment}
            variant="contained"
            color="success"
            disabled={savingPayment || !newPayment.amount || parseFloat(newPayment.amount) <= 0}
            startIcon={savingPayment ? <CircularProgress size={18} /> : <CheckCircle />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {savingPayment ? 'Enregistrement...' : 'Enregistrer le paiement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Generation Dialog */}
      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('invoices:dialogs.generatePdf')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
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