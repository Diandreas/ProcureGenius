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
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Delete,
  Edit,
  Save,
  Cancel,
  Business,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { purchaseOrdersAPI, suppliersAPI, productsAPI, warehousesAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import QuickCreateDialog from '../../components/common/QuickCreateDialog';
import { supplierFields, getProductFields } from '../../config/quickCreateFields';
import ProductSelectionDialog from '../../components/invoices/ProductSelectionDialog';

function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
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
    product: null,
    product_reference: '',
    description: '',
    quantity: 1,
    unit_price: 0,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);

  // Quick Create states
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  // Totals calculation
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxRate = 0.15; // 15% tax rate (adjustable)
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
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
      enqueueSnackbar('Erreur lors du chargement des fournisseurs', { variant: 'error' });
    }
  };

  const fetchProducts = async (supplierId = null) => {
    try {
      // Si un fournisseur est sélectionné, filtrer les produits par ce fournisseur
      const params = supplierId ? { supplier: supplierId } : {};
      const response = await productsAPI.list(params);
      setProducts(response.data.results || response.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement des produits', { variant: 'error' });
    }
  };

  // Recharger les produits quand le fournisseur change
  useEffect(() => {
    if (formData.supplier && formData.supplier.id) {
      fetchProducts(formData.supplier.id);
    } else {
      fetchProducts(); // Charger tous les produits si aucun fournisseur sélectionné
    }
  }, [formData.supplier]);

  // Pré-sélectionner le fournisseur depuis l'URL
  useEffect(() => {
    if (supplierIdFromUrl && suppliers.length > 0 && !formData.supplier && !isEdit) {
      const supplier = suppliers.find(s => s.id === supplierIdFromUrl);
      if (supplier) {
        setFormData(prev => ({ ...prev, supplier }));
        enqueueSnackbar(`Fournisseur ${supplier.name} pré-sélectionné`, { variant: 'info' });
      }
    }
  }, [supplierIdFromUrl, suppliers, formData.supplier, isEdit]);

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.list();
      setWarehouses(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des entrepôts:', error);
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
      enqueueSnackbar('Erreur lors du chargement du bon de commande', { variant: 'error' });
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
    enqueueSnackbar(result.message || 'Fournisseur créé avec succès', { variant: 'success' });
    setSuppliers(prev => [...prev, result.data]);
    setFormData(prev => ({ ...prev, supplier: result.data }));
    fetchSuppliers();
  };

  const handleProductCreated = (result) => {
    enqueueSnackbar(result.message || 'Produit créé avec succès', { variant: 'success' });
    setProducts(prev => [...prev, result.data]);
    setNewItem(prev => ({
      ...prev,
      product_reference: result.data.reference || '',
      description: result.data.name,
      unit_price: parseFloat(result.data.cost_price) || parseFloat(result.data.price) || 0
    }));
    fetchProducts();
  };

  const handleAddItem = () => {
    // Validation: Un produit doit être sélectionné
    if (!newItem.product) {
      enqueueSnackbar('Veuillez sélectionner ou créer un produit', { variant: 'error' });
      return;
    }

    if (!newItem.description || newItem.quantity <= 0 || newItem.unit_price <= 0) {
      enqueueSnackbar('Veuillez remplir tous les champs requis', { variant: 'error' });
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

    setNewItem({
      product: null,
      product_reference: '',
      description: '',
      quantity: 1,
      unit_price: 0,
    });
    setAddItemDialogOpen(false);
  };

  const handleEditItem = (index) => {
    const item = items[index];
    setNewItem({
      product_reference: item.product_reference || '',
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
    setEditingItemIndex(index);
    setAddItemDialogOpen(true);
  };

  const handleDeleteItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (product) => {
    if (product) {
      setNewItem(prev => ({
        ...prev,
        product_reference: product.reference || product.sku || '',
        description: product.name,
        unit_price: product.price || product.unit_price || 0,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.supplier || items.length === 0) {
      enqueueSnackbar('Veuillez remplir tous les champs obligatoires et ajouter au moins un article', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        supplier: formData.supplier.id,
        delivery_warehouse: formData.delivery_warehouse ? formData.delivery_warehouse.id : null,
        items: items.map(item => ({
          ...item,
          product: item.product ? item.product.id : null,
        })),
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
      };

      if (isEdit) {
        await purchaseOrdersAPI.update(id, payload);
        enqueueSnackbar('Bon de commande modifié avec succès', { variant: 'success' });
      } else {
        const response = await purchaseOrdersAPI.create(payload);
        enqueueSnackbar('Bon de commande créé avec succès', { variant: 'success' });
        navigate(`/purchase-orders/${response.data.id}`);
        return;
      }
      navigate(`/purchase-orders/${id}`);
    } catch (error) {
      enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' });
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
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/purchase-orders')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {isEdit ? 'Modifier le bon de commande' : 'Nouveau bon de commande'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={() => navigate('/purchase-orders')}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Form */}
        <Grid item xs={12} md={8}>
          {/* Basic Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Numéro de commande"
                    value={formData.po_number}
                    onChange={(e) => handleInputChange('po_number', e.target.value)}
                    disabled={isEdit}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      label="Statut"
                    >
                      <MenuItem value="draft">Brouillon</MenuItem>
                      <MenuItem value="pending">En attente</MenuItem>
                      <MenuItem value="approved">Approuvé</MenuItem>
                      <MenuItem value="sent">Envoyé</MenuItem>
                      <MenuItem value="received">Reçu</MenuItem>
                      <MenuItem value="cancelled">Annulé</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Titre *"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
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
                        <TextField {...params} label="Fournisseur *" required />
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
                    label="Date requise"
                    type="date"
                    value={formData.required_date}
                    onChange={(e) => handleInputChange('required_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date de livraison prévue"
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
                      <TextField {...params} label="Entrepôt de livraison" />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Adresse de livraison"
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
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Articles commandés
                </Typography>
                <Button
                  startIcon={<Add />}
                  onClick={() => setAddItemDialogOpen(true)}
                  variant="contained"
                  size="small"
                >
                  Ajouter un article
                </Button>
              </Box>

              {items.length === 0 ? (
                <Alert severity="info">
                  Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Référence</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Quantité</TableCell>
                        <TableCell align="right">Prix unitaire</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_reference || '-'}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" onClick={() => handleEditItem(index)}>
                              <Edit />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteItem(index)} color="error">
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
                Résumé financier
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Sous-total:</Typography>
                  <Typography>{formatCurrency(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Taxes (15%):</Typography>
                  <Typography>{formatCurrency(taxAmount)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(total)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Selected Supplier Info */}
          {formData.supplier && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Fournisseur sélectionné
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Business color="primary" />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {formData.supplier.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formData.supplier.email}
                    </Typography>
                    {formData.supplier.phone && (
                      <Typography variant="body2" color="text.secondary">
                        {formData.supplier.phone}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate(`/suppliers/${formData.supplier.id}`)}
                >
                  Voir le fournisseur
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Add/Edit Item Dialog with Product Selection and Creation */}
      <ProductSelectionDialog
        open={addItemDialogOpen}
        onClose={() => setAddItemDialogOpen(false)}
        products={products}
        newItem={newItem}
        setNewItem={setNewItem}
        onAddItem={handleAddItem}
        onCreateProduct={() => setProductDialogOpen(true)}
        editingItemIndex={editingItemIndex}
      />

      {/* Quick Create Dialogs */}
      <QuickCreateDialog
        open={supplierDialogOpen}
        onClose={() => setSupplierDialogOpen(false)}
        onSuccess={handleSupplierCreated}
        entityType="supplier"
        fields={supplierFields}
        createFunction={suppliersAPI.quickCreate}
        title="Créer un fournisseur rapidement"
      />

      <QuickCreateDialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        onSuccess={handleProductCreated}
        entityType="product"
        fields={getProductFields(suppliers, formData.supplier)}
        createFunction={productsAPI.quickCreate}
        title="Créer un produit rapidement"
        contextData={formData.supplier ? { supplier_id: formData.supplier.id } : {}}
      />
    </Box>
  );
}

export default PurchaseOrderForm;