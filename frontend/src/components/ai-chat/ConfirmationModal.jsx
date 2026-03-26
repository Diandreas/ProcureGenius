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
  Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
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
  Close,
  CheckCircle,
  HelpOutline,
} from '@mui/icons-material';
import { modalBackdrop, modalContent } from '../../animations/variants/modal';
import { fadeInUp, scaleIn } from '../../animations/variants/scroll-reveal';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import api from '../../services/api';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} />;
});

/**
 * ConfirmationModal Amélioré - Style Premium "Procura"
 * Modal de confirmation universelle pour création d'entités avec un design de haut calibre.
 */
const ConfirmationModal = ({ open, onClose, entityType, draftData, onConfirm }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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

  // Mettre à jour formData quand draftData change
  useEffect(() => {
    if (draftData) {
      setFormData(draftData);
      setItems(draftData.items || []);
    }
  }, [draftData]);

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
      subtitle: 'Vérifiez les détails de la facture avant finalisation',
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
      subtitle: 'Création d\'une nouvelle fiche client',
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
      subtitle: 'Création d\'une nouvelle fiche fournisseur',
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
      subtitle: 'Vérifiez les détails du bon de commande',
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
      subtitle: 'Ajout d\'un nouveau produit au catalogue',
      fields: [
        { name: 'name', label: 'Nom du produit', icon: <Inventory />, required: true, fullWidth: true },
        { name: 'reference', label: 'Référence', icon: <Badge />, required: true },
        { name: 'price', label: 'Prix unitaire', icon: <Euro />, type: 'number', required: true },
        { name: 'description', label: 'Description', icon: <Description />, multiline: true, rows: 3, fullWidth: true },
      ],
    },
  };

  const config = entityConfig[entityType] || entityConfig.invoice;
  const entityColor = config.color;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleAddItem = () => {
    if (newItem.description && newItem.quantity > 0) {
      const updatedItems = [...items, { ...newItem }];
      setItems(updatedItems);
      setNewItem({ description: '', quantity: 1, unit_price: 0 });
      
      // Mettre à jour le montant total automatiquement
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      setFormData(prev => ({ ...prev, total_amount: newTotal }));
    }
  };

  const handleRemoveItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    
    // Mettre à jour le montant total automatiquement
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    setFormData(prev => ({ ...prev, total_amount: newTotal }));
  };

  const validate = () => {
    const newErrors = {};
    config.fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = 'Ce champ est requis';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validate()) {
      onConfirm({ ...formData, items });
    }
  };

  const handleCancel = () => {
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
          borderRadius: 4,
          maxHeight: '90vh',
          boxShadow: '0 24px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          background: isDark ? '#0f172a' : '#ffffff',
        },
      }}
      BackdropProps={{
        sx: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }
      }}
    >
      {/* Header Premium (Identique au ListModal pour cohérence) */}
      <Box sx={{
        background: isDark 
          ? `linear-gradient(135deg, ${alpha(entityColor, 0.15)} 0%, ${alpha('#000', 0.2)} 100%)`
          : `linear-gradient(135deg, ${alpha(entityColor, 0.08)} 0%, ${alpha(entityColor, 0.02)} 100%)`,
        position: 'relative',
        pt: 4,
        pb: 3,
        px: 4
      }}>
        {/* Décoration de fond */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(entityColor, 0.15)} 0%, transparent 70%)`,
          zIndex: 0
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <motion.div variants={scaleIn} initial="hidden" animate="visible">
              <Avatar sx={{
                bgcolor: entityColor,
                boxShadow: `0 12px 24px ${alpha(entityColor, 0.4)}`,
                width: 60,
                height: 60,
                border: '2px solid white'
              }}>
                {React.cloneElement(config.icon, { sx: { fontSize: 30 } })}
              </Avatar>
            </motion.div>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
                Vérification : {config.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {config.subtitle}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={handleCancel} 
            sx={{ 
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </Box>

      <Divider />

      <DialogContent sx={{ 
        p: 4, 
        bgcolor: isDark ? '#0f172a' : '#f8fafc',
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-thumb': { bgcolor: alpha(entityColor, 0.2), borderRadius: 4 },
      }}>
        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Grid container spacing={3}>
            {/* Alerte d'information */}
            <Grid item xs={12}>
              <Alert 
                icon={<CheckCircle fontSize="inherit" />} 
                severity="info"
                sx={{ 
                  borderRadius: 2, 
                  bgcolor: alpha(entityColor, 0.05), 
                  color: isDark ? alpha(entityColor, 0.9) : alpha(entityColor, 0.8),
                  '& .MuiAlert-icon': { color: entityColor }
                }}
              >
                L'IA a préparé ces informations. Vous pouvez les modifier avant de confirmer la création.
              </Alert>
            </Grid>

            {/* Champs de formulaire */}
            {config.fields.map((field) => (
              <Grid item xs={12} sm={field.fullWidth ? 12 : 6} key={field.name}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {field.label} {field.required && '*'}
                </Typography>
                <TextField
                  fullWidth
                  name={field.name}
                  type={field.type || 'text'}
                  value={formData[field.name] || ''}
                  onChange={handleInputChange}
                  error={!!errors[field.name]}
                  helperText={errors[field.name]}
                  multiline={field.multiline}
                  rows={field.rows}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {React.cloneElement(field.icon, { sx: { color: alpha(entityColor, 0.5), fontSize: 20 } })}
                      </InputAdornment>
                    ),
                    sx: {
                      bgcolor: theme.palette.background.paper,
                      borderRadius: 2.5,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: isDark ? alpha('#fff', 0.02) : '#fff' },
                      '&.Mui-focused': { bgcolor: '#fff', boxShadow: `0 4px 12px ${alpha(entityColor, 0.1)}` }
                    }
                  }}
                />
              </Grid>
            ))}

            {/* Section Articles (si applicable) */}
            {(entityType === 'invoice' || entityType === 'purchase_order') && (
              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShoppingCart sx={{ color: entityColor }} />
                      Articles & Prestations
                    </Typography>
                    <Chip 
                      label={`${items.length} ligne${items.length > 1 ? 's' : ''}`}
                      size="small"
                      sx={{ fontWeight: 700, bgcolor: alpha(entityColor, 0.1), color: entityColor }}
                    />
                  </Box>

                  {items.length > 0 && (
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        mb: 3, 
                        border: `1px solid ${theme.palette.divider}`, 
                        borderRadius: 3, 
                        overflow: 'hidden',
                        boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.03)'
                      }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                            <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Désignation</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Qté</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>P.U.</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                            <TableCell align="center" width={50}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow key={index} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell sx={{ fontWeight: 500 }}>{item.description}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell align="right">{item.unit_price?.toFixed(2)} €</TableCell>
                              <TableCell align="right">
                                <Typography sx={{ fontWeight: 700, color: entityColor }}>
                                  {(item.quantity * item.unit_price).toFixed(2)} €
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
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
                      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: alpha(entityColor, 0.03), borderTop: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="subtitle2" sx={{ mr: 2, fontWeight: 600 }}>Total HT :</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: entityColor, fontSize: '1.1rem' }}>
                          {items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} €
                        </Typography>
                      </Box>
                    </Paper>
                  )}

                  {/* Formulaire d'ajout d'article moderne */}
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2.5, 
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha(theme.palette.action.hover, 0.03), 
                      borderRadius: 3, 
                      border: '1px dashed',
                      borderColor: alpha(entityColor, 0.3)
                    }}
                  >
                    <Typography variant="caption" sx={{ mb: 2, fontWeight: 700, color: entityColor, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Ajouter manuellement une ligne
                    </Typography>
                    <Grid container spacing={2} alignItems="flex-end">
                      <Grid item xs={12} sm={5}>
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
                              label="Produit / Service"
                              variant="outlined"
                              sx={{
                                bgcolor: theme.palette.background.paper,
                                '& .MuiOutlinedInput-root': { borderRadius: 2 }
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
                          label="Qté"
                          type="number"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                          inputProps={{ min: 0 }}
                          sx={{ bgcolor: theme.palette.background.paper, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Prix (€)"
                          type="number"
                          value={newItem.unit_price}
                          onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ bgcolor: theme.palette.background.paper, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<Add />}
                          onClick={handleAddItem}
                          disabled={!newItem.description || newItem.quantity <= 0}
                          sx={{
                            textTransform: 'none',
                            bgcolor: entityColor,
                            borderRadius: 2,
                            height: 40,
                            fontWeight: 700,
                            '&:hover': { bgcolor: entityColor, opacity: 0.9 },
                          }}
                        >
                          Ajouter
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              </Grid>
            )}
          </Grid>
        </motion.div>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        px: 4,
        bgcolor: theme.palette.background.paper, 
        borderTop: `1px solid ${theme.palette.divider}`,
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
          <HelpOutline fontSize="small" />
          <Typography variant="caption">Besoin d'aide ? Contactez le support IA.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={handleCancel}
            sx={{ 
              color: 'text.secondary', 
              fontWeight: 700, 
              borderRadius: 2.5, 
              px: 3,
              textTransform: 'none'
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              py: 1.2, 
              px: 4,
              bgcolor: entityColor,
              borderRadius: 2.5,
              boxShadow: `0 8px 20px ${alpha(entityColor, 0.3)}`,
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': {
                bgcolor: entityColor,
                boxShadow: `0 12px 28px ${alpha(entityColor, 0.45)}`,
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            Finaliser la création
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
