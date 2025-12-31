import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  Typography,
  Avatar,
  Divider,
  InputAdornment,
  Alert,
  Fade,
  Zoom,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  useTheme,
  alpha,
  Slide,
} from '@mui/material';
import api from '../../services/api';
import {
  Receipt,
  Person,
  Business,
  ShoppingCart,
  Inventory,
  Euro,
  CalendarToday,
  Description,
  Email,
  Phone,
  Home,
  ContactPage,
  LocationCity,
  Badge,
  Add,
  Delete,
} from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * Modal de confirmation universelle pour création d'entités
 * Supporte: invoice, client, supplier, purchase_order, product
 */
const ConfirmationModal = ({ open, onClose, entityType, draftData, onConfirm }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState(draftData || {});
  const [errors, setErrors] = useState({});

  // State pour gérer les articles (items) pour factures et bons de commande
  const [items, setItems] = useState(draftData?.items || []);
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0
  });

  // State pour la liste des produits (autocomplete)
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Charger la liste des produits au montage du composant
  useEffect(() => {
    if (open && (entityType === 'invoice' || entityType === 'purchase_order')) {
      fetchProducts();
    }
  }, [open, entityType]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await api.get('/products/');
      const data = response.data;
      setProducts(data.results || data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Configuration par type d'entité
  const entityConfig = {
    invoice: {
      icon: <Receipt />,
      color: theme.palette.success.main,
      title: 'Facture',
      fields: [
        { name: 'client_name', label: 'Client', icon: <Person />, required: true, fullWidth: true },
        { name: 'client_email', label: 'Email du client', icon: <Email />, type: 'email', fullWidth: true },
        { name: 'client_phone', label: 'Téléphone du client', icon: <Phone />, type: 'tel', fullWidth: true },
        { name: 'title', label: 'Titre de la facture', icon: <Description />, required: true, fullWidth: true },
        { name: 'total_amount', label: 'Montant total', icon: <Euro />, type: 'number', required: true },
        { name: 'due_date', label: "Date d'échéance", icon: <CalendarToday />, type: 'date', required: true },
        { name: 'description', label: 'Description', icon: <Description />, multiline: true, rows: 3, fullWidth: true },
      ],
    },
    client: {
      icon: <Person />,
      color: theme.palette.primary.main,
      title: 'Client',
      fields: [
        { name: 'name', label: 'Nom', icon: <Person />, required: true, fullWidth: true },
        { name: 'email', label: 'Email', icon: <Email />, type: 'email', fullWidth: true },
        { name: 'phone', label: 'Téléphone', icon: <Phone />, type: 'tel' },
        { name: 'contact_person', label: 'Personne de contact', icon: <ContactPage /> },
        { name: 'address', label: 'Adresse', icon: <Home />, multiline: true, rows: 2, fullWidth: true },
        { name: 'payment_terms', label: 'Conditions de paiement', icon: <Euro /> },
        { name: 'tax_id', label: 'Numéro fiscal', icon: <Badge /> },
      ],
    },
    supplier: {
      icon: <Business />,
      color: theme.palette.info.main,
      title: 'Fournisseur',
      fields: [
        { name: 'name', label: 'Nom', icon: <Business />, required: true, fullWidth: true },
        { name: 'contact_person', label: 'Personne de contact', icon: <ContactPage />, fullWidth: true },
        { name: 'email', label: 'Email', icon: <Email />, type: 'email', fullWidth: true },
        { name: 'phone', label: 'Téléphone', icon: <Phone />, type: 'tel' },
        { name: 'city', label: 'Ville', icon: <LocationCity /> },
        { name: 'address', label: 'Adresse', icon: <Home />, multiline: true, rows: 2, fullWidth: true },
      ],
    },
    purchase_order: {
      icon: <ShoppingCart />,
      color: theme.palette.warning.main,
      title: 'Bon de Commande',
      fields: [
        { name: 'supplier_name', label: 'Fournisseur', icon: <Business />, required: true, fullWidth: true },
        { name: 'total_amount', label: 'Montant total', icon: <Euro />, type: 'number', required: true },
        { name: 'expected_delivery_date', label: 'Date de livraison prévue', icon: <CalendarToday />, type: 'date' },
        { name: 'description', label: 'Description', icon: <Description />, multiline: true, rows: 3, fullWidth: true },
      ],
    },
    product: {
      icon: <Inventory />,
      color: theme.palette.secondary.main,
      title: 'Produit',
      fields: [
        {
          name: 'name',
          label: 'Nom',
          icon: <Inventory />,
          required: true,
          fullWidth: true,
        },
        {
          name: 'reference',
          label: 'Référence',
          icon: <Badge />,
          required: true,
        },
        {
          name: 'price',
          label: 'Prix',
          icon: <Euro />,
          type: 'number',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          icon: <Description />,
          multiline: true,
          rows: 3,
          fullWidth: true,
        },
      ],
    },
  };

  const config = entityConfig[entityType] || entityConfig.invoice;

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData({
      ...formData,
      [field]: value,
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validate = () => {
    const newErrors = {};
    config.fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = 'Ce champ est requis';
      }
      // Validation email
      if (
        field.type === 'email' &&
        formData[field.name] &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[field.name])
      ) {
        newErrors[field.name] = 'Email invalide';
      }
      // Validation nombre
      if (
        field.type === 'number' &&
        formData[field.name] &&
        isNaN(parseFloat(formData[field.name]))
      ) {
        newErrors[field.name] = 'Nombre invalide';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fonctions pour gérer les articles (pour factures et bons de commande)
  const handleAddItem = () => {
    if (!newItem.description || newItem.quantity <= 0 || newItem.unit_price < 0) {
      return;
    }

    setItems([...items, { ...newItem }]);
    setNewItem({ description: '', quantity: 1, unit_price: 0 });

    // Recalculer le total
    updateTotalAmount([...items, newItem]);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    updateTotalAmount(updatedItems);
  };

  const updateTotalAmount = (itemsList) => {
    const total = itemsList.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    setFormData({
      ...formData,
      total_amount: total
    });
  };

  const handleConfirm = () => {
    if (validate()) {
      const confirmData = {
        ...formData,
        force_create: true
      };

      // Ajouter items si c'est une facture ou bon de commande
      if ((entityType === 'invoice' || entityType === 'purchase_order') && items.length > 0) {
        confirmData.items = items;
      }

      onConfirm(confirmData);
      onClose();
    }
  };

  const handleCancel = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 3,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          bgcolor: theme.palette.background.paper,
        },
      }}
      BackdropProps={{
        sx: { backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0,0,0,0.5)' }
      }}
    >
      <Box sx={{
        background: `linear-gradient(to right, ${alpha(config.color, 0.1)}, ${alpha(config.color, 0.05)})`,
        p: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{
              bgcolor: config.color,
              width: 50,
              height: 50,
              boxShadow: `0 4px 12px ${alpha(config.color, 0.4)}`
            }}
          >
            {config.icon}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Confirmer la création
            </Typography>
            <Typography variant="body2" sx={{ color: config.color, fontWeight: 600, opacity: 0.9 }}>
              {config.title.toUpperCase()}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleCancel} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'white' } }}>
          <Delete sx={{ transform: 'rotate(45deg)' }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4 }}>
        <Box sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.info.main, 0.05),
          border: `1px dashed ${alpha(theme.palette.info.main, 0.3)}`,
          display: 'flex', alignItems: 'center', gap: 2,
          mb: 3
        }}>
          <Typography variant="body2" color="text.secondary">
            Veuillez vérifier les informations ci-dessous. Vous pouvez les modifier avant la validation.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {config.fields.map((field) => (
            <Grid item xs={12} sm={field.fullWidth ? 12 : 6} key={field.name}>
              <TextField
                fullWidth
                label={field.label}
                value={formData[field.name] || ''}
                onChange={handleChange(field.name)}
                type={field.type || 'text'}
                required={field.required}
                error={!!errors[field.name]}
                helperText={errors[field.name]}
                multiline={field.multiline}
                rows={field.rows}
                variant="outlined"
                InputProps={{
                  startAdornment: field.icon && (
                    <InputAdornment position="start" sx={{ color: 'text.secondary', mr: 1 }}>{field.icon}</InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.action.hover, 0.05),
                    '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' },
                    '&:hover fieldset': { borderColor: alpha(config.color, 0.5) },
                    '&.Mui-focused fieldset': { borderColor: config.color, borderWidth: 2 },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: config.color }
                }}
              />
            </Grid>
          ))}
        </Grid>

        {/* Section Articles pour Factures et Bons de Commande */}
        {(entityType === 'invoice' || entityType === 'purchase_order') && (
          <Box sx={{ mt: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(config.color, 0.1), color: config.color }}>
                <ShoppingCart sx={{ fontSize: 16 }} />
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Articles / Services
              </Typography>
            </Box>

            {/* Liste des articles existants stylisée */}
            {items.length > 0 && (
              <Box sx={{ mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                      <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Qté</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Prix Unit.</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                      <TableCell align="center" width={50}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>{item.description}</TableCell>
                        <TableCell align="right" sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>{item.unit_price?.toFixed(2)} €</TableCell>
                        <TableCell align="right" sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <strong>{(item.quantity * item.unit_price).toFixed(2)} €</strong>
                        </TableCell>
                        <TableCell align="center" sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveItem(index)}
                            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', bgcolor: alpha(config.color, 0.05) }}>
                  <Typography variant="subtitle2" sx={{ mr: 2, fontWeight: 600 }}>Total Articles:</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: config.color }}>
                    {items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} €
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Formulaire d'ajout d'article moderne */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: alpha(theme.palette.action.hover, 0.03), borderRadius: 2, border: '1px dashed rgba(0,0,0,0.1)' }}>
              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>
                AJOUTER UN ARTICLE
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={5}>
                  {/* AUTOCOMPLETE INTEGRATION */}
                  <Autocomplete
                    freeSolo
                    options={products}
                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.reference})`}
                    loading={loadingProducts}
                    onInputChange={(event, newInputValue) => {
                      setNewItem(prev => ({ ...prev, description: newInputValue }));
                    }}
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue !== 'string') {
                        setNewItem(prev => ({
                          ...prev,
                          description: newValue.name,
                          unit_price: parseFloat(newValue.price) || 0
                        }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Rechercher un produit ou saisir..."
                        variant="outlined"
                        sx={{
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-root': { borderRadius: 1.5 }
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">Ref: {option.reference} - {option.price}€</Typography>
                        </Box>
                      </li>
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Qté"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0, step: 1 }}
                    sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Prix (€)"
                    type="number"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAddItem}
                    disabled={!newItem.description || newItem.quantity <= 0}
                    sx={{
                      textTransform: 'none',
                      bgcolor: config.color,
                      borderRadius: 1.5,
                      boxShadow: 'none',
                      fontWeight: 600,
                      '&:hover': { bgcolor: config.color, opacity: 0.9, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                    }}
                  >
                    Ajouter
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, bgcolor: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={handleCancel} sx={{ color: 'text.secondary', fontWeight: 600, borderRadius: 2 }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          sx={{
            py: 1, px: 3,
            bgcolor: config.color,
            borderRadius: 2,
            boxShadow: `0 8px 16px ${alpha(config.color, 0.25)}`,
            fontWeight: 700,
            '&:hover': {
              bgcolor: config.color,
              boxShadow: `0 12px 20px ${alpha(config.color, 0.35)}`,
              transform: 'translateY(-1px)'
            },
          }}
        >
          Confirmer la création
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
