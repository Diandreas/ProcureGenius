import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Autocomplete,
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
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add,
  Edit,
  Delete,
  Search,
  Business,
  AttachMoney,
  Receipt,
  Send,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { invoicesAPI, clientsAPI, productsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import QuickCreateDialog from '../../components/common/QuickCreateDialog';
import { clientFields, getProductFields } from '../../config/quickCreateFields';
import ProductSelectionDialog from '../../components/invoices/ProductSelectionDialog';

const UNIT_LABELS = {
  'piece': 'Pièce',
  'box': 'Boîte',
  'kg': 'Kilogramme',
  'l': 'Litre',
  'm': 'Mètre',
  'tablet': 'Comprimé',
  'capsule': 'Gélule',
  'blister': 'Plaquette',
  'vial': 'Flacon',
  'ampoule': 'Ampoule',
  'sachet': 'Sachet',
  'tube': 'Tube',
  'kit': 'Kit',
  'pack': 'Paquet',
  'roll': 'Rouleau',
  'set': 'Ensemble',
  'dozen': 'Douzaine',
  'g': 'Gramme',
  'mg': 'Milligramme',
  'ml': 'Millilitre',
  'cm': 'Centimètre'
};

function InvoiceForm() {
  const { t } = useTranslation(['invoices', 'common']);
  const { format: formatCurrency } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isEdit = Boolean(id);
  const clientIdFromUrl = searchParams.get('clientId');

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client: null,
    tax_rate: 20,
    status: 'paid', // Default to paid
    payment_method: 'cash' // Default to cash
  });

  const PAYMENT_METHODS = [
    { value: 'cash', label: 'Espèces' },
    { value: 'mobile_money', label: 'Mobile Money' }
  ];

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    product_reference: '',
    product: null,
    unit_of_measure: 'piece'
  });

  // Quick Create states
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      fetchInvoice();
    }
  }, [id, isEdit]);

  // Pre-select client from URL
  useEffect(() => {
    if (clientIdFromUrl && clients.length > 0 && !formData.client && !isEdit) {
      const client = clients.find(c => c.id === clientIdFromUrl);
      if (client) {
        setFormData(prev => ({ ...prev, client }));
        enqueueSnackbar(t('invoices:messages.clientPreselected', { name: client.name }), { variant: 'info' });
      }
    }
  }, [clientIdFromUrl, clients, formData.client, isEdit]);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.list();
      setClients(response.data.results || []);
    } catch (error) {
      enqueueSnackbar(t('invoices:messages.loadClientsError'), { variant: 'error' });
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.list({ page_size: 1000 });
      setProducts(response.data.results || []);
    } catch (error) {
      enqueueSnackbar(t('invoices:messages.loadProductsError'), { variant: 'error' });
    }
  };

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await invoicesAPI.get(id);
      const invoice = response.data;
      setFormData({
        title: invoice.title || '',
        description: invoice.description || '',
        client: invoice.client,
        issue_date: invoice.issue_date ? invoice.issue_date.split('T')[0] : new Date().toISOString().split('T')[0],
        // due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
        tax_rate: invoice.tax_rate || 20,
        status: invoice.status || 'paid',
        payment_method: invoice.payment_method || 'cash'
      });
      setItems(invoice.items || []);
    } catch (error) {
      enqueueSnackbar(t('invoices:messages.loadInvoiceFormError'), { variant: 'error' });
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    return isNaN(subtotal) ? 0 : subtotal;
  };

  const calculateTaxAmount = () => {
    const taxRate = formData.tax_rate || 0;
    const subtotal = calculateSubtotal();
    const taxAmount = (subtotal * taxRate) / 100;
    return isNaN(taxAmount) ? 0 : taxAmount;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxAmount();
    const total = subtotal + taxAmount;
    return isNaN(total) ? 0 : total;
  };

  // Quick Create handlers
  const handleClientCreated = (result) => {
    enqueueSnackbar(result.message || t('common:messages.clientCreatedSuccess'), { variant: 'success' });
    // Ajouter le nouveau client à la liste
    setClients(prev => [...prev, result.data]);
    // Sélectionner automatiquement le nouveau client
    setFormData(prev => ({ ...prev, client: result.data }));
    fetchClients(); // Rafraîchir la liste complète
  };

  const handleProductCreated = (result) => {
    enqueueSnackbar(result.message || t('common:messages.productCreatedSuccess'), { variant: 'success' });
    // Ajouter le nouveau produit à la liste
    setProducts(prev => [...prev, result.data]);
    // Pré-remplir le formulaire d'item avec ce produit
    setNewItem(prev => ({
      ...prev,
      product: result.data,
      product_reference: result.data.reference || '',
      description: result.data.name,
      unit_price: parseFloat(result.data.price) || 0
    }));
    fetchProducts(); // Rafraîchir la liste complète
  };

  const handleAddItem = () => {
    if (!newItem.description || newItem.quantity <= 0 || newItem.unit_price < 0) {
      enqueueSnackbar(t('invoices:messages.fillAllRequiredFields'), { variant: 'error' });
      return;
    }

    const item = {
      ...newItem,
      total_price: newItem.quantity * newItem.unit_price,
    };

    if (editingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = item;
      setItems(updatedItems);
      setEditingItemIndex(-1);
    } else {
      setItems(prev => [...prev, item]);
    }

    setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '', product: null, unit_of_measure: 'piece' });
    setItemDialogOpen(false);
  };

  const handleEditItem = (index) => {
    const item = items[index];
    setNewItem(item);
    setEditingItemIndex(index);
    setItemDialogOpen(true);
  };

  const handleDeleteItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (product) => {
    if (product) {
      setNewItem(prev => ({
        ...prev,
        product: product,
        description: product.name,
        unit_price: product.price || 0,
        product_reference: product.reference || ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      enqueueSnackbar(t('invoices:messages.enterTitleRequired'), { variant: 'error' });
      return;
    }

    if (items.length === 0) {
      enqueueSnackbar(t('invoices:messages.addAtLeastOneItem'), { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTaxAmount();
      const totalAmount = calculateTotal();

      const payload = {
        ...formData,
        client: formData.client ? formData.client.id : null,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_of_measure: item.unit_of_measure,
          product_reference: item.product_reference,
          total_price: item.total_price
        })),
        subtotal: subtotal || 0,
        tax_amount: taxAmount || 0,
        total_amount: totalAmount || 0
      };

      if (isEdit) {
        await invoicesAPI.update(id, payload);
        enqueueSnackbar(t('invoices:messages.invoiceUpdatedSuccess'), { variant: 'success' });
      } else {
        await invoicesAPI.create(payload);
        enqueueSnackbar(t('invoices:messages.invoiceCreatedSuccess'), { variant: 'success' });
      }

      navigate('/invoices');
    } catch (error) {
      console.error('Erreur API:', error);
      console.error('Response data:', error.response?.data);

      let errorMessage = isEdit ? t('invoices:messages.updateError') : t('invoices:messages.creationError');

      // Afficher les erreurs de validation détaillées
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          const errorDetails = Object.entries(errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join(' | ');
          errorMessage = `${errorMessage}: ${errorDetails}`;
        } else if (typeof errors === 'string') {
          errorMessage = `${errorMessage}: ${errors}`;
        }
      }

      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const MobileItemCard = ({ item, index }) => (
    <Card sx={{
      mb: 1.25,
      borderRadius: 1,
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderColor: 'primary.main',
        background: 'rgba(255, 255, 255, 0.95)'
      }
    }}>
      <CardContent sx={{ p: 1.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
          <Box>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
              {item.product_reference || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
              {item.description}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {formatCurrency(item.total_price)}
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.4 }}>
            {item.quantity} {UNIT_LABELS[item.unit_of_measure] || item.unit_of_measure} × {formatCurrency(item.unit_price)}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              onClick={() => handleEditItem(index)}
              sx={{
                bgcolor: 'rgba(66, 66, 66, 0.08)',
                color: 'text.secondary',
                width: 26,
                height: 26,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'secondary.main',
                  color: 'white',
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(66, 66, 66, 0.3)'
                }
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDeleteItem(index)}
              sx={{
                bgcolor: 'rgba(211, 47, 47, 0.08)',
                color: 'error.main',
                width: 26,
                height: 26,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'white',
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)'
                }
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && isEdit) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
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
          <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 600 }}>
            {isEdit ? t('invoices:editInvoice') : t('invoices:newInvoice')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/invoices')}
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
          >
            {t('invoices:buttons.cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={loading}
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? t('invoices:labels.savingLabel') : t('invoices:buttons.save')}
          </Button>
        </Box>
      </Box>

      {/* Actions Mobile - Affiché uniquement sur mobile */}
      <Box sx={{ mb: 2, display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/invoices')}
            size="small"
          >
            {t('common:back')}
          </Button>
          <Typography variant="h6" noWrap sx={{ flex: 1, ml: 1 }}>
            {isEdit ? t('invoices:editInvoice') : t('invoices:newInvoice')}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => navigate('/invoices')}
            size="small"
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
          >
            {t('invoices:buttons.cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={loading}
            size="small"
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? t('invoices:labels.savingLabel') : t('invoices:buttons.save')}
          </Button>
        </Stack>
      </Box>
      <Box sx={{ px: isMobile ? 2 : 0 }}>
        <form onSubmit={handleSubmit}>
          {isMobile ? (
            <Box>
              {/* Basic Information Mobile */}
              <Card sx={{ mb: 2, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                    {t('invoices:labels.generalInformation')}
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label={t('invoices:labels.invoiceTitleField')}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      fullWidth
                      label={t('invoices:labels.description')}
                      multiline
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    {/* Dates hidden for cleaner UI, handled in background */}
                  </Stack>
                </CardContent>
              </Card>

              {/* Client Selection Mobile */}
              <Card sx={{ mb: 2, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {t('invoices:labels.client')}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setClientDialogOpen(true)}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        width: 28,
                        height: 28
                      }}
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </Box>
                  <Autocomplete
                    options={clients}
                    getOptionLabel={(option) => option.name || ''}
                    value={formData.client}
                    onChange={(event, newValue) => {
                      setFormData({ ...formData, client: newValue });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Sélectionner un client"
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />
                  {formData.client && (
                    <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {formData.client.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {formData.client.email}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Items Mobile */}
              <Card sx={{ mb: 2, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {t('invoices:labels.billedItems')}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => {
                        setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '', product: null, unit_of_measure: 'piece' });
                        setEditingItemIndex(-1);
                        setItemDialogOpen(true);
                      }}
                      size="small"
                      sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                    >
                      {t('invoices:buttons.add')}
                    </Button>
                  </Box>
                  {items.map((item, index) => (
                    <MobileItemCard key={index} item={item} index={index} />
                  ))}
                  {items.length === 0 && (
                    <Typography color="text.secondary" sx={{ fontSize: '0.875rem', textAlign: 'center', py: 2 }}>
                      {t('invoices:messages.noItemsAddedMessage')}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Financial Summary Mobile */}
              <Card sx={{ mb: 2, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                    {t('invoices:labels.financialSummary')}
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}>
                        <Typography variant="h6" color="primary" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          {formatCurrency(calculateSubtotal())}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {t('invoices:labels.subtotal')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
                        <Typography variant="h6" color="warning.main" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          {formatCurrency(calculateTaxAmount())}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {t('invoices:labels.vatRate', { rate: formData.tax_rate })}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="h6" color="success.main" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          {formatCurrency(calculateTotal())}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {t('invoices:labels.totalTTC')}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <TextField
                    fullWidth
                    label={t('invoices:labels.vatRateField')}
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    size="small"
                    sx={{ mt: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </CardContent>
              </Card>

              {/* Payment Method Mobile */}
              <Card sx={{ mb: 2, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                    {t('invoices:labels.paymentMethod', 'Mode de paiement')}
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('invoices:labels.paymentMethod')}</InputLabel>
                    <Select
                      value={formData.payment_method}
                      label={t('invoices:labels.paymentMethod')}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      sx={{ borderRadius: 2 }}
                    >
                      {PAYMENT_METHODS.map(method => (
                        <MenuItem key={method.value} value={method.value}>
                          {method.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Left Column */}
              <Grid item xs={12} md={8}>
                {/* Basic Information */}
                <Card sx={{ mb: 3, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {t('invoices:labels.generalInformation')}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={t('invoices:labels.invoiceTitleField')}
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={t('invoices:labels.description')}
                          multiline
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                      {/* Dates hidden for cleaner UI */}
                    </Grid>
                  </CardContent>
                </Card>

                {/* Items */}
                <Card sx={{ mb: 3, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Articles
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => {
                          setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '', product: null, unit_of_measure: 'piece' });
                          setEditingItemIndex(-1);
                          setItemDialogOpen(true);
                        }}
                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
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
                            <TableCell sx={{ fontWeight: 600 }}>Unité</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{t('invoices:columns.quantity')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{t('invoices:columns.unitPrice')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{t('invoices:columns.total')}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>{t('invoices:columns.actions')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow key={index} hover>
                              <TableCell>{item.product_reference || '-'}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>{UNIT_LABELS[item.unit_of_measure] || item.unit_of_measure}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(item.total_price)}</TableCell>
                              <TableCell align="center">
                                <Stack direction="row" spacing={1} justifyContent="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditItem(index)}
                                    sx={{
                                      bgcolor: 'secondary.light',
                                      color: 'secondary.contrastText',
                                      '&:hover': { bgcolor: 'secondary.main' }
                                    }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteItem(index)}
                                    sx={{
                                      bgcolor: 'error.light',
                                      color: 'error.contrastText',
                                      '&:hover': { bgcolor: 'error.main' }
                                    }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                          {items.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                <Typography color="text.secondary">
                                  {t('invoices:messages.noItemsDesktopMessage')}
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
                <Card sx={{ borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Résumé financier
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                          <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                            {formatCurrency(calculateSubtotal())}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Sous-total
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                          <Typography variant="h5" color="warning.main" sx={{ fontWeight: 600 }}>
                            {formatCurrency(calculateTaxAmount())}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            TVA ({formData.tax_rate}%)
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                          <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
                            {formatCurrency(calculateTotal())}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total TTC
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          label={t('invoices:labels.vatRateField')}
                          type="number"
                          value={formData.tax_rate}
                          onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                          inputProps={{ min: 0, max: 100, step: 0.1 }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Right Column */}
              <Grid item xs={12} md={4}>
                {/* Client Selection */}
                <Card sx={{ mb: 3, borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Client
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setClientDialogOpen(true)}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      >
                        <Add />
                      </IconButton>
                    </Box>
                    <Autocomplete
                      options={clients}
                      getOptionLabel={(option) => option.name || ''}
                      value={formData.client}
                      onChange={(event, newValue) => {
                        setFormData({ ...formData, client: newValue });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('invoices:fields.selectClient')}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <Business sx={{ mr: 1, color: 'action.active' }} />,
                          }}
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        return (
                          <Box component="li" key={key} {...otherProps}>
                            <Business sx={{ mr: 2, color: 'action.active' }} />
                            <Box>
                              <Typography variant="body1">{option.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {option.email}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }}
                    />
                    {formData.client && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                          {formData.client.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formData.client.email}
                        </Typography>
                        {formData.client.phone && (
                          <Typography variant="body2" color="text.secondary">
                            {formData.client.phone}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Method Desktop */}
                <Card sx={{ borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {t('invoices:labels.paymentMethod', 'Mode de paiement')}
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel>{t('invoices:labels.paymentMethod')}</InputLabel>
                      <Select
                        value={formData.payment_method}
                        label={t('invoices:labels.paymentMethod')}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        sx={{ borderRadius: 2 }}
                      >
                        {PAYMENT_METHODS.map(method => (
                          <MenuItem key={method.value} value={method.value}>
                            {method.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </form>

        {/* Add/Edit Item Dialog with Product/Service Distinction */}
        <ProductSelectionDialog
          open={itemDialogOpen}
          onClose={() => setItemDialogOpen(false)}
          products={products}
          newItem={newItem}
          setNewItem={setNewItem}
          onAddItem={handleAddItem}
          onCreateProduct={() => setProductDialogOpen(true)}
          editingItemIndex={editingItemIndex}
        />

        {/* Quick Create Dialogs */}
        <QuickCreateDialog
          open={clientDialogOpen}
          onClose={() => setClientDialogOpen(false)}
          onSuccess={handleClientCreated}
          entityType="client"
          fields={clientFields}
          createFunction={clientsAPI.quickCreate}
          title={t('invoices:dialogs.quickCreateClient')}
        />

        <QuickCreateDialog
          open={productDialogOpen}
          onClose={() => setProductDialogOpen(false)}
          onSuccess={handleProductCreated}
          entityType="product"
          fields={getProductFields([], null)}
          createFunction={productsAPI.quickCreate}
          title={t('invoices:dialogs.quickCreateProduct')}
        />
      </Box>
    </Box>
  );
}

export default InvoiceForm;