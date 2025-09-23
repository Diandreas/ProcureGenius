import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { purchaseOrdersAPI, suppliersAPI, productsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = Boolean(id);

  // Form state
  const [formData, setFormData] = useState({
    po_number: '',
    title: '',
    description: '',
    supplier: null,
    required_date: '',
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
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);

  // Totals calculation
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxRate = 0.15; // 15% tax rate (adjustable)
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.list();
      setProducts(response.data.results || response.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement des produits', { variant: 'error' });
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
        required_date: po.required_date ? po.required_date.split('T')[0] : '',
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

  const handleAddItem = () => {
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
        items,
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
                  <Autocomplete
                    options={suppliers}
                    getOptionLabel={(option) => option.name || ''}
                    value={formData.supplier}
                    onChange={(event, newValue) => handleInputChange('supplier', newValue)}
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

      {/* Add/Edit Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItemIndex >= 0 ? 'Modifier l\'article' : 'Ajouter un article'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => option.name || ''}
                onChange={(event, newValue) => handleProductSelect(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Sélectionner un produit (optionnel)" />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Réf: {option.reference || option.sku} - {formatCurrency(option.price || option.unit_price || 0)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Référence produit"
                value={newItem.product_reference}
                onChange={(e) => setNewItem({ ...newItem, product_reference: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantité *"
                type="number"
                required
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description *"
                required
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prix unitaire *"
                type="number"
                required
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total"
                value={formatCurrency(newItem.quantity * newItem.unit_price)}
                disabled
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.description || newItem.quantity <= 0 || newItem.unit_price <= 0}
          >
            {editingItemIndex >= 0 ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PurchaseOrderForm;