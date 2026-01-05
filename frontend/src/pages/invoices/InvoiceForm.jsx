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
import { invoicesAPI, clientsAPI, productsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client: null,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_rate: 20,
    status: 'draft'
  });

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    product_reference: '',
    product: null
  });

  useEffect(() => {
    fetchClients();
    fetchProducts();
    if (isEdit) {
      fetchInvoice();
    }
  }, [id, isEdit]);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.list();
      setClients(response.data.results || []);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement des clients', { variant: 'error' });
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.list();
      setProducts(response.data.results || []);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement des produits', { variant: 'error' });
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
        due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
        tax_rate: invoice.tax_rate || 20,
        status: invoice.status || 'draft'
      });
      setItems(invoice.items || []);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement de la facture', { variant: 'error' });
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const calculateTaxAmount = () => {
    return (calculateSubtotal() * formData.tax_rate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxAmount();
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

    setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '', product: null });
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

    if (!formData.client) {
      enqueueSnackbar('Veuillez sélectionner un client', { variant: 'error' });
      return;
    }

    if (!formData.title.trim()) {
      enqueueSnackbar('Veuillez saisir un titre', { variant: 'error' });
      return;
    }

    if (items.length === 0) {
      enqueueSnackbar('Veuillez ajouter au moins un article', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        client: formData.client.id,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_reference: item.product_reference,
          total_price: item.total_price
        })),
        subtotal: calculateSubtotal(),
        tax_amount: calculateTaxAmount(),
        total_amount: calculateTotal()
      };

      if (isEdit) {
        await invoicesAPI.update(id, payload);
        enqueueSnackbar('Facture modifiée avec succès', { variant: 'success' });
      } else {
        await invoicesAPI.create(payload);
        enqueueSnackbar('Facture créée avec succès', { variant: 'success' });
      }

      navigate('/invoices');
    } catch (error) {
      enqueueSnackbar(
        isEdit ? 'Erreur lors de la modification' : 'Erreur lors de la création',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const MobileItemCard = ({ item, index }) => (
    <Card sx={{
      mb: 1.25,
      borderRadius: 3,
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
            {item.quantity} × {formatCurrency(item.unit_price)}
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
    <Box p={isMobile ? 2 : 3}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            {isEdit ? 'Modifier la facture' : 'Nouvelle facture'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/invoices')}
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={loading}
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        {isMobile ? (
          <Box>
            {/* Basic Information Mobile */}
            <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                  Informations générales
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Titre de la facture"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Date d'émission"
                        type="date"
                        value={formData.issue_date}
                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Date d'échéance"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            {/* Client Selection Mobile */}
            <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                  Client
                </Typography>
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
                      required
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
            <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    Articles
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '', product: null });
                      setEditingItemIndex(-1);
                      setItemDialogOpen(true);
                    }}
                    size="small"
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Ajouter
                  </Button>
                </Box>
                {items.map((item, index) => (
                  <MobileItemCard key={index} item={item} index={index} />
                ))}
                {items.length === 0 && (
                  <Typography color="text.secondary" sx={{ fontSize: '0.875rem', textAlign: 'center', py: 2 }}>
                    Aucun article ajouté. Cliquez sur "Ajouter" pour commencer.
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary Mobile */}
            <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                  Résumé financier
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography variant="h6" color="primary" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        {formatCurrency(calculateSubtotal())}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Sous-total
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
                      <Typography variant="h6" color="warning.main" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        {formatCurrency(calculateTaxAmount())}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        TVA ({formData.tax_rate}%)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="h6" color="success.main" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        {formatCurrency(calculateTotal())}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Total TTC
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  label="Taux de TVA (%)"
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  size="small"
                  sx={{ mt: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </CardContent>
            </Card>

            {/* Status Mobile */}
            <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
                  Statut
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Statut de la facture</InputLabel>
                  <Select
                    value={formData.status}
                    label="Statut de la facture"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="draft">Brouillon</MenuItem>
                    <MenuItem value="sent">Envoyée</MenuItem>
                    <MenuItem value="paid">Payée</MenuItem>
                    <MenuItem value="cancelled">Annulée</MenuItem>
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
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Informations générales
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Titre de la facture"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Date d'émission"
                        type="date"
                        value={formData.issue_date}
                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Date d'échéance"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Items */}
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Articles
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => {
                        setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '', product: null });
                        setEditingItemIndex(-1);
                        setItemDialogOpen(true);
                      }}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                      Ajouter un article
                    </Button>
                  </Box>

                  <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Référence</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Quantité</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Prix unitaire</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{item.product_reference || '-'}</TableCell>
                            <TableCell>{item.description}</TableCell>
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
                                Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.
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
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
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
                        label="Taux de TVA (%)"
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
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Client
                  </Typography>
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
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <Business sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Business sx={{ mr: 2, color: 'action.active' }} />
                        <Box>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.email}
                          </Typography>
                        </Box>
                      </Box>
                    )}
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

              {/* Status */}
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Statut
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Statut de la facture</InputLabel>
                    <Select
                      value={formData.status}
                      label="Statut de la facture"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="draft">Brouillon</MenuItem>
                      <MenuItem value="sent">Envoyée</MenuItem>
                      <MenuItem value="paid">Payée</MenuItem>
                      <MenuItem value="cancelled">Annulée</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </form>

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingItemIndex >= 0 ? 'Modifier l\'article' : 'Ajouter un article'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => option.name || ''}
                value={newItem.product}
                onChange={(event, newValue) => handleProductSelect(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Rechercher un produit"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Réf: {option.reference} - {formatCurrency(option.price)}
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantité"
                type="number"
                required
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1 }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                required
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prix unitaire HT"
                type="number"
                required
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                  {formatCurrency((newItem.quantity || 0) * (newItem.unit_price || 0))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total ligne
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setItemDialogOpen(false)}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.description || newItem.quantity <= 0 || newItem.unit_price <= 0}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {editingItemIndex >= 0 ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvoiceForm;