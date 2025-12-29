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
} from '@mui/material';
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

/**
 * Modal de confirmation universelle pour création d'entités
 * Supporte: invoice, client, supplier, purchase_order, product
 */
const ConfirmationModal = ({ open, onClose, entityType, draftData, onConfirm }) => {
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
      const response = await fetch('/api/products/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.results || data || []);
      }
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
      color: 'success.main',
      title: 'Facture',
      fields: [
        {
          name: 'client_name',
          label: 'Client',
          icon: <Person />,
          required: true,
          fullWidth: true,
        },
        {
          name: 'client_email',
          label: 'Email du client',
          icon: <Email />,
          type: 'email',
          fullWidth: true,
        },
        {
          name: 'client_phone',
          label: 'Téléphone du client',
          icon: <Phone />,
          type: 'tel',
          fullWidth: true,
        },
        {
          name: 'title',
          label: 'Titre de la facture',
          icon: <Description />,
          required: true,
          fullWidth: true,
        },
        {
          name: 'total_amount',
          label: 'Montant total',
          icon: <Euro />,
          type: 'number',
          required: true,
        },
        {
          name: 'due_date',
          label: "Date d'échéance",
          icon: <CalendarToday />,
          type: 'date',
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
    client: {
      icon: <Person />,
      color: 'primary.main',
      title: 'Client',
      fields: [
        {
          name: 'name',
          label: 'Nom',
          icon: <Person />,
          required: true,
          fullWidth: true,
        },
        {
          name: 'email',
          label: 'Email',
          icon: <Email />,
          type: 'email',
          fullWidth: true,
        },
        {
          name: 'phone',
          label: 'Téléphone',
          icon: <Phone />,
          type: 'tel',
        },
        {
          name: 'contact_person',
          label: 'Personne de contact',
          icon: <ContactPage />,
        },
        {
          name: 'address',
          label: 'Adresse',
          icon: <Home />,
          multiline: true,
          rows: 2,
          fullWidth: true,
        },
        {
          name: 'payment_terms',
          label: 'Conditions de paiement',
          icon: <Euro />,
        },
        {
          name: 'tax_id',
          label: 'Numéro fiscal',
          icon: <Badge />,
        },
      ],
    },
    supplier: {
      icon: <Business />,
      color: 'info.main',
      title: 'Fournisseur',
      fields: [
        {
          name: 'name',
          label: 'Nom',
          icon: <Business />,
          required: true,
          fullWidth: true,
        },
        {
          name: 'contact_person',
          label: 'Personne de contact',
          icon: <ContactPage />,
          fullWidth: true,
        },
        {
          name: 'email',
          label: 'Email',
          icon: <Email />,
          type: 'email',
          fullWidth: true,
        },
        {
          name: 'phone',
          label: 'Téléphone',
          icon: <Phone />,
          type: 'tel',
        },
        {
          name: 'city',
          label: 'Ville',
          icon: <LocationCity />,
        },
        {
          name: 'address',
          label: 'Adresse',
          icon: <Home />,
          multiline: true,
          rows: 2,
          fullWidth: true,
        },
      ],
    },
    purchase_order: {
      icon: <ShoppingCart />,
      color: 'warning.main',
      title: 'Bon de Commande',
      fields: [
        {
          name: 'supplier_name',
          label: 'Fournisseur',
          icon: <Business />,
          required: true,
          fullWidth: true,
        },
        {
          name: 'total_amount',
          label: 'Montant total',
          icon: <Euro />,
          type: 'number',
          required: true,
        },
        {
          name: 'expected_delivery_date',
          label: 'Date de livraison prévue',
          icon: <CalendarToday />,
          type: 'date',
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
    product: {
      icon: <Inventory />,
      color: 'secondary.main',
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
      TransitionComponent={Zoom}
      transitionDuration={300}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{
              bgcolor: config.color,
              width: 48,
              height: 48,
            }}
          >
            {config.icon}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              ✨ Confirmer la création
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {config.title}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent dividers sx={{ py: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Vérifiez et modifiez les informations si nécessaire avant de créer {config.title.toLowerCase()}
        </Alert>

        <Grid container spacing={2}>
          {config.fields.map((field) => (
            <Grid item xs={field.fullWidth ? 12 : 6} key={field.name}>
              <TextField
                fullWidth
                size="small"
                label={field.label}
                value={formData[field.name] || ''}
                onChange={handleChange(field.name)}
                type={field.type || 'text'}
                required={field.required}
                error={!!errors[field.name]}
                helperText={errors[field.name]}
                multiline={field.multiline}
                rows={field.rows}
                InputProps={{
                  startAdornment: field.icon && (
                    <InputAdornment position="start">{field.icon}</InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  },
                }}
              />
            </Grid>
          ))

          }
        </Grid>

        {/* Section Articles pour Factures et Bons de Commande */}
        {(entityType === 'invoice' || entityType === 'purchase_order') && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCart fontSize="small" />
              Articles / Services
            </Typography>

            {/* Liste des articles existants */}
            {items.length > 0 && (
              <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell align="right"><strong>Qté</strong></TableCell>
                      <TableCell align="right"><strong>Prix Unit.</strong></TableCell>
                      <TableCell align="right"><strong>Total</strong></TableCell>
                      <TableCell align="center"><strong>Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{item.unit_price?.toFixed(2)} €</TableCell>
                        <TableCell align="right">
                          <strong>{(item.quantity * item.unit_price).toFixed(2)} €</strong>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>Total:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" color="primary">
                          {items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} €
                        </Typography>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Formulaire d'ajout d'article */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                Ajouter un article
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Ex: Ordinateur portable"
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Quantité"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0, step: 1 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Prix unitaire (€)"
                    type="number"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={handleAddItem}
                    disabled={!newItem.description || newItem.quantity <= 0}
                    sx={{
                      textTransform: 'none',
                      bgcolor: config.color,
                      '&:hover': {
                        bgcolor: config.color,
                        opacity: 0.9,
                      },
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

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleCancel} sx={{ textTransform: 'none' }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          sx={{
            textTransform: 'none',
            bgcolor: config.color,
            '&:hover': {
              bgcolor: config.color,
              opacity: 0.9,
            },
          }}
        >
          ✓ Créer {config.title}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
