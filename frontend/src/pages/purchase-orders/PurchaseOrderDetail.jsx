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
import { purchaseOrdersAPI } from '../../services/api';
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
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate('/purchase-orders')} size={isMobile ? 'small' : 'medium'}>
            <ArrowBack />
          </IconButton>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ flex: 1, minWidth: 'fit-content' }}>
            {purchaseOrder.po_number}
          </Typography>
          <Chip
            icon={getStatusIcon(purchaseOrder.status)}
            label={getStatusLabel(purchaseOrder.status)}
            color={getStatusColor(purchaseOrder.status)}
            size={isMobile ? 'small' : 'medium'}
          />
          {!isMobile && (
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
              <Tooltip title={t('purchaseOrders:tooltips.sendEmail') || 'Envoyer par email'}>
                <Button
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={() => {
                    setEmailData({
                      recipient_email: purchaseOrder.supplier?.email || '',
                      custom_message: `Bonjour ${purchaseOrder.supplier?.name || 'Fournisseur'},

Veuillez trouver ci-joint votre bon de commande ${purchaseOrder.po_number}.

Le PDF de votre bon de commande est joint à cet email.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement`
                    });
                    setSendEmailDialogOpen(true);
                  }}
                  disabled={!purchaseOrder.supplier?.email}
                >
                  {t('purchaseOrders:buttons.sendEmail') || 'Envoyer par email'}
                </Button>
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
                <MenuItem 
                  onClick={() => {
                    setEmailData({
                      recipient_email: purchaseOrder.supplier?.email || '',
                      custom_message: `Bonjour ${purchaseOrder.supplier?.name || 'Fournisseur'},

Veuillez trouver ci-joint votre bon de commande ${purchaseOrder.po_number}.

Le PDF de votre bon de commande est joint à cet email.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement`
                    });
                    setSendEmailDialogOpen(true);
                  }}
                  disabled={!purchaseOrder.supplier?.email}
                >
                  <Email fontSize="small" sx={{ mr: 1 }} />
                  {t('purchaseOrders:buttons.sendEmail') || 'Envoyer par email'}
                </MenuItem>
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
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" gutterBottom>
                  {purchaseOrder.title}
                </Typography>
                {purchaseOrder.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                      {t('purchaseOrders:labels.description')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
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
              <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
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
            <Card sx={{ borderRadius: 1, mb: isMobile ? 2 : 3 }}>
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
              <Card sx={{ borderRadius: 1 }}>
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
          <Card sx={{ borderRadius: 1 }}>
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
          <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <AttachMoney color="primary" />
                {t('purchaseOrders:labels.financialSummary')}
              </Typography>
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'primary.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <AttachMoney sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="primary.main" fontWeight="bold">
                        {formatCurrency(purchaseOrder.subtotal || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('purchaseOrders:labels.subtotal')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'warning.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <Receipt sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="warning.main" fontWeight="bold">
                        {formatCurrency(purchaseOrder.tax_amount || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('purchaseOrders:labels.taxes')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderRadius: 1, bgcolor: 'success.50' }}>
                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 3 }}>
                      <AttachMoney sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                      <Typography variant={isMobile ? 'h5' : 'h4'} color="success.main" fontWeight="bold">
                        {formatCurrency(purchaseOrder.total_amount || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('purchaseOrders:labels.total')}
                      </Typography>
                    </CardContent>
                  </Card>
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
    </Box>
  );
}

export default PurchaseOrderDetail;