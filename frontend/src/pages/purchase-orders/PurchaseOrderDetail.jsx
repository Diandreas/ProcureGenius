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
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  PictureAsPdf,
  Info,
  Inventory,
  LocalShipping,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/config';
import { purchaseOrdersAPI } from '../../services/api';
import { settingsAPI } from '../../services/settingsAPI';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import { generatePurchaseOrderPDF, downloadPDF, openPDFInNewTab, TEMPLATE_TYPES } from '../../services/pdfService';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['purchaseOrders', 'common']);
  const { format: formatCurrency } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_TYPES.CLASSIC);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [settings, setSettings] = useState(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    custom_message: ''
  });
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    product_reference: ''
  });

  useEffect(() => {
    fetchPurchaseOrder();
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

  const fetchPurchaseOrder = async () => {
    setLoading(true);
    try {
      const response = await purchaseOrdersAPI.get(id);
      setPurchaseOrder(response.data);
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.loadingError'), { variant: 'error' });
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/purchase-orders/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(t('purchaseOrders:messages.confirmDelete'))) {
      try {
        await purchaseOrdersAPI.delete(id);
        enqueueSnackbar(t('purchaseOrders:messages.poDeletedSuccess'), { variant: 'success' });
        navigate('/purchase-orders');
      } catch (error) {
        enqueueSnackbar(t('purchaseOrders:messages.deleteError'), { variant: 'error' });
      }
    }
  };

  const handleApprove = async () => {
    try {
      const response = await purchaseOrdersAPI.approve(id);
      setPurchaseOrder(response.data);
      enqueueSnackbar(t('purchaseOrders:messages.poApprovedSuccess'), { variant: 'success' });
      setApproveDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.approvalError'), { variant: 'error' });
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await purchaseOrdersAPI.addItem(id, newItem);
      await fetchPurchaseOrder(); // Reload to get updated totals
      enqueueSnackbar(t('purchaseOrders:messages.itemAddedSuccess'), { variant: 'success' });
      setAddItemDialogOpen(false);
      setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '' });
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.itemAddError'), { variant: 'error' });
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.recipient_email) {
      enqueueSnackbar(t('purchaseOrders:messages.emailRequired') || 'Email destinataire requis', { variant: 'error' });
      return;
    }

    setSendingEmail(true);
    try {
      // Récupérer la langue actuelle depuis i18n
      const currentLanguage = i18n.language || 'fr';
      const language = currentLanguage.split('-')[0]; // 'en-US' -> 'en'
      
      const response = await purchaseOrdersAPI.sendEmail(id, {
        recipient_email: emailData.recipient_email,
        custom_message: emailData.custom_message || undefined,
        template: selectedTemplate,
        language: language
      });
      setPurchaseOrder(response.data.purchase_order || response.data);
      enqueueSnackbar(response.data.message || t('purchaseOrders:messages.emailSent') || 'Email envoyé avec succès', { variant: 'success' });
      setSendEmailDialogOpen(false);
      setEmailData({ recipient_email: '', custom_message: '' });
      await fetchPurchaseOrder(); // Refresh to show updated sent_at date
    } catch (error) {
      console.error('Error sending email:', error);
      enqueueSnackbar(
        error.response?.data?.error || t('purchaseOrders:messages.emailError') || 'Erreur lors de l\'envoi de l\'email',
        { variant: 'error' }
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const handleGeneratePDF = async (action = 'download') => {
    setGeneratingPdf(true);
    try {
      const pdfBlob = await generatePurchaseOrderPDF(purchaseOrder, selectedTemplate);

      if (action === 'download') {
        downloadPDF(pdfBlob, `bon-commande-${purchaseOrder.po_number}.pdf`);
        enqueueSnackbar(t('purchaseOrders:messages.pdfDownloadedSuccess'), { variant: 'success' });
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
          enqueueSnackbar(t('purchaseOrders:messages.printWindowOpened'), { variant: 'success' });
        } else {
          enqueueSnackbar(t('purchaseOrders:messages.printWindowError'), { variant: 'error' });
        }
      }

      setPdfDialogOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      enqueueSnackbar(t('purchaseOrders:messages.pdfGenerationError'), { variant: 'error' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: <Edit color="action" />,
      pending: <Schedule color="warning" />,
      approved: <CheckCircle color="success" />,
      sent: <Send color="info" />,
      received: <CheckCircle color="success" />,
      cancelled: <Block color="error" />,
    };
    return icons[status] || null;
  };

  if (loading) {
    return <LoadingState message={t('purchaseOrders:messages.loading', 'Chargement du bon de commande...')} />;
  }

  if (!purchaseOrder) {
    return (
      <ErrorState
        title={t('purchaseOrders:messages.poNotFound', 'Bon de commande non trouvé')}
        message={t('purchaseOrders:messages.poNotFoundDescription', 'Le bon de commande que vous recherchez n\'existe pas ou a été supprimé.')}
        showHome={false}
        onRetry={() => navigate('/purchase-orders')}
      />
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate('/purchase-orders')} size="medium">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold" sx={{ flex: 1, minWidth: 'fit-content' }}>
            {purchaseOrder.po_number}
          </Typography>
          <Chip
            icon={getStatusIcon(purchaseOrder.status)}
            label={getStatusLabel(purchaseOrder.status)}
            color={getStatusColor(purchaseOrder.status)}
            size="medium"
          />
          {(
            <>
              <Tooltip title={t('purchaseOrders:tooltips.generatePDF')}>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={() => setPdfDialogOpen(true)}
                >
                  {t('purchaseOrders:buttons.generatePDF')}
                </Button>
              </Tooltip>
              <Tooltip
                title={
                  !purchaseOrder.supplier?.email
                    ? t('purchaseOrders:tooltips.noSupplierEmail', 'Le fournisseur n\'a pas d\'adresse email')
                    : t('purchaseOrders:tooltips.sendEmail')
                }
                arrow
              >
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<Email />}
                    onClick={() => {
                      const currentLanguage = i18n.language || 'fr';
                      const lang = currentLanguage.split('-')[0];
                      const defaultMessage = t('purchaseOrders:dialogs.sendEmail.defaultMessage', {
                        name: purchaseOrder.supplier?.name || (lang === 'en' ? 'Supplier' : 'Fournisseur'),
                        number: purchaseOrder.po_number
                      });
                      setEmailData({
                        recipient_email: purchaseOrder.supplier?.email || '',
                        custom_message: defaultMessage
                      });
                      setSendEmailDialogOpen(true);
                    }}
                    disabled={!purchaseOrder.supplier?.email}
                  >
                    {t('purchaseOrders:buttons.sendEmail')}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={t('purchaseOrders:tooltips.editPO')}>
                <IconButton
                  onClick={handleEdit}
                  sx={{
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'white',
                    }
                  }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
              {purchaseOrder.status === 'draft' && (
                <Tooltip title={t('purchaseOrders:tooltips.approvePO')}>
                  <Button
                    variant="contained"
                    startIcon={<Done />}
                    onClick={() => setApproveDialogOpen(true)}
                    color="success"
                  >
                    {t('purchaseOrders:buttons.approve')}
                  </Button>
                </Tooltip>
              )}
            </>
          )}
          <Tooltip title={t('common:buttons.moreActions')}>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            {isMobile && (
              <>
                <MenuItem onClick={() => setPdfDialogOpen(true)}>
                  <PictureAsPdf fontSize="small" sx={{ mr: 1 }} />
                  {t('purchaseOrders:buttons.generatePDF')}
                </MenuItem>
                <Tooltip
                  title={
                    !purchaseOrder.supplier?.email
                      ? t('purchaseOrders:tooltips.noSupplierEmail', 'Le fournisseur n\'a pas d\'adresse email')
                      : ''
                  }
                  arrow
                  placement="left"
                >
                  <span>
                    <MenuItem
                      onClick={() => {
                        const defaultMessage = t('purchaseOrders:dialogs.sendEmail.defaultMessage', {
                          name: purchaseOrder.supplier?.name || 'Fournisseur',
                          number: purchaseOrder.po_number
                        });
                        setEmailData({
                          recipient_email: purchaseOrder.supplier?.email || '',
                          custom_message: defaultMessage
                        });
                        setSendEmailDialogOpen(true);
                      }}
                      disabled={!purchaseOrder.supplier?.email}
                    >
                      <Email fontSize="small" sx={{ mr: 1 }} />
                      {t('purchaseOrders:buttons.sendEmail')}
                    </MenuItem>
                  </span>
                </Tooltip>
                <MenuItem onClick={handleEdit}>
                  <Edit fontSize="small" sx={{ mr: 1 }} />
                  {t('purchaseOrders:buttons.edit')}
                </MenuItem>
                {purchaseOrder.status === 'draft' && (
                  <MenuItem onClick={() => setApproveDialogOpen(true)} sx={{ color: 'success.main' }}>
                    <Done fontSize="small" sx={{ mr: 1 }} />
                    {t('purchaseOrders:buttons.approve')}
                  </MenuItem>
                )}
                <Divider />
              </>
            )}
            <MenuItem onClick={() => setAddItemDialogOpen(true)}>
              <Add fontSize="small" sx={{ mr: 1 }} />
              {t('purchaseOrders:buttons.addItem')}
            </MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              {t('purchaseOrders:buttons.delete')}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Actions Mobile - Affiché uniquement sur mobile */}
      <Box sx={{ mb: 2, display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
        <Chip
          icon={getStatusIcon(purchaseOrder.status)}
          label={getStatusLabel(purchaseOrder.status)}
          color={getStatusColor(purchaseOrder.status)}
          size="small"
        />
        <Tooltip title={t('purchaseOrders:tooltips.generatePDF')}>
          <IconButton
            onClick={() => setPdfDialogOpen(true)}
            size="small"
            sx={{ color: 'success.main' }}
          >
            <PictureAsPdf />
          </IconButton>
        </Tooltip>
        <Tooltip
          title={
            !purchaseOrder.supplier?.email
              ? t('purchaseOrders:tooltips.noSupplierEmail', 'Le fournisseur n\'a pas d\'adresse email')
              : t('purchaseOrders:tooltips.sendEmail')
          }
        >
          <span>
            <IconButton
              onClick={() => {
                const currentLanguage = i18n.language || 'fr';
                const lang = currentLanguage.split('-')[0];
                const defaultMessage = t('purchaseOrders:dialogs.sendEmail.defaultMessage', {
                  name: purchaseOrder.supplier?.name || (lang === 'en' ? 'Supplier' : 'Fournisseur'),
                  number: purchaseOrder.po_number
                });
                setEmailData({
                  recipient_email: purchaseOrder.supplier?.email || '',
                  custom_message: defaultMessage
                });
                setSendEmailDialogOpen(true);
              }}
              disabled={!purchaseOrder.supplier?.email}
              size="small"
              sx={{ color: 'info.main' }}
            >
              <Email />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('purchaseOrders:tooltips.editPO')}>
          <IconButton
            onClick={handleEdit}
            size="small"
            sx={{ color: 'primary.main' }}
          >
            <Edit />
          </IconButton>
        </Tooltip>
        {purchaseOrder.status === 'draft' && (
          <Tooltip title={t('purchaseOrders:tooltips.approvePO')}>
            <IconButton
              onClick={() => setApproveDialogOpen(true)}
              size="small"
              sx={{ color: 'success.main' }}
            >
              <Done />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t('common:buttons.moreActions')}>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <MoreVert />
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
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            minWidth: isMobile ? 'auto' : 120,
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            px: isMobile ? 1 : 2,
          }
        }}
      >
        <Tab
          icon={<Info sx={{ fontSize: isMobile ? 18 : 20 }} />}
          label={t('purchaseOrders:tabs.general')}
          iconPosition="start"
        />
        <Tab
          icon={<Inventory sx={{ fontSize: isMobile ? 18 : 20 }} />}
          label={t('purchaseOrders:tabs.items')}
          iconPosition="start"
        />
        <Tab
          icon={<AttachMoney sx={{ fontSize: isMobile ? 18 : 20 }} />}
          label={t('purchaseOrders:tabs.financial')}
          iconPosition="start"
        />
      </Tabs>

      {/* Tab: General Information */}
      {activeTab === 0 && (
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Order Info Card */}
            <Card sx={{
              borderRadius: 3,
              mb: isMobile ? 2 : 3,
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
            }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant={isMobile ? 'h6' : 'h5'} sx={{
                  fontWeight: 700,
                  mb: 2,
                  background: theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {purchaseOrder.title}
                </Typography>
                {purchaseOrder.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ color: 'text.primary' }}>
                      {t('purchaseOrders:labels.description')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {purchaseOrder.description}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Supplier Info */}
            {purchaseOrder.supplier && (
              <Card sx={{ borderRadius: 2, mb: isMobile ? 2 : 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Business sx={{ color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight="600">
                      {t('purchaseOrders:labels.supplier')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                      <Business />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {purchaseOrder.supplier.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {purchaseOrder.supplier.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/suppliers/${purchaseOrder.supplier.id}`)}
                  >
                    {t('purchaseOrders:buttons.viewSupplier')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card sx={{ borderRadius: 2, mb: isMobile ? 2 : 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t('purchaseOrders:labels.importantDates')}
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarToday color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('purchaseOrders:labels.creationDate')}
                      secondary={formatDate(purchaseOrder.created_at)}
                    />
                  </ListItem>
                  {purchaseOrder.required_date && (
                    <ListItem>
                      <ListItemIcon>
                        <Schedule color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('purchaseOrders:labels.requiredDate')}
                        secondary={formatDate(purchaseOrder.required_date)}
                      />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemIcon>
                      <Edit color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('purchaseOrders:labels.lastUpdate')}
                      secondary={formatDate(purchaseOrder.updated_at)}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Created By */}
            {purchaseOrder.created_by && (
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    {t('purchaseOrders:labels.createdBy')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 48, height: 48 }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {purchaseOrder.created_by.first_name} {purchaseOrder.created_by.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {purchaseOrder.created_by.email}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Tab: Items */}
      {activeTab === 1 && (
        <Box>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory color="primary" />
                  {t('purchaseOrders:labels.orderedItems')}
                </Typography>
                {!isMobile && (
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setAddItemDialogOpen(true)}
                    disabled={purchaseOrder.status !== 'draft'}
                  >
                    {t('purchaseOrders:buttons.addItem')}
                  </Button>
                )}
              </Box>
              {isMobile ? (
                // Mobile Card View
                <Box>
                  {purchaseOrder.items?.map((item, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                          {item.description}
                        </Typography>
                        {item.product_reference && (
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            {t('purchaseOrders:columns.reference')}: {item.product_reference}
                          </Typography>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              {t('purchaseOrders:columns.quantity')}
                            </Typography>
                            <Typography variant="body2" fontWeight="500">
                              {item.quantity}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              {t('purchaseOrders:columns.unitPrice')}
                            </Typography>
                            <Typography variant="body2" fontWeight="500">
                              {formatCurrency(item.unit_price)}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              {t('purchaseOrders:columns.total')}
                            </Typography>
                            <Typography variant="body2" fontWeight="600" color="primary.main">
                              {formatCurrency(item.total_price)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                  {(!purchaseOrder.items || purchaseOrder.items.length === 0) && (
                    <Alert severity="info">
                      {t('purchaseOrders:labels.noItemsInPO')}
                    </Alert>
                  )}
                  {isMobile && purchaseOrder.status === 'draft' && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => setAddItemDialogOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      {t('purchaseOrders:buttons.addItem')}
                    </Button>
                  )}
                </Box>
              ) : (
                // Desktop Table View
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('purchaseOrders:columns.reference')}</TableCell>
                        <TableCell>{t('purchaseOrders:columns.description')}</TableCell>
                        <TableCell align="right">{t('purchaseOrders:columns.quantity')}</TableCell>
                        <TableCell align="right">{t('purchaseOrders:columns.unitPrice')}</TableCell>
                        <TableCell align="right">{t('purchaseOrders:columns.total')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchaseOrder.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_reference || '-'}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                      {(!purchaseOrder.items || purchaseOrder.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">
                              {t('purchaseOrders:labels.noItemsInPO')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab: Financial Summary */}
      {activeTab === 2 && (
        <Box>
          <Card sx={{
            borderRadius: 3,
            boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
            background: theme => `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            border: '1px solid',
            borderColor: theme => alpha(theme.palette.divider, 0.1),
            backdropFilter: 'blur(20px)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.success.main})`,
              borderRadius: '3px 3px 0 0'
            }
          }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="h6" gutterBottom sx={{
                fontWeight: 700,
                mb: isMobile ? 2 : 3,
                background: theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {t('purchaseOrders:labels.financialSummary')}
              </Typography>
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    textAlign: 'center',
                    p: isMobile ? 2 : 3,
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.primary.main, 0.2),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => `0 12px 28px ${alpha(theme.palette.primary.main, 0.3)}`,
                      background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`
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
                    <AttachMoney sx={{
                      fontSize: isMobile ? 32 : 40,
                      color: 'primary.main',
                      mb: isMobile ? 1 : 1.5,
                      opacity: 0.9
                    }} />
                    <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                      fontWeight: 700,
                      mb: 1,
                      background: theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {formatCurrency(purchaseOrder.subtotal || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {t('purchaseOrders:labels.subtotal')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    textAlign: 'center',
                    p: isMobile ? 2 : 3,
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.warning.main, 0.2),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => `0 12px 28px ${alpha(theme.palette.warning.main, 0.3)}`,
                      background: theme => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`
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
                    <Receipt sx={{
                      fontSize: isMobile ? 32 : 40,
                      color: 'warning.main',
                      mb: isMobile ? 1 : 1.5,
                      opacity: 0.9
                    }} />
                    <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                      fontWeight: 700,
                      mb: 1,
                      background: theme => `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {formatCurrency(purchaseOrder.tax_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {t('purchaseOrders:labels.taxes')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    textAlign: 'center',
                    p: isMobile ? 2 : 3,
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.success.main, 0.2),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => `0 12px 28px ${alpha(theme.palette.success.main, 0.3)}`,
                      background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`
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
                    <Payment sx={{
                      fontSize: isMobile ? 32 : 40,
                      color: 'success.main',
                      mb: isMobile ? 1 : 1.5,
                      opacity: 0.9
                    }} />
                    <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                      fontWeight: 700,
                      mb: 1,
                      background: theme => `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {formatCurrency(purchaseOrder.total_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {t('purchaseOrders:labels.total')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <DialogTitle>{t('purchaseOrders:dialogs.approvePO')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('purchaseOrders:messages.confirmApprove')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>{t('purchaseOrders:buttons.cancel')}</Button>
          <Button onClick={handleApprove} color="success" variant="contained">
            {t('purchaseOrders:buttons.approve')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('purchaseOrders:dialogs.addItem')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('purchaseOrders:fields.productReference')}
                value={newItem.product_reference}
                onChange={(e) => setNewItem({ ...newItem, product_reference: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('purchaseOrders:fields.itemDescription')}
                required
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={t('purchaseOrders:fields.itemQuantity')}
                type="number"
                required
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={t('purchaseOrders:fields.itemUnitPrice')}
                type="number"
                required
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>{t('purchaseOrders:buttons.cancel')}</Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.description || newItem.quantity <= 0}
          >
            {t('purchaseOrders:buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Generation Dialog */}
      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('purchaseOrders:dialogs.generatePDF')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {settings?.paperSize === 'thermal_80' || settings?.paperSize === 'thermal_58' ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  {t('purchaseOrders:messages.thermalPrintingMode', 'Format d\'impression thermique détecté. Le template de ticket thermal sera utilisé automatiquement.')}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {settings.paperSize === 'thermal_80' ? 'Format: 80mm' : 'Format: 58mm'}
                </Typography>
              </Alert>
            ) : (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>{t('purchaseOrders:labels.poTemplate')}</InputLabel>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  label={t('purchaseOrders:labels.poTemplate')}
                >
                  <MenuItem value={TEMPLATE_TYPES.CLASSIC}>{t('purchaseOrders:templates.classic')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.MODERN}>{t('purchaseOrders:templates.modern')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.MINIMAL}>{t('purchaseOrders:templates.minimal')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.PROFESSIONAL}>{t('purchaseOrders:templates.professional')}</MenuItem>
                </Select>
              </FormControl>
            )}
            <Typography variant="body2" color="text.secondary">
              {t('purchaseOrders:messages.pdfStyleInfo')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfDialogOpen(false)}>
            {t('purchaseOrders:buttons.cancel')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('preview')}
            variant="outlined"
            disabled={generatingPdf}
            startIcon={<PictureAsPdf />}
          >
            {t('purchaseOrders:buttons.preview')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('print')}
            variant="outlined"
            disabled={generatingPdf}
            startIcon={<Print />}
          >
            {t('purchaseOrders:buttons.print')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('download')}
            variant="contained"
            disabled={generatingPdf}
            startIcon={generatingPdf ? <CircularProgress size={20} /> : <Download />}
          >
            {generatingPdf ? t('purchaseOrders:labels.generating') : t('purchaseOrders:buttons.download')}
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
          {t('purchaseOrders:dialogs.sendEmail.title')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('purchaseOrders:dialogs.sendEmail.recipient')}
                  type="email"
                  value={emailData.recipient_email}
                  onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                  required
                  helperText={t('purchaseOrders:dialogs.sendEmail.recipientHelp')}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('purchaseOrders:labels.poTemplate')}</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label={t('purchaseOrders:labels.poTemplate')}
                  >
                    <MenuItem value={TEMPLATE_TYPES.CLASSIC}>{t('purchaseOrders:templates.classic')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.MODERN}>{t('purchaseOrders:templates.modern')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.MINIMAL}>{t('purchaseOrders:templates.minimal')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.PROFESSIONAL}>{t('purchaseOrders:templates.professional')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('purchaseOrders:dialogs.sendEmail.message')}
                  multiline
                  rows={8}
                  value={emailData.custom_message}
                  onChange={(e) => setEmailData({ ...emailData, custom_message: e.target.value })}
                  helperText={t('purchaseOrders:dialogs.sendEmail.messageHelp')}
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
            {t('purchaseOrders:buttons.cancel')}
          </Button>
          <Button
            onClick={handleSendEmail}
            color="primary"
            variant="contained"
            disabled={!emailData.recipient_email || sendingEmail}
            startIcon={sendingEmail ? <CircularProgress size={20} /> : <Send />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {sendingEmail ? t('purchaseOrders:labels.sending') : t('purchaseOrders:dialogs.sendEmail.send')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PurchaseOrderDetail;