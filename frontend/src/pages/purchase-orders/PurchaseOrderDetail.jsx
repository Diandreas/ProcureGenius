import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { purchaseOrdersAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, formatDate, formatCurrency } from '../../utils/formatters';
import { generatePurchaseOrderPDF, downloadPDF, openPDFInNewTab, TEMPLATE_TYPES } from '../../services/pdfService';

function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['purchaseOrders', 'common']);

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_TYPES.CLASSIC);
  const [generatingPdf, setGeneratingPdf] = useState(false);
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
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!purchaseOrder) {
    return (
      <Alert severity="error">
        {t('purchaseOrders:messages.poNotFound')}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/purchase-orders')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {purchaseOrder.po_number}
          </Typography>
          <Chip
            icon={getStatusIcon(purchaseOrder.status)}
            label={getStatusLabel(purchaseOrder.status)}
            color={getStatusColor(purchaseOrder.status)}
            size="large"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdf />}
            onClick={() => setPdfDialogOpen(true)}
          >
            {t('purchaseOrders:buttons.generatePDF')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
          >
            {t('purchaseOrders:buttons.edit')}
          </Button>
          {purchaseOrder.status === 'draft' && (
            <Button
              variant="contained"
              startIcon={<Done />}
              onClick={() => setApproveDialogOpen(true)}
              color="success"
            >
              {t('purchaseOrders:buttons.approve')}
            </Button>
          )}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
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

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Order Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('purchaseOrders:labels.generalInformation')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    {purchaseOrder.title}
                  </Typography>
                </Grid>
                {purchaseOrder.description && (
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('purchaseOrders:labels.description')}
                      </Typography>
                      <Typography>{purchaseOrder.description}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('purchaseOrders:labels.orderedItems')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setAddItemDialogOpen(true)}
                  disabled={purchaseOrder.status !== 'draft'}
                >
                  {t('purchaseOrders:buttons.addItem')}
                </Button>
              </Box>
              <TableContainer component={Paper}>
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
                        <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
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
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('purchaseOrders:labels.financialSummary')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="primary">
                      {formatCurrency(purchaseOrder.subtotal || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('purchaseOrders:labels.subtotal')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="warning.main">
                      {formatCurrency(purchaseOrder.tax_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('purchaseOrders:labels.taxes')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(purchaseOrder.total_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('purchaseOrders:labels.total')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Supplier Info */}
          {purchaseOrder.supplier && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('purchaseOrders:labels.supplier')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Business />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
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
                  onClick={() => navigate(`/suppliers/${purchaseOrder.supplier.id}`)}
                >
                  {t('purchaseOrders:buttons.viewSupplier')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
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
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('purchaseOrders:labels.createdBy')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
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