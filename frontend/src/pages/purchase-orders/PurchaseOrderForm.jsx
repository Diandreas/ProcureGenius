import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  useMediaQuery,
  useTheme,
  Avatar,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Delete,
  Edit,
  Save,
  Cancel,
  Business,
  AutoAwesome,
  AutoFixHigh,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { purchaseOrdersAPI, suppliersAPI, warehousesAPI, aiChatAPI } from '../../services/api';
import useCurrency from '../../hooks/useCurrency';
import QuickCreateDialog from '../../components/common/QuickCreateDialog';
import { supplierFields } from '../../config/quickCreateFields';
import POItemDialog from '../../components/purchase-orders/POItemDialog';

function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['purchaseOrders', 'common']);
  const { format: formatCurrency } = useCurrency();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isEdit = Boolean(id);
  const supplierIdFromUrl = searchParams.get('supplier');

  // Form state
  const [formData, setFormData] = useState({
    po_number: '',
    title: '',
    description: '',
    supplier: null,
    delivery_warehouse: null,
    required_date: '',
    expected_delivery_date: '',
    delivery_address: '',
    status: 'draft',
  });

  // Items state
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    product_reference: '',
    description: '',
    quantity: 1,
    unit_price: 0,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiPrompt, setAiAiPrompt] = useState('');
  const [showAiInput, setShowAiAiInput] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) {
      enqueueSnackbar('Veuillez décrire ce que vous souhaitez commander', { variant: 'info' });
      return;
    }

    setIsAiProcessing(true);
    try {
      const prompt = `Extraire les informations de bon de commande depuis ce texte: "${aiPrompt}". 
      Retourne un JSON avec: supplier_name, title, items (array avec description, quantity, unit_price). 
      Si le fournisseur n'est pas clair, laisse vide. 
      Réponds UNIQUEMENT avec le JSON pur.`;

      const response = await aiChatAPI.generateText(prompt, 500);
      const content = response.data.content;
      
      // Nettoyer le contenu pour extraire le JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        // 1. Chercher le fournisseur
        if (data.supplier_name) {
          const foundSupplier = suppliers.find(s => 
            s.name.toLowerCase().includes(data.supplier_name.toLowerCase())
          );
          if (foundSupplier) {
            setFormData(prev => ({ ...prev, supplier: foundSupplier, title: data.title || prev.title }));
          } else {
            setFormData(prev => ({ ...prev, title: data.title || `Commande ${data.supplier_name}` }));
            enqueueSnackbar(`Fournisseur "${data.supplier_name}" non trouvé, veuillez le sélectionner manuellement.`, { variant: 'warning' });
          }
        }

        // 2. Ajouter les articles
        if (data.items && data.items.length > 0) {
          const newItems = data.items.map(item => ({
            product: null, // On pourra faire du matching plus tard
            product_reference: '',
            description: item.description || 'Article sans description',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0
          }));
          setItems(prev => [...prev, ...newItems]);
        }

        setShowAiAiInput(false);
        setAiAiPrompt('');
        enqueueSnackbar('Bon de commande pré-rempli par l\'IA !', { variant: 'success' });
      }
    } catch (error) {
      console.error('AI Assist error:', error);
      enqueueSnackbar('Erreur lors de l\'analyse par l\'IA', { variant: 'error' });
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Quick Create states
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  // Totals calculation
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);
  const taxRate = 0.20; // 20% TVA standard
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  useEffect(() => {
    fetchSuppliers();
    fetchWarehouses();
    if (isEdit) {
      fetchPurchaseOrder();
    } else {
      generatePONumber();
    }
  }, [id, isEdit]);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list();
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.suppliersLoadError'), { variant: 'error' });
    }
  };

  // Pré-sélectionner le fournisseur depuis l'URL
  useEffect(() => {
    if (supplierIdFromUrl && suppliers.length > 0 && !formData.supplier && !isEdit) {
      const supplier = suppliers.find(s => s.id === supplierIdFromUrl);
      if (supplier) {
        setFormData(prev => ({ ...prev, supplier }));
        enqueueSnackbar(t('purchaseOrders:messages.supplierPreselected', { name: supplier.name }), { variant: 'info' });
      }
    }
  }, [supplierIdFromUrl, suppliers, formData.supplier, isEdit]);

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.list();
      setWarehouses(response.data.results || response.data);
    } catch (error) {
      console.error(t('purchaseOrders:messages.warehousesLoadError'), error);
      setWarehouses([]);
    }
  };

  const fetchPurchaseOrder = async () => {
    setLoading(true);
    try {
      const response = await purchaseOrdersAPI.get(id);
      const po = response.data;
      setFormData({
        po_number: po.po_number,
        title: po.title,
        description: po.description || '',
        supplier: po.supplier,
        delivery_warehouse: po.delivery_warehouse || null,
        required_date: po.required_date ? po.required_date.split('T')[0] : '',
        expected_delivery_date: po.expected_delivery_date ? po.expected_delivery_date.split('T')[0] : '',
        delivery_address: po.delivery_address || '',
        status: po.status,
      });
      setItems(po.items || []);
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.poFormLoadError'), { variant: 'error' });
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const generatePONumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setFormData(prev => ({
      ...prev,
      po_number: `PO-${year}${month}${day}-${random}`
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Quick Create handlers
  const handleSupplierCreated = (result) => {
    enqueueSnackbar(result.message || t('purchaseOrders:messages.supplierCreatedSuccess'), { variant: 'success' });
    setSuppliers(prev => [...prev, result.data]);
    setFormData(prev => ({ ...prev, supplier: result.data }));
    fetchSuppliers();
  };


  const handleAddItem = () => {
    if (!newItem.description?.trim() || parseFloat(newItem.quantity) <= 0) {
      enqueueSnackbar(t('purchaseOrders:messages.fillRequiredFields'), { variant: 'error' });
      return;
    }

    const item = {
      ...newItem,
      quantity: parseFloat(newItem.quantity),
      unit_price: parseFloat(newItem.unit_price) || 0,
      total_price: parseFloat(newItem.quantity) * (parseFloat(newItem.unit_price) || 0),
    };

    if (editingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = item;
      setItems(updatedItems);
      setEditingItemIndex(-1);
    } else {
      setItems(prev => [...prev, item]);
    }

    setNewItem({ product_reference: '', description: '', quantity: 1, unit_price: 0 });
    setAddItemDialogOpen(false);
  };

  const handleEditItem = (index) => {
    const item = items[index];
    setNewItem({
      product_reference: item.product_reference || '',
      description: item.description || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
    setEditingItemIndex(index);
    setAddItemDialogOpen(true);
  };

  const handleDeleteItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.supplier || items.length === 0) {
      enqueueSnackbar(t('purchaseOrders:messages.completeFormValidation'), { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        supplier: formData.supplier.id,
        delivery_warehouse: formData.delivery_warehouse ? formData.delivery_warehouse.id : null,
        required_date: formData.required_date || null,
        expected_delivery_date: formData.expected_delivery_date || null,
        items: items.map(({ product, total_price, ...item }) => ({
          ...item,
          product: product?.id ?? null,
        })),
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
      };

      if (isEdit) {
        await purchaseOrdersAPI.update(id, payload);
        enqueueSnackbar(t('purchaseOrders:messages.poUpdatedSuccess'), { variant: 'success' });
      } else {
        const response = await purchaseOrdersAPI.create(payload);
        enqueueSnackbar(t('purchaseOrders:messages.poCreatedSuccess'), { variant: 'success' });
        navigate(`/purchase-orders/${response.data.id}`);
        return;
      }
      navigate(`/purchase-orders/${id}`);
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.savingError'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      p: { xs: 0, sm: 2, md: 3 },
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: { xs: 'none', md: 'flex' }, justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/purchase-orders')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="800" sx={{
            background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {isEdit ? t('purchaseOrders:editPO') : t('purchaseOrders:newPO')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AutoAwesome />}
            onClick={() => setShowAiAiInput(!showAiInput)}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}
          >
            {showAiInput ? 'Fermer Assistant' : 'Assistant IA'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={() => navigate('/purchase-orders')}
            sx={{ borderRadius: 2.5, textTransform: 'none' }}
          >
            {t('purchaseOrders:buttons.cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={saving}
            sx={{ 
              borderRadius: 2.5, 
              textTransform: 'none', 
              fontWeight: 600,
              boxShadow: theme => `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
            }}
          >
            {saving ? t('purchaseOrders:labels.saving') : t('purchaseOrders:buttons.save')}
          </Button>
        </Stack>
      </Box>

      {/* AI Assistant Input Section */}
      <AnimatePresence>
        {showAiInput && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            sx={{ mb: 3 }}
          >
            <Card sx={{ 
              mb: 3, 
              borderRadius: 3, 
              border: '2px solid',
              borderColor: 'secondary.light',
              bgcolor: alpha(theme.palette.secondary.main, 0.02)
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <AutoFixHigh />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="600">Assistant de Commande Intelligent</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Décrivez votre commande (fournisseur, articles, quantités) et l'IA remplira le formulaire pour vous.
                    </Typography>
                  </Box>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Ex: Commande 50 ordinateurs portables et 20 souris sans fil chez le fournisseur Dell Canada pour le projet de bureau."
                  value={aiPrompt}
                  onChange={(e) => setAiAiPrompt(e.target.value)}
                  disabled={isAiProcessing}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleAiAssist}
                    disabled={isAiProcessing || !aiPrompt.trim()}
                    startIcon={isAiProcessing ? <CircularProgress size={20} color="inherit" /> : <AutoFixHigh />}
                    sx={{ borderRadius: 2, px: 4 }}
                  >
                    {isAiProcessing ? 'Analyse en cours...' : 'Remplir le formulaire'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions Mobile */}
      <Box sx={{
        mb: 1.5,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'flex-end',
        px: 2,
        py: 1
      }}>
        {/* Les actions sont gérées par le top navbar sur mobile */}
      </Box>
      <Box sx={{ px: isMobile ? 2 : 0 }}>

      <Grid container spacing={isMobile ? 1.5 : 3}>
        {/* Main Form */}
        <Grid item xs={12} md={8}>
          {/* Basic Information */}
          <Card sx={{
            mb: isMobile ? 1.5 : 3,
            borderRadius: isMobile ? 2.5 : 2,
            boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
            backdropFilter: isMobile ? 'blur(10px)' : 'none',
            border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
          }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontSize: isMobile ? '1rem' : undefined,
                  mb: isMobile ? 1.5 : 2
                }}
              >
                {t('purchaseOrders:labels.generalInformation')}
              </Typography>
              <Grid container spacing={isMobile ? 1.5 : 2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('purchaseOrders:labels.poNumber')}
                    value={formData.po_number}
                    onChange={(e) => handleInputChange('po_number', e.target.value)}
                    disabled={isEdit}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('purchaseOrders:labels.statusField')}</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      label={t('purchaseOrders:labels.statusField')}
                    >
                      <MenuItem value="draft">{t('purchaseOrders:status.draft')}</MenuItem>
                      <MenuItem value="pending">{t('purchaseOrders:status.pending')}</MenuItem>
                      <MenuItem value="approved">{t('purchaseOrders:status.approved')}</MenuItem>
                      <MenuItem value="sent">{t('purchaseOrders:status.sent')}</MenuItem>
                      <MenuItem value="received">{t('purchaseOrders:status.received')}</MenuItem>
                      <MenuItem value="cancelled">{t('purchaseOrders:status.cancelled')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('purchaseOrders:labels.titleField')}
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('purchaseOrders:labels.descriptionField')}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Autocomplete
                      options={suppliers}
                      getOptionLabel={(option) => option.name || ''}
                      value={formData.supplier}
                      onChange={(event, newValue) => handleInputChange('supplier', newValue)}
                      fullWidth
                      renderInput={(params) => (
                        <TextField {...params} label={t('purchaseOrders:labels.supplierField')} required />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Business sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="body2">{option.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.email}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    />
                    <IconButton
                      onClick={() => setSupplierDialogOpen(true)}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        mt: 0.5
                      }}
                    >
                      <Add />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('purchaseOrders:labels.requiredDateField')}
                    type="date"
                    value={formData.required_date}
                    onChange={(e) => handleInputChange('required_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('purchaseOrders:labels.expectedDeliveryDate')}
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => handleInputChange('expected_delivery_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={warehouses}
                    getOptionLabel={(option) => option.name || ''}
                    value={formData.delivery_warehouse}
                    onChange={(event, newValue) => handleInputChange('delivery_warehouse', newValue)}
                    fullWidth
                    renderInput={(params) => (
                      <TextField {...params} label={t('purchaseOrders:labels.deliveryWarehouse')} />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('purchaseOrders:labels.deliveryAddress')}
                    value={formData.delivery_address}
                    onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Items */}
          <Card sx={{
            borderRadius: isMobile ? 2.5 : 2,
            boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
            backdropFilter: isMobile ? 'blur(10px)' : 'none',
            border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
          }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: isMobile ? 1.5 : 2
              }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: isMobile ? '1rem' : undefined
                  }}
                >
                  {t('purchaseOrders:labels.orderedItemsForm')}
                </Typography>
                <Button
                  startIcon={<Add />}
                  onClick={() => setAddItemDialogOpen(true)}
                  variant="contained"
                  size={isMobile ? 'small' : 'small'}
                  sx={{
                    borderRadius: isMobile ? 2 : 1,
                    fontSize: isMobile ? '0.813rem' : undefined,
                    py: isMobile ? 0.75 : undefined,
                    px: isMobile ? 1.5 : undefined,
                    minWidth: isMobile ? 'auto' : undefined
                  }}
                >
                  {t('purchaseOrders:buttons.addItem')}
                </Button>
              </Box>

              {items.length === 0 ? (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: isMobile ? 2 : 1,
                    fontSize: isMobile ? '0.813rem' : undefined,
                    py: isMobile ? 1 : undefined
                  }}
                >
                  {t('purchaseOrders:messages.noItemsAlert')}
                </Alert>
              ) : (
                <TableContainer
                  component={Paper}
                  sx={{
                    borderRadius: isMobile ? 2 : 1,
                    boxShadow: isMobile ? 'none' : undefined,
                    border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  <Table size={isMobile ? 'small' : 'medium'}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: isMobile ? '0.813rem' : undefined, fontWeight: 600 }}>
                          {t('purchaseOrders:columns.reference')}
                        </TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.813rem' : undefined, fontWeight: 600 }}>
                          {t('purchaseOrders:columns.description')}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontSize: isMobile ? '0.813rem' : undefined, fontWeight: 600 }}
                        >
                          {t('purchaseOrders:columns.quantity')}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontSize: isMobile ? '0.813rem' : undefined, fontWeight: 600 }}
                        >
                          {t('purchaseOrders:columns.unitPrice')}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontSize: isMobile ? '0.813rem' : undefined, fontWeight: 600 }}
                        >
                          {t('purchaseOrders:columns.total')}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontSize: isMobile ? '0.813rem' : undefined, fontWeight: 600 }}
                        >
                          {t('purchaseOrders:columns.actions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ fontSize: isMobile ? '0.813rem' : undefined }}>
                            {item.product_reference || '-'}
                          </TableCell>
                          <TableCell sx={{ fontSize: isMobile ? '0.813rem' : undefined }}>
                            {item.description}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                          >
                            {item.quantity}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                          >
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                          >
                            {formatCurrency(item.quantity * item.unit_price)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size={isMobile ? 'small' : 'small'}
                              onClick={() => handleEditItem(index)}
                              sx={{
                                width: isMobile ? 32 : undefined,
                                height: isMobile ? 32 : undefined,
                                '& .MuiSvgIcon-root': {
                                  fontSize: isMobile ? '1rem' : undefined
                                }
                              }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size={isMobile ? 'small' : 'small'}
                              onClick={() => handleDeleteItem(index)}
                              color="error"
                              sx={{
                                width: isMobile ? 32 : undefined,
                                height: isMobile ? 32 : undefined,
                                '& .MuiSvgIcon-root': {
                                  fontSize: isMobile ? '1rem' : undefined
                                }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Financial Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('purchaseOrders:labels.finSummary')}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>{t('purchaseOrders:labels.subtotalLabel')}</Typography>
                  <Typography>{formatCurrency(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>{t('purchaseOrders:labels.taxesLabel')}</Typography>
                  <Typography>{formatCurrency(taxAmount)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">{t('purchaseOrders:labels.totalLabel')}</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(total)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Selected Supplier Info */}
          {formData.supplier && (
            <Card sx={{
              borderRadius: isMobile ? 2.5 : 2,
              boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.1)',
              backdropFilter: isMobile ? 'blur(10px)' : 'none',
              border: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    fontSize: isMobile ? '1rem' : undefined,
                    mb: isMobile ? 1.5 : 2
                  }}
                >
                  {t('purchaseOrders:labels.selectedSupplier')}
                </Typography>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 1.5 : 2,
                  mb: isMobile ? 1.5 : 2
                }}>
                  <Business color="primary" sx={{ fontSize: isMobile ? 20 : 24 }} />
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 'medium',
                        fontSize: isMobile ? '0.938rem' : undefined
                      }}
                    >
                      {formData.supplier.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                    >
                      {formData.supplier.email}
                    </Typography>
                    {formData.supplier.phone && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.813rem' : undefined }}
                      >
                        {formData.supplier.phone}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate(`/suppliers/${formData.supplier.id}`)}
                  sx={{
                    borderRadius: isMobile ? 2 : 1,
                    fontSize: isMobile ? '0.875rem' : undefined,
                    py: isMobile ? 1 : undefined
                  }}
                >
                  {t('purchaseOrders:buttons.viewSupplier')}
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
      </Box>

      {/* Dialog ajout/édition ligne BdC — saisie libre, pas de catalogue obligatoire */}
      <POItemDialog
        open={addItemDialogOpen}
        onClose={() => { setAddItemDialogOpen(false); setEditingItemIndex(-1); }}
        item={newItem}
        setItem={setNewItem}
        onConfirm={handleAddItem}
        editingIndex={editingItemIndex}
        supplierId={formData.supplier?.id}
      />

      {/* Quick Create Supplier */}
      <QuickCreateDialog
        open={supplierDialogOpen}
        onClose={() => setSupplierDialogOpen(false)}
        onSuccess={handleSupplierCreated}
        entityType="supplier"
        fields={supplierFields}
        createFunction={suppliersAPI.quickCreate}
        title={t('purchaseOrders:dialogs.quickCreateSupplier')}
      />
    </Box>
  );
}

export default PurchaseOrderForm;